import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { Channel, type ChannelType } from './channel.entity';
import { ChannelSection } from './channel-section.entity';

const CHANNEL_TYPES: ChannelType[] = ['text', 'voice'];

export class CreateChannelRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: CHANNEL_TYPES })
  @IsIn(CHANNEL_TYPES)
  type: ChannelType;

  @ApiProperty({ minLength: 1, maxLength: 32 })
  @IsString()
  @Length(1, 32)
  emoji: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 64, nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @Length(1, 64)
  gameTag?: string | null;
}

export class UpdateChannelRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  emoji?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 64, nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @Length(1, 64)
  gameTag?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  sectionId?: string | null;
}

export class CreateSectionRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  channelIds?: string[];
}

export class UpdateSectionRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;
}

export class ChannelResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  guildId: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  sectionId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CHANNEL_TYPES })
  type: ChannelType;

  @ApiProperty()
  emoji: string;

  @ApiProperty({ nullable: true })
  gameTag: string | null;

  @ApiProperty()
  position: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class SectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  guildId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  position: number;

  @ApiProperty({ type: ChannelResponseDto, isArray: true })
  @Type(() => ChannelResponseDto)
  channels: ChannelResponseDto[];
}

export class ChannelTreeResponseDto {
  @ApiProperty({ type: SectionResponseDto, isArray: true })
  @Type(() => SectionResponseDto)
  sections: SectionResponseDto[];

  @ApiProperty({ type: ChannelResponseDto, isArray: true })
  @Type(() => ChannelResponseDto)
  channels: ChannelResponseDto[];
}

export function toChannelResponse(channel: Channel): ChannelResponseDto {
  return {
    id: channel.id,
    guildId: channel.guildId,
    sectionId: channel.sectionId,
    name: channel.name,
    type: channel.type,
    emoji: channel.emoji,
    gameTag: channel.gameTag,
    position: channel.position,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

export function toSectionResponse(
  section: ChannelSection,
  channels: Channel[],
): SectionResponseDto {
  return {
    id: section.id,
    guildId: section.guildId,
    name: section.name,
    position: section.position,
    channels: channels.map(toChannelResponse),
  };
}
