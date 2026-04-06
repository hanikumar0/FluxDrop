import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async createSession(userId: string, refreshToken: string, deviceInfo: string, ipAddress: string) {
    const refreshTokenHash = await this.tokenService.hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        familyId,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });
  }

  async revokeAllUserSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }
}
