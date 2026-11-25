import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CsrfGuard, CsrfMode } from '../auth/csrf.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { User } from '../users/user.entity';
import {
  ChannelResponseDto,
  ChannelTreeResponseDto,
  CreateChannelRequestDto,
  CreateSectionRequestDto,
  SectionResponseDto,
  UpdateChannelRequestDto,
  UpdateSectionRequestDto,
  toChannelResponse,
  toSectionResponse,
} from './channel.dto';
import { Channel } from './channel.entity';
import { ChannelsService } from './channels.service';

@ApiTags('channels')
@ApiCookieAuth('guildcore.session')
@Controller()
@UseGuards(SessionAuthGuard)
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Post('guilds/:guildId/channels')
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Create an unsectioned channel' })
  @ApiCreatedResponse({ type: ChannelResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async create(
    @CurrentUser() user: User,
    @Param('guildId', ParseUUIDPipe) guildId: string,
    @Body() body: CreateChannelRequestDto,
  ): Promise<ChannelResponseDto> {
    const channel = await this.channels.createChannel(user.id, guildId, body);
    return toChannelResponse(channel);
  }

  @Get('guilds/:guildId/channels')
  @ApiOperation({ summary: 'List sections and channels in a guild' })
  @ApiOkResponse({ type: ChannelTreeResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async list(
    @CurrentUser() user: User,
    @Param('guildId', ParseUUIDPipe) guildId: string,
  ): Promise<ChannelTreeResponseDto> {
    const { sections, channels } = await this.channels.tree(user.id, guildId);
    const grouped = new Map<string, Channel[]>();
    const root: Channel[] = [];
    for (const channel of channels) {
      if (!channel.sectionId) {
        root.push(channel);
        continue;
      }
      const list = grouped.get(channel.sectionId) ?? [];
      list.push(channel);
      grouped.set(channel.sectionId, list);
    }
    return {
      sections: sections.map((section) =>
        toSectionResponse(section, grouped.get(section.id) ?? []),
      ),
      channels: root.map(toChannelResponse),
    };
  }

  @Patch('channels/:id')
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Update or move a channel' })
  @ApiOkResponse({ type: ChannelResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateChannelRequestDto,
  ): Promise<ChannelResponseDto> {
    const channel = await this.channels.updateChannel(user.id, id, body);
    return toChannelResponse(channel);
  }

  @Delete('channels/:id')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Delete a channel' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.channels.deleteChannel(user.id, id);
  }
}

@ApiTags('sections')
@ApiCookieAuth('guildcore.session')
@Controller()
@UseGuards(SessionAuthGuard)
export class SectionsController {
  constructor(private readonly channels: ChannelsService) {}

  @Post('guilds/:guildId/sections')
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Create a section and optionally move channels into it' })
  @ApiCreatedResponse({ type: SectionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async create(
    @CurrentUser() user: User,
    @Param('guildId', ParseUUIDPipe) guildId: string,
    @Body() body: CreateSectionRequestDto,
  ): Promise<SectionResponseDto> {
    const { section, channels } = await this.channels.createSection(
      user.id,
      guildId,
      body.name,
      body.channelIds ?? [],
    );
    return toSectionResponse(section, channels);
  }

  @Patch('sections/:id')
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Rename a section' })
  @ApiOkResponse({ type: SectionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async rename(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSectionRequestDto,
  ): Promise<SectionResponseDto> {
    const section = await this.channels.renameSection(user.id, id, body.name);
    const { channels } = await this.channels.tree(user.id, section.guildId);
    return toSectionResponse(
      section,
      channels.filter((channel) => channel.sectionId === section.id),
    );
  }

  @Delete('sections/:id')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Delete a section and leave its channels unsectioned' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.channels.deleteSection(user.id, id);
  }
}
