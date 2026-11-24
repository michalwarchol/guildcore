const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
