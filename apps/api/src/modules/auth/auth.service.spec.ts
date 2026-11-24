import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AuthAuditEvent } from './auth-audit-event.entity';
import { AuthCredential } from './auth-credential.entity';
import { AuthService } from './auth.service';
import { hashPassword } from './password';
import { SessionService } from './session.service';

async function passwordHashForTest(): Promise<string> {
  return hashPassword('different-password');
}

describe('AuthService', () => {
  const users = {
    findByEmail: jest.fn(),
    insertProfile: jest.fn(),
  };
  const sessions = {
    issue: jest.fn().mockResolvedValue({
      id: 'session-id',
      token: 'raw-token',
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
    }),
  };
  const credentials = {
    findOne: jest.fn(),
  };
  const audits = {
    create: jest.fn((value: unknown) => value),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      dataSource as unknown as DataSource,
      users as unknown as UsersService,
      sessions as unknown as SessionService,
      credentials as unknown as Repository<AuthCredential>,
      audits as unknown as Repository<AuthAuditEvent>,
    );
  });

  it('rejects a duplicate username from profile creation', async () => {
    dataSource.transaction.mockImplementation(
      async (callback: (manager: object) => Promise<unknown>) =>
        callback({}),
    );
    users.insertProfile.mockRejectedValue(
      new ConflictException('Username is already taken'),
    );

    await expect(
      service.register(
        {
          email: 'ada@michalwarchol.com',
          username: 'ada',
          password: 'password123',
        },
        null,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the same login error and still verifies a hash when the email is unknown', async () => {
    users.findByEmail.mockResolvedValue(null);

    const attempt = service.login(
      { email: 'missing@michalwarchol.com', password: 'password123' },
      '127.0.0.1',
    );

    await expect(attempt).rejects.toEqual(
      new UnauthorizedException('Invalid email or password'),
    );
    expect(audits.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login_failure', userId: null }),
    );
    const saved = audits.save.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(saved)).not.toContain('missing@michalwarchol.com');
    expect(JSON.stringify(saved)).not.toContain('password123');
  });

  it('does not reveal whether the password was the failing field', async () => {
    users.findByEmail.mockResolvedValue({ id: 'user-id' });
    credentials.findOne.mockResolvedValue({
      passwordHash: await passwordHashForTest(),
    });

    await expect(
      service.login(
        { email: 'ada@michalwarchol.com', password: 'password123' },
        null,
      ),
    ).rejects.toEqual(new UnauthorizedException('Invalid email or password'));
  });
});
