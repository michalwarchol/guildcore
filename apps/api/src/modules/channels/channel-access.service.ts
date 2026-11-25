import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuildsService } from '../guilds/guilds.service';
import { Permission, hasPermission } from '../guilds/permissions';
import { Channel } from './channel.entity';

@Injectable()
export class ChannelAccessService {
  constructor(
    @InjectRepository(Channel)
    private readonly channels: Repository<Channel>,
    private readonly guilds: GuildsService,
  ) {}

  canViewChannel(userId: string, channelId: string): Promise<boolean> {
    return this.allows(userId, channelId, Permission.VIEW_CHANNEL);
  }

  canSendMessage(userId: string, channelId: string): Promise<boolean> {
    return this.allows(userId, channelId, Permission.SEND_MESSAGES);
  }

  async canJoinVoice(userId: string, channelId: string): Promise<boolean> {
    const channel = await this.channels.findOne({ where: { id: channelId } });
    if (!channel || channel.type !== 'voice') {
      return false;
    }
    return this.memberHas(userId, channel.guildId, Permission.CONNECT_VOICE);
  }

  private async allows(
    userId: string,
    channelId: string,
    required: number,
  ): Promise<boolean> {
    const channel = await this.channels.findOne({ where: { id: channelId } });
    if (!channel) {
      return false;
    }
    return this.memberHas(userId, channel.guildId, required);
  }

  private async memberHas(
    userId: string,
    guildId: string,
    required: number,
  ): Promise<boolean> {
    const granted = await this.guilds.permissionsFor(userId, guildId);
    return granted !== null && hasPermission(granted, required);
  }
}
