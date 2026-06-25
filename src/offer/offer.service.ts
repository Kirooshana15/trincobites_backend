import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { OfferStatus, OfferType, OperationalDay, CustomerSegment, OrderChannel } from '@prisma/client';

@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) { }

  private async getRestaurantForUser(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }
    return restaurant;
  }

  // Helper mappings
  private mapStatusToDb(status?: string): OfferStatus {
    switch (status?.toLowerCase()) {
      case 'active': return OfferStatus.ACTIVE;
      case 'scheduled': return OfferStatus.SCHEDULED;
      case 'draft': return OfferStatus.DRAFT;
      case 'expired': return OfferStatus.EXPIRED;
      default: return OfferStatus.ACTIVE;
    }
  }

  private mapStatusToFrontend(status: OfferStatus): string {
    switch (status) {
      case OfferStatus.ACTIVE: return 'Active';
      case OfferStatus.SCHEDULED: return 'Scheduled';
      case OfferStatus.DRAFT: return 'Draft';
      case OfferStatus.EXPIRED: return 'Expired';
      default: return 'Active';
    }
  }

  private mapTypeToDb(type?: string): OfferType {
    const norm = type?.replace(/[\s_-]+/g, '').toLowerCase() || '';
    switch (norm) {
      case 'percentagediscount':
      case 'percentage':
        return OfferType.PERCENTAGE_DISCOUNT;
      case 'fixedamountdiscount':
      case 'fixedamount':
        return OfferType.FIXED_AMOUNT_DISCOUNT;
      case 'freedelivery':
        return OfferType.FREE_DELIVERY;
      case 'buyonegetone':
      case 'bogo':
      case 'buyonegetonefree':
        return OfferType.BUY_ONE_GET_ONE;
      case 'combodeal':
      case 'combo':
        return OfferType.COMBO_DEAL;
      case 'discount':
        return OfferType.DISCOUNT;
      case 'itemdiscount':
        return OfferType.ITEM_DISCOUNT;
      case 'firstorderdiscount':
      case 'firstorder':
      case 'firstorderonly':
        return OfferType.FIRST_ORDER_DISCOUNT;
      case 'festivaloffer':
      case 'festival':
        return OfferType.FESTIVAL_OFFER;
      case 'happyhour':
        return OfferType.HAPPY_HOUR;
      case 'weekendoffer':
      case 'weekend':
        return OfferType.WEEKEND_OFFER;
      case 'minimumorder':
      case 'minorder':
        return OfferType.MINIMUM_ORDER;
      case 'promo':
        return OfferType.FESTIVAL_OFFER;
      default:
        return OfferType.DISCOUNT;
    }
  }

  private mapTypeToFrontend(type: OfferType): string {
    switch (type) {
      case OfferType.PERCENTAGE_DISCOUNT: return 'Percentage Discount';
      case OfferType.FIXED_AMOUNT_DISCOUNT: return 'Fixed Amount Discount';
      case OfferType.FREE_DELIVERY: return 'Free Delivery';
      case OfferType.BUY_ONE_GET_ONE: return 'Buy One Get One';
      case OfferType.COMBO_DEAL: return 'Combo Deal';
      case OfferType.DISCOUNT: return 'Discount';
      case OfferType.ITEM_DISCOUNT: return 'Item Discount';
      case OfferType.FIRST_ORDER_DISCOUNT: return 'First Order Discount';
      case OfferType.FESTIVAL_OFFER: return 'Festival Offer';
      case OfferType.HAPPY_HOUR: return 'Happy Hour';
      case OfferType.WEEKEND_OFFER: return 'Weekend Offer';
      case OfferType.MINIMUM_ORDER: return 'Minimum Order';
      default: return 'Discount';
    }
  }

  private mapDayToDb(day: string): OperationalDay {
    switch (day.toLowerCase().slice(0, 3)) {
      case 'mon': return OperationalDay.MON;
      case 'tue': return OperationalDay.TUE;
      case 'wed': return OperationalDay.WED;
      case 'thu': return OperationalDay.THU;
      case 'fri': return OperationalDay.FRI;
      case 'sat': return OperationalDay.SAT;
      case 'sun': return OperationalDay.SUN;
      default: return OperationalDay.MON;
    }
  }

  private mapDayToFrontend(day: OperationalDay): string {
    switch (day) {
      case OperationalDay.MON: return 'Mon';
      case OperationalDay.TUE: return 'Tue';
      case OperationalDay.WED: return 'Wed';
      case OperationalDay.THU: return 'Thu';
      case OperationalDay.FRI: return 'Fri';
      case OperationalDay.SAT: return 'Sat';
      case OperationalDay.SUN: return 'Sun';
      default: return 'Mon';
    }
  }

  private mapSegmentToDb(segment?: string): CustomerSegment {
    const norm = segment?.toLowerCase() || '';
    if (norm.includes('first')) return CustomerSegment.FIRST_ORDER_ONLY;
    return CustomerSegment.ALL_CUSTOMERS;
  }

  private mapSegmentToFrontend(segment: CustomerSegment): string {
    switch (segment) {
      case CustomerSegment.ALL_CUSTOMERS: return 'All';
      case CustomerSegment.FIRST_ORDER_ONLY: return 'FirstOrder';
      default: return 'All';
    }
  }

  private mapChannelToDb(channel?: string): OrderChannel {
    const norm = channel?.toLowerCase() || '';
    if (norm.includes('delivery')) return OrderChannel.DELIVERY_ONLY;
    if (norm.includes('pickup')) return OrderChannel.PICKUP_ONLY;
    return OrderChannel.ALL_ORDERS;
  }

  private mapChannelToFrontend(channel: OrderChannel): string {
    switch (channel) {
      case OrderChannel.ALL_ORDERS: return 'All';
      case OrderChannel.DELIVERY_ONLY: return 'Delivery';
      case OrderChannel.PICKUP_ONLY: return 'Pickup';
      default: return 'All';
    }
  }

  private getEmojiForType(type: OfferType): string {
    switch (type) {
      case OfferType.FREE_DELIVERY: return '🚚';
      case OfferType.BUY_ONE_GET_ONE: return '🍕';
      case OfferType.COMBO_DEAL: return '🍔';
      case OfferType.FESTIVAL_OFFER: return '🎉';
      case OfferType.HAPPY_HOUR: return '🕒';
      case OfferType.WEEKEND_OFFER: return '🍻';
      case OfferType.PERCENTAGE_DISCOUNT: return '🏷️';
      case OfferType.FIXED_AMOUNT_DISCOUNT: return '💵';
      case OfferType.ITEM_DISCOUNT: return '🍕';
      case OfferType.MINIMUM_ORDER: return '🛍️';
      case OfferType.DISCOUNT: return '🏷️';
      case OfferType.FIRST_ORDER_DISCOUNT: return '🎁';
      default: return '🎁';
    }
  }

  private getGradientForId(id: string): string {
    const gradients = [
      "from-emerald-500/10 to-teal-500/15 border-emerald-500/20",
      "from-rose-500/10 to-purple-500/15 border-rose-500/20",
      "from-amber-500/10 to-orange-500/15 border-orange-500/20",
      "from-blue-500/10 to-indigo-500/15 border-blue-500/20",
    ];
    let hash = 0;
    const str = id || "";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  private mapDbOfferToFrontend(offer: any) {
    if (!offer) return null;
    return {
      ...offer,
      status: this.mapStatusToFrontend(offer.status),
      type: offer.type,
      emoji: this.getEmojiForType(offer.type),
      bgGradient: this.getGradientForId(offer.id),
      activeDays: offer.activeDays.map((d: OperationalDay) => this.mapDayToFrontend(d)),
      targetCustomer: this.mapSegmentToFrontend(offer.targetCustomer),
      channel: this.mapChannelToFrontend(offer.channel),
    };
  }

  async create(userId: string, dto: CreateOfferDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    const activeDaysDb = dto.activeDays?.map(d => this.mapDayToDb(d)) || [];

    const offer = await this.prisma.offer.create({
      data: {
        restaurantId: restaurant.id,
        title: dto.title,
        description: dto.description,
        discountBadge: dto.discountBadge,
        activeDays: activeDaysDb,
        startDate: dto.startDate,
        endDate: dto.endDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timeLabel: dto.timeLabel,
        status: this.mapStatusToDb(dto.status),
        type: this.mapTypeToDb(dto.type),
        bannerImage: dto.bannerImage,
        targetCustomer: this.mapSegmentToDb(dto.targetCustomer),
        channel: this.mapChannelToDb(dto.channel),
        minOrderAmount: dto.minOrderAmount ?? 0,
        menuItemId: (dto.menuItemId && dto.menuItemId.trim() !== "") ? dto.menuItemId : null,
        categoryId: (dto.categoryId && dto.categoryId.trim() !== "") ? dto.categoryId : null,
        metadata: dto.metadata ?? null,
      },
    });

    return this.mapDbOfferToFrontend(offer);
  }

  async findAll(userId: string, search?: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const whereClause: any = {
      restaurantId: restaurant.id,
    };

    if (search && search.trim() !== '') {
      whereClause.OR = [
        {
          title: {
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
        {
          discountBadge: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const offers = await this.prisma.offer.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return offers.map(o => this.mapDbOfferToFrontend(o));
  }

  async findOne(userId: string, id: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const offer = await this.prisma.offer.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return this.mapDbOfferToFrontend(offer);
  }

  async update(userId: string, id: string, dto: UpdateOfferDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    // Verify ownership and existence
    const existing = await this.prisma.offer.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Offer not found');
    }

    const activeDaysDb = dto.activeDays ? dto.activeDays.map(d => this.mapDayToDb(d)) : undefined;

    const offer = await this.prisma.offer.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        discountBadge: dto.discountBadge,
        activeDays: activeDaysDb,
        startDate: dto.startDate,
        endDate: dto.endDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timeLabel: dto.timeLabel,
        status: dto.status ? this.mapStatusToDb(dto.status) : undefined,
        type: dto.type ? this.mapTypeToDb(dto.type) : undefined,
        bannerImage: dto.bannerImage,
        targetCustomer: dto.targetCustomer ? this.mapSegmentToDb(dto.targetCustomer) : undefined,
        channel: dto.channel ? this.mapChannelToDb(dto.channel) : undefined,
        minOrderAmount: dto.minOrderAmount,
        menuItemId: dto.menuItemId !== undefined ? ((dto.menuItemId && dto.menuItemId.trim() !== "") ? dto.menuItemId : null) : undefined,
        categoryId: dto.categoryId !== undefined ? ((dto.categoryId && dto.categoryId.trim() !== "") ? dto.categoryId : null) : undefined,
        metadata: dto.metadata !== undefined ? (dto.metadata ?? null) : undefined,
      },
    });

    return this.mapDbOfferToFrontend(offer);
  }

  async remove(userId: string, id: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    // Verify ownership and existence
    const existing = await this.prisma.offer.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Offer not found');
    }

    await this.prisma.offer.delete({
      where: { id },
    });

    return {
      message: 'Offer deleted successfully',
      id,
    };
  }

  async search(userId: string, query: string) {
    return this.findAll(userId, query);
  }

  async findPublicByRestaurant(restaurantId: string) {
    const offers = await this.prisma.offer.findMany({
      where: {
        restaurantId,
        status: {
          in: [OfferStatus.ACTIVE, OfferStatus.SCHEDULED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return offers.map(o => this.mapDbOfferToFrontend(o));
  }

  async findAllPublic() {
    const offers = await this.prisma.offer.findMany({
      where: {
        status: {
          in: [OfferStatus.ACTIVE, OfferStatus.SCHEDULED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return offers.map(o => this.mapDbOfferToFrontend(o));
  }
}
