import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBankDetailsDto, UpdateRefundSettingsDto, ResolveRefundDto, CreateManualRefundDto, UpdateRefundStatusDto } from './dto/payment.dto';

export async function generateTransactionId(prismaTx: any): Promise<string> {
  let isUnique = false;
  let txId = '';
  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    txId = `TXN-${randomNum}`;
    const existing = await prismaTx.transaction.findUnique({
      where: { id: txId }
    });
    if (!existing) {
      isUnique = true;
    }
  }
  return txId;
}

export async function generatePayoutId(prismaTx: any): Promise<string> {
  let isUnique = false;
  let payoutId = '';
  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    payoutId = `PAY-${randomNum}`;
    const existing = await prismaTx.payoutRecord.findUnique({
      where: { id: payoutId }
    });
    if (!existing) {
      isUnique = true;
    }
  }
  return payoutId;
}


@Injectable()
export class PaymentService {
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

  async getDashboard(userId: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get orders delivered today and this month to compute earnings
    const todayOrders = await this.prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: 'DELIVERED',
        createdAt: { gte: startOfToday }
      }
    });

    const monthOrders = await this.prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: 'DELIVERED',
        createdAt: { gte: startOfMonth }
      }
    });

    const todayEarnings = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const monthEarnings = monthOrders.reduce((sum, o) => sum + o.total, 0);

    // Earnings breakdown
    const deliveryRevenue = monthOrders.filter(o => o.orderType === 'DELIVERY').reduce((sum, o) => sum + o.subtotal, 0);
    const pickupRevenue = monthOrders.filter(o => o.orderType === 'SELF_PICKUP').reduce((sum, o) => sum + o.subtotal, 0);
    const deliveryFee = monthOrders.filter(o => o.orderType === 'DELIVERY').reduce((sum, o) => sum + o.deliveryFee, 0);
    const taxes = monthOrders.reduce((sum, o) => sum + o.tax, 0);

    // Tips are not allowed, so tips received is 0
    const tipsReceived = 0;
    // 2% promotions contribution
    const promotionsContribution = monthOrders.reduce((sum, o) => sum + (o.subtotal * 0.02), 0);
    // 10% platform commission
    const platformCommission = (deliveryRevenue + pickupRevenue) * 0.10;

    const breakdown = {
      deliveryRevenue,
      pickupRevenue,
      tipsReceived,
      promotionsContribution,
      platformCommission,
      deliveryFee,
      taxes
    };

    // Settlement Info
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStr = `${sevenDaysAgo.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`;

    const ordersIncluded = await this.prisma.order.count({
      where: {
        restaurantId: restaurant.id,
        status: 'DELIVERED',
        paymentMethod: 'CARD',
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const transitDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expectedDateStr = transitDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const settlementInfo = {
      amount: restaurant.pendingSettlement,
      period: periodStr,
      ordersIncluded,
      expectedDate: expectedDateStr
    };

    // Bank Details
    const defaultBank = {
      holderName: '',
      bankName: '',
      accountNumber: '',
      branch: '',
      status: 'Verification Pending',
    };

    // Refund Settings
    const defaultRefundSettings = {
      refundPolicy: 'Refunds will be processed instantly if errors are validated. Dynamic reviews on complaints are performed on high value disputes above LKR 2,500. Automatic restock clearances will trigger upon approval.',
      autoApproveSmall: true,
      maxRefundLimit: 1000,
    };

    return {
      availableBalance: restaurant.availableBalance,
      pendingSettlement: restaurant.pendingSettlement,
      todayEarnings,
      monthEarnings,
      breakdown,
      settlementInfo,
      bankDetails: restaurant.bankDetails || defaultBank,
      refundSettings: restaurant.refundSettings || defaultRefundSettings,
    };
  }

  async getTransactions(userId: string, search?: string, type?: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const whereClause: any = {
      restaurantId: restaurant.id,
    };

    if (search && search.trim() !== '') {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type && type !== 'All') {
      if (type === 'Revenue') {
        whereClause.type = 'Order Revenue';
      } else if (type === 'Tips') {
        whereClause.type = 'Tip Received';
      } else if (type === 'Refunds') {
        whereClause.type = 'Refund Debit';
      }
    }

    const txs = await this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return txs.map(tx => ({
      id: tx.id,
      orderNumber: tx.orderNumber,
      amount: tx.amount,
      type: tx.type,
      date: tx.createdAt.toISOString().replace('T', ' ').substring(0, 16),
      status: tx.status
    }));
  }

  async getPayoutHistory(userId: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const payouts = await this.prisma.payoutRecord.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' }
    });

    return payouts.map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.createdAt.toISOString().split('T')[0],
      status: p.status
    }));
  }

  async getRefundRequests(userId: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    const refunds = await this.prisma.refundRequest.findMany({
      where: {
        restaurantId: restaurant.id
      },
      orderBy: { createdAt: 'desc' }
    });

    return refunds.map(r => ({
      id: r.id,
      customerName: r.customerName,
      orderNumber: r.orderNumber,
      amount: r.amount,
      reason: r.reason,
      status: r.status
    }));
  }

  async requestEarlyPayout(userId: string) {
    const restaurant = await this.getRestaurantForUser(userId);

    if (restaurant.availableBalance <= 1000) {
      throw new BadRequestException('Available balance is too low for early payout');
    }

    const amountToWithdraw = restaurant.availableBalance;

    const payoutId = await generatePayoutId(this.prisma);

    // Create a payout record
    const payout = await this.prisma.payoutRecord.create({
      data: {
        id: payoutId,
        restaurantId: restaurant.id,
        amount: amountToWithdraw,
        status: 'Processing'
      }
    });

    // Deduct available balance
    const updatedRestaurant = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { availableBalance: 0 }
    });

    return {
      availableBalance: updatedRestaurant.availableBalance,
      payout: {
        id: payout.id,
        amount: payout.amount,
        date: payout.createdAt.toISOString().split('T')[0],
        status: payout.status
      }
    };
  }

  async updateBankDetails(userId: string, dto: UpdateBankDetailsDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        bankDetails: {
          ...dto,
          status: 'Verification Pending'
        }
      }
    });

    return updated.bankDetails;
  }

  async updateRefundSettings(userId: string, dto: UpdateRefundSettingsDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        refundSettings: { ...dto }
      }
    });

    return updated.refundSettings;
  }

  async resolveRefundRequest(userId: string, requestId: string, dto: ResolveRefundDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    const refund = await this.prisma.refundRequest.findFirst({
      where: {
        id: requestId,
        restaurantId: restaurant.id
      }
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.status !== 'Pending') {
      throw new BadRequestException('Refund request has already been resolved');
    }

    if (dto.outcome === 'Approve') {
      let newAvailable = restaurant.availableBalance;
      let newPending = restaurant.pendingSettlement;

      if (newAvailable >= refund.amount) {
        newAvailable -= refund.amount;
      } else {
        newPending -= refund.amount;
      }

      await this.prisma.$transaction(async (tx) => {
        // Update refund request status
        await tx.refundRequest.update({
          where: { id: requestId },
          data: { status: 'Approved' }
        });

        const txId = await generateTransactionId(tx);

        // Create negative Refund Debit transaction
        await tx.transaction.create({
          data: {
            id: txId,
            restaurantId: restaurant.id,
            amount: -refund.amount,
            type: 'Refund Debit',
            orderNumber: refund.orderNumber,
            status: 'Completed'
          }
        });

        // Update restaurant wallet
        await tx.restaurant.update({
          where: { id: restaurant.id },
          data: {
            availableBalance: newAvailable,
            pendingSettlement: newPending
          }
        });
      });

      return {
        message: `Refund of LKR ${refund.amount.toLocaleString()} approved.`,
        status: 'Approved',
        amount: refund.amount,
        orderNumber: refund.orderNumber,
        availableBalance: newAvailable,
        pendingSettlement: newPending
      };
    } else {
      await this.prisma.refundRequest.update({
        where: { id: requestId },
        data: { status: 'Rejected' }
      });

      return {
        message: `Refund request rejected. Reason: ${dto.reason || 'No reason specified'}`,
        status: 'Rejected',
        amount: refund.amount,
        orderNumber: refund.orderNumber
      };
    }
  }

  async createManualRefund(userId: string, dto: CreateManualRefundDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    const refund = await this.prisma.refundRequest.create({
      data: {
        restaurantId: restaurant.id,
        orderNumber: dto.orderNumber,
        customerName: dto.customerName,
        amount: dto.amount,
        reason: dto.reason,
        status: dto.status,
      }
    });

    if (dto.status === 'Approved' || dto.status === 'Completed') {
      const txId = await generateTransactionId(this.prisma);
      await this.prisma.transaction.create({
        data: {
          id: txId,
          restaurantId: restaurant.id,
          amount: -dto.amount,
          type: 'Refund Debit',
          orderNumber: dto.orderNumber,
          status: 'Completed'
        }
      });
    }

    return refund;
  }

  async updateRefundStatus(userId: string, id: string, dto: UpdateRefundStatusDto) {
    const restaurant = await this.getRestaurantForUser(userId);

    const refund = await this.prisma.refundRequest.findFirst({
      where: {
        id,
        restaurantId: restaurant.id
      }
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: { status: dto.status }
    });

    const isApproved = dto.status === 'Approved' || dto.status === 'Completed';
    const wasApproved = refund.status === 'Approved' || refund.status === 'Completed';
    if (isApproved && !wasApproved) {
      const txId = await generateTransactionId(this.prisma);
      await this.prisma.transaction.create({
        data: {
          id: txId,
          restaurantId: restaurant.id,
          amount: -refund.amount,
          type: 'Refund Debit',
          orderNumber: refund.orderNumber,
          status: 'Completed'
        }
      });
    }

    return updated;
  }
}
