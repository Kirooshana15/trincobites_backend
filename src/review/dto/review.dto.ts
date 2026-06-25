import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'restaurantId is required' })
  @IsString()
  restaurantId!: string;

  @IsNotEmpty({ message: 'orderId is required' })
  @IsString()
  orderId!: string;

  @IsNotEmpty({ message: 'rating is required' })
  @IsNumber()
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  foodRating?: number;

  @IsOptional()
  @IsNumber()
  serviceRating?: number;

  @IsOptional()
  @IsString()
  dishName?: string;
}

export class AdminReplyDto {
  @IsNotEmpty({ message: 'Reply text is required' })
  @IsString()
  text!: string;
}

