import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CSRF_COOKIE, SESSION_COOKIE } from './session-token';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const config = {
    getOrThrow: (key: string) =>
      key === 'webUrl' ? 'http://localhost:5173' : 'http://localhost:3000',
  } as ConfigService;

  function guardFor(mode: 'origin' | 'token' | 'logout'): CsrfGuard {
    const reflector = {
      getAllAndOverride: () => mode,
    } as unknown as Reflector;
    return new CsrfGuard(config, reflector);
  }

  function contextFor(headers: Record<string, string>, cookies: Record<string, string>) {
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => headers[name.toLowerCase()],
          cookies,
        }),
      }),
    } as never;
  }

  it('rejects a cross-site origin', () => {
    const guard = guardFor('origin');
    expect(() =>
      guard.canActivate(
        contextFor({ origin: 'https://evil.example' }, {}),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows the configured web origin', () => {
    const guard = guardFor('origin');
    expect(
      guard.canActivate(
        contextFor({ origin: 'http://localhost:5173' }, {}),
      ),
    ).toBe(true);
  });

  it('requires a matching CSRF token for cookie-authenticated mutations', () => {
    const guard = guardFor('token');
    expect(() =>
      guard.canActivate(
        contextFor(
          { origin: 'http://localhost:5173', 'x-csrf-token': 'nope' },
          { [CSRF_COOKIE]: 'expected' },
        ),
      ),
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(
        contextFor(
          { origin: 'http://localhost:5173', 'x-csrf-token': 'expected' },
          { [CSRF_COOKIE]: 'expected' },
        ),
      ),
    ).toBe(true);
  });

  it('allows logout when no session or CSRF cookie is present', () => {
    const guard = guardFor('logout');
    expect(
      guard.canActivate(contextFor({ origin: 'http://localhost:3000' }, {})),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        contextFor(
          { origin: 'http://localhost:3000' },
          { [SESSION_COOKIE]: 'present' },
        ),
      ),
    ).toThrow(ForbiddenException);
  });
});
