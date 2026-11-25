import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { GuildsService } from '../guilds/guilds.service';
import { Permission } from '../guilds/permissions';
import { ChannelSection } from './channel-section.entity';
import { Channel, ChannelType } from './channel.entity';

export interface NewChannel {
  name: string;
  type: ChannelType;
  emoji: string;
  gameTag?: string | null;
}

export interface ChannelPatch {
  name?: string;
  emoji?: string;
  gameTag?: string | null;
  sectionId?: string | null;
}

@Injectable()
export class ChannelsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Channel)
    private readonly channels: Repository<Channel>,
    @InjectRepository(ChannelSection)
    private readonly sections: Repository<ChannelSection>,
    private readonly guilds: GuildsService,
  ) {}

  async createChannel(
    userId: string,
    guildId: string,
    input: NewChannel,
  ): Promise<Channel> {
    await this.guilds.assertPermission(
      userId,
      guildId,
      Permission.MANAGE_CHANNELS,
    );
    const position = await this.nextChannelPosition(guildId, null);
    return this.channels.save(
      this.channels.create({
        guildId,
        sectionId: null,
        name: input.name,
        type: input.type,
        emoji: input.emoji,
        gameTag: input.gameTag ?? null,
        position,
      }),
    );
  }

  async tree(
    userId: string,
    guildId: string,
  ): Promise<{ sections: ChannelSection[]; channels: Channel[] }> {
    await this.guilds.assertPermission(userId, guildId, Permission.VIEW_CHANNEL);
    const [sections, channels] = await Promise.all([
      this.sections.find({
        where: { guildId },
        order: { position: 'ASC', id: 'ASC' },
      }),
      this.channels.find({
        where: { guildId },
        order: { position: 'ASC', id: 'ASC' },
      }),
    ]);
    return { sections, channels };
  }

  async updateChannel(
    userId: string,
    channelId: string,
    patch: ChannelPatch,
  ): Promise<Channel> {
    const channel = await this.requireChannel(channelId);
    await this.guilds.assertPermission(
      userId,
      channel.guildId,
      Permission.MANAGE_CHANNELS,
    );
    if (patch.name !== undefined) {
      channel.name = patch.name;
    }
    if (patch.emoji !== undefined) {
      channel.emoji = patch.emoji;
    }
    if (patch.gameTag !== undefined) {
      channel.gameTag = patch.gameTag;
    }
    if (patch.sectionId !== undefined && patch.sectionId !== channel.sectionId) {
      if (patch.sectionId !== null) {
        await this.requireSection(channel.guildId, patch.sectionId);
      }
      channel.sectionId = patch.sectionId;
      channel.position = await this.nextChannelPosition(
        channel.guildId,
        patch.sectionId,
      );
    }
    return this.channels.save(channel);
  }

  async deleteChannel(userId: string, channelId: string): Promise<void> {
    const channel = await this.requireChannel(channelId);
    await this.guilds.assertPermission(
      userId,
      channel.guildId,
      Permission.MANAGE_CHANNELS,
    );
    await this.channels.delete({ id: channel.id });
  }

  async createSection(
    userId: string,
    guildId: string,
    name: string,
    channelIds: string[],
  ): Promise<{ section: ChannelSection; channels: Channel[] }> {
    await this.guilds.assertPermission(
      userId,
      guildId,
      Permission.MANAGE_CHANNELS,
    );
    const uniqueIds = [...new Set(channelIds)];
    return this.dataSource.transaction(async (manager) => {
      const channels = await this.channelsInGuild(manager, guildId, uniqueIds);
      const position = await this.nextSectionPosition(manager, guildId);
      const section = await manager.getRepository(ChannelSection).save(
        manager.getRepository(ChannelSection).create({
          guildId,
          name,
          position,
        }),
      );
      const ordered = uniqueIds.map((id, index) => {
        const channel = channels.get(id);
        if (!channel) {
          throw new NotFoundException('Channel not found');
        }
        channel.sectionId = section.id;
        channel.position = index;
        return channel;
      });
      if (ordered.length > 0) {
        await manager.getRepository(Channel).save(ordered);
      }
      return { section, channels: ordered };
    });
  }

  async renameSection(
    userId: string,
    sectionId: string,
    name: string,
  ): Promise<ChannelSection> {
    const section = await this.sections.findOne({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    await this.guilds.assertPermission(
      userId,
      section.guildId,
      Permission.MANAGE_CHANNELS,
    );
    section.name = name;
    return this.sections.save(section);
  }

  async deleteSection(userId: string, sectionId: string): Promise<void> {
    const section = await this.sections.findOne({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    await this.guilds.assertPermission(
      userId,
      section.guildId,
      Permission.MANAGE_CHANNELS,
    );
    await this.dataSource.transaction(async (manager) => {
      const grouped = await manager.getRepository(Channel).find({
        where: { sectionId: section.id },
        order: { position: 'ASC', id: 'ASC' },
      });
      let position = await this.nextChannelPosition(
        section.guildId,
        null,
        manager,
      );
      for (const channel of grouped) {
        channel.sectionId = null;
        channel.position = position;
        position += 1;
      }
      if (grouped.length > 0) {
        await manager.getRepository(Channel).save(grouped);
      }
      await manager.getRepository(ChannelSection).delete({ id: section.id });
    });
  }

  private async requireChannel(channelId: string): Promise<Channel> {
    const channel = await this.channels.findOne({ where: { id: channelId } });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  private async requireSection(
    guildId: string,
    sectionId: string,
  ): Promise<ChannelSection> {
    const section = await this.sections.findOne({
      where: { id: sectionId, guildId },
    });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  private async channelsInGuild(
    manager: EntityManager,
    guildId: string,
    ids: string[],
  ): Promise<Map<string, Channel>> {
    if (ids.length === 0) {
      return new Map();
    }
    const found = await manager.getRepository(Channel).find({
      where: { guildId, id: In(ids) },
    });
    if (found.length !== ids.length) {
      throw new NotFoundException('Channel not found');
    }
    return new Map(found.map((channel) => [channel.id, channel]));
  }

  private async nextChannelPosition(
    guildId: string,
    sectionId: string | null,
    manager?: EntityManager,
  ): Promise<number> {
    const repository = (manager ?? this.dataSource.manager).getRepository(Channel);
    const row = await repository.findOne({
      where: { guildId, sectionId: sectionId === null ? IsNull() : sectionId },
      order: { position: 'DESC' },
    });
    return row ? row.position + 1 : 0;
  }

  private async nextSectionPosition(
    manager: EntityManager,
    guildId: string,
  ): Promise<number> {
    const row = await manager.getRepository(ChannelSection).findOne({
      where: { guildId },
      order: { position: 'DESC' },
    });
    return row ? row.position + 1 : 0;
  }
}
