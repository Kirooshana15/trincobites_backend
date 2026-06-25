import { Controller, Get, Post, Patch, Delete, Body, Req, UseGuards, Param } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    const userId = req.user.id;
    return this.cartService.getCart(userId);
  }

  @Post()
  async addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    const userId = req.user.id;
    return this.cartService.addToCart(userId, dto);
  }

  @Patch(':id')
  async updateCartItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user.id;
    return this.cartService.updateCartItem(userId, id, dto);
  }

  @Delete(':id')
  async removeCartItem(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.cartService.removeCartItem(userId, id);
  }

  @Delete()
  async clearCart(@Req() req: any) {
    const userId = req.user.id;
    return this.cartService.clearCart(userId);
  }
}
