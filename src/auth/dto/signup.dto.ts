import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a string.' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes — no numbers or special characters.',
  })
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters.' })
  fullName!: string;

  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @Matches(/^(?!.*@(gmail|yahoo|hotmail|outlook|icloud)\.co$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, {
    message: 'Please provide a valid email address (e.g. example@gmail.com).',
  })
  email!: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Phone number must contain only digits (7–15 digits), with an optional leading +.',
  })
  phone!: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password!: string;
}
