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
import { User } from '../src/modules/users/user.entity';

const EMAIL_DOMAIN = '@guilds.e2e.michalwarchol.com';

describe('Guilds and channels (e2e)', () => {
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

  it('builds a guild channel tree and hides it from non-members', async () => {
    const owner = await register('owner');
    const outsider = await register('outsider');

    const created = await request(server)
      .post('/api/v1/guilds')
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        name: 'Night Raid',
        description: 'Weeknight group',
        iconUrl: 'https://cdn.example.com/guild.png',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'Night Raid',
      description: 'Weeknight group',
      iconUrl: 'https://cdn.example.com/guild.png',
      ownerId: owner.id,
    });
    const guildId = created.body.id as string;

    const listed = await request(server)
      .get('/api/v1/guilds')
      .set('Cookie', owner.cookies)
      .expect(200);
    expect(listed.body).toEqual([
      expect.objectContaining({ id: guildId, name: 'Night Raid' }),
    ]);

    const detail = await request(server)
      .get(`/api/v1/guilds/${guildId}`)
      .set('Cookie', owner.cookies)
      .expect(200);
    expect(detail.body.membership.nickname).toBeNull();

    await request(server)
      .get(`/api/v1/guilds/${guildId}`)
      .set('Cookie', outsider.cookies)
      .expect(404);

    const channel1 = await request(server)
      .post(`/api/v1/guilds/${guildId}/channels`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'general', type: 'text', emoji: '💬' })
      .expect(201);
    const channel2 = await request(server)
      .post(`/api/v1/guilds/${guildId}/channels`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        name: 'raid',
        type: 'voice',
        emoji: '🎧',
        gameTag: 'wow',
      })
      .expect(201);

    const section = await request(server)
      .post(`/api/v1/guilds/${guildId}/sections`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'Text', channelIds: [channel1.body.id] })
      .expect(201);
    expect(section.body.channels.map((channel: { id: string }) => channel.id)).toEqual([
      channel1.body.id,
    ]);

    await request(server)
      .patch(`/api/v1/channels/${channel2.body.id}`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({ sectionId: section.body.id })
      .expect(200);

    const tree = await request(server)
      .get(`/api/v1/guilds/${guildId}/channels`)
      .set('Cookie', owner.cookies)
      .expect(200);
    expect(tree.body.channels).toEqual([]);
    expect(tree.body.sections).toHaveLength(1);
    expect(tree.body.sections[0].channels.map((channel: { name: string }) => channel.name)).toEqual([
      'general',
      'raid',
    ]);

    await request(server)
      .get(`/api/v1/guilds/${guildId}/channels`)
      .set('Cookie', outsider.cookies)
      .expect(404);

    await request(server)
      .delete(`/api/v1/sections/${section.body.id}`)
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .expect(204);

    const afterDelete = await request(server)
      .get(`/api/v1/guilds/${guildId}/channels`)
      .set('Cookie', owner.cookies)
      .expect(200);
    expect(afterDelete.body.sections).toEqual([]);
    expect(afterDelete.body.channels.map((channel: { name: string }) => channel.name)).toEqual([
      'general',
      'raid',
    ]);
  });

  it('rejects unauthenticated and invalid guild writes', async () => {
    await request(server).get('/api/v1/guilds').expect(401);
    const owner = await register('invalid');
    await request(server)
      .post('/api/v1/guilds')
      .set('Origin', origin)
      .set('Cookie', owner.cookies)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: '' })
      .expect(400);
    await request(server)
      .get('/api/v1/guilds/not-a-uuid')
      .set('Cookie', owner.cookies)
      .expect(400);
  });

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
