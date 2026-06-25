import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { generateTransactionId } from '../payment/payment.service';


// Map database values to frontend strings
const mapStatusToFrontend = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.ORDER_RECEIVED:
      return 'Order Received';
    case OrderStatus.PREPARING:
      return 'Preparing';
    case OrderStatus.OUT_FOR_DELIVERY:
      return 'Out for Delivery';
    case OrderStatus.DELIVERED:
      return 'Delivered';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Order Received';
  }
};

const mapStatusToDb = (status: string): OrderStatus => {
  switch (status) {
    case 'Order Received':
    case 'Pending':
      return OrderStatus.ORDER_RECEIVED;
    case 'Accepted':
    case 'Preparing':
      return OrderStatus.PREPARING;
    case 'Out for Delivery':
      return OrderStatus.OUT_FOR_DELIVERY;
    case 'Completed':
    case 'Delivered':
      return OrderStatus.DELIVERED;
    case 'Cancelled':
      return OrderStatus.CANCELLED;
    default:
      return OrderStatus.ORDER_RECEIVED;
  }
};

const mapOrderTypeToFrontend = (type: OrderType): string => {
  return type === OrderType.DELIVERY ? 'Delivery' : 'Self Pickup';
};

const mapOrderTypeToDb = (type: string): OrderType => {
  return type === 'Delivery' ? OrderType.DELIVERY : OrderType.SELF_PICKUP;
};

const mapPaymentMethodToFrontend = (method: PaymentMethod): string => {
  return method === PaymentMethod.CARD ? 'card' : 'cash';
};

const mapPaymentMethodToDb = (method: string): PaymentMethod => {
  return method === 'card' ? PaymentMethod.CARD : PaymentMethod.CASH;
};

