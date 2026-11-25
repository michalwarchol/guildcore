import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import {
  generateOpaqueToken,
  hashSessionToken,
} from '../auth/session-token';
import { GuildInvitation } from './guild-invitation.entity';
import { Guild } from './guild.entity';
import { GuildsService } from './guilds.service';
import { Permission, hasPermission } from './permissions';

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface CreatedInvitation {
  id: string;
  token: string;
  expiresAt: Date;
}

export interface InvitationPreview {
  guild: { id: string; name: string };
  expiresAt: Date;
  alreadyMember: boolean;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly guilds: GuildsService,
    @InjectRepository(GuildInvitation)
    private readonly invitations: Repository<GuildInvitation>,
    @InjectRepository(Guild)
    private readonly guildRepository: Repository<Guild>,
  ) {}

  async create(userId: string, guildId: string): Promise<CreatedInvitation> {
    await this.guilds.getForMember(userId, guildId);
    const token = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const saved = await this.invitations.save(
      this.invitations.create({
        guildId,
        createdBy: userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
        revokedAt: null,
      }),
    );
    return { id: saved.id, token, expiresAt: saved.expiresAt };
  }

  async list(userId: string, guildId: string): Promise<GuildInvitation[]> {
    await this.guilds.getForMember(userId, guildId);
    const admin = await this.isAdministrator(userId, guildId);
    return this.invitations.find({
      where: {
        guildId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
        ...(admin ? {} : { createdBy: userId }),
      },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
  }

  async revoke(
    userId: string,
    guildId: string,
    invitationId: string,
  ): Promise<void> {
    await this.guilds.getForMember(userId, guildId);
    const invitation = await this.invitations.findOne({
      where: { id: invitationId, guildId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.revokedAt) {
      return;
    }
    const admin = await this.isAdministrator(userId, guildId);
    if (invitation.createdBy !== userId && !admin) {
      throw new ForbiddenException('Missing permission');
    }
    invitation.revokedAt = new Date();
    await this.invitations.save(invitation);
  }

  async preview(userId: string, token: string): Promise<InvitationPreview> {
    const invitation = await this.findUsable(token);
    const guild = await this.loadGuild(invitation.guildId);
    const membership = await this.guilds.permissionsFor(userId, guild.id);
    return {
      guild: { id: guild.id, name: guild.name },
      expiresAt: invitation.expiresAt,
      alreadyMember: membership !== null,
    };
  }

  async accept(userId: string, token: string): Promise<Guild> {
    const invitation = await this.findUsable(token);
    const guild = await this.loadGuild(invitation.guildId);
    await this.guilds.addMember(guild.id, userId);
    return guild;
  }

  private async findUsable(token: string): Promise<GuildInvitation> {
    if (!INVITE_TOKEN_PATTERN.test(token)) {
      throw new NotFoundException('Invitation not found');
    }
    const invitation = await this.invitations.findOne({
      where: { tokenHash: hashSessionToken(token) },
    });
    if (
      !invitation ||
      invitation.revokedAt !== null ||
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      throw new NotFoundException('Invitation not found');
    }
    return invitation;
  }

  private async loadGuild(guildId: string): Promise<Guild> {
    const guild = await this.guildRepository.findOne({ where: { id: guildId } });
    if (!guild) {
      throw new NotFoundException('Invitation not found');
    }
    return guild;
  }

  private async isAdministrator(userId: string, guildId: string): Promise<boolean> {
    const granted = await this.guilds.permissionsFor(userId, guildId);
    return granted !== null && hasPermission(granted, Permission.ADMINISTRATOR);
  }
}
