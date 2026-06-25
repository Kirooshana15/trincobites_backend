import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('offer')
export class OfferController {
  constructor(
    private readonly offerService: OfferService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return {
      message: 'Image uploaded successfully',
      url: uploadResult.secure_url,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async create(@Req() req: any, @Body() dto: CreateOfferDto) {
    const userId = req.user.id;
    return this.offerService.create(userId, dto);
  }

  @Get('public')
  async findAllPublic() {
    return this.offerService.findAllPublic();
  }

  @Get('public/restaurant/:restaurantId')
  async findPublicByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.offerService.findPublicByRestaurant(restaurantId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async search(@Req() req: any, @Query('query') query?: string) {
    const userId = req.user.id;
    return this.offerService.search(userId, query || '');
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async findAll(@Req() req: any, @Query('search') search?: string) {
    const userId = req.user.id;
    return this.offerService.findAll(userId, search);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.offerService.findOne(userId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOfferDto) {
    const userId = req.user.id;
    return this.offerService.update(userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.offerService.remove(userId, id);
  }
}
