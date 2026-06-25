import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  private async getRestaurantForUser(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }
    return restaurant;
  }

  private async getOrCreateCategory(restaurantId: string, name: string) {
    if (!name || name.trim() === '') {
      return null;
    }
    const trimmedName = name.trim();
    // Try to find the category
    let category = await this.prisma.category.findUnique({
      where: {
        restaurantId_name: {
          restaurantId,
          name: trimmedName,
        },
      },
    });

    // If not found, auto-create it!
    if (!category) {
      category = await this.prisma.category.create({
        data: {
          restaurantId,
          name: trimmedName,
          iconName: 'Pizza', // Default icon
          displayOrder: 1,
          status: 'Active',
        },
      });
    }
    return category;
  }

  async create(userId: string, dto: CreateMenuItemDto) {
    const restaurant = await this.getRestaurantForUser(userId);
    
    // Check if a menu item with this name already exists in the restaurant
    const existing = await this.prisma.menuItem.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Menu item with name "${dto.name}" already exists in your menu`);
    }

    const category = await this.getOrCreateCategory(restaurant.id, dto.category);

    return this.prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: category?.id ?? null,
        name: dto.name,
        description: dto.description,
        image: dto.image,
        price: dto.price,
        stock: dto.stock ?? 0,
        isAvailable: dto.isAvailable ?? true,
        tags: dto.tags ?? [],
        variants: dto.variants ?? [],
        addons: dto.addons ?? [],
        timeAvailability: dto.timeAvailability || 'All Day',
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(userId: string, search?: string, categoryName?: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const whereClause: any = {
      restaurantId: restaurant.id,
    };

    if (categoryName && categoryName !== 'All') {
      whereClause.category = {
        name: categoryName,
      };
    }

    if (search && search.trim() !== '') {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.menuItem.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(userId: string, id: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
      include: {
        category: true,
      },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item not found`);
    }

    return menuItem;
  }

  async update(userId: string, id: string, dto: UpdateMenuItemDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    // Verify ownership and existence
    const existing = await this.prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Menu item not found`);
    }

    // Check name collision if changing name
    if (dto.name && dto.name !== existing.name) {
      const collision = await this.prisma.menuItem.findFirst({
        where: {
          restaurantId: restaurant.id,
          name: {
            equals: dto.name,
            mode: 'insensitive',
          },
          NOT: {
            id,
          },
        },
      });
      if (collision) {
        throw new ConflictException(`Menu item with name "${dto.name}" already exists in your menu`);
      }
    }

    const updateData: any = {
      name: dto.name,
      description: dto.description,
      image: dto.image,
      price: dto.price,
      stock: dto.stock,
      isAvailable: dto.isAvailable,
      tags: dto.tags,
      variants: dto.variants,
      addons: dto.addons,
      timeAvailability: dto.timeAvailability,
    };

    if (dto.category !== undefined) {
      const category = await this.getOrCreateCategory(restaurant.id, dto.category);
      updateData.categoryId = category?.id ?? null;
    }

    const willBeOutOfStock = (dto.stock !== undefined && dto.stock === 0 && existing.stock > 0) ||
                             (dto.isAvailable !== undefined && dto.isAvailable === false && existing.isAvailable === true);

    if (willBeOutOfStock) {
      await this.prisma.notification.create({
        data: {
          restaurantId: restaurant.id,
          type: 'security',
          title: 'Food Item Out of Stock',
          description: `Menu item "${dto.name || existing.name}" is out of stock.`,
        },
      });
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const existing = await this.prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Menu item not found`);
    }

    // Delete reviews associated with this dish
    await this.prisma.review.deleteMany({
      where: {
        restaurantId: restaurant.id,
        dishName: {
          equals: existing.name,
          mode: 'insensitive',
        },
      },
    });

    await this.prisma.menuItem.delete({
      where: { id },
    });

    // Update restaurant stats
    const reviews = await this.prisma.review.findMany({
      where: {
        restaurantId: restaurant.id,
        hidden: false,
      },
      select: {
        rating: true,
      },
    });

    const reviewsCount = reviews.length;
    const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviewsCount > 0 ? parseFloat((ratingSum / reviewsCount).toFixed(2)) : 0;

    await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        rating: averageRating,
        reviewsCount: reviewsCount,
      },
    });

    return {
      message: 'Menu item deleted successfully',
      id,
    };
  }

  async findPublicByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
