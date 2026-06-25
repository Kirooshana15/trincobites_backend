import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Category name is required.' })
  @IsString({ message: 'Category name must be text.' })
  @MinLength(2, { message: 'Category name must be at least 2 characters.' })
  @MaxLength(80, { message: 'Category name must not exceed 80 characters.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be text.' })
  @MaxLength(300, { message: 'Description must not exceed 300 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Display order must be a number.' })
  @Min(1, { message: 'Display order must be at least 1.' })
  displayOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Category name must be text.' })
  @MinLength(2, { message: 'Category name must be at least 2 characters.' })
  @MaxLength(80, { message: 'Category name must not exceed 80 characters.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be text.' })
  @MaxLength(300, { message: 'Description must not exceed 300 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Display order must be a number.' })
  @Min(1, { message: 'Display order must be at least 1.' })
  displayOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
