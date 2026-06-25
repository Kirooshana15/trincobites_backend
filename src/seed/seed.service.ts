import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    this.logger.log('Starting automatic database seeding...');
    try {
      await this.seedAdmin();
      await this.seedRestaurants();
      await this.sanitizeOffers();
      await this.linkFamilyComboToFriedRice();
      this.logger.log('Database seeding process completed.');
    } catch (error) {
      this.logger.error('Error during database seeding:', error);
    }
  }

  private async seedAdmin() {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set in environment. Skipping admin seeding.');
      return;
    }

    const trimmedEmail = email.trim();

    // Check if user already exists by email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      this.logger.log(`Admin user already exists with email: ${trimmedEmail}. Skipping.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await this.prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        fullName: 'System Admin',
      },
    });

    this.logger.log(`Admin user created successfully: ${admin.email}`);
  }

  private async seedRestaurants() {
    const restaurants = [
      {
        nameKey: 'RESTAURANT1_NAME',
        emailKey: 'RESTAURANT1_EMAIL',
        phoneKey: 'RESTAURANT1_PHONE',
        passwordKey: 'RESTAURANT1_PASSWORD',
      },
      {
        nameKey: 'RESTAURANT2_NAME',
        emailKey: 'RESTAURANT2_EMAIL',
        phoneKey: 'RESTAURANT2_PHONE',
        passwordKey: 'RESTAURANT2_PASSWORD',
      },
      {
        nameKey: 'RESTAURANT3_NAME',
        emailKey: 'RESTAURANT3_EMAIL',
        phoneKey: 'RESTAURANT3_PHONE',
        passwordKey: 'RESTAURANT3_PASSWORD',
      },
    ];

    for (const rest of restaurants) {
      const name = this.configService.get<string>(rest.nameKey)?.trim();
      const email = this.configService.get<string>(rest.emailKey)?.trim();
      const phone = this.configService.get<string>(rest.phoneKey)?.trim();
      const password = this.configService.get<string>(rest.passwordKey);

      if (!name || !email || !phone || !password) {
        this.logger.warn(`Missing configurations for ${rest.nameKey}. Skipping seeding for this restaurant.`);
        continue;
      }

      // Check if user already exists by email
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.log(`Restaurant user already exists with email: ${email}. Skipping.`);
        continue;
      }

      // Check if phone number is already in use
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        this.logger.warn(`Phone number ${phone} is already in use by user ${existingPhone.email}. Skipping restaurant creation for ${name}.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User with Role.RESTAURANT (profile is created manually later)
      const user = await this.prisma.user.create({
        data: {
          fullName: name,
          email,
          phone,
          password: hashedPassword,
          role: Role.RESTAURANT,
        },
      });

      this.logger.log(`Restaurant user created successfully: ${user.email}`);
    }
  }

  private async sanitizeOffers() {
    this.logger.log('Sanitizing Offer table categoryId and menuItemId empty strings to null...');
    try {
      const offersToUpdate = await this.prisma.offer.findMany({
        where: {
          OR: [
            { menuItemId: '' },
            { categoryId: '' }
          ]
        }
      });

      for (const offer of offersToUpdate) {
        await this.prisma.offer.update({
          where: { id: offer.id },
          data: {
            menuItemId: offer.menuItemId === '' ? null : offer.menuItemId,
            categoryId: offer.categoryId === '' ? null : offer.categoryId
          }
        });
      }
      this.logger.log(`Sanitized ${offersToUpdate.length} offers.`);
    } catch (error) {
      this.logger.error('Error sanitizing offers:', error);
    }
  }

  private async linkFamilyComboToFriedRice() {
    this.logger.log('Checking and linking Family Combo Deal to Chicken Fried Rice...');
    try {
      const offer = await this.prisma.offer.findFirst({
        where: {
          title: {
            contains: 'Family Combo Deal',
            mode: 'insensitive'
          }
        }
      });

      if (!offer) {
        this.logger.warn('Family Combo Deal offer not found.');
        return;
      }

      this.logger.log(`Found Family Combo Deal offer with ID: ${offer.id}, owned by restaurant: ${offer.restaurantId}`);

      const friedRice = await this.prisma.menuItem.findFirst({
        where: {
          restaurantId: offer.restaurantId,
          name: {
            contains: 'Chicken Fried Rice',
            mode: 'insensitive'
          }
        }
      });

      if (!friedRice) {
        this.logger.warn('Chicken Fried Rice menu item not found for this restaurant. Cannot link Family Combo Deal.');
        return;
      }

      this.logger.log(`Found Chicken Fried Rice with ID: ${friedRice.id}`);

      if (offer.menuItemId !== friedRice.id) {
        await this.prisma.offer.update({
          where: { id: offer.id },
          data: {
            menuItemId: friedRice.id
          }
        });
        this.logger.log(`Successfully linked/updated Family Combo Deal to Chicken Fried Rice (ID: ${friedRice.id})!`);
      } else {
        this.logger.log('Family Combo Deal is already linked to the correct restaurant-specific menu item.');
      }
    } catch (error) {
      this.logger.error('Error linking Family Combo Deal:', error);
    }
  }

}
