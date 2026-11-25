import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { GuildMember } from './guild-member.entity';
import { Guild } from './guild.entity';
import { MemberRole } from './member-role.entity';
import {
  EVERYONE_PERMISSIONS,
  Permission,
  hasPermission,
} from './permissions';
import { Role } from './role.entity';

export interface GuildWrite {
  name: string;
  description?: string | null;
  iconUrl?: string | null;
}

export interface GuildPatch {
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
}

@Injectable()
export class GuildsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Guild)
    private readonly guilds: Repository<Guild>,
    @InjectRepository(GuildMember)
    private readonly members: Repository<GuildMember>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
  ) {}

  async create(ownerId: string, input: GuildWrite): Promise<Guild> {
    return this.dataSource.transaction(async (manager) => {
      const guild = await manager.getRepository(Guild).save(
        manager.getRepository(Guild).create({
          name: input.name,
          description: input.description ?? null,
          iconUrl: input.iconUrl ?? null,
          ownerId,
        }),
      );
      await manager.getRepository(GuildMember).save(
        manager.getRepository(GuildMember).create({
          guildId: guild.id,
          userId: ownerId,
          nickname: null,
        }),
      );
      const everyone = await manager.getRepository(Role).save(
        manager.getRepository(Role).create({
          guildId: guild.id,
          name: 'Everyone',
          permissions: EVERYONE_PERMISSIONS,
          position: 0,
          isDefault: true,
        }),
      );
      const administrator = await manager.getRepository(Role).save(
        manager.getRepository(Role).create({
          guildId: guild.id,
          name: 'Administrator',
          permissions: Permission.ADMINISTRATOR,
          position: 1,
          isDefault: false,
        }),
      );
      await manager.getRepository(MemberRole).save([
        manager.getRepository(MemberRole).create({
          guildId: guild.id,
          userId: ownerId,
          roleId: everyone.id,
        }),
        manager.getRepository(MemberRole).create({
          guildId: guild.id,
          userId: ownerId,
          roleId: administrator.id,
        }),
      ]);
      return guild;
    });
  }

  async listForUser(userId: string): Promise<Guild[]> {
    return this.guilds
      .createQueryBuilder('guild')
      .innerJoin(
        GuildMember,
        'member',
        'member.guild_id = guild.id AND member.user_id = :userId',
        { userId },
      )
      .orderBy('guild.name', 'ASC')
      .addOrderBy('guild.id', 'ASC')
      .getMany();
  }

  async getForMember(
    userId: string,
    guildId: string,
  ): Promise<{ guild: Guild; member: GuildMember }> {
    const member = await this.members.findOne({
      where: { guildId, userId },
    });
    if (!member) {
      throw new NotFoundException('Guild not found');
    }
    const guild = await this.guilds.findOne({ where: { id: guildId } });
    if (!guild) {
      throw new NotFoundException('Guild not found');
    }
    return { guild, member };
  }

  async update(
    userId: string,
    guildId: string,
    patch: GuildPatch,
  ): Promise<Guild> {
    await this.assertPermission(userId, guildId, Permission.MANAGE_GUILD);
    const guild = await this.guilds.findOne({ where: { id: guildId } });
    if (!guild) {
      throw new NotFoundException('Guild not found');
    }
    if (patch.name !== undefined) {
      guild.name = patch.name;
    }
    if (patch.description !== undefined) {
      guild.description = patch.description;
    }
    if (patch.iconUrl !== undefined) {
      guild.iconUrl = patch.iconUrl;
    }
    return this.guilds.save(guild);
  }

  async permissionsFor(userId: string, guildId: string): Promise<number | null> {
    const member = await this.members.findOne({
      where: { guildId, userId },
    });
    if (!member) {
      return null;
    }
    const roles = await this.roles
      .createQueryBuilder('role')
      .innerJoin(
        MemberRole,
        'assignment',
        'assignment.role_id = role.id AND assignment.guild_id = role.guild_id AND assignment.user_id = :userId',
        { userId },
      )
      .where('role.guild_id = :guildId', { guildId })
      .getMany();
    return roles.reduce((granted, role) => granted | role.permissions, 0);
  }

  async assertPermission(
    userId: string,
    guildId: string,
    required: number,
  ): Promise<void> {
    const granted = await this.permissionsFor(userId, guildId);
    if (granted === null) {
      throw new NotFoundException('Guild not found');
    }
    if (!hasPermission(granted, required)) {
      throw new ForbiddenException('Missing permission');
    }
  }

  async addMember(guildId: string, userId: string): Promise<GuildMember> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const members = manager.getRepository(GuildMember);
        const existing = await members.findOne({ where: { guildId, userId } });
        if (existing) {
          return existing;
        }
        const everyone = await manager.getRepository(Role).findOne({
          where: { guildId, isDefault: true },
        });
        if (!everyone) {
          throw new InternalServerErrorException('Guild has no default role');
        }
        const member = await members.save(
          members.create({
            guildId,
            userId,
            nickname: null,
          }),
        );
        await manager.getRepository(MemberRole).save(
          manager.getRepository(MemberRole).create({
            guildId,
            userId,
            roleId: everyone.id,
          }),
        );
        return member;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const existing = await this.members.findOne({ where: { guildId, userId } });
      if (!existing) {
        throw error;
      }
      return existing;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
