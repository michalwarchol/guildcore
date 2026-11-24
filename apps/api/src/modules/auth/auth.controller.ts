import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UserResponseDto } from '../users/user.dto';
import { AuthService } from './auth.service';
import { LoginRequestDto, RegisterRequestDto } from './auth.dto';
import { CsrfGuard, CsrfMode } from './csrf.guard';
import { clearAuthCookies, writeAuthCookies } from './session-auth.guard';
import { SESSION_COOKIE } from './session-token';

@ApiTags('auth')
@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(201)
  @CsrfMode('origin')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Origin is not allowed' })
  register(
    @Body() body: RegisterRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    return this.establish(this.auth.register(body, clientIp(request)), response);
  }

  @Post('login')
  @HttpCode(200)
  @CsrfMode('origin')
  @UseGuards(ThrottlerGuard)
  @ApiCookieAuth('guildcore.session')
  @ApiOperation({ summary: 'Start a session with email and password' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({ description: 'Origin is not allowed' })
  login(
    @Body() body: LoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    return this.establish(this.auth.login(body, clientIp(request)), response);
  }

  @Post('logout')
  @HttpCode(204)
  @CsrfMode('logout')
  @ApiCookieAuth('guildcore.session')
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Origin or CSRF token was rejected' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const rawToken = request.cookies?.[SESSION_COOKIE] as string | undefined;
    await this.auth.logout(rawToken, clientIp(request));
    clearAuthCookies(response, this.config.getOrThrow<string>('apiUrl'));
  }

  private async establish(
    pending: ReturnType<AuthService['register']>,
    response: Response,
  ): Promise<UserResponseDto> {
    const result = await pending;
    writeAuthCookies(
      response,
      this.config.getOrThrow<string>('apiUrl'),
      result.session.token,
    );
    return result.profile;
  }
}

function clientIp(request: Request): string | null {
  return request.ip ?? null;
}
