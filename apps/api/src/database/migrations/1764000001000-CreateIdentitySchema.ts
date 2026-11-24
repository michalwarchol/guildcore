import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentitySchema1764000001000 implements MigrationInterface {
  name = 'CreateIdentitySchema1764000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar(32) NOT NULL,
        "email" varchar(320) NOT NULL,
        "display_name" varchar(64) NOT NULL,
        "avatar_url" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_username" UNIQUE ("username"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_credentials" (
        "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "password_hash" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_hash" varchar(64) NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "last_seen_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_sessions_session_hash" UNIQUE ("session_hash")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_sessions_user_expires"
      ON "sessions" ("user_id", "expires_at")
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "provider" varchar(32) NOT NULL,
        "provider_user_id" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_auth_identities_provider_user" UNIQUE ("provider", "provider_user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "steam_profiles" (
        "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "steam_id" text NOT NULL,
        "persona_name" text,
        "avatar_url" text,
        "profile_url" text,
        "visibility_state" text,
        "last_synced_at" timestamptz,
        CONSTRAINT "uq_steam_profiles_steam_id" UNIQUE ("steam_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_audit_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(32) NOT NULL,
        "ip" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_auth_audit_events_action" CHECK (
          "action" IN (
            'register',
            'login_success',
            'login_failure',
            'logout',
            'profile_update'
          )
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "auth_audit_events"');
    await queryRunner.query('DROP TABLE IF EXISTS "steam_profiles"');
    await queryRunner.query('DROP TABLE IF EXISTS "auth_identities"');
    await queryRunner.query('DROP TABLE IF EXISTS "sessions"');
    await queryRunner.query('DROP TABLE IF EXISTS "auth_credentials"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
