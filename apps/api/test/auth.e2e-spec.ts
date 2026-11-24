import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { io } from 'socket.io-client';
import { DataSource, Like } from 'typeorm';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { Session } from '../src/modules/auth/session.entity';
import {
  CSRF_COOKIE,
  generateOpaqueToken,
  hashSessionToken,
  SESSION_COOKIE,
} from '../src/modules/auth/session-token';
import { User } from '../src/modules/users/user.entity';

const EMAIL_DOMAIN = '@e2e.michalwarchol.com';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let origin: string;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp(false);
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

  it('registers, reads and updates the profile, then logout invalidates HTTP and sockets', async () => {
    const email = uniqueEmail('member');
    const username = uniqueUsername('member');
    const registered = await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        email,
        username,
        password: 'password123',
        displayName: 'Member',
      })
      .expect(201);

    expect(registered.body).toMatchObject({
      email,
      username,
      displayName: 'Member',
      avatarUrl: null,
    });
    expect(JSON.stringify(registered.body)).not.toMatch(/passwordHash|sessionHash/i);
    const cookies = cookieHeader(registered.headers['set-cookie']);
    const csrf = cookieValue(registered.headers['set-cookie'], CSRF_COOKIE);

    const me = await request(server)
      .get('/api/v1/users/me')
      .set('Cookie', cookies)
      .expect(200);
    expect(me.body.id).toBe(registered.body.id);

    const patched = await request(server)
      .patch('/api/v1/users/me')
      .set('Origin', origin)
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrf)
      .send({
        displayName: 'Updated Member',
        avatarUrl: 'https://cdn.example.com/a.png',
      })
      .expect(200);
    expect(patched.body.displayName).toBe('Updated Member');
    expect(patched.body.avatarUrl).toBe('https://cdn.example.com/a.png');

    const port = httpPort(server);
    await expect(connectSocket(port, cookies)).resolves.toBeUndefined();

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrf)
      .expect(204);

    await request(server)
      .get('/api/v1/users/me')
      .set('Cookie', cookies)
      .expect(401);
    await expect(connectSocket(port, cookies)).rejects.toThrow(/unauthorized/);
  });

  it('rejects duplicate email and username', async () => {
    const email = uniqueEmail('dup');
    const username = uniqueUsername('dup');
    await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({ email, username, password: 'password123' })
      .expect(201);

    await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        email,
        username: uniqueUsername('other'),
        password: 'password123',
      })
      .expect(409);

    await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        email: uniqueEmail('other'),
        username,
        password: 'password123',
      })
      .expect(409);
  });

  it('uses one error for an unknown email and a wrong password', async () => {
    const email = uniqueEmail('login');
    const username = uniqueUsername('login');
    await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({ email, username, password: 'password123' })
      .expect(201);

    const unknown = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({
        email: uniqueEmail('missing'),
        password: 'password123',
      })
      .expect(401);
    const wrong = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ email, password: 'password456' })
      .expect(401);

    expect(wrong.body).toEqual(unknown.body);
    expect(JSON.stringify(wrong.body)).not.toMatch(/argon2|session/i);
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a missing, expired, or revoked session', async () => {
    await request(server).get('/api/v1/users/me').expect(401);

    const email = uniqueEmail('session');
    const registered = await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        email,
        username: uniqueUsername('session'),
        password: 'password123',
      })
      .expect(201);

    const expiredToken = generateOpaqueToken();
    const revokedToken = generateOpaqueToken();
    const sessions = app.get(DataSource).getRepository(Session);
    const now = new Date();
    await sessions.save([
      sessions.create({
        sessionHash: hashSessionToken(expiredToken),
        userId: registered.body.id as string,
        expiresAt: new Date(now.getTime() - 1000),
        revokedAt: null,
        lastSeenAt: now,
      }),
      sessions.create({
        sessionHash: hashSessionToken(revokedToken),
        userId: registered.body.id as string,
        expiresAt: new Date(now.getTime() + 60_000),
        revokedAt: now,
        lastSeenAt: now,
      }),
    ]);

    await request(server)
      .get('/api/v1/users/me')
      .set('Cookie', `${SESSION_COOKIE}=${expiredToken}`)
      .expect(401);
    await request(server)
      .get('/api/v1/users/me')
      .set('Cookie', `${SESSION_COOKIE}=${revokedToken}`)
      .expect(401);
  });

  it('rejects a cross-site origin and a bad CSRF token', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: uniqueEmail('csrf'), password: 'password123' })
      .expect(403);

    const registered = await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        email: uniqueEmail('csrf'),
        username: uniqueUsername('csrf'),
        password: 'password123',
      })
      .expect(201);
    const cookies = cookieHeader(registered.headers['set-cookie']);

    await request(server)
      .patch('/api/v1/users/me')
      .set('Origin', origin)
      .set('Cookie', cookies)
      .set('X-CSRF-Token', 'not-the-token')
      .send({ displayName: 'Nope' })
      .expect(403);
  });

  it('publishes auth and user routes in OpenAPI', async () => {
    const response = await request(server).get('/api/docs-json').expect(200);
    expect(response.body.paths['/api/v1/auth/login']).toBeDefined();
    expect(response.body.paths['/api/v1/users/me']).toBeDefined();
  });
});

describe('Authentication throttling (e2e)', () => {
  let app: INestApplication<App>;
  let origin: string;

  beforeAll(async () => {
    app = await createApp(true);
    origin = new URL(app.get(ConfigService).getOrThrow<string>('webUrl')).origin;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after the test auth limit', async () => {
    const server = app.getHttpServer();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', origin)
        .send({
          email: `throttle${attempt}${EMAIL_DOMAIN}`,
          password: 'password123',
        })
        .expect(401);
    }
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({
        email: `throttle-blocked${EMAIL_DOMAIN}`,
        password: 'password123',
      })
      .expect(429);
  });
});

async function createApp(throttle: boolean): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (!throttle) {
    builder.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true });
  }
  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  configureApp(app);
  return app;
}

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}${EMAIL_DOMAIN}`;
}

function uniqueUsername(label: string): string {
  return `${label}_${Math.random().toString(16).slice(2, 10)}`.slice(0, 32);
}

function cookieHeader(setCookie: string | string[] | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return list.map((value) => value.split(';')[0]).join('; ');
}

function cookieValue(
  setCookie: string | string[] | undefined,
  name: string,
): string {
  const header = cookieHeader(setCookie);
  const pair = header
    .split('; ')
    .find((value) => value.startsWith(`${name}=`));
  if (!pair) {
    throw new Error(`Missing ${name} cookie`);
  }
  return decodeURIComponent(pair.slice(name.length + 1));
}

function httpPort(server: { address: () => unknown }): number {
  const address = server.address();
  if (typeof address === 'object' && address && 'port' in address) {
    return address.port as number;
  }
  throw new Error('HTTP server is not listening');
}

function connectSocket(port: number, cookie: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      extraHeaders: { cookie },
      reconnection: false,
      timeout: 3000,
    });
    socket.once('connect', () => {
      socket.close();
      resolve();
    });
    socket.once('connect_error', (error: Error) => {
      socket.close();
      reject(error);
    });
  });
}
