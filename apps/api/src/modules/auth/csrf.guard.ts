import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CSRF_COOKIE, SESSION_COOKIE, tokensMatch } from './session-token';

export const CSRF_MODE = 'csrfMode';

export type CsrfMode = 'origin' | 'token' | 'logout';

export const CsrfMode = (mode: CsrfMode) => SetMetadata(CSRF_MODE, mode);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const mode =
      this.reflector.getAllAndOverride<CsrfMode>(CSRF_MODE, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'origin';
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.header('origin');
    const allowed = new Set([
      originOf(this.config.getOrThrow<string>('webUrl')),
      originOf(this.config.getOrThrow<string>('apiUrl')),
    ]);
    if (!origin || !allowed.has(origin)) {
      throw new ForbiddenException('Invalid origin');
    }
    if (mode === 'origin') {
      return true;
    }
    const csrfCookie = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const sessionCookie = request.cookies?.[SESSION_COOKIE] as
      | string
      | undefined;
    const header = request.header('x-csrf-token');
    const tokenRequired =
      mode === 'token' ||
      (mode === 'logout' && (Boolean(csrfCookie) || Boolean(sessionCookie)));
    if (!tokenRequired) {
      return true;
    }
    if (!csrfCookie || !header || !tokensMatch(csrfCookie, header)) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}

function originOf(value: string): string {
  return new URL(value).origin;
}
