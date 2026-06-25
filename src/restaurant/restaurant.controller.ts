import { Controller, Get, Post, Put, Body, Req, UseGuards, Param, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto, UpdateRestaurantDto, GetRestaurantsFilterDto } from './dto/restaurant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('restaurant')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Get('dashboard-stats')
  async getDashboardStats(@Req() req: any, @Query('timeframe') timeframe: 'today' | '7days' | '30days' = '7days') {
    const userId = req.user.id;
    return this.restaurantService.getDashboardStats(userId, timeframe);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Get('analytics')
  async getAnalyticsStats(@Req() req: any, @Query('timeframe') timeframe: 'today' | '7days' | '30days' | '12months' = '7days') {
    const userId = req.user.id;
    return this.restaurantService.getAnalyticsStats(userId, timeframe);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Get('customers')
  async getCustomers(@Req() req: any) {
    const userId = req.user.id;
    return this.restaurantService.getCustomers(userId);
  }

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return {
      message: 'Image uploaded successfully',
      url: uploadResult.secure_url,
    };
  }

  @Get('public')
  async listPublicRestaurants(@Query() filters: GetRestaurantsFilterDto) {
    return this.restaurantService.listPublicRestaurants(filters);
  }

  @Get('public/:id')
  async getPublicProfile(@Param('id') id: string) {
    return this.restaurantService.getPublicProfile(id);
  }

  @Get('db-debug')
  async getDbDebug() {
    return this.restaurantService.getDbDebug();
  }
}
