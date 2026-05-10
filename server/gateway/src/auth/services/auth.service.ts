import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private sessionService: SessionService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUserResult = await this.db.query(
      'SELECT id FROM "User" WHERE email = $1',
      [dto.email],
    );

    if (existingUserResult.rowCount && existingUserResult.rowCount > 0) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const userResult = await this.db.query(
      'INSERT INTO "User" (id, email, "passwordHash", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id, email',
      [dto.email, passwordHash],
    );

    const user = userResult.rows[0];

    // TODO: Emit auth.user.created event to RabbitMQ

    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto, ipAddress: string) {
    const userResult = await this.db.query(
      'SELECT id, email, "passwordHash", roles FROM "User" WHERE email = $1',
      [dto.email],
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    });

    const refreshToken = await this.tokenService.generateRefreshToken();
    await this.sessionService.createSession(user.id, refreshToken, dto.deviceInfo, ipAddress);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, roles: user.roles },
    };
  }
}
