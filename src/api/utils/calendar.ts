export function generateGoogleCalendarLink(event: {
  title: string;
  dateStr: string;
  timeStr: string;
  timezone?: string;
  durationMinutes?: number;
}): string {
  try {
    const { title, dateStr, timeStr, durationMinutes = 60 } = event;
    const startDate = new Date(`${dateStr} ${timeStr}`);
    if (isNaN(startDate.getTime())) {
      return '';
    }
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
    const text = encodeURIComponent(title);
    const details = encodeURIComponent("Booking scheduled via OminiRep.");
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
  } catch (e) {
    return '';
  }
}
