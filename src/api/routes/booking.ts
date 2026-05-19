import express from 'express';
import { Booking, Settings, UsageStats, Client } from '../models';
import { sendEmail } from '../email';
import { startOfDay, endOfDay, parseISO, isBefore, isAfter, addMinutes, format } from 'date-fns';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

router.post('/check-availability', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const { date, durationMinutes, clientId: bodyClientId } = req.body;
  const clientId = bodyClientId || req.headers['x-client-id'] || (req as any).clientId;
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is required');

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

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const { fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, preferredEndTime, notes, clientId: bodyClientId } = req.body;
    const clientId = bodyClientId || req.headers['x-client-id'] || (req as any).clientId;

    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is required');

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

    // Unlimited for super admin
    if (clientId === 'plumber-001') {
      storageLimit = 999999999999;
    }

    if (usage.storageBytesUsed >= storageLimit) {
      return envRes.sendError(403, 'QUOTA_EXCEEDED', 'Storage Limit reached. Cannot accept new bookings right now.');
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
      status: 'pending',
      location
    });

    // Notify Business
    if (settings) {
      sendEmail(
        settings.contactEmail,
        'Project Request: New Booking Received',
        `New booking from ${fullName}.\nService: ${serviceSelection}\nDate: ${preferredDate}\nTime: ${preferredStartTime}`,
        undefined,
        clientId
      );
    }
    
    // Notify Customer
    sendEmail(
      email,
      'Booking Confirmation - PrimeSoft Alliance',
      `Hello ${fullName}, \n\nThank you for choosing PrimeSoft Alliance. We have received your booking for ${serviceSelection} on ${preferredDate} at ${preferredStartTime}.\n\nOur team will review the request and get back to you shortly.\n\nBest regards,\nPrimeSoft Alliance Team`,
      undefined,
      clientId
    );

    // Sync to Leads immediately
    try {
      const { Lead } = await import('../models');
      const [first, ...lastParts] = (fullName || '').split(' ');
      
      const criteria: any = { clientId };
      const or = [];
      if (email) or.push({ contactEmail: email.toLowerCase().trim() });
      if (phoneNumber) or.push({ contactPhone: phoneNumber.trim() });
      
      let lead = null;
      if (or.length > 0) lead = await Lead.findOne({ ...criteria, $or: or });

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

export default router;
