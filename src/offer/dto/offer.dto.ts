import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOfferDto {
  @IsNotEmpty({ message: 'Offer title is required.' })
  @IsString({ message: 'Title must be a text value.' })
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(120, { message: 'Title must not exceed 120 characters.' })
  title!: string;

  @IsNotEmpty({ message: 'Offer description is required.' })
  @IsString({ message: 'Description must be a text value.' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters.' })
  description!: string;

  @IsNotEmpty({ message: 'Discount badge text is required.' })
  @IsString({ message: 'Discount badge must be a text value.' })
  @MaxLength(50, { message: 'Discount badge must not exceed 50 characters.' })
  discountBadge!: string;

  @IsNotEmpty({ message: 'Active days are required.' })
  @IsArray({ message: 'Active days must be an array.' })
  @IsString({ each: true, message: 'Each active day must be a text value.' })
  activeDays!: string[];

  @IsNotEmpty({ message: 'Start date is required.' })
  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD).' })
  startDate!: string;

  @IsNotEmpty({ message: 'End date is required.' })
  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD).' })
  endDate!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timeLabel?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  bannerImage?: string;

  @IsOptional()
  @IsString()
  targetCustomer?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum order amount must be a number.' })
  @Min(0, { message: 'Minimum order amount cannot be negative.' })
  minOrderAmount?: number;

  @IsOptional()
  @IsString()
  menuItemId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  metadata?: any;
}

export class UpdateOfferDto {
  @IsOptional()
  @IsString({ message: 'Title must be a text value.' })
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(120, { message: 'Title must not exceed 120 characters.' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a text value.' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters.' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Discount badge must be a text value.' })
  @MaxLength(50, { message: 'Discount badge must not exceed 50 characters.' })
  discountBadge?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeDays?: string[];

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD).' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD).' })
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timeLabel?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  bannerImage?: string;

  @IsOptional()
  @IsString()
  targetCustomer?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum order amount must be a number.' })
  @Min(0, { message: 'Minimum order amount cannot be negative.' })
  minOrderAmount?: number;

  @IsOptional()
  @IsString()
  menuItemId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  metadata?: any;
}
