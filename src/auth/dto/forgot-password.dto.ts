import { IsEmail, IsNotEmpty, IsString, Length, MinLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @Matches(/^(?!.*@(gmail|yahoo|hotmail|outlook|icloud)\.co$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, {
    message: 'Please provide a valid email address (e.g. example@gmail.com).',
  })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @Matches(/^(?!.*@(gmail|yahoo|hotmail|outlook|icloud)\.co$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, {
    message: 'Please provide a valid email address (e.g. example@gmail.com).',
  })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'OTP must be a string.' })
  @IsNotEmpty({ message: 'OTP is required.' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @Matches(/^(?!.*@(gmail|yahoo|hotmail|outlook|icloud)\.co$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, {
    message: 'Please provide a valid email address (e.g. example@gmail.com).',
  })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'OTP must be a string.' })
  @IsNotEmpty({ message: 'OTP is required.' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;
}
