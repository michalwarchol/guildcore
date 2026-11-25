import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGuildInvitations1764000003000 implements MigrationInterface {
  name = 'CreateGuildInvitations1764000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guild_invitations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" uuid NOT NULL REFERENCES "guilds"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        CONSTRAINT "uq_guild_invitations_token_hash" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_guild_invitations_guild_expires"
      ON "guild_invitations" ("guild_id", "expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "guild_invitations"');
  }
}
