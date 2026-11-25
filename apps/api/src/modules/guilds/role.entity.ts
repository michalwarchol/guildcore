import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

const bigintNumber = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'bigint', transformer: bigintNumber })
  permissions: number;

  @Column({ type: 'int' })
  position: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;
}
