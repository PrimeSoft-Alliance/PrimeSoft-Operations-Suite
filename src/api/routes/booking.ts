import express from 'express';
import { Booking, Settings, UsageStats, Client, Lead } from '../models';
import { sendEmail } from '../email';
import { startOfDay, endOfDay, parseISO, isBefore, isAfter, addMinutes, format } from 'date-fns';
import { EnvelopeResponse } from '../middlewares/envelope';
import { resolveClientId } from '../utils/resolveClient';
import { identityService } from '../services/identityService';

const router = express.Router();

router.post('/check-availability', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = await resolveClientId(req);
  const { date } = req.body;
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Target client could not be identified');

  try {
    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'NOT_FOUND', 'Settings not found');

    const reqDate = new Date(date);
    if (isNaN(reqDate.getTime())) {
      return envRes.sendError(400, 'INVALID_DATE', 'The provided date is invalid');
    }

    const dayOfWeek = reqDate.getDay();
    const workingHour = settings.workingHours?.find((wh: any) => wh.day === dayOfWeek);

    if (!workingHour || !workingHour.isOpen || !workingHour.openTime || !workingHour.closeTime) {
      return envRes.sendSuccess({ availableSlots: [] });
    }

    const { openTime, closeTime } = workingHour;
    
    // Simplistic slots generation
    // Example: open '08:00', close '17:00'
    const openParts = (openTime || '08:00').split(':').map(Number);
    const closeParts = (closeTime || '17:00').split(':').map(Number);
    
    if (openParts.length < 2 || closeParts.length < 2 || isNaN(openParts[0]) || isNaN(closeParts[0])) {
      console.warn(`[AVAILABILITY] Invalid working hours for ${clientId} on day ${dayOfWeek}`);
      return envRes.sendSuccess({ availableSlots: [] });
    }

    let currentSlot = new Date(reqDate);
    currentSlot.setHours(openParts[0], openParts[1], 0, 0);

    const endTime = new Date(reqDate);
    endTime.setHours(closeParts[0], closeParts[1], 0, 0);

    const slotDuration = settings.slotDurationMinutes || 60;
    const buffer = settings.bufferTimeMinutes || 30;
    
    // Fetch existing bookings for the day
    const dayStart = startOfDay(reqDate);
    const dayEnd = endOfDay(reqDate);
    const existingBookings = await Booking.find({
      clientId,
      preferredDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] }
    });

    const availableSlots = [];

    // Safety limit to avoid infinite loops
    let iterations = 0;
    while (currentSlot < endTime && iterations < 100) {
      iterations++;
      const slotEnd = addMinutes(currentSlot, slotDuration);
      
      // Check if slot overlaps with close time
      if (isAfter(slotEnd, endTime)) break;

      const slotStartStr = format(currentSlot, 'HH:mm');
      const slotEndStr = format(slotEnd, 'HH:mm');

      // Check overlap
      const hasOverlap = existingBookings.some(b => {
        if (!b.preferredStartTime || !b.preferredEndTime) return false;
        return (slotStartStr >= b.preferredStartTime && slotStartStr < b.preferredEndTime) ||
               (slotEndStr > b.preferredStartTime && slotEndStr <= b.preferredEndTime) ||
               (slotStartStr <= b.preferredStartTime && slotEndStr >= b.preferredEndTime);
      });

      // Buffer consideration is missing here for simplicity, but can be added. 

      if (!hasOverlap) {
        const startTime12 = format(currentSlot, 'hh:mm a');
        const endTime12 = format(slotEnd, 'hh:mm a');
        availableSlots.push({ 
          startTime: slotStartStr, 
          endTime: slotEndStr,
          displayTime: `${startTime12} - ${endTime12}`
        });
      }

      currentSlot = addMinutes(currentSlot, slotDuration + buffer);
    }

    envRes.sendSuccess({ availableSlots });

  } catch (error) {
    envRes.sendError(500, 'SERVER_ERROR', 'Check availability failed');
  }
});

import { bookingService } from '../services/bookingService';

