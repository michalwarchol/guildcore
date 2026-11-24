import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthAuditEvent } from './auth-audit-event.entity';
import { AuthController } from './auth.controller';
import { AuthCredential } from './auth-credential.entity';
import { AuthIdentity } from './auth-identity.entity';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionGateway } from './session.gateway';
import { Session } from './session.entity';
import { SessionService } from './session.service';
import { SteamProfile } from './steam-profile.entity';

const TEST_AUTH_LIMIT = 5;
const DEFAULT_AUTH_LIMIT = 10;

@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([
      AuthCredential,
      Session,
      AuthIdentity,
      SteamProfile,
      AuthAuditEvent,
    ]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 60_000,
            limit:
              config.get<string>('nodeEnv') === 'test'
                ? TEST_AUTH_LIMIT
                : DEFAULT_AUTH_LIMIT,
          },
        ],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionAuthGuard, CsrfGuard, SessionGateway],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
