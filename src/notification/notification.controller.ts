import { Controller, Get, Put, Patch, Delete, Req, UseGuards, Param, BadRequestException, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Req() req) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.getNotifications(restaurantId);
  }

  @Get('preferences')
  async getPreferences(@Req() req) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.getPreferences(restaurantId);
  }

  @Put('preferences')
  async savePreferences(@Req() req, @Body() preferences: any[]) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.savePreferences(restaurantId, preferences);
  }

  @Patch('mark-all-read')
  async markAllRead(@Req() req) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.markAllRead(restaurantId);
  }

  @Patch(':id/read')
  async toggleRead(@Req() req, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.toggleRead(id, restaurantId);
  }

  @Delete('clear-read')
  async clearRead(@Req() req) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.clearRead(restaurantId);
  }

  @Delete(':id')
  async deleteNotification(@Req() req, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('User is not associated with any restaurant');
    }
    return this.notificationService.deleteNotification(id, restaurantId);
  }
}
