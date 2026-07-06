import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';

export interface ICalEventOptions {
  uid?: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  url?: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
  timezone?: string;
  reminderRules?: string[];
}

function formatICalDate(date: Date, isUTC: boolean = true): string {
  if (isUTC) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  // Local time format (not fully robust for strict tz, but basic fallback)
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export const calendarService = {
  generateICS(options: ICalEventOptions): string {
    const uid = options.uid || uuidv4();
    const dtstamp = formatICalDate(new Date());
    const dtstart = formatICalDate(options.start);
    const dtend = formatICalDate(options.end);
    
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OminiRep Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${this.escapeICS(options.title)}`,
      `STATUS:${options.status || 'CONFIRMED'}`
    ];

    if (options.description) {
      ics.push(`DESCRIPTION:${this.escapeICS(options.description)}`);
    }

    if (options.location) {
      ics.push(`LOCATION:${this.escapeICS(options.location)}`);
    }

    if (options.url) {
      ics.push(`URL:${options.url}`);
    }

    if (options.organizerEmail) {
      const orgName = options.organizerName ? `CN=${options.organizerName}:` : '';
      ics.push(`ORGANIZER;${orgName}mailto:${options.organizerEmail}`);
    }

    if (options.attendeeEmail) {
      const attName = options.attendeeName ? `;CN=${options.attendeeName}` : '';
      ics.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE${attName}:mailto:${options.attendeeEmail}`);
    }

    // Reminders (Alarms)
    const rules = options.reminderRules && options.reminderRules.length > 0 ? options.reminderRules : ['24h', '1h'];
    
    rules.forEach(rule => {
      let trigger = '-PT';
      if (rule === '24h') trigger += '24H';
      else if (rule === '1h') trigger += '1H';
      else if (rule.endsWith('m')) trigger += `${rule.replace('m', '')}M`;
      else if (rule.endsWith('h')) trigger += `${rule.replace('h', '')}H`;
      else trigger += '1H'; // fallback

      ics.push(
        'BEGIN:VALARM',
        `TRIGGER:${trigger}`,
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'END:VALARM'
      );
    });

    ics.push('END:VEVENT');
    ics.push('END:VCALENDAR');

    return ics.join('\r\n');
  },

  escapeICS(text: string): string {
    return text.replace(/\\/g, '\\\\')
               .replace(/;/g, '\\;')
               .replace(/,/g, '\\,')
               .replace(/\n/g, '\\n');
  }
};
