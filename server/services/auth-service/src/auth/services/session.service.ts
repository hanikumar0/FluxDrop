import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { TokenService } from './token.service';

@Injectable()
export class SessionService {
  constructor(
    private db: DatabaseService,
    private tokenService: TokenService,
  ) {}

  async createSession(userId: string, refreshToken: string, deviceInfo: string, ipAddress: string) {
    const refreshTokenHash = await this.tokenService.hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return this.db.query(
      'INSERT INTO "Session" (id, "userId", "refreshTokenHash", "familyId", "deviceInfo", "ipAddress", "expiresAt", "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())',
      [userId, refreshTokenHash, familyId, deviceInfo, ipAddress, expiresAt],
    );
  }

  async revokeAllUserSessions(userId: string) {
    await this.db.query(
      'UPDATE "Session" SET "isRevoked" = true WHERE "userId" = $1',
      [userId],
    );
  }
}