router.post('/:id/accept', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const booking = await bookingService.updateStatus(req.params.id, 'confirmed');
    envRes.sendSuccess(booking);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.post('/:id/reject', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const booking = await bookingService.updateStatus(req.params.id, 'rejected', req.body.notes);
    envRes.sendSuccess(booking);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.post('/:id/reschedule', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const { date, startTime, endTime } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, {
      $set: {
        preferredDate: new Date(date),
        preferredStartTime: startTime,
        preferredEndTime: endTime,
        status: 'rescheduled'
      }
    }, { new: true });
    
    await bookingService.generateICal(req.params.id);
    
    if (booking) {
       const { notificationService } = await import('../services/notificationService');
       await notificationService.sendBookingRescheduled(booking.clientId, booking);
    }
    
    envRes.sendSuccess(booking);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.post('/:id/message', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = await resolveClientId(req);
  const { message, subject } = req.body;

  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid credentials');
  if (!message || !message.trim()) {
    return envRes.sendError(400, 'BAD_REQUEST', 'Message is required');
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return envRes.sendError(404, 'NOT_FOUND', 'Booking not found');
    }

    const { Contact, Conversation, TelnyxNumber } = await import('../models');
    const { conversationService } = await import('../services/conversationService');
    const { telegramManager } = await import('../services/telegramManager');
    const { telnyxService } = await import('../services/telnyxService');

    // Find contact by email or phone
    const contact = await Contact.findOne({
      clientId,
      $or: [
        { email: booking.email.toLowerCase().trim() },
        { phone: booking.phoneNumber?.trim() }
      ]
    });

    const finalSubject = subject || `Update regarding your booking for ${booking.serviceSelection}`;
    const channelsSent: string[] = [];

    // 1. SMTP/Email notification (Always sent)
    await sendEmail(
      booking.email,
      finalSubject,
      message,
      `<p>${message.replace(/\n/g, '<br/>')}</p>`,
      clientId
    );
    channelsSent.push('email');

    // 2. Outbound medium matching
    if (contact) {
      // WhatsApp
      if (contact.whatsappJid) {
        try {
          await conversationService.sendOutbound({
            clientId,
            contactId: contact._id.toString(),
            channel: 'whatsapp',
            text: message
          });
          channelsSent.push('whatsapp');
        } catch (err: any) {
          console.warn('[Booking Msg] WhatsApp delivery failed:', err.message);
        }
      }

      // Telegram
      if (contact.telegramChatId) {
        try {
          await telegramManager.sendMessage(clientId, contact.telegramChatId, { text: message });
          channelsSent.push('telegram');

          // Log Telegram outbound
          let conv = await Conversation.findOne({ clientId, customerJid: contact.telegramChatId });
          if (!conv) {
            conv = new Conversation({ clientId, customerJid: contact.telegramChatId, platform: 'telegram', messages: [] });
          }
          conv.messages.push({
            sender: 'assistant',
            text: message,
            timestamp: new Date()
          });
          await conv.save();
        } catch (err: any) {
          console.warn('[Booking Msg] Telegram delivery failed:', err.message);
        }
      }

      // Telnyx SMS fallback if no messaging channel is active but phone is present
      if (!contact.whatsappJid && !contact.telegramChatId && booking.phoneNumber) {
        try {
          const rentedNumber = await TelnyxNumber.findOne({ clientId });
          const fromNumber = rentedNumber?.phoneNumber || '+15555555555';
          await telnyxService.sendSMS(clientId, fromNumber, booking.phoneNumber, message);
          channelsSent.push('sms');
        } catch (err: any) {
          console.warn('[Booking Msg] SMS delivery failed:', err.message);
        }
      }
    }

    envRes.sendSuccess({
      success: true,
      channelsSent,
      message: `Message sent via: ${channelsSent.join(', ')}`
    });

  } catch (err: any) {
    console.error('[Booking Msg Exception]', err);
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.get('/:id/ics', async (req, res) => {
  try {
    const icsPath = await bookingService.generateICal(req.params.id);
    res.redirect(icsPath);
  } catch (err) {
    res.status(500).send('Failed to generate calendar invite');
  }
});

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const { fullName, email, serviceSelection, preferredDate, preferredStartTime, preferredEndTime, notes } = req.body;
    const phoneNumber = req.body.phoneNumber || req.body.phone;
    console.log('[DEBUG] [Booking] Received body:', req.body, 'Matched phoneNumber:', phoneNumber);
    if (!phoneNumber) return envRes.sendError(400, 'VALIDATION_ERROR', 'Phone number is required');
    const clientId = await resolveClientId(req);

    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Target client could not be identified');

    // Fetch Geo Location
    const ip = (req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '').split(',')[0].trim();
    let location = { ip, city: 'Unknown', country: 'Unknown' };
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = { ip, city: geoData.city, country: geoData.country };
      }
    } catch (e) { console.warn('[GEO] Failed to fetch IP geo:', e); }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) usage = await UsageStats.create({ clientId, month: currentMonth });

    const clientRecord = await Client.findOne({ clientId });
    let storageLimit = clientRecord?.storageLimitBytes || 52428800;

    if (usage.storageBytesUsed >= storageLimit) {
      return envRes.sendError(401, 'QUOTA_EXCEEDED', 'Storage Limit reached. Cannot accept new bookings right now.');
    }

    const settings = await Settings.findOne({ clientId });

    // Double check overlap
    const existing = await Booking.findOne({
      clientId,
      preferredDate: startOfDay(new Date(preferredDate)),
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          preferredStartTime: { $lte: preferredStartTime },
          preferredEndTime: { $gt: preferredStartTime }
        },
        {
          preferredStartTime: { $lt: preferredEndTime },
          preferredEndTime: { $gte: preferredEndTime }
        }
      ]
    });

    if (existing) {
      return envRes.sendError(409, 'CONFLICT', 'This time slot is no longer available. Please choose another.');
    }

    const booking = await Booking.create({
      clientId,
      fullName, phoneNumber, email, serviceSelection,
      preferredDate: startOfDay(new Date(preferredDate)),
      preferredStartTime, preferredEndTime, notes,
      status: 'awaiting',
      location
    });

    try {
      const { Notification } = await import('../models');
      await Notification.create({
        clientId,
        title: 'New Booking Request',
        message: `${fullName} has requested a booking for ${serviceSelection}.`,
        type: 'booking',
        relatedId: booking._id
      });
      const io = req.app.get('io');
      if (io) io.to(clientId).emit('notification', { title: 'New Booking Request', type: 'booking' });
    } catch (err) {}

    // Generate Calendar Invite
    let attachments: any[] = [];
    let providerMail: string = settings?.contactEmail || '';
    let bizName = settings?.businessName || 'our business';
    let calendarLink = `/api/bookings/${booking._id}/ics`;

    try {
      const { processBookingCalendarInvite } = await import('../services/bookingCalendarService');
      const calData = await processBookingCalendarInvite(booking._id);
      attachments = calData.attachments;
      providerMail = calData.providerEmail;
      bizName = calData.businessName;
    } catch (err) {
      console.warn('[CALENDAR] Failed to generate ICS on booking creation:', err);
    }

    // Notify Business
    if (providerMail) {
      const providerHtml = `
        <p>New booking from <strong>${fullName}</strong>.</p>
        <p><strong>Booking ID:</strong> <code>${booking._id}</code></p>
        <p><strong>Service:</strong> ${serviceSelection}</p>
        <p><strong>Date:</strong> ${preferredDate}</p>
        <p><strong>Time:</strong> ${preferredStartTime}</p>
        <br/>
        <p><a href="${req.protocol}://${req.get('host')}${calendarLink}" style="padding: 10px 15px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px;">Add to Calendar</a></p>
      `;
      sendEmail(
        providerMail,
        'Project Request: New Booking Received',
        `New booking from ${fullName}.\nBooking ID: ${booking._id}\nService: ${serviceSelection}\nDate: ${preferredDate}\nTime: ${preferredStartTime}`,
        providerHtml,
        clientId,
        undefined,
        attachments
      );
    }
    
    // Notify Customer
    const customerHtml = `
      <p>Hello ${fullName},</p>
      <p>Thank you for choosing ${bizName}. We have received your booking for <strong>${serviceSelection}</strong> on <strong>${preferredDate}</strong> at <strong>${preferredStartTime}</strong>.</p>
      <p><strong>Your Booking ID is:</strong> <code>${booking._id}</code> (Save this ID to update, reschedule, or cancel your booking with our AI assistant.)</p>
      <p>Our team will review the request and get back to you shortly.</p>
      <br/>
      <p><a href="${req.protocol}://${req.get('host')}${calendarLink}" style="padding: 10px 15px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px;">Add to Calendar</a></p>
      <br/>
      <p>Best regards,<br/>${bizName} Team</p>
    `;

    sendEmail(
      email,
      `Booking Confirmation - ${bizName}`,
      `Hello ${fullName}, \n\nThank you for choosing ${bizName}. We have received your booking for ${serviceSelection} on ${preferredDate} at ${preferredStartTime}.\n\nYour Booking ID is: ${booking._id} (Save this ID to update, reschedule, or cancel your booking with our AI assistant.)\n\nOur team will review the request and get back to you shortly.\n\nBest regards,\n${bizName} Team`,
      customerHtml,
      clientId,
      undefined,
      attachments
    );

    // Schedule Reminders
    try {
      const { scheduleReminders } = await import('../services/reminderService');
      scheduleReminders(booking._id).catch(err => console.warn('Reminder scheduling failed:', err));
    } catch (err) {}

    // Sync to Leads immediately
    try {
      const [first, ...lastParts] = (fullName || '').split(' ');
      
      const contact = await identityService.resolveContact(clientId, {
        email: email,
        phone: phoneNumber,
        name: fullName
      }, 'booking');

      const criteria: any = { clientId, contactId: contact._id };
      let lead = await Lead.findOne(criteria);

      if (lead) {
        lead.lastActivity = new Date();
        const tags = new Set([...(lead.tags || []), 'from booking', 'high-intent']);
        lead.tags = Array.from(tags);
        lead.status = 'very-strong';
        if (location) lead.location = location;
        if (serviceSelection) {
           const existingData = lead.data instanceof Map ? Object.fromEntries(lead.data) : (lead.data || {});
           lead.data = { ...existingData, lastServiceRequested: serviceSelection, bookingId: booking._id };
        }
        await lead.save();
      } else {
        await Lead.create({
          clientId,
          contactId: contact._id,
          contactFirst: first || 'Unknown',
          contactLast: lastParts.join(' ') || '',
          contactEmail: email,
          contactPhone: phoneNumber,
          source: 'booking',
          tags: ['from booking', 'high-intent', 'auto-synced'],
          status: 'very-strong',
          location,
          lastActivity: new Date(),
          data: { lastServiceRequested: serviceSelection, bookingId: booking._id }
        });
      }
    } catch (err) {
      console.warn('[LEAD-SYNC] Failed to sync booking to lead:', err);
    }

    envRes.sendSuccess(booking);
  } catch (error) {
    envRes.sendError(500, 'SERVER_ERROR', 'Booking submission failed');
  }
});

