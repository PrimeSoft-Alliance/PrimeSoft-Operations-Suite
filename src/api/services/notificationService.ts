import { sendEmail } from '../email';
import { Booking, Ticket, Inquiry, Client, Contact, Settings } from '../models';
import pino from 'pino';
import { generateGoogleCalendarLink } from '../utils/calendar';

const logger = pino({ name: 'NotificationService' });

const recentlyOpenedTickets = new Set<string>();

function getBeautifulEmailHtml(title: string, greeting: string, contentHtml: string, actionUrl?: string, actionText?: string, businessName: string = "OminiRep") {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025);
    }
    .header {
      background-color: #4f46e5;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 32px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .info-box {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
    }
    .info-row {
      display: table;
      width: 100%;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      display: table-cell;
      color: #64748b;
      font-weight: 500;
      width: 40%;
      padding-right: 16px;
      vertical-align: top;
    }
    .info-value {
      display: table-cell;
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      width: 60%;
      vertical-align: top;
    }
    .button-container {
      text-align: center;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      font-weight: 600;
      font-size: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #4338ca;
    }
    .footer {
      background-color: #f8fafc;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #94a3b8;
      font-size: 13px;
      margin: 0 0 8px 0;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    
    @media only screen and (max-width: 600px) {
      .wrapper {
        padding: 0 !important;
      }
      .container {
        border-radius: 0 !important;
        border: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .content {
        padding: 32px 20px !important;
      }
      .header {
        padding: 24px 20px !important;
      }
      .info-box {
        padding: 20px 16px !important;
      }
      .info-row {
        display: block !important;
        margin-bottom: 16px !important;
      }
      .info-label, .info-value {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }
      .info-value {
        margin-top: 4px !important;
      }
      .btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${businessName}</h1>
      </div>
      <div class="content">
        <h2>${greeting}</h2>
        ${contentHtml}
        
        ${actionUrl && actionText ? `
          <div class="button-container">
            <a href="${actionUrl}" class="btn" target="_blank">${actionText}</a>
          </div>
        ` : ''}
      </div>
      <div class="footer">
        <p>This is an automated notification from ${businessName}.</p>
        <p>Powering seamless client support & business operations.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export class NotificationService {

  private async getClientEmail(clientId: string): Promise<string | null> {
    const client = await Client.findOne({ clientId }).lean();
    if (client?.email) return client.email;
    const settings = await Settings.findOne({ clientId }).lean();
    return settings?.adminEmail || null;
  }

  private async getBusinessDetails(clientId: string) {
    try {
      const settings = await Settings.findOne({ clientId }).lean();
      const businessName = settings?.businessName || 'OminiRep Client';
      const notifSettings = settings?.notificationSettings || {
        booking: true,
        ticket: true,
        inquiries: true,
        missedCalls: true,
        newLeads: true,
        contact: true,
        messages: true,
        others: true
      };
      return { businessName, notifSettings };
    } catch (err) {
      logger.error(`Error getting business details: ${err}`);
      return {
        businessName: 'OminiRep Client',
        notifSettings: {
          booking: true,
          ticket: true,
          inquiries: true,
          missedCalls: true,
          newLeads: false,
          contact: false,
          messages: false,
          others: false
        }
      };
    }
  }

  /**
   * Booking Notifications
   */
  async sendBookingCreated(clientId: string, booking: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = booking.email;
    const dateStr = new Date(booking.preferredDate).toDateString();
    const timeStr = booking.preferredStartTime;

    const calendarLink = generateGoogleCalendarLink({
      title: `${booking.serviceSelection} with ${businessName}`,
      dateStr: booking.preferredDate,
      timeStr: booking.preferredStartTime,
      timezone: booking.timezone
    });

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Booking Confirmed: ${booking.serviceSelection}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${booking.fullName}, your booking is confirmed!`,
        `
        <p>Your booking has been successfully scheduled. We look forward to providing you with exceptional service!</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Service</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">Time</span><span class="info-value">${timeStr}</span></div>
          <div class="info-row"><span class="info-label">Timezone</span><span class="info-value">${booking.timezone || 'UTC'}</span></div>
        </div>
        `,
        calendarLink,
        'Add to Google Calendar',
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${booking.fullName},\n\nYour booking for ${booking.serviceSelection} on ${dateStr} at ${timeStr} is confirmed.\n\nThank you!`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking created to customer: ${e.message}`));
    }

    // To Client (If booking notifications toggle is active)
    if (clientEmail && (notifSettings.booking ?? true)) {
      const subject = `New Booking Alert: ${booking.fullName}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>You have received a new customer appointment booking on OminiRep.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${booking.fullName}</span></div>
          <div class="info-row"><span class="info-label">Customer Email</span><span class="info-value">${booking.email || '—'}</span></div>
          <div class="info-row"><span class="info-label">Service Selected</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">Scheduled Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">Scheduled Time</span><span class="info-value">${timeStr}</span></div>
        </div>
        `,
        calendarLink,
        'Add to Google Calendar',
        businessName
      );
      await sendEmail(
        clientEmail,
        subject,
        `You have a new booking from ${booking.fullName} for ${booking.serviceSelection} on ${dateStr} at ${timeStr}.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking created to client: ${e.message}`));
    }
  }

  async sendBookingCancelled(clientId: string, booking: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = booking.email;
    const dateStr = new Date(booking.preferredDate).toDateString();
    const timeStr = booking.preferredStartTime;

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Booking Cancelled: ${booking.serviceSelection}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${booking.fullName}, your booking has been cancelled.`,
        `
        <p>As requested, your booking for <b>${booking.serviceSelection}</b> on <b>${dateStr}</b> has been cancelled.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Service</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #ef4444; font-weight: bold;">CANCELLED</span></div>
        </div>
        <p>If you wish to rebook, please visit our website again. We look forward to serving you in the future.</p>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${booking.fullName},\n\nYour booking for ${booking.serviceSelection} on ${dateStr} has been cancelled.\n\nThank you!`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking cancelled to customer: ${e.message}`));
    }

    // To Client (If booking notifications toggle is active)
    if (clientEmail && (notifSettings.booking ?? true)) {
      const subject = `Booking Cancelled: ${booking.fullName}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>An appointment booking was cancelled by the customer or administrator.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${booking.fullName}</span></div>
          <div class="info-row"><span class="info-label">Service Selected</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">Scheduled Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #ef4444; font-weight: bold;">CANCELLED</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Cancelled] ${booking.fullName} - ${booking.serviceSelection}`,
        `The booking from ${booking.fullName} for ${booking.serviceSelection} on ${dateStr} at ${timeStr} was cancelled.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking cancelled to client: ${e.message}`));
    }
  }

  async sendBookingRescheduled(clientId: string, booking: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = booking.email;
    const dateStr = new Date(booking.preferredDate).toDateString();
    const timeStr = booking.preferredStartTime;

    const calendarLink = generateGoogleCalendarLink({
      title: `${booking.serviceSelection} with ${businessName}`,
      dateStr: booking.preferredDate,
      timeStr: booking.preferredStartTime,
      timezone: booking.timezone
    });

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Booking Rescheduled: ${booking.serviceSelection}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${booking.fullName}, your booking has been rescheduled.`,
        `
        <p>Your appointment has been successfully updated to a new time. Please find your updated timing below.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Service</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">New Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">New Time</span><span class="info-value">${timeStr}</span></div>
          <div class="info-row"><span class="info-label">Timezone</span><span class="info-value">${booking.timezone || 'UTC'}</span></div>
        </div>
        `,
        calendarLink,
        'Add to Google Calendar',
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${booking.fullName},\n\nYour booking for ${booking.serviceSelection} has been rescheduled to ${dateStr} at ${timeStr}.\n\nThank you!`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking rescheduled to customer: ${e.message}`));
    }

    // To Client (If booking notifications toggle is active)
    if (clientEmail && (notifSettings.booking ?? true)) {
      const subject = `Booking Rescheduled Alert: ${booking.fullName}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A customer booking has been rescheduled to a new date and time.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${booking.fullName}</span></div>
          <div class="info-row"><span class="info-label">Service Selected</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">New Scheduled Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">New Scheduled Time</span><span class="info-value">${timeStr}</span></div>
        </div>
        `,
        calendarLink,
        'Add to Google Calendar',
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Rescheduled] ${booking.fullName} - ${booking.serviceSelection}`,
        `The booking from ${booking.fullName} for ${booking.serviceSelection} has been rescheduled to ${dateStr} at ${timeStr}.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking rescheduled to client: ${e.message}`));
    }
  }

  /**
   * Ticket Notifications
   */
  async sendTicketOpened(clientId: string, ticket: any) {
    const ticketIdStr = (ticket._id || ticket.id)?.toString();
    if (ticketIdStr) {
      if (recentlyOpenedTickets.has(ticketIdStr)) {
        logger.info(`[NOTIF-DEDUPE] Ticket ${ticketIdStr} already sent opened notification recently, skipping duplicate email.`);
        return;
      }
      recentlyOpenedTickets.add(ticketIdStr);
      // Clean up from memory after 10 seconds
      setTimeout(() => recentlyOpenedTickets.delete(ticketIdStr), 10000);
    }

    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = ticket.customerEmail;

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Support Ticket Created: #${ticket.ticketId || ticket._id || 'Support'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${ticket.customerName}, we have received your request.`,
        `
        <p>We have successfully received your support request and opened a ticket for you. Our team is reviewing it and will get back to you shortly.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Category</span><span class="info-value">${ticket.category || 'General Support'}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #4f46e5; font-weight: bold;">OPEN</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${ticket.customerName},\n\nWe have received your support request and opened a ticket for you.\n\nTicket Subject: ${ticket.subject}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket opened to customer: ${e.message}`));
    }

    // To Client (If ticket notifications toggle is active)
    if (clientEmail && (notifSettings.ticket ?? true)) {
      const subject = `New Support Ticket: ${ticket.subject}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A new support ticket has been logged in your OminiRep dashboard.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${ticket.customerName}</span></div>
          <div class="info-row"><span class="info-label">Customer Email</span><span class="info-value">${ticket.customerEmail}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Priority</span><span class="info-value" style="text-transform: uppercase;">${ticket.priority || 'medium'}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[New Ticket] ${ticket.subject}`,
        `A new support ticket was opened by ${ticket.customerName}.\n\nSubject: ${ticket.subject}\n\nPlease check the dashboard.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket opened to client: ${e.message}`));
    }
  }

  async sendTicketClosed(clientId: string, ticket: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = ticket.customerEmail;

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Support Ticket Resolved: #${ticket.ticketId || ticket._id || 'Support'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${ticket.customerName}, your ticket has been resolved.`,
        `
        <p>Your support ticket has been marked as resolved and closed. We hope we resolved your issue effectively!</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #10b981; font-weight: bold;">CLOSED</span></div>
        </div>
        <p>Thank you for using our service. If you have any further questions, feel free to open a new ticket.</p>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${ticket.customerName},\n\nYour support ticket "${ticket.subject}" has been marked as closed.\n\nThank you!`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket closed to customer: ${e.message}`));
    }

    // To Client (If ticket notifications toggle is active)
    if (clientEmail && (notifSettings.ticket ?? true)) {
      const subject = `Ticket Closed Alert: #${ticket.ticketId || 'Support'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>The support ticket has been resolved and closed.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${ticket.customerName}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #10b981; font-weight: bold;">CLOSED</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Resolved] Ticket Closed: ${ticket.subject}`,
        `Ticket #${ticket.ticketId || ticket._id} has been marked as closed.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket closed to client: ${e.message}`));
    }
  }

  async sendTicketReopened(clientId: string, ticket: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = ticket.customerEmail;

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Support Ticket Reopened: ${ticket.subject}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${ticket.customerName}`,
        `
        <p>Your support ticket has been successfully reopened. Our assistance team has been alerted and will resume active support on this matter.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #f59e0b; font-weight: bold;">REOPENED</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${ticket.customerName},\n\nYour support ticket "${ticket.subject}" has been reopened. Our support team will assist you shortly.\n\nThank you!`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket reopened to customer: ${e.message}`));
    }

    // To Client (If ticket notifications toggle is active)
    if (clientEmail && (notifSettings.ticket ?? true)) {
      const subject = `Ticket Reopened Alert: #${ticket.ticketId || 'Support'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>The support ticket has been reopened by the customer for further review.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${ticket.customerName}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #f59e0b; font-weight: bold;">REOPENED</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Reopened] Ticket Alert: ${ticket.subject}`,
        `Ticket #${ticket.ticketId || ticket._id} was reopened by ${ticket.customerName}.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket reopened to client: ${e.message}`));
    }
  }

  async sendBookingUpdated(clientId: string, booking: any, changeSummary: string) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = booking.email;
    const dateStr = new Date(booking.preferredDate).toDateString();
    const timeStr = booking.preferredStartTime;

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Booking Updated: ${booking.serviceSelection}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${booking.fullName}, your booking has been updated.`,
        `
        <p>Your booking for <b>${booking.serviceSelection}</b> has been updated with the following details:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 8px; font-style: italic; color: #334155;">
          "${changeSummary}"
        </div>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Service</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">Time</span><span class="info-value">${timeStr}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${booking.fullName},\n\nYour booking for ${booking.serviceSelection} has been updated: ${changeSummary}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking updated to customer: ${e.message}`));
    }

    // To Client (If booking notifications toggle is active)
    if (clientEmail && (notifSettings.booking ?? true)) {
      const subject = `Booking Updated: ${booking.fullName}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A customer booking has been updated.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${booking.fullName}</span></div>
          <div class="info-row"><span class="info-label">Service Selected</span><span class="info-value">${booking.serviceSelection}</span></div>
          <div class="info-row"><span class="info-label">Update Details</span><span class="info-value">${changeSummary}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Updated] ${booking.fullName} - ${booking.serviceSelection}`,
        `The booking from ${booking.fullName} for ${booking.serviceSelection} was updated: ${changeSummary}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send booking updated to client: ${e.message}`));
    }
  }

  async sendTicketUpdated(clientId: string, ticket: any, updateDetails: string) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);
    const customerEmail = ticket.customerEmail;

    // To Customer (Always send)
    if (customerEmail) {
      const subject = `Support Ticket Updated: #${ticket.ticketId || ticket._id || 'Support'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello ${ticket.customerName}, your ticket has been updated.`,
        `
        <p>Your support ticket has been updated with new information.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 8px; font-style: italic; color: #334155;">
          "${updateDetails}"
        </div>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        customerEmail,
        subject,
        `Hello ${ticket.customerName},\n\nYour support ticket "${ticket.subject}" has been updated: ${updateDetails}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket updated to customer: ${e.message}`));
    }

    // To Client (If ticket notifications toggle is active)
    if (clientEmail && (notifSettings.ticket ?? true)) {
      const subject = `Ticket Updated Alert: #${ticket.ticketId || 'Support'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A support ticket has been updated.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Ticket ID</span><span class="info-value">#${ticket.ticketId || ticket._id || 'Support'}</span></div>
          <div class="info-row"><span class="info-label">Customer Name</span><span class="info-value">${ticket.customerName}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${ticket.subject}</span></div>
          <div class="info-row"><span class="info-label">Update Details</span><span class="info-value">${updateDetails}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Updated] Ticket Alert: ${ticket.subject}`,
        `Ticket #${ticket.ticketId || ticket._id} has been updated: ${updateDetails}.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send ticket updated to client: ${e.message}`));
    }
  }

  /**
   * Missed Call
   */
  async sendMissedCall(clientId: string, call: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);

    if (clientEmail && (notifSettings.missedCalls ?? true)) {
      const subject = `Missed Call Alert: ${call.from}`;
      const dateStr = new Date(call.createdAt || Date.now()).toLocaleString();
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>You have missed an incoming customer call on your virtual phone system. Please review your logs to return the call.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Caller Number</span><span class="info-value">${call.from}</span></div>
          <div class="info-row"><span class="info-label">Time of Call</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: #ef4444; font-weight: bold;">UNANSWERED</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[Missed Call] from ${call.from}`,
        `You missed a call from ${call.from} at ${dateStr}.\n\nPlease review your dashboard for details.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send missed call: ${e.message}`));
    }
  }

  /**
   * New Inquiry
   */
  async sendNewInquiry(clientId: string, inquiry: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);

    if (clientEmail && (notifSettings.inquiries ?? true)) {
      const subject = `New Inquiry Alert: ${inquiry.senderEmail}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A new customer inquiry has been received via your website widget or contact channel.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Sender Email</span><span class="info-value">${inquiry.senderEmail}</span></div>
          <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${inquiry.subject || 'No Subject'}</span></div>
          <div class="info-row"><span class="info-label">Source</span><span class="info-value">${inquiry.source || 'Website Widget'}</span></div>
        </div>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 8px; font-style: italic; color: #334155;">
          "${inquiry.message || 'No message content provided.'}"
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[New Inquiry] from ${inquiry.senderEmail}`,
        `You received a new inquiry from ${inquiry.senderEmail}.\n\nSubject: ${inquiry.subject || 'No Subject'}\n\nPlease check your Shared Inbox.`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send new inquiry: ${e.message}`));
    }
  }

  /**
   * New Lead (Optional toggle, off by default)
   */
  async sendNewLead(clientId: string, lead: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);

    if (clientEmail && (notifSettings.newLeads ?? false)) {
      const subject = `New Lead Captured: ${lead.fullName || lead.name}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A new prospective customer lead has been captured and qualified by OminiRep AI.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Name</span><span class="info-value">${lead.fullName || lead.name || 'Anonymous'}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-value">${lead.email || '—'}</span></div>
          <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${lead.phone || lead.phoneNumber || '—'}</span></div>
          <div class="info-row"><span class="info-label">Source</span><span class="info-value">${lead.source || 'CRM Pipeline'}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[New Lead] ${lead.fullName || lead.name || 'Anonymous'}`,
        `New lead qualified: ${lead.fullName || lead.name || 'Anonymous'} (${lead.email || 'No email'})`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send new lead: ${e.message}`));
    }
  }

  /**
   * Contact Created/Updated (Optional toggle, off by default)
   */
  async sendContactCreated(clientId: string, contact: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);

    if (clientEmail && (notifSettings.contact ?? false)) {
      const subject = `CRM Contact Logged: ${contact.name}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A contact profile has been saved or modified in your OminiRep database.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Contact Name</span><span class="info-value">${contact.name}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-value">${contact.email || '—'}</span></div>
          <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${contact.phone || '—'}</span></div>
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[CRM Contact] ${contact.name}`,
        `CRM contact saved: ${contact.name}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send contact notification: ${e.message}`));
    }
  }

  /**
   * New Message (Optional toggle, off by default)
   */
  async sendNewMessage(clientId: string, message: any) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);

    if (clientEmail && (notifSettings.messages ?? false)) {
      const subject = `New Social Inbox Message: ${message.from || 'Customer'}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>You have received a new customer message in your shared messaging workspace.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Sender</span><span class="info-value">${message.from || 'Customer'}</span></div>
          <div class="info-row"><span class="info-label">Platform</span><span class="info-value" style="text-transform: uppercase;">${message.platform || message.type || 'Inbox'}</span></div>
        </div>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 8px; font-style: italic; color: #334155;">
          "${message.content || 'Image/Attachment only'}"
        </div>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[New Inbox Message] from ${message.from || 'Customer'}`,
        `New inbox message: ${message.content || 'Attachment received'}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send message notification: ${e.message}`));
    }
  }

  /**
   * Other Activity Alert (Optional toggle, off by default)
   */
  async sendOtherAlert(clientId: string, activityTitle: string, activityDetails: string) {
    const { businessName, notifSettings } = await this.getBusinessDetails(clientId);
    const clientEmail = await this.getClientEmail(clientId);

    if (clientEmail && (notifSettings.others ?? false)) {
      const subject = `System Alert: ${activityTitle}`;
      const html = getBeautifulEmailHtml(
        subject,
        `Hello Team`,
        `
        <p>A secondary business operation or background event occurred on your OminiRep client workspace.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Event Alert</span><span class="info-value">${activityTitle}</span></div>
          <div class="info-row"><span class="info-label">Timestamp</span><span class="info-value">${new Date().toLocaleString()}</span></div>
        </div>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 16px;">${activityDetails}</p>
        `,
        undefined,
        undefined,
        businessName
      );
      await sendEmail(
        clientEmail,
        `[System Alert] ${activityTitle}`,
        `Activity: ${activityTitle} - ${activityDetails}`,
        html,
        clientId
      ).catch(e => logger.error(`Failed to send system alert: ${e.message}`));
    }
  }
}

export const notificationService = new NotificationService();
