import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  async send(@Body() body: any) {
    const { userId, type, title, message, metadata } = body;
    return this.notificationService.sendNotification(userId, type, title, message, metadata);
  }

  @Patch('preferences/:userId')
  async updatePrefs(@Param('userId') userId: string, @Body() data: any) {
    return this.notificationService.updatePreference(userId, data);
  }
}
