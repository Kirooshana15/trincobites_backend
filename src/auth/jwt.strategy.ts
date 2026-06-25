import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

function getLocalTime(date: Date = new Date()): Date {
  // Sri Lanka timezone is UTC+5:30.
  // We explicitly add 5.5 hours to the UTC timestamp so that the database stores the correct local Sri Lankan time.
  const SRI_LANKA_OFFSET = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + SRI_LANKA_OFFSET);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-key-change-in-production',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (token) {
      const dbToken = await this.prisma.token.findUnique({
        where: { token },
      });

      if (!dbToken || dbToken.expiresAt < getLocalTime()) {
        throw new UnauthorizedException('Token has expired or has been revoked');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        restaurant: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const { restaurant, ...restUserDetails } = user;
    return {
      ...restUserDetails,
      restaurantId: restaurant?.id,
    };
  }
}
