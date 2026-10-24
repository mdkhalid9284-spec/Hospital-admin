import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { INotification, UserRole } from '../models/types.js';

export class NotificationService {
  public static send(data: {
    recipientId: string;
    recipientRole: UserRole;
    title: string;
    message: string;
    type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
    link?: string;
  }): INotification {
    const notif: INotification = {
      id: `notif-${uuidv4().substring(0, 8)}`,
      recipientId: data.recipientId,
      recipientRole: data.recipientRole,
      title: data.title,
      message: data.message,
      type: data.type || 'INFO',
      isRead: false,
      link: data.link,
      createdAt: new Date().toISOString(),
    };

    db.notifications.unshift(notif);
    return notif;
  }

  public static getForUser(userId: string): INotification[] {
    return db.notifications.filter((n) => n.recipientId === userId);
  }

  public static markAsRead(notificationId: string): void {
    const notif = db.notifications.find((n) => n.id === notificationId);
    if (notif) notif.isRead = true;
  }
}
