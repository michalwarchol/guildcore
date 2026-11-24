import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { Session } from './session.entity';
import {
  generateOpaqueToken,
  hashSessionToken,
  LAST_SEEN_WRITE_INTERVAL_MS,
  SESSION_ROTATE_AFTER_MS,
  SESSION_TTL_MS,
} from './session-token';

export interface ResolvedSession {
  user: User;
  sessionId: string;
  rotatedToken?: string;
}

export interface IssuedSession {
  id: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    private readonly users: UsersService,
  ) {}

  async issue(userId: string): Promise<IssuedSession> {
    const token = generateOpaqueToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const session = await this.sessions.save(
      this.sessions.create({
        sessionHash: hashSessionToken(token),
        userId,
        expiresAt,
        revokedAt: null,
        lastSeenAt: now,
      }),
    );
    return { id: session.id, token, expiresAt };
  }

  async resolve(
    rawToken: string | undefined,
    options: { rotate: boolean },
  ): Promise<ResolvedSession | null> {
    if (!rawToken) {
      return null;
    }
    const session = await this.sessions.findOne({
      where: { sessionHash: hashSessionToken(rawToken) },
    });
    if (!session || !this.isActive(session)) {
      return null;
    }
    const user = await this.users.findById(session.userId);
    if (!user) {
      return null;
    }
    const now = new Date();
    if (
      options.rotate &&
      now.getTime() - session.createdAt.getTime() >= SESSION_ROTATE_AFTER_MS
    ) {
      session.revokedAt = now;
      await this.sessions.save(session);
      const issued = await this.issue(user.id);
      return { user, sessionId: issued.id, rotatedToken: issued.token };
    }
    if (
      now.getTime() - session.lastSeenAt.getTime() >=
      LAST_SEEN_WRITE_INTERVAL_MS
    ) {
      session.lastSeenAt = now;
      await this.sessions.save(session);
    }
    return { user, sessionId: session.id };
  }

  async revokeByToken(rawToken: string | undefined): Promise<string | null> {
    if (!rawToken) {
      return null;
    }
    const session = await this.sessions.findOne({
      where: { sessionHash: hashSessionToken(rawToken) },
    });
    if (!session || session.revokedAt) {
      return session?.userId ?? null;
    }
    session.revokedAt = new Date();
    await this.sessions.save(session);
    return session.userId;
  }

  private isActive(session: Session): boolean {
    return (
      session.revokedAt === null && session.expiresAt.getTime() > Date.now()
    );
  }
}
