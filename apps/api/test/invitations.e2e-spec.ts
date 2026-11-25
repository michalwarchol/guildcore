import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { DataSource, Like } from 'typeorm';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { CSRF_COOKIE } from '../src/modules/auth/session-token';
import { GuildInvitation } from '../src/modules/guilds/guild-invitation.entity';
import { GuildMember } from '../src/modules/guilds/guild-member.entity';
import { MemberRole } from '../src/modules/guilds/member-role.entity';
import { Role } from '../src/modules/guilds/role.entity';
import { User } from '../src/modules/users/user.entity';

const EMAIL_DOMAIN = '@invitations.e2e.michalwarchol.com';

describe('Guild invitations (e2e)', () => {
  let app: INestApplication<App>;
  let origin: string;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    origin = new URL(app.get(ConfigService).getOrThrow<string>('webUrl')).origin;
    await app.listen(0);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app
      .get(DataSource)
      .getRepository(User)
      .delete({ email: Like(`%${EMAIL_DOMAIN}`) });
    await app.close();
  });

  it('joins members through a multi-use link and revokes it', async () => {
    const owner = await register('owner');
    const member = await register('member');
    const other = await register('other');
    const outsider = await register('outsider');
    const guildId = await createGuild(owner, 'Invite Guild');

    await request(server)
      .post(`/api/v1/guilds/${guildId}/invitations`)
      .set('Origin', origin)
      .set('Cookie', outsider.cookies)
      .set('X-CSRF-Token', outsider.csrf)
      .expect(404);

    const created = await request(server)
      .post(`/api/v1/guilds/${guildId}/invitations`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .expect(201);
    const token = created.body.token as string;
    expect(created.body.id).toEqual(expect.any(String));
    expect(created.body.expiresAt).toEqual(expect.any(String));

    const preview = await request(server)
      .get(`/api/v1/invitations/${token}`)
      .set('Cookie', member.cookies)
      .expect(200);
    expect(preview.body).toMatchObject({
      guild: { id: guildId, name: 'Invite Guild' },
      alreadyMember: false,
    });

    await request(server)
      .get('/api/v1/invitations/not-a-valid-token')
      .set('Cookie', member.cookies)
      .expect(404);

    const joined = await request(server)
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Origin', origin)
      .set('Cookie', member.cookies)
      .set('X-CSRF-Token', member.csrf)
      .expect(200);
    expect(joined.body.id).toBe(guildId);

    await request(server)
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Origin', origin)
      .set('Cookie', member.cookies)
      .set('X-CSRF-Token', member.csrf)
      .expect(200);

    const dataSource = app.get(DataSource);
    const memberships = await dataSource.getRepository(GuildMember).count({
      where: { guildId, userId: member.id },
    });
    expect(memberships).toBe(1);
    const everyone = await dataSource.getRepository(Role).findOneByOrFail({
      guildId,
      isDefault: true,
    });
    const assigned = await dataSource.getRepository(MemberRole).findOne({
      where: { guildId, userId: member.id, roleId: everyone.id },
    });
    expect(assigned).not.toBeNull();

    await request(server)
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Origin', origin)
      .set('Cookie', other.cookies)
      .set('X-CSRF-Token', other.csrf)
      .expect(200);

    const memberInvite = await request(server)
      .post(`/api/v1/guilds/${guildId}/invitations`)
      .set('Origin', origin)
      .set('Cookie', member.cookies)
      .set('X-CSRF-Token', member.csrf)
      .expect(201);

    const visibleToMember = await request(server)
      .get(`/api/v1/guilds/${guildId}/invitations`)
      .set('Cookie', member.cookies)
      .expect(200);
    expect(visibleToMember.body.map((row: { id: string }) => row.id)).toEqual([
      memberInvite.body.id,
    ]);
    expect(visibleToMember.body[0].token).toBeUndefined();

    const visibleToOwner = await request(server)
      .get(`/api/v1/guilds/${guildId}/invitations`)
      .set('Cookie', owner.cookies)
      .expect(200);
    expect(visibleToOwner.body).toHaveLength(2);

    await request(server)
      .delete(`/api/v1/guilds/${guildId}/invitations/${memberInvite.body.id}`)
      .set('Origin', origin)
      .set('Cookie', other.cookies)
      .set('X-CSRF-Token', other.csrf)
      .expect(403);

    await request(server)
      .delete(`/api/v1/guilds/${guildId}/invitations/${created.body.id}`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .expect(204);

    await request(server)
      .get(`/api/v1/invitations/${token}`)
      .set('Cookie', outsider.cookies)
      .expect(404);
    await request(server)
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Origin', origin)
      .set('Cookie', outsider.cookies)
      .set('X-CSRF-Token', outsider.csrf)
      .expect(404);

    await request(server)
      .delete(`/api/v1/guilds/${guildId}/invitations/${memberInvite.body.id}`)
      .set('Origin', origin)
      .set('Cookie', member.cookies)
      .set('X-CSRF-Token', member.csrf)
      .expect(204);
    await request(server)
      .delete(`/api/v1/guilds/${guildId}/invitations/${memberInvite.body.id}`)
      .set('Origin', origin)
      .set('Cookie', member.cookies)
      .set('X-CSRF-Token', member.csrf)
      .expect(204);

    const expired = await request(server)
      .post(`/api/v1/guilds/${guildId}/invitations`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .expect(201);
    await dataSource.getRepository(GuildInvitation).update(expired.body.id as string, {
      expiresAt: new Date(Date.now() - 1000),
    });
    await request(server)
      .get(`/api/v1/invitations/${expired.body.token}`)
      .set('Cookie', outsider.cookies)
      .expect(404);
    await request(server)
      .post(`/api/v1/invitations/${expired.body.token}/accept`)
      .set('Origin', origin)
      .set('Cookie', outsider.cookies)
      .set('X-CSRF-Token', outsider.csrf)
      .expect(404);
  });

  async function createGuild(
    owner: { cookies: string; csrf: string },
    name: string,
  ): Promise<string> {
    const response = await request(server)
      .post('/api/v1/guilds')
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name })
      .expect(201);
    return response.body.id as string;
  }

  async function register(label: string): Promise<{
    id: string;
    cookies: string;
    csrf: string;
  }> {
    const response = await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        email: `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}${EMAIL_DOMAIN}`,
        username: `${label}_${Math.random().toString(16).slice(2, 10)}`.slice(0, 32),
        password: 'password123',
      })
      .expect(201);
    return {
      id: response.body.id as string,
      cookies: cookieHeader(response.headers['set-cookie']),
      csrf: cookieValue(response.headers['set-cookie'], CSRF_COOKIE),
    };
  }
});

function cookieHeader(setCookie: string | string[] | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return list.map((value) => value.split(';')[0]).join('; ');
}

function cookieValue(setCookie: string | string[] | undefined, name: string): string {
  const header = cookieHeader(setCookie);
  const pair = header.split('; ').find((value) => value.startsWith(`${name}=`));
  if (!pair) {
    throw new Error(`Missing ${name} cookie`);
  }
  return decodeURIComponent(pair.slice(name.length + 1));
}
