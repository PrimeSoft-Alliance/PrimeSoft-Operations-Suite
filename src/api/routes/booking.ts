import express from 'express';
import { Booking, Settings, UsageStats } from '../models';
import { sendEmail } from '../email';
import { startOfDay, endOfDay, parseISO, isBefore, isAfter, addMinutes, format } from 'date-fns';

const router = express.Router();

router.post('/check-availability', async (req, res) => {
  const { date, durationMinutes, clientId: bodyClientId } = req.body;
  const clientId = bodyClientId || req.headers['x-client-id'] || 'plumber-001';
  try {
    const settings = await Settings.findOne({ clientId });
    if (!settings) return res.status(500).json({ error: 'Settings not found' });

    const reqDate = new Date(date);
    const dayOfWeek = reqDate.getDay();
    const workingHour = settings.workingHours.find((wh: any) => wh.day === dayOfWeek);

    if (!workingHour || !workingHour.isOpen) {
      return res.json({ availableSlots: [] });
    }

    const { openTime, closeTime } = workingHour;
    
    // Simplistic slots generation
    // Example: open '08:00', close '17:00'
    const openParts = openTime.split(':').map(Number);
    const closeParts = closeTime.split(':').map(Number);
    
    let currentSlot = new Date(reqDate);
    currentSlot.setHours(openParts[0], openParts[1], 0, 0);

    const endTime = new Date(reqDate);
    endTime.setHours(closeParts[0], closeParts[1], 0, 0);

    const slotDuration = settings.slotDurationMinutes || 60;
    const buffer = settings.bufferTimeMinutes || 30;
    const requiredTotalMinutes = durationMinutes || 60;

    // Fetch existing bookings for the day
    const dayStart = startOfDay(reqDate);
    const dayEnd = endOfDay(reqDate);
    const existingBookings = await Booking.find({
      clientId,
      preferredDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] }
    });

    const availableSlots = [];

    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, slotDuration);
      
      // Check if slot overlaps with close time
      if (isAfter(slotEnd, endTime)) break;

      const slotStartStr = format(currentSlot, 'HH:mm');
      const slotEndStr = format(slotEnd, 'HH:mm');

      // Check overlap
      const hasOverlap = existingBookings.some(b => {
        return (slotStartStr >= b.preferredStartTime && slotStartStr < b.preferredEndTime) ||
               (slotEndStr > b.preferredStartTime && slotEndStr <= b.preferredEndTime) ||
               (slotStartStr <= b.preferredStartTime && slotEndStr >= b.preferredEndTime);
      });

      // Buffer consideration is missing here for simplicity, but can be added. 

      if (!hasOverlap) {
        availableSlots.push({ startTime: slotStartStr, endTime: slotEndStr });
      }

      currentSlot = addMinutes(currentSlot, slotDuration + buffer);
    }

    res.json({ availableSlots });

  } catch (error) {
    res.status(500).json({ error: 'Check availability failed' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, preferredEndTime, notes, clientId: bodyClientId } = req.body;
    const clientId = bodyClientId || req.headers['x-client-id'] || 'plumber-001';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) usage = await UsageStats.create({ clientId, month: currentMonth });

    const { Client } = await import('../models');
    const clientRecord = await Client.findOne({ clientId });
    let storageLimit = clientRecord?.storageLimitBytes || 52428800;

    // Unlimited for super admin
    if (clientId === 'plumber-001') {
      storageLimit = 999999999999;
    }

    if (usage.storageBytesUsed >= storageLimit) {
      return res.status(403).json({ error: 'Storage Limit reached. Cannot accept new bookings right now.' });
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
      return res.status(400).json({ error: 'This time slot is no longer available. Please choose another.' });
    }

    const booking = await Booking.create({
      clientId,
      fullName, phoneNumber, email, serviceSelection,
      preferredDate: startOfDay(new Date(preferredDate)),
      preferredStartTime, preferredEndTime, notes,
      status: 'pending' // need manual confirm or auto
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

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Booking submission failed' });
  }
});

export default router;
