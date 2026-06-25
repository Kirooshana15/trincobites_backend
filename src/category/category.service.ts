import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
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

  async create(userId: string, dto: CreateCategoryDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    // Check if category name already exists for this restaurant
    const existing = await this.prisma.category.findUnique({
      where: {
        restaurantId_name: {
          restaurantId: restaurant.id,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Category with name "${dto.name}" already exists`);
    }

    return this.prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: dto.name,
        description: dto.description,
        image: dto.image,
        iconName: dto.iconName || 'Pizza',
        displayOrder: dto.displayOrder ?? 1,
        status: dto.status || 'Active',
      },
    });
  }

  async findAll(userId: string, search?: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const whereClause: any = {
      restaurantId: restaurant.id,
    };

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

    return this.prisma.category.findMany({
      where: whereClause,
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async findOne(userId: string, id: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category not found`);
    }

    return category;
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    // Verify ownership and existence
    const existing = await this.prisma.category.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Category not found`);
    }

    // Check name collision if name is changing
    if (dto.name && dto.name !== existing.name) {
      const collision = await this.prisma.category.findUnique({
        where: {
          restaurantId_name: {
            restaurantId: restaurant.id,
            name: dto.name,
          },
        },
      });
      if (collision) {
        throw new ConflictException(`Category with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        image: dto.image,
        iconName: dto.iconName,
        displayOrder: dto.displayOrder,
        status: dto.status,
      },
    });
  }

  async remove(userId: string, id: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    // Verify ownership and existence
    const existing = await this.prisma.category.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Category not found`);
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      message: 'Category deleted successfully',
      id,
    };
  }

  async findPublicByRestaurant(restaurantId: string) {
    return this.prisma.category.findMany({
      where: {
        restaurantId,
        status: 'Active',
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async findAllPublic() {
    const categories = await this.prisma.category.findMany({
      where: {
        status: 'Active',
        restaurant: {
          showPublicly: true,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const uniqueMap = new Map<string, any>();
    for (const cat of categories) {
      const key = cat.name.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          id: cat.id,
          name: cat.name.trim(),
          image: cat.image,
          iconName: cat.iconName,
        });
      }
    }
    return Array.from(uniqueMap.values());
  }
}


