import ical, { ICalCalendarMethod } from 'ical-generator';
import { Booking, Settings } from '../models';
import path from 'path';
import fs from 'fs';
import { startOfDay, endOfDay, addMinutes, format } from 'date-fns';
import { sendEmail } from '../email';
import { processBookingCalendarInvite } from './bookingCalendarService';
import { telegramManager } from './telegramManager';
import { conversationService } from './conversationService';
import { telnyxService } from './telnyxService';

export class BookingService {
  async generateICal(bookingId: string) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const calendar = ical({ name: 'OminiRep Booking' });
    calendar.method(ICalCalendarMethod.REQUEST);

    const start = new Date(booking.preferredDate);
    const [hours, minutes] = booking.preferredStartTime.split(':').map(Number);
    start.setHours(hours, minutes);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (booking.duration || 60));

    calendar.createEvent({
      id: booking._id.toString(),
      start,
      end,
      summary: booking.title || `${booking.serviceSelection} with ${booking.fullName}`,
      description: booking.description || booking.notes || 'Scheduled via OminiRep',
      location: booking.meetingLocation || 'Online',
      url: booking.meetingLink || '',
      organizer: {
        name: 'OminiRep Assistant',
        email: 'no-reply@ominirep.com'
      },
      attendees: [
        { name: booking.fullName, email: booking.email, rsvp: true }
      ]
    });

    const uploadsDir = path.join(process.cwd(), 'uploads', 'cals');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `booking_${bookingId}.ics`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, calendar.toString());

    booking.icsPath = `/uploads/cals/${filename}`;
    await booking.save();

    return booking.icsPath;
  }

  async updateStatus(bookingId: string, status: string, notes?: string) {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: { status, notes: notes || '' } },
      { new: true }
    );
    
    if (status === 'confirmed') {
      await this.generateICal(bookingId);
      // Send SMTP and platform notification upon status change confirmation
      await this.sendBookingNotifications(bookingId);
    } else if (status === 'rejected' || status === 'cancelled') {
      const { notificationService } = await import('./notificationService');
      await notificationService.sendBookingCancelled(booking!.clientId, booking);
    }

    return booking;
  }

  async getUpcomingAvailability(clientId: string, daysLimit = 4): Promise<string> {
    try {
      const settings = await Settings.findOne({ clientId });
      if (!settings) return "No business settings configured.";

      let result = "Upcoming Available Slots:\n";
      const now = new Date();

      for (let i = 0; i < daysLimit; i++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + i);
        
        const dayOfWeek = targetDate.getDay();
        const workingHour = settings.workingHours?.find((wh: any) => wh.day === dayOfWeek);

        const dateStr = targetDate.toISOString().split('T')[0];
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

        if (!workingHour || !workingHour.isOpen || !workingHour.openTime || !workingHour.closeTime) {
          result += `- ${dayName} (${dateStr}): Fully Booked / Closed\n`;
          continue;
        }

        const { openTime, closeTime } = workingHour;
        const openParts = openTime.split(':').map(Number);
        const closeParts = closeTime.split(':').map(Number);

        if (openParts.length < 2 || closeParts.length < 2 || isNaN(openParts[0]) || isNaN(closeParts[0])) {
          continue;
        }

        let currentSlot = new Date(targetDate);
        currentSlot.setHours(openParts[0], openParts[1], 0, 0);

        const endTime = new Date(targetDate);
        endTime.setHours(closeParts[0], closeParts[1], 0, 0);

        const slotDuration = settings.slotDurationMinutes || 60;
        const buffer = settings.bufferTimeMinutes || 30;

        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);
        const existingBookings = await Booking.find({
          clientId,
          preferredDate: { $gte: dayStart, $lte: dayEnd },
          status: { $in: ['pending', 'confirmed'] }
        });

        const daySlots = [];
        let iterations = 0;
        while (currentSlot < endTime && iterations < 100) {
          iterations++;
          const slotEnd = addMinutes(currentSlot, slotDuration);
          if (slotEnd > endTime) break;

          // If targetDate is today, check if slot is in the past
          if (i === 0 && currentSlot < now) {
            currentSlot = addMinutes(currentSlot, slotDuration + buffer);
            continue;
          }

          const slotStartStr = format(currentSlot, 'HH:mm');
          const slotEndStr = format(slotEnd, 'HH:mm');

          const hasOverlap = existingBookings.some(b => {
            if (!b.preferredStartTime || !b.preferredEndTime) return false;
            return (slotStartStr >= b.preferredStartTime && slotStartStr < b.preferredEndTime) ||
                   (slotEndStr > b.preferredStartTime && slotEndStr <= b.preferredEndTime) ||
                   (slotStartStr <= b.preferredStartTime && slotEndStr >= b.preferredEndTime);
          });

          if (!hasOverlap) {
            daySlots.push(slotStartStr);
          }

          currentSlot = addMinutes(currentSlot, slotDuration + buffer);
        }

        if (daySlots.length > 0) {
          result += `- ${dayName} (${dateStr}): Available times: [${daySlots.join(', ')}]\n`;
        } else {
          result += `- ${dayName} (${dateStr}): Fully Booked\n`;
        }
      }

      return result;
    } catch (err) {
      console.error('getUpcomingAvailability error:', err);
      return "Failed to load availability.";
    }
  }

  async sendBookingNotifications(bookingId: string, sourcePlatform?: string) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) return;

      const settings = await Settings.findOne({ clientId: booking.clientId });
      const businessName = settings?.businessName || 'the Business';
      const providerEmail = settings?.contactEmail || settings?.email || '';

      // Generate Calendar Invite
      let attachments: any[] = [];
      try {
        const calData = await processBookingCalendarInvite(booking._id.toString());
        attachments = calData.attachments;
      } catch (err) {
        console.warn('[CALENDAR] Failed to generate ICS on notification dispatch:', err);
      }

      const formattedDate = new Date(booking.preferredDate).toDateString();

      // 1. Send Email via Notification Service
      const { notificationService } = await import('./notificationService');
      await notificationService.sendBookingCreated(booking.clientId, booking);

      // 3. Send message via the platform used to contact the AI, except for widget
      if (sourcePlatform && sourcePlatform !== 'widget' && sourcePlatform !== 'web' && sourcePlatform !== 'ai_orchestrator') {
        const displayId = booking.tracking_id || `BKG-${booking._id.toString().slice(-5).toUpperCase()}`;
        const summaryMsg = `📅 Hello ${booking.fullName}, here is the summary of your booking confirmed via OminiRep.\n\n🆔 Booking ID: ${displayId}\n(Please keep this ID if you need to modify or cancel your booking.)\n\n👤 Name: ${booking.fullName}\n📧 Email: ${booking.email}\n🛠️ Service: ${booking.serviceSelection}\n🗓️ Date: ${formattedDate}\n⏰ Time: ${booking.preferredStartTime}\n📝 Notes: ${booking.notes || 'No specific notes added'}\n\nWe have successfully scheduled this for you and look forward to providing exceptional service. We will be in touch shortly!`;

        if (sourcePlatform === 'telegram' && booking.customerId) {
          try {
            // Find contact or telegram identity to get chatId
            const { TelegramIdentity } = await import('../models');
            const tgId = await (TelegramIdentity as any).findOne({ clientId: booking.clientId, contactId: booking.customerId });
            if (tgId?.chatId) {
              await telegramManager.sendMessage(booking.clientId, tgId.chatId, { text: summaryMsg });
            } else {
              // Try to find the conversation and send to customerJid
              const { Conversation } = await import('../models');
              const conv = await (Conversation as any).findOne({ clientId: booking.clientId, contactId: booking.customerId, platform: 'telegram' });
              if (conv?.customerJid) {
                await telegramManager.sendMessage(booking.clientId, conv.customerJid, { text: summaryMsg });
              }
            }
          } catch (err) {
            console.error('[NOTIFY] Telegram booking notification failed:', err);
          }
        } else if (sourcePlatform === 'whatsapp' && booking.customerId) {
          try {
            const { Contact } = await import('../models');
            const contact = await Contact.findById(booking.customerId);
            if (contact?.whatsappJid) {
              await conversationService.sendOutbound({
                clientId: booking.clientId,
                contactId: booking.customerId.toString(),
                channel: 'whatsapp',
                text: summaryMsg
              });
            }
          } catch (err) {
            console.error('[NOTIFY] WhatsApp booking notification failed:', err);
          }
        } else if (sourcePlatform === 'sms' && booking.customerId) {
          try {
            const { Contact } = await import('../models');
            const contact = await Contact.findById(booking.customerId);
            if (contact?.phone) {
              await telnyxService.sendSMS(booking.clientId, 'OMNIREP', contact.phone, summaryMsg);
            }
          } catch (err) {
            console.error('[NOTIFY] SMS booking notification failed:', err);
          }
        }
      }
    } catch (err) {
      console.error('[NOTIFY] Unified sendBookingNotifications failed:', err);
    }
  }
}

export const bookingService = new BookingService();
