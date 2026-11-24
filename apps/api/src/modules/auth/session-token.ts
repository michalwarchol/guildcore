import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'guildcore.session';
export const CSRF_COOKIE = 'guildcore.csrf';
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const SESSION_ROTATE_AFTER_MS = 24 * 60 * 60 * 1000;
export const LAST_SEEN_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isSecureCookie(apiUrl: string): boolean {
  return new URL(apiUrl).protocol === 'https:';
}

export function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function csrfCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}
