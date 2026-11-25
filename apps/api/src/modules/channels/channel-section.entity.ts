import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'channel_sections' })
export class ChannelSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  position: number;
}