async function processMockPayment(cardNumber?: string, amount?: number): Promise<{ success: boolean; transactionId: string; error?: string }> {
  // Simulate network delay of 1.5 seconds
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (!cardNumber) {
    return { success: false, transactionId: '', error: 'Card number is required' };
  }

  const cleanCard = cardNumber.replace(/\s/g, '');
  if (cleanCard.startsWith('4444')) {
    return { success: false, transactionId: '', error: 'Card declined: Insufficient funds' };
  }

  const randomTxId = `MOCK-TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  return { success: true, transactionId: randomTxId };
}

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) { }

  private formatOrderResponse(order: any) {
    if (!order) return null;
    return {
      ...order,
      id: order.orderNumber, // Use friendly orderNumber as id for the frontend
      dbId: order.id, // Store original UUID as dbId
      status: mapStatusToFrontend(order.status),
      orderType: mapOrderTypeToFrontend(order.orderType),
      paymentMethod: mapPaymentMethodToFrontend(order.paymentMethod),
      contact: {
        name: order.contactName,
        phone: order.contactPhone,
        email: order.contactEmail,
      },
      // Clean up internal database flat fields
      contactName: undefined,
      contactPhone: undefined,
      contactEmail: undefined,
    };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Fetch user's cart items from DB
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { menuItem: true, appliedOffer: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Fetch restaurant to validate minimum order value
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.temporaryClosure) {
      throw new BadRequestException('This restaurant is temporarily closed and not accepting orders.');
    }

    if (restaurant.holidayMode) {
      throw new BadRequestException('This restaurant is currently closed for holidays.');
    }

    if (restaurant.vacationMode) {
      throw new BadRequestException('This restaurant is currently on vacation.');
    }

    if (restaurant.acceptOrders === false) {
      throw new BadRequestException("This restaurant's kitchen is currently busy and not accepting new orders.");
    }

    if (restaurant.cashOnDelivery === false && dto.paymentMethod === 'cash') {
      throw new BadRequestException('Cash on Delivery is not supported by this restaurant. Please select Card payment.');
    }

    if (mapOrderTypeToDb(dto.orderType) === OrderType.DELIVERY && restaurant.deliveryAvailable === false) {
      throw new BadRequestException('Delivery is not available for this restaurant. Please select Self Pickup.');
    }

    if (restaurant.minOrder && restaurant.minOrder > 0) {
      let rawSubtotal = 0;
      for (const item of cartItems) {
        const extrasTotal = item.selectedExtras && Array.isArray(item.selectedExtras)
          ? (item.selectedExtras as any[]).reduce((sum, extra) => sum + (extra.price || 0), 0)
          : 0;
        let unitTotal = item.selectedSize === 'Large' ? item.menuItem.price * 1.5 + extrasTotal : item.menuItem.price + extrasTotal;
        if (item.customPrice !== null && item.customPrice !== undefined) {
          unitTotal = item.customPrice;
        }
        rawSubtotal += unitTotal * item.quantity;
      }

      if (rawSubtotal < restaurant.minOrder) {
        throw new BadRequestException(
          `Minimum order value for ${restaurant.name} is LKR ${restaurant.minOrder}. Your current order total is LKR ${rawSubtotal}.`
        );
      }
    }

    // Generate a unique, user-friendly order number: TRC-XXXX (random 4-digit code)
    let orderNumber = '';
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      orderNumber = `TRC-${randomNum}`;
      const existingOrder = await this.prisma.order.findUnique({
        where: { orderNumber },
      });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    // Validate and recalculate delivery fee based on Free Delivery Threshold
    let deliveryFee = dto.deliveryFee;
    if (mapOrderTypeToDb(dto.orderType) === OrderType.DELIVERY) {
      if (restaurant.freeDeliveryThreshold && restaurant.freeDeliveryThreshold > 0) {
        if (dto.subtotal >= restaurant.freeDeliveryThreshold) {
          deliveryFee = 0;
        }
      }
    } else {
      deliveryFee = 0;
    }
    const total = dto.subtotal + dto.tax + deliveryFee;

    // Process mock payment for card method
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let transactionId: string | null = null;
    let gatewayName: string | null = null;

    if (dto.paymentMethod === 'card') {
      const paymentResult = await processMockPayment(dto.cardNumber, total);
      if (!paymentResult.success) {
        throw new BadRequestException(paymentResult.error || 'Payment failed');
      }
      paymentStatus = PaymentStatus.COMPLETED;
      transactionId = paymentResult.transactionId;
      gatewayName = 'MOCK';
    }

    // 2. Perform database transaction to write Order and OrderItems, and clear Cart
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the Order record
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          restaurantId: dto.restaurantId,
          restaurantName: dto.restaurantName,
          orderType: mapOrderTypeToDb(dto.orderType),
          subtotal: dto.subtotal,
          tax: dto.tax,
          deliveryFee,
          total,
          paymentMethod: mapPaymentMethodToDb(dto.paymentMethod),
          paymentStatus,
          transactionId,
          gatewayName,
          contactName: dto.contact.name,
          contactPhone: dto.contact.phone,
          contactEmail: dto.contact.email,
          deliveryAddress: dto.deliveryAddress,
          locationLabel: dto.locationLabel,
          notes: dto.notes,
          statusTimeline: [
            { status: 'Pending', time: new Date().toISOString() }
          ],
        },
      });

      // Create notification for the restaurant
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      await tx.notification.create({
        data: {
          restaurantId: dto.restaurantId,
          userId: userId,
          type: 'orders',
          title: 'New Order Received',
          description: `Order ${orderNumber} from ${dto.contact.name} has ${itemCount} item${itemCount === 1 ? '' : 's'} worth LKR ${dto.total.toLocaleString()}.`,
          orderId: orderNumber,
        },
      });

      // Create OrderItems from CartItems and update MenuItem stock & ordersCount
      for (const cartItem of cartItems) {
        // Fetch current menuItem in transaction to prevent race conditions
        const dbMenuItem = await tx.menuItem.findUnique({
          where: { id: cartItem.menuItemId },
        });

        if (!dbMenuItem) {
          throw new NotFoundException(`Menu item "${cartItem.menuItem.name}" not found`);
        }

        if (!dbMenuItem.isAvailable) {
          throw new BadRequestException(`Menu item "${dbMenuItem.name}" is currently unavailable`);
        }

        if (dbMenuItem.stock < cartItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${dbMenuItem.name}". Available: ${dbMenuItem.stock}, requested: ${cartItem.quantity}`
          );
        }

        // Calculate new stock and availability
        const nextStock = dbMenuItem.stock - cartItem.quantity;
        const nextIsAvailable = nextStock > 0;

        if (nextStock === 0) {
          await tx.notification.create({
            data: {
              restaurantId: cartItem.restaurantId,
              type: 'security',
              title: 'Food Item Out of Stock',
              description: `Menu item "${dbMenuItem.name}" is out of stock.`,
            },
          });
        }

        // Update MenuItem stock, ordersCount, and isAvailable
        await tx.menuItem.update({
          where: { id: cartItem.menuItemId },
          data: {
            stock: nextStock,
            isAvailable: nextIsAvailable,
            ordersCount: {
              increment: cartItem.quantity,
            },
          },
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            menuItemId: cartItem.menuItemId,
            restaurantId: cartItem.restaurantId,
            name: cartItem.menuItem.name,
            price: cartItem.menuItem.price,
            image: cartItem.menuItem.image,
            quantity: cartItem.quantity,
            selectedSize: cartItem.selectedSize,
            selectedExtras: cartItem.selectedExtras || undefined,
            instructions: cartItem.instructions,
            customPrice: cartItem.customPrice,
            appliedOfferId: cartItem.appliedOfferId,
          },
        });
      }

      // Clear the CartItems
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return newOrder;
    });

    // Fetch the complete order with its items to return
    const completeOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            appliedOffer: true,
            menuItem: true,
          },
        },
      },
    });

    return this.formatOrderResponse(completeOrder);
  }

  async getOrders(userId: string, role: string, restaurantId?: string) {
    const whereClause: any = {};
    if (role === 'RESTAURANT' && restaurantId) {
      whereClause.restaurantId = restaurantId;
    } else {
      whereClause.userId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            appliedOffer: true,
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.formatOrderResponse(order));
  }

  async getLatestOrder(userId: string) {
    const latest = await this.prisma.order.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            appliedOffer: true,
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) return null;
    return this.formatOrderResponse(latest);
  }

  async getOrderById(userId: string, role: string, restaurantId: string | undefined, id: string) {
    const whereClause: any = {};
    if (role === 'RESTAURANT' && restaurantId) {
      whereClause.restaurantId = restaurantId;
    } else {
      whereClause.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where: {
        ...whereClause,
        OR: [
          { id },
          { orderNumber: id },
        ],
      },
      include: {
        items: {
          include: {
            appliedOffer: true,
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrderResponse(order);
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderNumber: id },
        ],
      },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Update status timeline
    let timeline: any[] = [];
    if (existing.statusTimeline && Array.isArray(existing.statusTimeline)) {
      timeline = [...existing.statusTimeline];
    } else {
      timeline = [{ status: 'Pending', time: existing.createdAt.toISOString() }];
    }

    let statusLabel = dto.status;
    if (statusLabel === 'Delivered') {
      statusLabel = 'Completed';
    } else if (statusLabel === 'Order Received') {
      statusLabel = 'Pending';
    }

    const hasStatus = timeline.some((node: any) => node.status === statusLabel);
    if (!hasStatus) {
      timeline.push({
        status: statusLabel,
        time: new Date().toISOString(),
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Check if status is transitioning to CANCELLED from something else
      if (mapStatusToDb(dto.status) === OrderStatus.CANCELLED && existing.status !== OrderStatus.CANCELLED) {
        if (existing.status === OrderStatus.DELIVERED) {
          throw new BadRequestException('Delivered orders cannot be cancelled');
        }

        const orderItems = await tx.orderItem.findMany({
          where: { orderId: existing.id },
        });

        for (const item of orderItems) {
          const menuItem = await tx.menuItem.findUnique({
            where: { id: item.menuItemId },
          });

          if (menuItem) {
            const nextStock = menuItem.stock + item.quantity;
            const nextIsAvailable = nextStock > 0;
            const nextOrdersCount = Math.max(0, menuItem.ordersCount - item.quantity);

            await tx.menuItem.update({
              where: { id: item.menuItemId },
              data: {
                stock: nextStock,
                isAvailable: nextIsAvailable,
                ordersCount: nextOrdersCount,
              },
            });
          }
        }

        // Create RefundRequest if card payment and refund is initiated
        if (existing.paymentMethod === PaymentMethod.CARD && dto.refundInitiated) {
          await tx.refundRequest.create({
            data: {
              restaurantId: existing.restaurantId,
              orderId: existing.id,
              orderNumber: existing.orderNumber,
              customerName: existing.contactName,
              amount: existing.total,
              reason: dto.cancellationReason || 'Order cancelled by restaurant',
              status: 'Approved',
            },
          });

          const revTxId = await generateTransactionId(tx);
          // Create balancing Order Revenue transaction (+amount)
          await tx.transaction.create({
            data: {
              id: revTxId,
              restaurantId: existing.restaurantId,
              orderId: existing.id,
              orderNumber: existing.orderNumber,
              amount: existing.total,
              type: 'Order Revenue',
              status: 'Completed',
            },
          });

          const refTxId = await generateTransactionId(tx);
          // Create negative Refund Debit transaction (-amount)
          await tx.transaction.create({
            data: {
              id: refTxId,
              restaurantId: existing.restaurantId,
              orderId: existing.id,
              orderNumber: existing.orderNumber,
              amount: -existing.total,
              type: 'Refund Debit',
              status: 'Completed',
            },
          });

          // Create notification for the customer
          await tx.notification.create({
            data: {
              userId: existing.userId,
              type: 'payments',
              title: 'Refund Initiated',
              description: `Your refund of LKR ${existing.total.toLocaleString()} for order ${existing.orderNumber} has been initiated and will be credited to your card within 3-5 business days.`,
              orderId: existing.orderNumber,
            },
          });
        }
      }

      // 2. Prepare update data
      const orderUpdateData: any = {
        status: mapStatusToDb(dto.status),
        cancellationReason: dto.cancellationReason ?? undefined,
        refundInitiated: dto.refundInitiated ?? undefined,
        statusTimeline: timeline,
      };

      if (mapStatusToDb(dto.status) === OrderStatus.CANCELLED && existing.status !== OrderStatus.CANCELLED) {
        if (existing.paymentMethod === PaymentMethod.CARD && dto.refundInitiated) {
          orderUpdateData.paymentStatus = PaymentStatus.REFUNDED;
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: existing.id },
        data: orderUpdateData,
        include: {
          items: {
            include: {
              appliedOffer: true,
              menuItem: true,
            },
          },
        },
      });

      // 3. Check if status is transitioning to DELIVERED
      if (updatedOrder.status === OrderStatus.DELIVERED && existing.status !== OrderStatus.DELIVERED) {
        const existingTx = await tx.transaction.findFirst({
          where: { orderNumber: updatedOrder.orderNumber },
        });

        if (!existingTx) {
          const txId = await generateTransactionId(tx);
          // Create Transaction
          await tx.transaction.create({
            data: {
              id: txId,
              restaurantId: updatedOrder.restaurantId,
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              amount: updatedOrder.total,
              type: 'Order Revenue',
              status: 'Completed',
            },
          });

          // Update restaurant wallet balance
          await tx.restaurant.update({
            where: { id: updatedOrder.restaurantId },
            data: {
              availableBalance: updatedOrder.paymentMethod === PaymentMethod.CASH
                ? { increment: updatedOrder.total }
                : undefined,
              pendingSettlement: updatedOrder.paymentMethod === PaymentMethod.CARD
                ? { increment: updatedOrder.total }
                : undefined,
            },
          });
        }
      }

      return updatedOrder;
    });

    return this.formatOrderResponse(updated);
  }
}
