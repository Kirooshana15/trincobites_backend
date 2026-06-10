import { Controller, Get, Post, Put, Body, Req, UseGuards, Param } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.restaurantService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Post('profile')
  async createProfile(@Req() req: any, @Body() dto: CreateRestaurantDto) {
    const userId = req.user.id;
    return this.restaurantService.createProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateRestaurantDto) {
    const userId = req.user.id;
    return this.restaurantService.updateProfile(userId, dto);
  }

  @Get('public')
  async listPublicRestaurants() {
    return this.restaurantService.listPublicRestaurants();
  }

  @Get('public/:id')
  async getPublicProfile(@Param('id') id: string) {
    return this.restaurantService.getPublicProfile(id);
  }
}
