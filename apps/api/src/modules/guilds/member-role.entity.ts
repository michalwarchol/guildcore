import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'member_roles' })
export class MemberRole {
  @PrimaryColumn({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;
}
