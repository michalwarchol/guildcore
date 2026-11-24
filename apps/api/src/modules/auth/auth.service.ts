import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { toUserResponse, UserResponseDto } from '../users/user.dto';
import { UsersService } from '../users/users.service';
import { AuthAuditAction, AuthAuditEvent } from './auth-audit-event.entity';
import { AuthCredential } from './auth-credential.entity';
import { LoginRequestDto, RegisterRequestDto } from './auth.dto';
import { hashPassword, verifyPassword } from './password';
import { IssuedSession, SessionService } from './session.service';

const INVALID_LOGIN = 'Invalid email or password';

export interface AuthenticatedUser {
  profile: UserResponseDto;
  session: IssuedSession;
}

@Injectable()
export class AuthService {
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    @InjectRepository(AuthCredential)
    private readonly credentials: Repository<AuthCredential>,
    @InjectRepository(AuthAuditEvent)
    private readonly audits: Repository<AuthAuditEvent>,
  ) {
    this.dummyHash = hashPassword('not-a-real-password');
  }

  async register(
    input: RegisterRequestDto,
    ip: string | null,
  ): Promise<AuthenticatedUser> {
    const passwordHash = await hashPassword(input.password);
    const displayName = input.displayName?.trim() || input.username;
    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const created = await this.users.insertProfile(manager, {
          email: input.email,
          username: input.username,
          displayName,
        });
        await manager.getRepository(AuthCredential).save({
          userId: created.id,
          passwordHash,
        });
        return created;
      });
      await this.record('register', user.id, ip);
      const session = await this.sessions.issue(user.id);
      return { profile: toUserResponse(user), session };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email or username is already registered');
      }
      throw error;
    }
  }

  async login(
    input: LoginRequestDto,
    ip: string | null,
  ): Promise<AuthenticatedUser> {
    const user = await this.users.findByEmail(input.email);
    const credential = user
      ? await this.credentials.findOne({ where: { userId: user.id } })
      : null;
    const hash = credential?.passwordHash ?? (await this.dummyHash);
    const passwordMatches = await verifyPassword(hash, input.password);
    if (!user || !credential || !passwordMatches) {
      await this.record('login_failure', user?.id ?? null, ip);
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    await this.record('login_success', user.id, ip);
    const session = await this.sessions.issue(user.id);
    return { profile: toUserResponse(user), session };
  }

  async logout(rawToken: string | undefined, ip: string | null): Promise<void> {
    const userId = await this.sessions.revokeByToken(rawToken);
    if (userId) {
      await this.record('logout', userId, ip);
    }
  }

  async recordProfileUpdate(userId: string, ip: string | null): Promise<void> {
    await this.record('profile_update', userId, ip);
  }

  private async record(
    action: AuthAuditAction,
    userId: string | null,
    ip: string | null,
  ): Promise<void> {
    await this.audits.save(
      this.audits.create({
        action,
        userId,
        ip: ip ? ip.slice(0, 64) : null,
      }),
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
