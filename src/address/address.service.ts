import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    // If setting as default, unset previous default addresses
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        address: dto.address,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        instructions: dto.instructions,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAll(userId: string, search?: string) {
    const whereClause: any = {
      userId,
    };

    if (search && search.trim() !== '') {
      whereClause.OR = [
        {
          address: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          fullName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.address.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    // Verify existence and ownership
    const existing = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    // If updating default to true, unset others
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        address: dto.address,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        instructions: dto.instructions,
        isDefault: dto.isDefault,
      },
    });
  }

  async remove(userId: string, id: string) {
    // Verify existence and ownership
    const existing = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({
      where: { id },
    });

    return {
      message: 'Address deleted successfully',
      id,
    };
  }

  async search(userId: string, query: string) {
    return this.findAll(userId, query);
  }
}
