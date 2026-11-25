import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { CsrfGuard, CsrfMode } from '../auth/csrf.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { User } from '../users/user.entity';
import { toGuildResponse, GuildResponseDto } from './guild.dto';
import {
  CreateInvitationResponseDto,
  InvitationPreviewResponseDto,
  InvitationSummaryResponseDto,
  toInvitationSummary,
} from './invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiCookieAuth('guildcore.session')
@Controller()
@UseGuards(SessionAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('guilds/:guildId/invitations')
  @UseGuards(ThrottlerGuard, CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Create a 24-hour guild invitation link' })
  @ApiCreatedResponse({ type: CreateInvitationResponseDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async create(
    @CurrentUser() user: User,
    @Param('guildId', ParseUUIDPipe) guildId: string,
  ): Promise<CreateInvitationResponseDto> {
    const created = await this.invitations.create(user.id, guildId);
    return {
      id: created.id,
      token: created.token,
      expiresAt: created.expiresAt.toISOString(),
    };
  }

  @Get('guilds/:guildId/invitations')
  @ApiOperation({ summary: 'List active invitations the caller can revoke' })
  @ApiOkResponse({ type: InvitationSummaryResponseDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async list(
    @CurrentUser() user: User,
    @Param('guildId', ParseUUIDPipe) guildId: string,
  ): Promise<InvitationSummaryResponseDto[]> {
    const invitations = await this.invitations.list(user.id, guildId);
    return invitations.map(toInvitationSummary);
  }

  @Delete('guilds/:guildId/invitations/:invitationId')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Revoke a guild invitation' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async revoke(
    @CurrentUser() user: User,
    @Param('guildId', ParseUUIDPipe) guildId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.invitations.revoke(user.id, guildId, invitationId);
  }

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Preview a guild invitation' })
  @ApiOkResponse({ type: InvitationPreviewResponseDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async preview(
    @CurrentUser() user: User,
    @Param('token') token: string,
  ): Promise<InvitationPreviewResponseDto> {
    const preview = await this.invitations.preview(user.id, token);
    return {
      guild: preview.guild,
      expiresAt: preview.expiresAt.toISOString(),
      alreadyMember: preview.alreadyMember,
    };
  }

  @Post('invitations/:token/accept')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard, CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Accept a guild invitation' })
  @ApiOkResponse({ type: GuildResponseDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async accept(
    @CurrentUser() user: User,
    @Param('token') token: string,
  ): Promise<GuildResponseDto> {
    const guild = await this.invitations.accept(user.id, token);
    return toGuildResponse(guild);
  }
}
