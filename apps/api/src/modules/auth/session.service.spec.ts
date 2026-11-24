import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Session } from './session.entity';
import { SessionService } from './session.service';
import { hashSessionToken } from './session-token';

describe('SessionService', () => {
  const sessions = {
    findOne: jest.fn(),
    save: jest.fn(async (value: Session) => value),
    create: jest.fn((value: Partial<Session>) => value),
  };
  const users = {
    findById: jest.fn(),
  };
  const service = new SessionService(
    sessions as unknown as Repository<Session>,
    users as unknown as UsersService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an expired or revoked session', async () => {
    sessions.findOne.mockResolvedValueOnce({
      sessionHash: hashSessionToken('expired'),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      userId: 'user-id',
    });
    sessions.findOne.mockResolvedValueOnce({
      sessionHash: hashSessionToken('revoked'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      userId: 'user-id',
    });

    await expect(
      service.resolve('expired', { rotate: false }),
    ).resolves.toBeNull();
    await expect(
      service.resolve('revoked', { rotate: false }),
    ).resolves.toBeNull();
    expect(users.findById).not.toHaveBeenCalled();
  });
});
