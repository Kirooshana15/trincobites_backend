import { Controller, Get, Post, Patch, Body, Req, UseGuards, Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user.id;
    return this.orderService.createOrder(userId, dto);
  }

  @Get()
  async getOrders(@Req() req: any) {
    const userId = req.user.id;
    const role = req.user.role;
    const restaurantId = req.user.restaurantId;
    return this.orderService.getOrders(userId, role, restaurantId);
  }

  @Get('latest')
  async getLatestOrder(@Req() req: any) {
    const userId = req.user.id;
    return this.orderService.getLatestOrder(userId);
  }

  @Get(':id')
  async getOrderById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const role = req.user.role;
    const restaurantId = req.user.restaurantId;
    return this.orderService.getOrderById(userId, role, restaurantId, id);
  }

  @Patch(':id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateOrderStatus(id, dto);
  }
}
