import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async calculateLoyaltyScore(userId: string): Promise<string> {
    const deliveredCount = await this.prisma.order.count({
      where: {
        userId,
        status: OrderStatus.DELIVERED,
      },
    });

    if (deliveredCount <= 1) return 'New';
    if (deliveredCount <= 3) return 'Bronze';
    if (deliveredCount <= 7) return 'Gold';
    return 'Diamond VIP';
  }

  private formatReviewResponse(review: any): any {
    if (!review) return null;

    const customerName = review.user?.fullName || 'Guest Customer';
    const initials = customerName
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Get order history count for loyalty
    const deliveredCount = review.user?.orders?.length ?? 0;
    let loyaltyScore = 'Bronze';
    if (deliveredCount <= 1) loyaltyScore = 'New';
    else if (deliveredCount <= 3) loyaltyScore = 'Bronze';
    else if (deliveredCount <= 7) loyaltyScore = 'Gold';
    else loyaltyScore = 'Diamond VIP';

    const replies = Array.isArray(review.replies) ? review.replies : [];

    return {
      id: review.id,
      restaurantId: review.restaurantId,
      customerName,
      avatar: initials,
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt.toISOString().split('T')[0],
      foodRating: review.foodRating ?? review.rating,
      serviceRating: review.serviceRating ?? review.rating,
      verified: true,
      orderId: review.order?.orderNumber || review.orderId || '',
      dishName: review.dishName || 'Food Item',
      dishImage: review.images && Array.isArray(review.images) && review.images.length > 0 ? review.images[0] : undefined,
      images: review.images || [],
      sentiment: review.sentiment,
      reported: review.reported,
      reportReason: review.reportReason || undefined,
      hidden: review.hidden,
      bookmarked: review.bookmarked,
      pinned: review.pinned,
      loyaltyScore,
      replies,
      createdAt: review.createdAt,
    };
  }

  private async updateRestaurantStats(restaurantId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        restaurantId,
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
      where: { id: restaurantId },
      data: {
        rating: averageRating,
        reviewsCount: reviewsCount,
      },
    });
  }

  async createReview(userId: string, dto: CreateReviewDto) {
    // Find the order and verify it is delivered and belongs to the user
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: dto.orderId },
          { orderNumber: dto.orderId }
        ],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('You can only review your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can only review orders that have been successfully delivered');
    }

    // Check if review already exists for this order
    const existingReview = await this.prisma.review.findFirst({
      where: { orderId: order.id },
    });

    if (existingReview) {
      throw new BadRequestException('A review has already been submitted for this order');
    }

    // Determine sentiment
    const sentiment = dto.rating >= 4 ? 'Positive' : dto.rating <= 2 ? 'Negative' : 'Neutral';

    // Fallback dish name if not provided
    const dishName = dto.dishName || order.items?.[0]?.name || 'Food Item';

    const review = await this.prisma.review.create({
      data: {
        restaurantId: dto.restaurantId,
        userId,
        orderId: order.id,
        rating: dto.rating,
        comment: dto.comment || 'No comment provided.',
        images: dto.images || [],
        foodRating: dto.foodRating ?? dto.rating,
        serviceRating: dto.serviceRating ?? dto.rating,
        dishName,
        sentiment,
        replies: [],
      },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    // Update restaurant stats
    await this.updateRestaurantStats(dto.restaurantId);

    // Create notification for the restaurant
    await this.prisma.notification.create({
      data: {
        restaurantId: dto.restaurantId,
        userId: userId,
        type: 'customers',
        title: 'New Review Received',
        description: `A customer submitted a ${dto.rating}-star review: "${(dto.comment || 'No comment provided.').slice(0, 60)}..."`,
      },
    });

    return this.formatReviewResponse(review);
  }

  async getReviewsForRestaurant(restaurantId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { restaurantId },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => this.formatReviewResponse(r));
  }

  async getReviewByOrderId(orderId: string) {
    // Get review associated with orderId
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId }
        ],
      },
    });
    if (!order) return null;

    const review = await this.prisma.review.findUnique({
      where: { orderId: order.id },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    return this.formatReviewResponse(review);
  }

  async replyToReview(reviewId: string, restaurantId: string, text: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.restaurantId !== restaurantId) {
      throw new BadRequestException('You can only reply to reviews for your own restaurant');
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let currentReplies = Array.isArray(review.replies) ? (review.replies as any[]) : [];

    if (currentReplies.length > 0) {
      currentReplies[0] = {
        ...currentReplies[0],
        text,
        timestamp,
      };
    } else {
      currentReplies = [
        {
          avatar: 'TB',
          timestamp,
          text,
        },
      ];
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        replies: currentReplies,
      },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    return this.formatReviewResponse(updated);
  }

  async togglePin(reviewId: string, restaurantId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.restaurantId !== restaurantId) {
      throw new BadRequestException('Review not found or unauthorized');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { pinned: !review.pinned },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    return this.formatReviewResponse(updated);
  }

  async toggleBookmark(reviewId: string, restaurantId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.restaurantId !== restaurantId) {
      throw new BadRequestException('Review not found or unauthorized');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { bookmarked: !review.bookmarked },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    return this.formatReviewResponse(updated);
  }

  async reportReview(reviewId: string, restaurantId: string, reason: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.restaurantId !== restaurantId) {
      throw new BadRequestException('Review not found or unauthorized');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        reported: true,
        reportReason: reason,
      },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    return this.formatReviewResponse(updated);
  }

  async hideReview(reviewId: string, restaurantId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.restaurantId !== restaurantId) {
      throw new BadRequestException('Review not found or unauthorized');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { hidden: true },
      include: {
        user: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED }
            }
          }
        },
        order: true,
      },
    });

    await this.updateRestaurantStats(restaurantId);

    return this.formatReviewResponse(updated);
  }

  async deleteReview(reviewId: string, restaurantId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.restaurantId !== restaurantId) {
      throw new BadRequestException('Review not found or unauthorized');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    await this.updateRestaurantStats(restaurantId);

    return { success: true };
  }
}
