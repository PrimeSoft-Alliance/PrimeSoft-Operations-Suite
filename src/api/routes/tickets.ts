import express from 'express';
import { Ticket, TicketMessage, Settings, Contact, Lead } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';
import { sendEmail } from '../email';

const router = express.Router();

router.use(authMiddleware);

const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  let queryCid = req.query.clientId;
  let headerCid = req.headers['x-client-id'];
  
  if (typeof queryCid === 'object' && queryCid !== null && 'clientId' in queryCid) queryCid = queryCid.clientId;
  if (typeof headerCid === 'object' && headerCid !== null && 'clientId' in headerCid) headerCid = headerCid.clientId;

  let cid = userCid || reqCid || headerCid || queryCid;

  if (!cid) return null;
  cid = String(cid);

  (req as any).clientId = cid;
  return cid;
};

// Get all tickets
router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const tickets = await Ticket.find({ clientId }).sort({ updatedAt: -1 }).lean();
    envRes.sendSuccess(tickets);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch tickets');
  }
});

// Create a new support ticket
router.post('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const { customerName, customerEmail, subject, priority, description } = req.body;
    if (!customerName || !customerEmail || !subject || !description) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Customer name, email, subject, and description are required.');
    }
    const ticket = await Ticket.create({
      clientId,
      customerName,
      customerEmail: customerEmail.toLowerCase().trim(),
      subject,
      status: 'open',
      priority: priority || 'medium',
      hasUnreadMessages: false,
      source: 'manual'
    });

    // Module Linking: Ensure Contact and Lead exist for this ticket
    try {
      let contact = await Contact.findOne({ clientId, email: customerEmail.toLowerCase().trim() });
      if (!contact) {
        contact = await Contact.create({
          clientId,
          name: customerName,
          email: customerEmail.toLowerCase().trim(),
          source: 'support'
        });
      }

      let lead = await Lead.findOne({ clientId, contactEmail: customerEmail.toLowerCase().trim() });
      if (!lead) {
        lead = await Lead.create({
          clientId,
          contactId: contact._id,
          contactFirst: customerName.split(' ')[0],
          contactLast: customerName.split(' ').slice(1).join(' ') || '',
          contactEmail: customerEmail.toLowerCase().trim(),
          source: 'support',
          stage: 'Qualified',
          status: 'strong',
          activities: [{
            type: 'ticket',
            description: `Support Ticket #${ticket._id.toString().slice(-6)} created: ${subject}`
          }]
        });
      } else {
        lead.activities.push({
          type: 'ticket',
          description: `New Support Ticket: ${subject}`,
          metadata: { ticketId: ticket._id }
        });
        lead.lastActivity = new Date();
        await lead.save();
      }
    } catch (linkErr) {
      console.warn('[TICKET_LINKING] Failed to link contact/lead:', linkErr);
    }

    await TicketMessage.create({
      clientId,
      ticketId: ticket._id,
      senderRole: 'customer',
      senderName: customerName,
      content: description,
      isInternal: false
    });

    try {
      const { createSystemNotification } = await import('../utils/notifications');
      await createSystemNotification(clientId, {
        title: 'New Support Ticket Created',
        message: `Ticket #${ticket._id.toString().slice(-6)} created for ${customerName}.`,
        type: 'system',
        relatedId: ticket._id,
        link: '/dashboard/tickets'
      });
      
      const { notificationService } = await import('../services/notificationService');
      await notificationService.sendTicketOpened(clientId, ticket);
    } catch (e) {
      console.error('Failed to create system notification:', e);
    }

    envRes.sendSuccess(ticket);
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to create support ticket: ' + error.message);
  }
});

