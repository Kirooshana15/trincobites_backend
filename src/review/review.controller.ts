import { Controller, Get, Post, Patch, Delete, Body, Req, UseGuards, Param, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, AdminReplyDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  async createReview(@Req() req: any, @Body() dto: CreateReviewDto) {
    const userId = req.user.id;
    return this.reviewService.createReview(userId, dto);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadImages(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const urls: string[] = [];
    for (const file of files) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      urls.push(uploadResult.secure_url);
    }

    return { urls };
  }

  @Get('restaurant/:restaurantId')
  async getReviewsForRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.reviewService.getReviewsForRestaurant(restaurantId);
  }

  @Get('order/:orderId')
  async getReviewByOrderId(@Param('orderId') orderId: string) {
    return this.reviewService.getReviewByOrderId(orderId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.RESTAURANT)
  @Post(':id/reply')
  async replyToReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AdminReplyDto,
  ) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Unauthorized: User is not linked to a restaurant');
    }
    return this.reviewService.replyToReview(id, restaurantId, dto.text);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.RESTAURANT)
  @Patch(':id/pin')
  async togglePin(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Unauthorized: User is not linked to a restaurant');
    }
    return this.reviewService.togglePin(id, restaurantId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.RESTAURANT)
  @Patch(':id/bookmark')
  async toggleBookmark(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Unauthorized: User is not linked to a restaurant');
    }
    return this.reviewService.toggleBookmark(id, restaurantId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.RESTAURANT)
  @Patch(':id/report')
  async reportReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Unauthorized: User is not linked to a restaurant');
    }
    return this.reviewService.reportReview(id, restaurantId, dto.reason);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.RESTAURANT)
  @Patch(':id/hide')
  async hideReview(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Unauthorized: User is not linked to a restaurant');
    }
    return this.reviewService.hideReview(id, restaurantId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.RESTAURANT)
  @Delete(':id')
  async deleteReview(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Unauthorized: User is not linked to a restaurant');
    }
    return this.reviewService.deleteReview(id, restaurantId);
  }
}
