import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'guild_members' })
export class GuildMember {
  @PrimaryColumn({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nickname: string | null;
}
