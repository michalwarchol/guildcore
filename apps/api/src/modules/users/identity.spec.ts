import { isUsername, normalizeEmail, normalizeUsername } from './identity';

describe('identity normalization', () => {
  it('lowercases and trims email and username', () => {
    expect(normalizeEmail('  John.Doe@MichalWarchol.com ')).toBe(
      'john.doe@michalwarchol.com',
    );
    expect(normalizeUsername('  John_Doe ')).toBe('john_doe');
  });

  it('accepts normalized usernames of 3 to 32 characters', () => {
    expect(isUsername('john_doe')).toBe(true);
    expect(isUsername('ab')).toBe(false);
    expect(isUsername('John')).toBe(false);
    expect(isUsername('a'.repeat(33))).toBe(false);
  });
});
