import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { User } from '../users/user.entity';
import { SessionService } from './session.service';
import {
  csrfCookieOptions,
  isSecureCookie,
  SESSION_COOKIE,
  sessionCookieOptions,
  CSRF_COOKIE,
  generateOpaqueToken,
} from './session-token';
import { ConfigService } from '@nestjs/config';

export interface AuthenticatedRequest extends Request {
  currentUser?: User;
  sessionId?: string;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const rawToken = request.cookies?.[SESSION_COOKIE] as string | undefined;
    const resolved = await this.sessions.resolve(rawToken, { rotate: true });
    if (!resolved) {
      throw new UnauthorizedException();
    }
    request.currentUser = resolved.user;
    request.sessionId = resolved.sessionId;
    if (resolved.rotatedToken) {
      const secure = isSecureCookie(this.config.getOrThrow<string>('apiUrl'));
      response.cookie(
        SESSION_COOKIE,
        resolved.rotatedToken,
        sessionCookieOptions(secure),
      );
    }
    return true;
  }
}

export function writeAuthCookies(
  response: Response,
  apiUrl: string,
  sessionToken: string,
): void {
  const secure = isSecureCookie(apiUrl);
  response.cookie(SESSION_COOKIE, sessionToken, sessionCookieOptions(secure));
  response.cookie(CSRF_COOKIE, generateOpaqueToken(), csrfCookieOptions(secure));
}

export function clearAuthCookies(response: Response, apiUrl: string): void {
  const secure = isSecureCookie(apiUrl);
  response.clearCookie(SESSION_COOKIE, sessionCookieOptions(secure));
  response.clearCookie(CSRF_COOKIE, csrfCookieOptions(secure));
}
