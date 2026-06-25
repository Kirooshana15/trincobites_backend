import { Controller, Get, Post, Body, Req, UseGuards, Query, Param, Patch } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { UpdateBankDetailsDto, UpdateRefundSettingsDto, ResolveRefundDto, CreateManualRefundDto, UpdateRefundStatusDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.getDashboard(userId);
  }

  @Get('transactions')
  async getTransactions(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    const userId = req.user.id;
    return this.paymentService.getTransactions(userId, search, type);
  }

  @Get('payout-history')
  async getPayoutHistory(@Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.getPayoutHistory(userId);
  }

  @Get('refund-requests')
  async getRefundRequests(@Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.getRefundRequests(userId);
  }

  @Post('payout')
  async requestEarlyPayout(@Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.requestEarlyPayout(userId);
  }

  @Post('bank-details')
  async updateBankDetails(@Req() req: any, @Body() dto: UpdateBankDetailsDto) {
    const userId = req.user.id;
    return this.paymentService.updateBankDetails(userId, dto);
  }

  @Post('refund-settings')
  async updateRefundSettings(@Req() req: any, @Body() dto: UpdateRefundSettingsDto) {
    const userId = req.user.id;
    return this.paymentService.updateRefundSettings(userId, dto);
  }

  @Post('refund-requests/:id/resolve')
  async resolveRefundRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ResolveRefundDto,
  ) {
    const userId = req.user.id;
    return this.paymentService.resolveRefundRequest(userId, id, dto);
  }

  @Post('refund-requests')
  async createManualRefund(@Req() req: any, @Body() dto: CreateManualRefundDto) {
    const userId = req.user.id;
    return this.paymentService.createManualRefund(userId, dto);
  }

  @Patch('refund-requests/:id/status')
  async updateRefundStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRefundStatusDto,
  ) {
    const userId = req.user.id;
    return this.paymentService.updateRefundStatus(userId, id, dto);
  }
}
