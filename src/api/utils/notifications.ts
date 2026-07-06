import { Notification } from '../models';

export async function createSystemNotification(clientId: string, {
  title,
  message,
  type = 'system',
  relatedId,
  link
}: {
  title: string;
  message: string;
  type?: 'system' | 'lead' | 'booking' | 'alert';
  relatedId?: string;
  link?: string;
}) {
  try {
    const notif = await Notification.create({
      clientId,
      title,
      message,
      type,
      relatedId,
      link
    });

    console.log(`[NOTIFICATION] Created in DB for client ${clientId}: ${title}`);

    const io = (global as any).io;
    if (io) {
      io.to(clientId).emit('notification', {
        _id: notif._id,
        clientId,
        title,
        message,
        type,
        relatedId,
        link,
        createdAt: notif.createdAt
      });
    }
    return notif;
  } catch (err) {
    console.error('Failed to create system notification:', err);
    return null;
  }
}
