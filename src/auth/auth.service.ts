import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hashedPassword,
        role: Role.CUSTOMER,
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
      });
    } else if (phone) {
      user = await this.prisma.user.findUnique({
        where: { phone },
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    await this.prisma.token.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const { password: _, ...userDetails } = user;

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

    // Delete token from database to revoke it
    await this.prisma.token.deleteMany({
      where: { token },
    });

    return {
      message: 'Logged out successfully, token revoked.',
    };
  }
}
