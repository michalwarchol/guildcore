import {
  Body,
  Controller,
  Get,
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
import {
  CreateGuildRequestDto,
  GuildDetailResponseDto,
  GuildResponseDto,
  UpdateGuildRequestDto,
  toGuildDetail,
  toGuildResponse,
} from './guild.dto';
import { GuildsService } from './guilds.service';

@ApiTags('guilds')
@ApiCookieAuth('guildcore.session')
@Controller('guilds')
@UseGuards(SessionAuthGuard)
export class GuildsController {
  constructor(private readonly guilds: GuildsService) {}

  @Post()
  @UseGuards(ThrottlerGuard, CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Create a guild' })
  @ApiCreatedResponse({ type: GuildResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async create(
    @CurrentUser() user: User,
    @Body() body: CreateGuildRequestDto,
  ): Promise<GuildResponseDto> {
    const guild = await this.guilds.create(user.id, body);
    return toGuildResponse(guild);
  }

  @Get()
  @ApiOperation({ summary: 'List guilds the caller belongs to' })
  @ApiOkResponse({ type: GuildResponseDto, isArray: true })
  @ApiUnauthorizedResponse()
  async list(@CurrentUser() user: User): Promise<GuildResponseDto[]> {
    const guilds = await this.guilds.listForUser(user.id);
    return guilds.map(toGuildResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a guild the caller belongs to' })
  @ApiOkResponse({ type: GuildDetailResponseDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async get(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GuildDetailResponseDto> {
    const { guild, member } = await this.guilds.getForMember(user.id, id);
    return toGuildDetail(guild, member);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Update a guild' })
  @ApiOkResponse({ type: GuildResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGuildRequestDto,
  ): Promise<GuildResponseDto> {
    const guild = await this.guilds.update(user.id, id, body);
    return toGuildResponse(guild);
  }
}