// Update ticket status/priority
router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findOne({ _id: ticketId, clientId });
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');

    const previousStatus = ticket.status;
    const newStatus = req.body.status;

    // Apply the body changes
    Object.assign(ticket, req.body);
    ticket.updatedAt = new Date();
    await ticket.save();

    // 2. Notify the person/customer if the ticket has been closed
    if (newStatus === 'closed' && previousStatus !== 'closed') {
      const { notificationService } = await import('../services/notificationService');
      await notificationService.sendTicketClosed(clientId, ticket);
    }

    // 3. Notify if a ticket was reopened (closed -> open/in_progress)
    if (previousStatus === 'closed' && (newStatus === 'open' || newStatus === 'in_progress')) {
      const { notificationService } = await import('../services/notificationService');
      await notificationService.sendTicketReopened(clientId, ticket);
    }

    envRes.sendSuccess(ticket);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update ticket');
  }
});

// Toggle AI for a ticket/thread
router.post('/:id/pause-ai', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const { paused } = req.body;
    const ticketId = req.params.id;
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, clientId },
      { $set: { aiEnabled: !paused } },
      { returnDocument: 'after' }
    );
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');

    // Also try to find and update linked Conversation if it exists
    const { Conversation } = await import('../models');
    // We try to match by customerEmail or customerPhone/JID
    // Tickets have customerEmail and possibly threadId/customerId
    const conv = await Conversation.findOneAndUpdate(
      { 
        clientId, 
        $or: [
          { customerJid: ticket.customerEmail },
          { customerJid: ticket.threadId }
        ]
      },
      { $set: { aiEnabled: !paused } }
    );

    envRes.sendSuccess({ success: true, aiEnabled: ticket.aiEnabled });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to toggle AI status');
  }
});

// Get messages for a ticket
router.get('/:id/messages', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, clientId });
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');

    const messages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean();
    envRes.sendSuccess(messages);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch messages');
  }
});

// Add a message to a ticket
router.post('/:id/messages', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, clientId });
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');

    const { content, senderRole, senderName, isInternal, imageUrl } = req.body;

    const message = await TicketMessage.create({
      clientId,
      ticketId: ticket._id,
      senderRole: senderRole || 'agent',
      senderName: senderName || 'Agent',
      content,
      imageUrl: imageUrl || undefined,
      isInternal: isInternal || false
    });

    // Update ticket updatedAt
    ticket.updatedAt = new Date();
    ticket.status = 'open'; // move to 'Open' automatically upon receiving a new reply
    if (senderRole === 'customer') {
      ticket.hasUnreadMessages = true;
    } else {
      ticket.hasUnreadMessages = false;
    }
    await ticket.save();

    // If it's an agent replying to a customer (and not internal), email the customer
    if (senderRole === 'agent' && !isInternal) {
      const settings = await Settings.findOne({ clientId }).lean();
      
      const threadId = ticket.threadId || `ticket-${ticket._id}@ominirep.com`;

      await sendEmail(
        ticket.customerEmail,
        `Re: ${ticket.subject}`, // Must match exactly with the original or typical thread
        `Hello ${ticket.customerName},\n\nYou have a new reply to your ticket:\n\n${content}\n\nBest,\nThe ${settings?.businessName || 'Support'} Team`,
        `<p>Hello ${ticket.customerName},</p><p>You have a new reply to your ticket:</p><blockquote>${content.replace(/\n/g, '<br/>')}</blockquote><p>Best,<br/>The ${settings?.businessName || 'Support'} Team</p>`,
        clientId,
        undefined,
        undefined,
        {
          inReplyTo: threadId,
          references: threadId
        }
      );
    }

    envRes.sendSuccess(message);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to add message');
  }
});

