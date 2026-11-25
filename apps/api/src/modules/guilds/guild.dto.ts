import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  ValidateIf,
} from 'class-validator';
import { Guild } from './guild.entity';
import { GuildMember } from './guild-member.entity';

export class CreateGuildRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @Length(1, 500)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://example.com/icon.png' })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  iconUrl?: string | null;
}

export class UpdateGuildRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @Length(1, 500)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://example.com/icon.png' })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  iconUrl?: string | null;
}

export class GuildMembershipResponseDto {
  @ApiProperty({ format: 'date-time' })
  joinedAt: string;

  @ApiProperty({ nullable: true })
  nickname: string | null;
}

export class GuildResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  iconUrl: string | null;

  @ApiProperty({ format: 'uuid' })
  ownerId: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class GuildDetailResponseDto extends GuildResponseDto {
  @ApiProperty({ type: GuildMembershipResponseDto })
  membership: GuildMembershipResponseDto;
}

export function toGuildResponse(guild: Guild): GuildResponseDto {
  return {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    iconUrl: guild.iconUrl,
    ownerId: guild.ownerId,
    createdAt: guild.createdAt.toISOString(),
    updatedAt: guild.updatedAt.toISOString(),
  };
}

export function toGuildDetail(
  guild: Guild,
  member: GuildMember,
): GuildDetailResponseDto {
  const response = toGuildResponse(guild);
  return {
    ...response,
    membership: {
      joinedAt: member.joinedAt.toISOString(),
      nickname: member.nickname,
    },
  };
}
