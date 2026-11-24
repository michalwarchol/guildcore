import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { CsrfGuard, CsrfMode } from '../auth/csrf.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { User } from './user.entity';
import { toUserResponse, UpdateProfileRequestDto, UserResponseDto } from './user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth('guildcore.session')
@Controller('users')
@UseGuards(SessionAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse()
  me(@CurrentUser() user: User): UserResponseDto {
    return toUserResponse(user);
  }

  @Patch('me')
  @UseGuards(CsrfGuard)
  @CsrfMode('token')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Origin or CSRF token was rejected' })
  async updateMe(
    @CurrentUser() user: User,
    @Body() body: UpdateProfileRequestDto,
    @Req() request: Request,
  ): Promise<UserResponseDto> {
    const updated = await this.users.updateProfile(user.id, {
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
    });
    await this.auth.recordProfileUpdate(user.id, request.ip ?? null);
    return toUserResponse(updated);
  }
}
