import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @Matches(/^(?!.*@(gmail|yahoo|hotmail|outlook|icloud)\.co$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, {
    message: 'Please provide a valid email address (e.g. example@gmail.com).',
  })
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Phone number must contain only digits (7–15 digits), with an optional leading +.',
  })
  phone?: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password!: string;
}
