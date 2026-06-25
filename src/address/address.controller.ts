import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, Query } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateAddressDto) {
    const userId = req.user.id;
    return this.addressService.create(userId, dto);
  }

  @Get('search')
  async search(@Req() req: any, @Query('query') query?: string) {
    const userId = req.user.id;
    return this.addressService.search(userId, query || '');
  }

  @Get()
  async findAll(@Req() req: any, @Query('search') search?: string) {
    const userId = req.user.id;
    return this.addressService.findAll(userId, search);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.addressService.findOne(userId, id);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    const userId = req.user.id;
    return this.addressService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.addressService.remove(userId, id);
  }
}
