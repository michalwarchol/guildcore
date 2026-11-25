import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GuildInvitation } from './guild-invitation.entity';
import { GuildMember } from './guild-member.entity';
import { Guild } from './guild.entity';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { MemberRole } from './member-role.entity';
import { Role } from './role.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Guild, GuildMember, Role, MemberRole, GuildInvitation]),
  ],
  controllers: [GuildsController, InvitationsController],
  providers: [GuildsService, InvitationsService],
  exports: [GuildsService],
})
export class GuildsModule {}
