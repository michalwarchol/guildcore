import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const AUTH_AUDIT_ACTIONS = [
  'register',
  'login_success',
  'login_failure',
  'logout',
  'profile_update',
] as const;

export type AuthAuditAction = (typeof AUTH_AUDIT_ACTIONS)[number];

@Entity({ name: 'auth_audit_events' })
export class AuthAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 32 })
  action: AuthAuditAction;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
