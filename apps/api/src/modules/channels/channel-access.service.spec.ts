import { Channel } from './channel.entity';
import { ChannelAccessService } from './channel-access.service';
import { Permission } from '../guilds/permissions';

describe('ChannelAccessService', () => {
  const channel: Channel = {
    id: 'channel-1',
    guildId: 'guild-1',
    sectionId: null,
    name: 'lobby',
    type: 'text',
    emoji: '#',
    gameTag: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function serviceFor(found: Channel | null, granted: number | null) {
    const channels = {
      findOne: jest.fn().mockResolvedValue(found),
    };
    const guilds = {
      permissionsFor: jest.fn().mockResolvedValue(granted),
    };
    return new ChannelAccessService(
      channels as never,
      guilds as never,
    );
  }

  it('denies voice join for a text channel', async () => {
    const service = serviceFor(channel, Permission.ADMINISTRATOR);
    await expect(service.canJoinVoice('user', channel.id)).resolves.toBe(false);
  });

  it('allows voice join when the member can connect', async () => {
    const voice: Channel = {
      id: channel.id,
      guildId: channel.guildId,
      sectionId: null,
      name: channel.name,
      type: 'voice',
      emoji: channel.emoji,
      gameTag: null,
      position: 0,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
    const service = serviceFor(voice, Permission.CONNECT_VOICE);
    await expect(service.canJoinVoice('user', channel.id)).resolves.toBe(true);
  });

  it('denies a missing permission and a missing channel', async () => {
    const denied = serviceFor(channel, Permission.VIEW_CHANNEL);
    await expect(denied.canSendMessage('user', channel.id)).resolves.toBe(false);
    const missing = serviceFor(null, Permission.ADMINISTRATOR);
    await expect(missing.canViewChannel('user', channel.id)).resolves.toBe(false);
  });
});
