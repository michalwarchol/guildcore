import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GuildsModule } from '../guilds/guilds.module';
import { ChannelAccessService } from './channel-access.service';
import { ChannelSection } from './channel-section.entity';
import { Channel } from './channel.entity';
import { ChannelsController, SectionsController } from './channels.controller';
import { ChannelsService } from './channels.service';

@Module({
  imports: [
    AuthModule,
    GuildsModule,
    TypeOrmModule.forFeature([Channel, ChannelSection]),
  ],
  controllers: [ChannelsController, SectionsController],
  providers: [ChannelsService, ChannelAccessService],
  exports: [ChannelAccessService],
})
export class ChannelsModule {}
