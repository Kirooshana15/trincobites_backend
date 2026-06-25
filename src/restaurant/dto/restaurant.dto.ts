import { CuisineType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRestaurantDto {
  @IsNotEmpty({ message: 'Restaurant name is required.' })
  @IsString({ message: 'Restaurant name must be text.' })
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(120, { message: 'Name must not exceed 120 characters.' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  logoImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  cuisineTypes?: CuisineType[];

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a number.' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a number.' })
  longitude?: number;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Phone number must contain only digits (7–15 digits), with an optional leading +.',
  })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Support number must contain only digits (7–15 digits), with an optional leading +.',
  })
  supportNumber?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  reviewsCount?: number;

  @IsOptional()
  @IsBoolean()
  halalFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  vegetarianFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  takeaway?: boolean;

  @IsOptional()
  @IsBoolean()
  delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  deliveryAvailable?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Delivery radius must be a number.' })
  @Min(0)
  deliveryRadius?: number;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Delivery fee must be a number.' })
  @Min(0, { message: 'Delivery fee cannot be negative.' })
  deliveryFee?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum order must be a number.' })
  @Min(0, { message: 'Minimum order cannot be negative.' })
  minOrder?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Free delivery threshold must be a number.' })
  @Min(0)
  freeDeliveryThreshold?: number;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  weeklyHours?: any;

  @IsOptional()
  @IsBoolean()
  holidayMode?: boolean;

  @IsOptional()
  @IsBoolean()
  temporaryClosure?: boolean;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsBoolean()
  acceptOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  showPublicly?: boolean;

  @IsOptional()
  @IsBoolean()
  vacationMode?: boolean;

  @IsOptional()
  @IsBoolean()
  cashOnDelivery?: boolean;
}

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString({ message: 'Restaurant name must be text.' })
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(120, { message: 'Name must not exceed 120 characters.' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  logoImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  cuisineTypes?: CuisineType[];

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a number.' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a number.' })
  longitude?: number;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Phone number must contain only digits (7–15 digits), with an optional leading +.',
  })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Support number must contain only digits (7–15 digits), with an optional leading +.',
  })
  supportNumber?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  reviewsCount?: number;

  @IsOptional()
  @IsBoolean()
  halalFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  vegetarianFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  takeaway?: boolean;

  @IsOptional()
  @IsBoolean()
  delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  deliveryAvailable?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Delivery radius must be a number.' })
  @Min(0)
  deliveryRadius?: number;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Delivery fee must be a number.' })
  @Min(0, { message: 'Delivery fee cannot be negative.' })
  deliveryFee?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum order must be a number.' })
  @Min(0, { message: 'Minimum order cannot be negative.' })
  minOrder?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Free delivery threshold must be a number.' })
  @Min(0)
  freeDeliveryThreshold?: number;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  weeklyHours?: any;

  @IsOptional()
  @IsBoolean()
  holidayMode?: boolean;

  @IsOptional()
  @IsBoolean()
  temporaryClosure?: boolean;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsBoolean()
  acceptOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  showPublicly?: boolean;

  @IsOptional()
  @IsBoolean()
  vacationMode?: boolean;

  @IsOptional()
  @IsBoolean()
  cashOnDelivery?: boolean;
}

export class GetRestaurantsFilterDto {
  search?: string;
  category?: string;
  openNow?: string | boolean;
  under30?: string | boolean;
  minRating?: string | number;
  withOffers?: string | boolean;
  dietary?: 'ALL' | 'VEG' | 'NON_VEG' | 'HALAL';
  sortBy?: 'name' | 'rating' | 'deliveryTime';
  sortOrder?: 'asc' | 'desc';
}
