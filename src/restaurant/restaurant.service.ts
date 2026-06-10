import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }

    return {
      message: 'Restaurant profile retrieved successfully',
      restaurant,
    };
  }

  async createProfile(userId: string, dto: CreateRestaurantDto) {
    // Check if user already has a restaurant profile
    const existing = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Restaurant profile already exists for this user. Use PUT to update.');
    }

    // Prepare data, parsing string coordinates if necessary
    const data = this.prepareData(dto);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        ...data,
        userId,
      },
    });

    return {
      message: 'Restaurant profile created successfully',
      restaurant,
    };
  }

  async updateProfile(userId: string, dto: UpdateRestaurantDto) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Restaurant profile not found. Use POST to create it first.');
    }

    const data = this.prepareData(dto);

    const restaurant = await this.prisma.restaurant.update({
      where: { userId },
      data,
    });

    return {
      message: 'Restaurant profile updated successfully',
      restaurant,
    };
  }

  async getPublicProfile(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
        showPublicly: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found or is not currently public');
    }

    return {
      message: 'Public restaurant profile retrieved successfully',
      restaurant,
    };
  }

  async listPublicRestaurants() {
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        showPublicly: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      message: 'Public restaurants retrieved successfully',
      count: restaurants.length,
      restaurants,
    };
  }

  private prepareData(dto: any) {
    const data: any = { ...dto };

    // Parse latitude & longitude to floats if they are strings
    if (dto.latitude !== undefined && dto.latitude !== null && dto.latitude !== '') {
      data.latitude = parseFloat(dto.latitude);
    }
    if (dto.longitude !== undefined && dto.longitude !== null && dto.longitude !== '') {
      data.longitude = parseFloat(dto.longitude);
    }

    // Ensure numeric fields are correctly typed
    if (dto.deliveryRadius !== undefined && dto.deliveryRadius !== null) {
      data.deliveryRadius = parseFloat(dto.deliveryRadius);
    }
    if (dto.deliveryFee !== undefined && dto.deliveryFee !== null) {
      data.deliveryFee = parseFloat(dto.deliveryFee);
    }
    if (dto.minOrder !== undefined && dto.minOrder !== null) {
      data.minOrder = parseFloat(dto.minOrder);
    }
    if (dto.freeDeliveryThreshold !== undefined && dto.freeDeliveryThreshold !== null) {
      data.freeDeliveryThreshold = parseFloat(dto.freeDeliveryThreshold);
    }

    return data;
  }
}
