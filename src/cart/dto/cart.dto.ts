import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty({ message: 'menuItemId is required' })
  @IsString()
  menuItemId!: string;

  @IsNotEmpty({ message: 'restaurantId is required' })
  @IsString()
  restaurantId!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  selectedSize?: string;

  @IsOptional()
  @IsArray()
  selectedExtras?: { name: string; price: number }[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  customPrice?: number;

  @IsOptional()
  @IsString()
  appliedOfferId?: string;
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  selectedSize?: string;

  @IsOptional()
  @IsArray()
  selectedExtras?: { name: string; price: number }[];
}

