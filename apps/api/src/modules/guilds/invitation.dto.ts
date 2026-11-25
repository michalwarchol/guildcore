import { ApiProperty } from '@nestjs/swagger';
import { GuildInvitation } from './guild-invitation.entity';

export class CreateInvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Raw token. Returned only from create.' })
  token: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt: string;
}

export class InvitationSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  createdBy: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt: string;
}

export class InvitationGuildResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

export class InvitationPreviewResponseDto {
  @ApiProperty({ type: InvitationGuildResponseDto })
  guild: InvitationGuildResponseDto;

  @ApiProperty({ format: 'date-time' })
  expiresAt: string;

  @ApiProperty()
  alreadyMember: boolean;
}

export function toInvitationSummary(
  invitation: GuildInvitation,
): InvitationSummaryResponseDto {
  return {
    id: invitation.id,
    createdBy: invitation.createdBy,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
  };
}