// Force-trigger/Simulate background alarms for a specific booking
router.post('/:id/reminders/trigger', async (req, res) => {
  try {
    const { id } = req.params;
    const { Booking: BookingModel, Settings: SettingsModel } = await import('../models');
    const booking = await BookingModel.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    // Send immediate email notification to simulate the alarm
    const settings = await SettingsModel.findOne({ clientId: booking.clientId });
    const bizName = settings?.businessName || 'Our Business';
    const { sendEmail } = await import('../email');

    const bookingDateStr = booking.preferredDate instanceof Date 
      ? booking.preferredDate.toDateString() 
      : new Date(booking.preferredDate).toDateString();

    const customerHtml = `
      <p>Hello ${booking.fullName},</p>
      <p>This is an automated <strong>[TEST ALARM REMINDER]</strong> for your upcoming booking for <strong>${booking.serviceSelection}</strong> on <strong>${bookingDateStr}</strong> at <strong>${booking.preferredStartTime}</strong>.</p>
      <p>We look forward to seeing you!</p>
      <br/>
      <p>Best regards,<br/>${bizName} Team</p>
    `;

    await sendEmail(
      booking.email,
      `[TEST REMINDER] Upcoming Booking with ${bizName}`,
      `This is a test reminder for your booking on ${bookingDateStr} at ${booking.preferredStartTime}.`,
      customerHtml,
      booking.clientId
    );

    return res.json({ success: true, message: 'Test alarm simulated and email dispatched.' });
  } catch (err: any) {
    console.error('[TEST-REMINDER-ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Real-world tenant wide live iCal/WebCal Feed subscription!
router.get('/feed/:clientId.ics', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { Booking: BookingModel, Settings: SettingsModel } = await import('../models');
    const icalGenerator = await import('ical-generator');
    const ical = (icalGenerator.default || icalGenerator) as any;
    const ICalCalendarMethod = (icalGenerator.ICalCalendarMethod || (icalGenerator as any).ICalCalendarMethod) as any;

    const bookings = await BookingModel.find({ clientId, status: { $ne: 'cancelled' } });
    const settings = await SettingsModel.findOne({ clientId });
    const bizName = settings?.businessName || 'OminiRep Client';

    const calendar = ical({ name: `${bizName} Bookings Feed` });
    calendar.method(ICalCalendarMethod.PUBLISH);

    for (const booking of bookings) {
      if (!booking.preferredDate || !booking.preferredStartTime) continue;
      
      try {
        const start = new Date(booking.preferredDate);
        const [hours, minutes] = (booking.preferredStartTime || '10:00').split(':').map(Number);
        if (!isNaN(hours)) start.setHours(hours, minutes || 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + (booking.duration || 60));

        calendar.createEvent({
          id: booking._id.toString(),
          start,
          end,
          summary: booking.title || `${booking.serviceSelection} - ${booking.fullName}`,
          description: `Customer: ${booking.fullName}\nEmail: ${booking.email}\nPhone: ${booking.phoneNumber || booking.phone || 'N/A'}\nNotes: ${booking.notes || 'None'}\n\nManaged by OminiRep AI Representative`,
          location: booking.meetingLocation || 'Online',
          url: booking.meetingLink || '',
          organizer: {
            name: `${bizName} Team`,
            email: 'no-reply@ominirep.com'
          },
          attendees: [
            { name: booking.fullName, email: booking.email, rsvp: true }
          ]
        });
      } catch (errEvent) {
        console.warn(`[ICAL-FEED] Failed to generate event for booking ${booking._id}:`, errEvent);
      }
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ominirep_feed_${clientId}.ics"`);
    res.send(calendar.toString());
  } catch (err: any) {
    console.error('[ICAL-FEED-ERROR]', err);
    res.status(500).send('Failed to generate calendar subscription feed: ' + err.message);
  }
});

// DELETE /v1/bookings - Bulk delete bookings
router.delete('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

    const idsString = req.body.ids || req.query.ids;
    const ids = Array.isArray(idsString) ? idsString : (typeof idsString === 'string' ? idsString.split(',') : []);

    if (ids.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'No IDs provided for deletion');
    }

    const { Booking } = await import('../models');
    await Booking.deleteMany({ _id: { $in: ids }, clientId });

    envRes.sendSuccess({ success: true, message: `${ids.length} bookings successfully deleted.` });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_ERROR', err.message);
  }
});

// DELETE /v1/bookings/:id - Single delete booking
router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

    const { Booking } = await import('../models');
    const result = await Booking.findOneAndDelete({ _id: req.params.id, clientId });

    if (!result) {
      return envRes.sendError(404, 'NOT_FOUND', 'Booking not found');
    }

    envRes.sendSuccess({ success: true, message: 'Booking successfully deleted.' });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_ERROR', err.message);
  }
});

export default router;
