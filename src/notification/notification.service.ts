import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(restaurantId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { notificationPreferences: true },
    });

    const preferences = restaurant?.notificationPreferences as any[];
    if (!preferences || !Array.isArray(preferences)) {
      return notifications;
    }

    const prefMap = preferences.reduce((acc, curr) => {
      acc[curr.key] = curr.enabled;
      return acc;
    }, {} as Record<string, boolean>);

    return notifications.filter((notif) => {
      let key = '';
      if (notif.title === 'New Order Received') key = 'newOrder';
      else if (notif.title === 'Order Cancelled') key = 'orderCancelled';
      else if (notif.title === 'Daily Order Update') key = 'dailyOrderUpdate';
      else if (notif.title === 'New Review Received') key = 'newReview';
      else if (notif.title === 'Customer Complaint Submitted') key = 'complaintSubmitted';
      else if (notif.title === 'Offer Expiring Soon') key = 'offerExpiring';
      else if (notif.title === 'Payment Received') key = 'paymentReceived';
      else if (notif.title === 'Failed Transaction') key = 'failedTransaction';
      else if (notif.title === 'Daily Revenue Summary') key = 'revenueSummary';
      else if (notif.title === 'Account Security Alert' || notif.title === 'Food Item Out of Stock') key = 'securityAlert';

      if (key && prefMap[key] === false) {
        return false;
      }
      return true;
    });
  }

  async getPreferences(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { notificationPreferences: true },
    });
    return restaurant?.notificationPreferences || null;
  }

  async savePreferences(restaurantId: string, preferences: any[]) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { notificationPreferences: preferences },
    });
  }

  async markAllRead(restaurantId: string) {
    await this.prisma.notification.updateMany({
      where: { restaurantId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  async toggleRead(id: string, restaurantId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, restaurantId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: !existing.read },
    });

    return updated;
  }

  async clearRead(restaurantId: string) {
    await this.prisma.notification.deleteMany({
      where: { restaurantId, read: true },
    });
    return { success: true };
  }

  async deleteNotification(id: string, restaurantId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, restaurantId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { success: true };
  }
}
