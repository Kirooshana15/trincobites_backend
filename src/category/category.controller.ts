import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    const userId = req.user.id;
    return this.categoryService.create(userId, dto);
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
  async findAll(@Req() req: any, @Query('search') search?: string) {
    const userId = req.user.id;
    return this.categoryService.findAll(userId, search);
  }

  @Get('public/restaurant/:restaurantId')
  async findPublicByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.categoryService.findPublicByRestaurant(restaurantId);
  }

  @Get('public')
  async findAllPublic() {
    return this.categoryService.findAllPublic();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.categoryService.findOne(userId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const userId = req.user.id;
    return this.categoryService.update(userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.categoryService.remove(userId, id);
  }
}


