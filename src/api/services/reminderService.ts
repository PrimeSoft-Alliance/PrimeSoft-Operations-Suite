import { Queue, Worker, Job } from './queueService';
import { Booking, Settings } from '../models';
import { sendEmail } from '../email';

export const reminderQueue = new Queue('booking-reminders');

const reminderWorker = new Worker('booking-reminders', async (job: Job) => {
  const { bookingId, type } = job.data;
  const booking = await Booking.findById(bookingId);
  if (!booking) return { status: 'skipped, booking not found' };
  
  if (booking.status === 'cancelled') {
    return { status: 'skipped, booking cancelled' };
  }

  const settings = await Settings.findOne({ clientId: booking.clientId });
  const bizName = settings?.businessName || 'Our Business';

  const customerHtml = `
    <p>Hello ${booking.fullName},</p>
    <p>This is a gentle reminder for your upcoming booking for <strong>${booking.serviceSelection}</strong> on <strong>${booking.preferredDate.toDateString()}</strong> at <strong>${booking.preferredStartTime}</strong>.</p>
    <p>We look forward to seeing you!</p>
    <br/>
    <p>Best regards,<br/>${bizName} Team</p>
  `;

  await sendEmail(
    booking.email,
    `Reminder: Upcoming Booking with ${bizName}`,
    `This is a reminder for your booking on ${booking.preferredDate} at ${booking.preferredStartTime}.`,
    customerHtml,
    booking.clientId
  );

  return { status: 'success', sentTo: booking.email };
}, { concurrency: 5 });

export const cancelReminders = async (bookingId: string) => {
  const jobs = await reminderQueue.getJobs(['delayed', 'waiting']);
  for (const job of jobs) {
    if (job.data?.bookingId === bookingId) {
      await job.remove();
    }
  }
};

export const scheduleReminders = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return;

  // Clear existing reminders
  await cancelReminders(bookingId);

  // default to 24h & 1h reminders if configured
  const rules = booking.reminderRules && booking.reminderRules.length > 0 ? booking.reminderRules : ['24h', '1h'];

  try {
    const bookingDateStr = booking.preferredDate.toISOString().split('T')[0];
    const startDate = new Date(`${bookingDateStr}T${booking.preferredStartTime}:00Z`);

    for (const rule of rules) {
      let delayMs = 0;
      if (rule === '24h') delayMs = 24 * 60 * 60 * 1000;
      if (rule === '1h') delayMs = 60 * 60 * 1000;
      if (rule.endsWith('m')) {
        delayMs = parseInt(rule.replace('m', '')) * 60 * 1000;
      }
      
      const fireAt = startDate.getTime() - delayMs;
      const delay = fireAt - Date.now();

      if (delay > 0) { // Only schedule future reminders
        await reminderQueue.add(`reminder-${rule}-${booking._id}`, {
          bookingId: booking._id,
          type: rule
        }, {
          delay,
          removeOnComplete: true,
          removeOnFail: false
        });
      }
    }
  } catch (err) {
    console.error('Failed to schedule reminders:', err);
  }
};
