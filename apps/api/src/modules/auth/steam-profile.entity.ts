import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'steam_profiles' })
export class SteamProfile {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'steam_id', type: 'text', unique: true })
  steamId: string;

  @Column({ name: 'persona_name', type: 'text', nullable: true })
  personaName: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'profile_url', type: 'text', nullable: true })
  profileUrl: string | null;

  @Column({ name: 'visibility_state', type: 'text', nullable: true })
  visibilityState: string | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;
}