// Incoming message from customer (Webhook / Simulation)
router.post('/incoming', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { ticketId, content, customerEmail, senderName } = req.body;
    
    // Find ticket by ID
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');

    const message = await TicketMessage.create({
      clientId: ticket.clientId,
      ticketId: ticket._id,
      senderRole: 'customer',
      senderName: senderName || ticket.customerName,
      content
    });

    ticket.status = 'open';
    ticket.hasUnreadMessages = true;
    ticket.updatedAt = new Date();
    await ticket.save();

    // Notify agent via email
    const { Client } = await import('../models');
    const client = await Client.findOne({ clientId: ticket.clientId }).lean();
    if (client && client.email) {
      await sendEmail(
        client.email,
        `New Reply to Ticket #${ticket._id.toString().slice(-6)}`,
        `You have a new customer reply on ticket: ${ticket.subject}\n\nContent:\n${content}\n\nView it in your dashboard.`,
        `<p>You have a new customer reply on ticket: <strong>${ticket.subject}</strong></p><p>Content:</p><blockquote>${content}</blockquote><p><a href="https://${client.subdomain}.your-platform.com/dashboard/tickets">View it in your dashboard</a></p>`,
        ticket.clientId
      );
    }

    envRes.sendSuccess({ success: true, message: 'Incoming message recorded' });
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to process incoming message: ' + error.message);
  }
});

// Mark messages as read
router.post('/:id/read', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, clientId },
      { $set: { hasUnreadMessages: false } },
      { returnDocument: 'after' }
    );
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to mark as read');
  }
});

// Test IMAP Connection
router.post('/test-imap', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const { host, port, user, pass, ssl } = req.body;
    const { EmailConfigService } = await import('../services/emailConfigService');

    let configToVerify: any = null;
    let source: any = 'missing';

    if (host && user && pass) {
      configToVerify = {
        host,
        port: parseInt(port) || 993,
        secure: ssl !== false,
        auth: { user, pass }
      };
      source = 'client';
    } else {
      const { config, source: selectedSource } = await EmailConfigService.getImapConfig(clientId);
      configToVerify = config;
      source = selectedSource;
    }

    if (!configToVerify) {
      return envRes.sendError(400, 'IMAP_MISSING', 'No IMAP configuration found');
    }

    const verification = await EmailConfigService.verifyImap(configToVerify, source);

    if (verification.verified) {
      envRes.sendSuccess({ 
        message: '✓ IMAP Connection established and mailbox access confirmed!',
        audit: verification
      });
    } else {
      envRes.sendError(500, 'IMAP_FAILED', `IMAP Verification Failed at ${verification.stage}`, verification.error);
    }
  } catch (error: any) {
    console.error('IMAP Test Error:', error);
    envRes.sendError(500, 'API_ERROR', 'API Error during testing', error instanceof Error ? error.message : String(error));
  }
});

// Synchronize Mailbox IMAP (receives incoming emails and binds them as tickets)
router.post('/sync-mailbox', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const { syncInquiriesFromImap } = await import('../services/emailSupportService');
    const result = await syncInquiriesFromImap(clientId);
    
    if (result.success) {
      envRes.sendSuccess({
        syncedCount: result.count || 0,
        message: `Successfully synchronized mailbox. ${result.count || 0} new messages processed.`
      });
    } else {
      envRes.sendError(500, 'SYNC_FAILED', result.error || 'Failed to sync mailbox');
    }
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'IMAP Sync Error: ' + error.message);
  }
});

// Bulk delete tickets
router.delete('/', async (req: any, res: any) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Client Context Required');
  
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return envRes.sendError(400, 'BAD_REQUEST', 'Array of IDs required');
  }

  try {
    const result = await Ticket.deleteMany({
      _id: { $in: ids },
      clientId
    });
    
    // Also delete associated messages
    await TicketMessage.deleteMany({
      ticketId: { $in: ids }
    });

    envRes.sendSuccess({ 
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} tickets and their associated messages.`
    });
  } catch (error: any) {
    envRes.sendError(500, 'SERVER_ERROR', error.message);
  }
});

// Delete single ticket
router.delete('/:id', async (req: any, res: any) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Client Context Required');
  
  const { id } = req.params;

  try {
    const ticket = await Ticket.findOneAndDelete({ _id: id, clientId });
    if (!ticket) {
      return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');
    }
    
    // Also delete associated messages
    await TicketMessage.deleteMany({ ticketId: id });

    envRes.sendSuccess({ message: 'Ticket deleted successfully' });
  } catch (error: any) {
    envRes.sendError(500, 'SERVER_ERROR', error.message);
  }
});

export default router;
