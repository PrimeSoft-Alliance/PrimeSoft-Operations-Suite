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

  if (req.user?.role === 'superadmin' && (queryCid || headerCid)) {
    cid = queryCid || headerCid;
  }
  
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
    } else {
      ticket.status = 'in_progress';
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

export default router;
