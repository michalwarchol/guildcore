import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'guild_invitations' })
@Index('idx_guild_invitations_guild_expires', ['guildId', 'expiresAt'])
export class GuildInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
