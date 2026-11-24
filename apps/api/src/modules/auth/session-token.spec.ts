import {
  csrfCookieOptions,
  isSecureCookie,
  sessionCookieOptions,
  tokensMatch,
} from './session-token';

describe('session cookies', () => {
  it('uses a non-secure cookie for local http and a secure cookie for https', () => {
    expect(isSecureCookie('http://localhost:3000')).toBe(false);
    expect(isSecureCookie('https://api.guildcore.gg')).toBe(true);
    expect(sessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(sessionCookieOptions(false).secure).toBe(false);
    expect(csrfCookieOptions(true).httpOnly).toBe(false);
  });

  it('compares CSRF tokens without accepting a different length', () => {
    expect(tokensMatch('same-token', 'same-token')).toBe(true);
    expect(tokensMatch('same-token', 'other')).toBe(false);
  });
});
