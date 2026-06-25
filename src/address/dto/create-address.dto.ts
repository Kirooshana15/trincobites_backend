import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty({ message: 'Address is required.' })
  @IsString({ message: 'Address must be a text value.' })
  address!: string;

  @IsNotEmpty({ message: 'Full name is required.' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes — no numbers or special characters.',
  })
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters.' })
  fullName!: string;

  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Phone number must contain only digits (7–15 digits), with an optional leading +.',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
