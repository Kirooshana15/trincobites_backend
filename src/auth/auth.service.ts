import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';

function getLocalTime(date: Date = new Date()): Date {
  // Sri Lanka timezone is UTC+5:30.
  // We explicitly add 5.5 hours to the UTC timestamp so that the database stores the correct local Sri Lankan time.
  const SRI_LANKA_OFFSET = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + SRI_LANKA_OFFSET);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async signUpCustomer(dto: SignupDto) {
    const { fullName, email, phone, password } = dto;

    if (!fullName || !email || !phone || !password) {
      throw new BadRequestException('All fields (fullName, email, phone, password) are required.');
    }

    // Check if email already exists
    const emailExists = await this.prisma.user.findUnique({
      where: { email },
    });
    if (emailExists) {
      throw new ConflictException('A user with this email already exists.');
    }

    // Check if phone already exists
    const phoneExists = await this.prisma.user.findUnique({
      where: { phone },
    });
    if (phoneExists) {
      throw new ConflictException('A user with this phone number already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = getLocalTime();
    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hashedPassword,
        role: Role.CUSTOMER,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Return created user details without the password
    const { password: _, ...result } = user;
    return {
      message: 'Customer signed up successfully',
      user: result,
    };
  }

  async login(dto: LoginDto) {
    const { email, phone, password } = dto;

    if (!password) {
      throw new BadRequestException('Password is required.');
    }

    let user: any = null;

    if (email) {
      user = await this.prisma.user.findUnique({
        where: { email },
        include: { restaurant: true },
      });
    } else if (phone) {
      user = await this.prisma.user.findUnique({
        where: { phone },
        include: { restaurant: true },
      });
    } else {
      throw new BadRequestException('Please provide either an email or phone number to log in.');
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Save token to Database (Default expiration matches JWT: 1 day)
    const now = new Date();
    const localNow = getLocalTime(now);
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const localExpiresAt = getLocalTime(expiresAt);

    await this.prisma.token.create({
      data: {
        token,
        userId: user.id,
        createdAt: localNow,
        expiresAt: localExpiresAt,
      },
    });

    const { password: _, restaurant, ...restUserDetails } = user;
    const userDetails = {
      ...restUserDetails,
      restaurantId: restaurant?.id,
    };

    return {
      message: 'Login successful',
      token,
      user: userDetails,
    };
  }

  async logout(token: string) {
    if (!token) {
      throw new BadRequestException('Token is required for logout.');
    }

    const localNow = getLocalTime();

    // Update token expiration to current local time to invalidate it
    await this.prisma.token.updateMany({
      where: { token },
      data: {
        expiresAt: localNow,
      },
    });

    return {
      message: 'Logged out successfully, token revoked.',
    };
  }

  async requestPasswordReset(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      throw new BadRequestException('This email address is not registered in our system.');
    }

    // Generate a 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP Expiry in 5 minutes (computed in Sri Lanka local time offset)
    const otpExpires = getLocalTime(new Date(Date.now() + 5 * 60 * 1000));

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: otpExpires,
      },
    });

    const mailSent = await this.mailService.sendOtpEmail(user.email, otp);
    if (!mailSent) {
      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }

    return {
      message: 'Successfully sent OTP to email!',
      role: user.role,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      throw new BadRequestException('This email address is not registered in our system.');
    }

    const localNow = getLocalTime();

    if (
      !user.resetOtp ||
      user.resetOtp !== otp ||
      !user.resetOtpExpires ||
      user.resetOtpExpires < localNow
    ) {
      throw new BadRequestException('Invalid or expired OTP code.');
    }

    return {
      message: 'OTP verified successfully!',
    };
  }

  async resetPassword(dto: any) {
    const { email, otp, password } = dto;
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      throw new BadRequestException('This email address is not registered in our system.');
    }

    const localNow = getLocalTime();

    if (
      !user.resetOtp ||
      user.resetOtp !== otp ||
      !user.resetOtpExpires ||
      user.resetOtpExpires < localNow
    ) {
      throw new BadRequestException('Invalid or expired OTP code.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    return {
      message: 'Password successfully reset!',
    };
  }
}
