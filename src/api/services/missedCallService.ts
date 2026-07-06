import { MissedCall } from '../models';
import { Contact } from '../models';
import pino from 'pino';

const logger = pino({ name: 'MissedCallService' });

export class MissedCallService {
  async listMissedCalls(clientId: string, filters: any = {}, options: any = {}) {
    const query = { clientId, ...filters };
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    
    const calls = await MissedCall.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('contactId');
      
    const total = await MissedCall.countDocuments(query);
    
    return { calls, total, page, totalPages: Math.ceil(total / limit) };
  }

  async markAsReachedOut(clientId: string, callId: string, details: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    leadStage?: string;
    outcome?: string;
    tags?: string[];
  }) {
    const call = await (MissedCall as any).findOne({ clientId, _id: callId });
    if (!call) throw new Error('Missed call record not found');

    // Update or Create Contact
    let contact;
    if (call.contactId) {
      contact = await Contact.findById(call.contactId);
    }
    
    if (!contact) {
        contact = await Contact.findOne({ clientId, $or: [{ phone: details.phone }, { email: details.email }] });
    }

    if (contact) {
      contact.name = details.name;
      contact.phone = details.phone;
      if (details.email) contact.email = details.email;
      if (details.notes) contact.message = (contact.message || '') + '\n' + details.notes;
      await contact.save();
    } else {
      contact = await Contact.create({
        clientId,
        name: details.name,
        phone: details.phone,
        email: details.email,
        message: details.notes,
        source: 'missed_call_reachout'
      });
    }

    // Link and Update Call
    call.status = 'reached_out';
    call.contactId = contact._id;
    call.outreachNotes = details.notes;
    call.outreachOutcome = details.outcome;
    await call.save();

    return { call, contact };
  }
}

export const missedCallService = new MissedCallService();
