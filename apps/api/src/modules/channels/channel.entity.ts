import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ChannelType = 'text' | 'voice';

@Entity({ name: 'channels' })
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'section_id', type: 'uuid', nullable: true })
  sectionId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  type: ChannelType;

  @Column({ type: 'varchar', length: 32 })
  emoji: string;

  @Column({ name: 'game_tag', type: 'varchar', length: 64, nullable: true })
  gameTag: string | null;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
