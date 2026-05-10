import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../schemas/notification.schema';
import { UserPreference } from '../schemas/user-preference.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(UserPreference.name) private userPreferenceModel: Model<UserPreference>,
  ) {}

  async sendNotification(userId: string, type: 'PUSH' | 'SMS' | 'EMAIL', title: string, body: string, metadata?: any) {
    // 1. Check user preferences
    const prefs = await this.userPreferenceModel.findOne({ userId }).exec();
    
    if (prefs) {
      if (type === 'PUSH' && !prefs.pushEnabled) return;
      if (type === 'SMS' && !prefs.smsEnabled) return;
      if (type === 'EMAIL' && !prefs.emailEnabled) return;
    }

    // 2. Create notification record
    const notification = new this.notificationModel({
      userId,
      type,
      title,
      body,
      metadata: metadata || {},
      sentAt: new Date(),
    });

    await notification.save();

    // 3. Delegate to provider (Mocked for now)
    try {
      this.logger.log(`Sending ${type} notification to user ${userId}: ${title}`);
      
      // Update status to SENT
      await this.notificationModel.findByIdAndUpdate(notification._id, {
        status: 'SENT',
      }).exec();
    } catch (error) {
      this.logger.error(`Failed to send notification ${notification._id}`, error);
      await this.notificationModel.findByIdAndUpdate(notification._id, {
        status: 'FAILED',
      }).exec();
    }

    return notification;
  }

  async updatePreference(userId: string, data: any) {
    return this.userPreferenceModel.findOneAndUpdate(
      { userId },
      { ...data },
      { upsert: true, new: true }
    ).exec();
  }
}
