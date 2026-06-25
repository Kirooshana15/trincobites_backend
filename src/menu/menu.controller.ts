import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async create(@Req() req: any, @Body() dto: CreateMenuItemDto) {
    const userId = req.user.id;
    return this.menuService.create(userId, dto);
  }

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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    const userId = req.user.id;
    return this.menuService.findAll(userId, search, category);
  }

  @Get('public/restaurant/:restaurantId')
  async findPublicByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findPublicByRestaurant(restaurantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.menuService.findOne(userId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    const userId = req.user.id;
    return this.menuService.update(userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.menuService.remove(userId, id);
  }
}
