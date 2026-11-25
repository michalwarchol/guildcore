import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGuildsChannels1764000002000 implements MigrationInterface {
  name = 'CreateGuildsChannels1764000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guilds" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "description" varchar(500),
        "icon_url" text,
        "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_guilds_owner" ON "guilds" ("owner_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "guild_members" (
        "guild_id" uuid NOT NULL REFERENCES "guilds"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "nickname" varchar(64),
        PRIMARY KEY ("guild_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_guild_members_user" ON "guild_members" ("user_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" uuid NOT NULL REFERENCES "guilds"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "permissions" bigint NOT NULL,
        "position" integer NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        CONSTRAINT "uq_roles_id_guild" UNIQUE ("id", "guild_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "member_roles" (
        "guild_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        PRIMARY KEY ("guild_id", "user_id", "role_id"),
        CONSTRAINT "fk_member_roles_member"
          FOREIGN KEY ("guild_id", "user_id")
          REFERENCES "guild_members" ("guild_id", "user_id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_member_roles_role"
          FOREIGN KEY ("role_id", "guild_id")
          REFERENCES "roles" ("id", "guild_id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "channel_sections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" uuid NOT NULL REFERENCES "guilds"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "position" integer NOT NULL,
        CONSTRAINT "uq_channel_sections_id_guild" UNIQUE ("id", "guild_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "channels" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" uuid NOT NULL REFERENCES "guilds"("id") ON DELETE CASCADE,
        "section_id" uuid,
        "name" varchar(100) NOT NULL,
        "type" varchar(16) NOT NULL,
        "emoji" varchar(32) NOT NULL,
        "game_tag" varchar(64),
        "position" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_channels_type" CHECK ("type" IN ('text', 'voice')),
        CONSTRAINT "fk_channels_section"
          FOREIGN KEY ("section_id")
          REFERENCES "channel_sections" ("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_channels_guild_section_position"
      ON "channels" ("guild_id", "section_id", "position")
    `);
    await queryRunner.query(`
      CREATE FUNCTION "enforce_channel_section_guild"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.section_id IS NOT NULL AND NOT EXISTS (
          SELECT 1
          FROM "channel_sections" AS section
          WHERE section.id = NEW.section_id
            AND section.guild_id = NEW.guild_id
        ) THEN
          RAISE EXCEPTION 'channel section belongs to another guild';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_channels_section_guild"
      BEFORE INSERT OR UPDATE OF "section_id", "guild_id" ON "channels"
      FOR EACH ROW
      EXECUTE FUNCTION "enforce_channel_section_guild"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_channels_section_guild" ON "channels"',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS "enforce_channel_section_guild"()',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "channels"');
    await queryRunner.query('DROP TABLE IF EXISTS "channel_sections"');
    await queryRunner.query('DROP TABLE IF EXISTS "member_roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "guild_members"');
    await queryRunner.query('DROP TABLE IF EXISTS "guilds"');
  }
}
