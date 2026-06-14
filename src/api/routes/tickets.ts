import express from 'express';
import { Ticket, TicketMessage, Settings } from '../models';
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

// Update ticket status/priority
router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, clientId },
      { $set: req.body },
      { new: true }
    );
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');
    envRes.sendSuccess(ticket);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update ticket');
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

    const { content, senderRole, senderName, isInternal } = req.body;

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderRole: senderRole || 'agent',
      senderName: senderName || 'Agent',
      content,
      isInternal: isInternal || false
    });

    // Update ticket updatedAt
    ticket.updatedAt = new Date();
    if (senderRole === 'customer') {
      ticket.status = 'open';
      ticket.hasUnreadMessages = true;
    } else {
      ticket.status = 'in_progress';
      ticket.hasUnreadMessages = false;
    }
    await ticket.save();

    // If it's an agent replying to a customer (and not internal), email the customer
    if (senderRole === 'agent' && !isInternal) {
      const settings = await Settings.findOne({ clientId }).lean();
      await sendEmail(
        ticket.customerEmail,
        `Re: ${ticket.subject} (Ticket #${ticket._id.toString().slice(-6)})`,
        `Hello ${ticket.customerName},\n\nYou have a new reply to your ticket:\n\n${content}\n\nBest,\nThe ${settings?.businessName || 'Support'} Team`,
        `<p>Hello ${ticket.customerName},</p><p>You have a new reply to your ticket:</p><blockquote>${content}</blockquote><p>Best,<br/>The ${settings?.businessName || 'Support'} Team</p>`,
        clientId
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
      ticketId: ticket._id,
      senderRole: 'customer',
      senderName: senderName || ticket.customerName,
      content,
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
      { new: true }
    );
    if (!ticket) return envRes.sendError(404, 'NOT_FOUND', 'Ticket not found');
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to mark as read');
  }
});

export default router;
