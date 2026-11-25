import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GuildMember } from './guild-member.entity';
import { Guild } from './guild.entity';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { MemberRole } from './member-role.entity';
import { Role } from './role.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Guild, GuildMember, Role, MemberRole]),
  ],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
