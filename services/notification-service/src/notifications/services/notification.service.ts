import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async sendNotification(userId: string, type: 'PUSH' | 'SMS' | 'EMAIL', title: string, body: string, metadata?: any) {
    // 1. Check user preferences
    const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
    
    if (prefs) {
      if (type === 'PUSH' && !prefs.pushEnabled) return;
      if (type === 'SMS' && !prefs.smsEnabled) return;
      if (type === 'EMAIL' && !prefs.emailEnabled) return;
    }

    // 2. Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        metadata: metadata || {},
      },
    });

    // 3. Delegate to provider (Mocked for now)
    try {
      this.logger.log(`Sending ${type} notification to user ${userId}: ${title}`);
      
      // Update status to SENT
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', provider: 'MOCK_PROVIDER' },
      });
    } catch (error) {
      this.logger.error(`Failed to send notification ${notification.id}`, error);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
    }

    return notification;
  }

  async updatePreference(userId: string, data: any) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
