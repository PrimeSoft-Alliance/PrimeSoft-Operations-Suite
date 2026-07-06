import { Booking, Settings } from '../models';
import { calendarService } from './calendarService';
import { sendEmail } from '../email';
import { parseISO, parse } from 'date-fns';

export async function processBookingCalendarInvite(bookingId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const settings = await Settings.findOne({ clientId: booking.clientId });
  const businessName = settings?.businessName || 'the Business';
  const providerEmail = booking.providerEmail || settings?.contactEmail || settings?.email;

  // Assuming `preferredDate` is a Date object marking start of day. 
  // Let's parse the exact start and end times
  let start: Date, end: Date;
  try {
    if (!booking.preferredDate || isNaN(booking.preferredDate.getTime())) {
      throw new Error('Invalid preferredDate');
    }
    const dateStr = booking.preferredDate.toISOString().split('T')[0];
    start = parse(`${dateStr} ${booking.preferredStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
    end = parse(`${dateStr} ${booking.preferredEndTime}`, 'yyyy-MM-dd HH:mm', new Date());
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date parsing');
    }
  } catch (e) {
    // Fallback if parsing fails
    start = new Date();
    start.setHours(start.getHours() + 24);
    end = new Date(start);
    end.setHours(end.getHours() + 1);
  }

  const icsString = calendarService.generateICS({
    uid: booking.calendarInviteId || `booking-${booking._id}@ominirep.com`,
    start,
    end,
    title: booking.title || `Booking: ${booking.serviceSelection}`,
    description: booking.description || `Booking for ${booking.serviceSelection}\nCustomer: ${booking.fullName}\nNotes: ${booking.notes || 'None'}`,
    location: booking.meetingLocation,
    organizerName: businessName,
    organizerEmail: providerEmail,
    attendeeName: booking.fullName,
    attendeeEmail: booking.email,
    status: booking.status === 'cancelled' ? 'CANCELLED' : (booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'),
    timezone: booking.timezone,
    reminderRules: booking.reminderRules
  });

  const attachments = [{
    filename: 'invite.ics',
    content: icsString,
    contentType: 'text/calendar; method=REQUEST'
  }];

  if (!booking.calendarInviteId) {
    booking.calendarInviteId = `booking-${booking._id}@ominirep.com`;
    await booking.save();
  }

  return { icsString, attachments, businessName, providerEmail };
}
