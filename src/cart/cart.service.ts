import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { OfferType } from '@prisma/client';

function getLocalTime(date: Date = new Date()): Date {
  // Sri Lanka timezone is UTC+5:30.
  // We explicitly add 5.5 hours to the UTC timestamp so that the database stores the correct local Sri Lankan time.
  const SRI_LANKA_OFFSET = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + SRI_LANKA_OFFSET);
}


@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async calculatePrice(
    userId: string,
    menuItemId: string,
    quantity: number,
    selectedSize: string | null,
    selectedExtras: any[] = [],
    appliedOfferId: string | null,
  ): Promise<number> {
    if (!menuItemId) {
      throw new NotFoundException('Menu item not found');
    }
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    // Determine the base price based on selected size or variant
    let basePrice = menuItem.price;
    if (selectedSize === 'Large') {
      basePrice = basePrice * 1.5;
    } else if (selectedSize && menuItem.variants) {
      const variants = menuItem.variants as any[];
      const variant = variants.find((v) => v.name === selectedSize);
      if (variant) {
        basePrice = variant.price;
      }
    }

    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);

    if (!appliedOfferId) {
      return basePrice + extrasTotal;
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id: appliedOfferId },
    });

    if (!offer || offer.status !== 'ACTIVE') {
      return basePrice + extrasTotal;
    }

    if (offer.menuItemId && offer.menuItemId.trim() !== '' && offer.menuItemId !== menuItemId) {
      return basePrice + extrasTotal;
    }

    if (offer.categoryId && offer.categoryId.trim() !== '' && menuItem.categoryId !== offer.categoryId) {
      return basePrice + extrasTotal;
    }

    // Extract potential values from discountBadge (e.g. "50% OFF", "Rs. 100 Off")
    const badge = offer.discountBadge || '';
    const pctMatch = badge.match(/(\d+)%/);
    const percent = pctMatch ? parseInt(pctMatch[1], 10) : 0;
    
    const amtMatch = badge.match(/Rs\.?\s*(\d+)/i) || badge.match(/(\d+)\s*Off/i);
    const flatAmount = amtMatch ? parseFloat(amtMatch[1]) : 0;

    let itemTotal = 0;

    switch (offer.type) {
      case 'BUY_ONE_GET_ONE': {
        // Buy 1 Get 1 Free: pay for Math.ceil(quantity / 2) items, and full extras for all items
        const payableQty = Math.ceil(quantity / 2);
        itemTotal = (basePrice * payableQty) + (extrasTotal * quantity);
        break;
      }

      case 'PERCENTAGE_DISCOUNT':
      case 'ITEM_DISCOUNT':
      case 'DISCOUNT':
      case 'FESTIVAL_OFFER':
      case 'HAPPY_HOUR':
      case 'WEEKEND_OFFER': {
        // Apply percentage discount on base item price
        const discountMultiplier = (100 - (percent || 10)) / 100; // default to 10%
        itemTotal = ((basePrice * discountMultiplier) + extrasTotal) * quantity;
        break;
      }

      case 'FIXED_AMOUNT_DISCOUNT': {
        // Flat discount on the base item price
        const discountVal = flatAmount || 100; // default to 100
        const discountedBase = Math.max(0, basePrice - discountVal);
        itemTotal = (discountedBase + extrasTotal) * quantity;
        break;
      }

      case 'COMBO_DEAL': {
        // Combo deals
        if (percent > 0) {
          const discountMultiplier = (100 - percent) / 100;
          itemTotal = ((basePrice * discountMultiplier) + extrasTotal) * quantity;
        } else if (flatAmount > 0) {
          const discountedBase = Math.max(0, basePrice - flatAmount);
          itemTotal = (discountedBase + extrasTotal) * quantity;
        } else {
          itemTotal = ((basePrice * 0.85) + extrasTotal) * quantity; // 15% discount
        }
        break;
      }

      default:
        itemTotal = (basePrice + extrasTotal) * quantity;
        break;
    }

    const fs = require('fs');
    try {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        menuItemId,
        quantity,
        selectedSize,
        selectedExtras,
        appliedOfferId,
        basePrice,
        extrasTotal,
        offerId: offer?.id || null,
        offerStatus: offer?.status || null,
        offerType: offer?.type || null,
        offerBadge: offer?.discountBadge || null,
        percent: typeof percent !== 'undefined' ? percent : null,
        itemTotal,
        result: itemTotal / quantity,
      };
      fs.appendFileSync('debug_cart.jsonl', JSON.stringify(debugInfo) + '\n');
    } catch (e) {}

    return itemTotal / quantity;
  }

  async findActiveOfferForMenuItem(restaurantId: string, menuItemId: string): Promise<any | null> {
    if (!menuItemId) return null;
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });
    if (!menuItem) return null;

    const now = new Date();
    const todayStr = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");

    const daysMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const currentDay = daysMap[now.getDay()];

    const offers = await this.prisma.offer.findMany({
      where: {
        restaurantId,
        status: "ACTIVE",
        startDate: { lte: todayStr },
        endDate: { gte: todayStr },
      },
    });

    const activeOffers = offers.filter(o => o.activeDays.includes(currentDay as any));

    const liveOffers = activeOffers.filter(offer => {
      if (!offer.startTime || !offer.endTime) return true;
      try {
        const parseTimeToMinutes = (t: string) => {
          const [time, period] = t.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = parseTimeToMinutes(offer.startTime);
        const endMinutes = parseTimeToMinutes(offer.endTime);

        if (startMinutes < endMinutes) {
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
      } catch (e) {
        return true;
      }
    });

    const itemOffer = liveOffers.find(o => o.menuItemId && o.menuItemId.trim() !== '' && o.menuItemId === menuItemId);
    if (itemOffer) return itemOffer;

    if (menuItem.categoryId) {
      const catOffer = liveOffers.find(o => o.categoryId && o.categoryId.trim() !== '' && o.categoryId === menuItem.categoryId);
      if (catOffer) return catOffer;
    }

    const storeOffer = liveOffers.find(o => (!o.menuItemId || o.menuItemId.trim() === '') && (!o.categoryId || o.categoryId.trim() === ''));
    return storeOffer || null;
  }

  async getCart(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        menuItem: true,
        appliedOffer: true,
        restaurant: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const {
      menuItemId,
      restaurantId,
      quantity = 1,
      selectedSize,
      selectedExtras = [],
      instructions,
      appliedOfferId,
    } = dto;

    // Check if cart contains items from a different restaurant
    const allCartItems = await this.prisma.cartItem.findMany({
      where: { userId },
    });
    if (allCartItems.length > 0 && allCartItems[0].restaurantId !== restaurantId) {
      throw new ConflictException('Cart contains items from another restaurant');
    }

    let finalOfferId = appliedOfferId;
    if (!finalOfferId) {
      const activeOffer = await this.findActiveOfferForMenuItem(restaurantId, menuItemId);
      if (activeOffer) {
        finalOfferId = activeOffer.id;
      }
    }

    // Fetch existing cart items to find a matching one (same menu item, size, and extras)
    const existingItems = await this.prisma.cartItem.findMany({
      where: {
        userId,
        menuItemId,
      },
    });

    const isExtrasEqual = (a: any, b: any) => {
      const extrasA = Array.isArray(a) ? a : [];
      const extrasB = Array.isArray(b) ? b : [];
      if (extrasA.length !== extrasB.length) return false;

      const sortedA = [...extrasA].sort((x, y) => x.name.localeCompare(y.name));
      const sortedB = [...extrasB].sort((x, y) => x.name.localeCompare(y.name));

      return sortedA.every(
        (val, index) =>
          val.name === sortedB[index].name && val.price === sortedB[index].price,
      );
    };

    const duplicate = existingItems.find(
      (item) =>
        item.selectedSize === (selectedSize || null) &&
        isExtrasEqual(item.selectedExtras, selectedExtras),
    );

    if (duplicate) {
      // Merge by updating quantity and recalculate customPrice
      const newQuantity = duplicate.quantity + quantity;
      
      let mergedOfferId = duplicate.appliedOfferId || finalOfferId;
      if (!mergedOfferId) {
        const activeOffer = await this.findActiveOfferForMenuItem(restaurantId, menuItemId);
        if (activeOffer) {
          mergedOfferId = activeOffer.id;
        }
      }

      const newPrice = await this.calculatePrice(
        userId,
        menuItemId,
        newQuantity,
        duplicate.selectedSize,
        duplicate.selectedExtras as any[],
        mergedOfferId || null,
      );

      return this.prisma.cartItem.update({
        where: { id: duplicate.id },
        data: {
          quantity: newQuantity,
          instructions: instructions !== undefined ? instructions : duplicate.instructions,
          customPrice: newPrice,
          appliedOfferId: mergedOfferId || null,
          updatedAt: getLocalTime(),
        },
        include: {
          menuItem: true,
          appliedOffer: true,
          restaurant: true,
        },
      });
    }

    // Calculate initial price on backend
    const calculatedPrice = await this.calculatePrice(
      userId,
      menuItemId,
      quantity,
      selectedSize || null,
      selectedExtras || [],
      finalOfferId || null,
    );

    // Otherwise, create a new cart item
    const localNow = getLocalTime();
    return this.prisma.cartItem.create({
      data: {
        userId,
        menuItemId,
        restaurantId,
        quantity,
        selectedSize: selectedSize || null,
        selectedExtras: selectedExtras as any,
        instructions: instructions || null,
        customPrice: calculatedPrice,
        appliedOfferId: finalOfferId || null,
        createdAt: localNow,
        updatedAt: localNow,
      },
      include: {
        menuItem: true,
        appliedOffer: true,
        restaurant: true,
      },
    });
  }

  async updateCartItem(userId: string, id: string, dto: UpdateCartItemDto) {
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Cart item not found');
    }

    // If new quantity is 0 or less, remove the item
    if (dto.quantity !== undefined && dto.quantity <= 0) {
      return this.removeCartItem(userId, id);
    }

    // Determine values for recalculation
    const finalSize = dto.selectedSize !== undefined ? dto.selectedSize : existing.selectedSize;
    const finalExtras = dto.selectedExtras !== undefined ? dto.selectedExtras : (existing.selectedExtras as any[] || []);
    const newQuantity = dto.quantity !== undefined ? dto.quantity : existing.quantity;

    let finalOfferId = existing.appliedOfferId;
    if (!finalOfferId) {
      const activeOffer = await this.findActiveOfferForMenuItem(existing.restaurantId, existing.menuItemId);
      if (activeOffer) {
        finalOfferId = activeOffer.id;
      }
    }

    const newPrice = await this.calculatePrice(
      userId,
      existing.menuItemId,
      newQuantity,
      finalSize,
      finalExtras,
      finalOfferId || null,
    );

    return this.prisma.cartItem.update({
      where: { id },
      data: {
        quantity: dto.quantity !== undefined ? dto.quantity : undefined,
        instructions: dto.instructions !== undefined ? dto.instructions : undefined,
        selectedSize: dto.selectedSize !== undefined ? dto.selectedSize : undefined,
        selectedExtras: dto.selectedExtras !== undefined ? (dto.selectedExtras as any) : undefined,
        customPrice: newPrice,
        appliedOfferId: finalOfferId || null,
        updatedAt: getLocalTime(),
      },
      include: {
        menuItem: true,
        appliedOffer: true,
        restaurant: true,
      },
    });
  }

  async removeCartItem(userId: string, id: string) {
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id },
    });

    return {
      message: 'Cart item removed successfully',
      id,
    };
  }

  async clearCart(userId: string) {
    const deleteResult = await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    return {
      message: 'Cart cleared successfully',
      count: deleteResult.count,
    };
  }
}
