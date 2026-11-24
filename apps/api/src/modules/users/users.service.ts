import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity';

export interface NewProfile {
  email: string;
  username: string;
  displayName: string;
}

export interface ProfilePatch {
  displayName?: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async insertProfile(
    manager: EntityManager,
    input: NewProfile,
  ): Promise<User> {
    const repository = manager.getRepository(User);
    const emailOwner = await repository.findOne({
      where: { email: input.email },
    });
    if (emailOwner) {
      throw new ConflictException('Email is already registered');
    }
    const usernameOwner = await repository.findOne({
      where: { username: input.username },
    });
    if (usernameOwner) {
      throw new ConflictException('Username is already taken');
    }
    try {
      const user = repository.create({
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        avatarUrl: null,
      });
      return await repository.save(user);
    } catch (error) {
      throw mapUniqueViolation(error);
    }
  }

  async updateProfile(userId: string, patch: ProfilePatch): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new ConflictException('User no longer exists');
    }
    if (patch.displayName !== undefined) {
      user.displayName = patch.displayName;
    }
    if (patch.avatarUrl !== undefined) {
      user.avatarUrl = patch.avatarUrl;
    }
    return this.users.save(user);
  }
}

function mapUniqueViolation(error: unknown): unknown {
  if (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  ) {
    return new ConflictException('Email or username is already registered');
  }
  return error;
}
