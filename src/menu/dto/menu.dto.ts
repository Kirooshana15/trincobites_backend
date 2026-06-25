import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMenuItemDto {
  @IsNotEmpty({ message: 'Item name is required.' })
  @IsString({ message: 'Item name must be a text value.' })
  @MinLength(2, { message: 'Item name must be at least 2 characters.' })
  @MaxLength(120, { message: 'Item name must not exceed 120 characters.' })
  name: string;

  @IsNotEmpty({ message: 'Category is required.' })
  @IsString({ message: 'Category must be a text value.' })
  category: string;

  @IsOptional()
  @IsString({ message: 'Description must be a text value.' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNotEmpty({ message: 'Price is required.' })
  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0, { message: 'Price cannot be negative.' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Stock must be a number.' })
  @Min(0, { message: 'Stock cannot be negative.' })
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each tag must be a text value.' })
  tags?: string[];

  @IsOptional()
  variants?: any;

  @IsOptional()
  addons?: any;

  @IsOptional()
  @IsString()
  timeAvailability?: string;
}

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString({ message: 'Item name must be a text value.' })
  @MinLength(2, { message: 'Item name must be at least 2 characters.' })
  @MaxLength(120, { message: 'Item name must not exceed 120 characters.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Category must be a text value.' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a text value.' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0, { message: 'Price cannot be negative.' })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Stock must be a number.' })
  @Min(0, { message: 'Stock cannot be negative.' })
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each tag must be a text value.' })
  tags?: string[];

  @IsOptional()
  variants?: any;

  @IsOptional()
  addons?: any;

  @IsOptional()
  @IsString()
  timeAvailability?: string;
}
