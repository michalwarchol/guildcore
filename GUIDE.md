# Gaming Community Platform — Backend Implementation Guide

> **Status:** Implementation playbook for a planned project; **not** a claim that code has been implemented.  
> **Last reviewed:** 2026-11-23  
> **Companion document:** [ARCHITECTURE.md](./ARCHITECTURE.md)

This guide turns the proposed architecture into incremental, testable development tasks. Start with the backend. Add the React application only when a meaningful API slice exists; add the Electron shell after the web client works well.

## Contents

1. [Working principles](#1-working-principles)
2. [Prerequisites](#2-prerequisites)
3. [Bootstrap the repository](#3-bootstrap-the-repository)
4. [Run local infrastructure](#4-run-local-infrastructure)
5. [Configure the NestJS application](#5-configure-the-nestjs-application)
6. [Set up PostgreSQL and migrations](#6-set-up-postgresql-and-migrations)
7. [Build authentication and users](#7-build-authentication-and-users)
8. [Implement guilds, channels, and permissions](#8-implement-guilds-channels-and-permissions)
9. [Implement text messaging](#9-implement-text-messaging)
10. [Add voice with LiveKit](#10-add-voice-with-livekit)
11. [Connect Steam accounts](#11-connect-steam-accounts)
12. [Introduce background work and infrastructure](#12-introduce-background-work-and-infrastructure)
13. [Prepare the React and Electron clients](#13-prepare-the-react-and-electron-clients)
14. [Testing, CI/CD, and release readiness](#14-testing-cicd-and-release-readiness)
15. [Roadmap and acceptance criteria](#15-roadmap-and-acceptance-criteria)
16. [Troubleshooting and common traps](#16-troubleshooting-and-common-traps)
17. [References](#17-references)

---

## 1. Working principles

- Build **vertical slices** that can be tested end-to-end: database → service → controller/gateway → client/test.
- Use a **modular monolith**, not microservices, until independently deploying a module clearly solves a measured problem.
- Keep NestJS controllers and Socket.IO gateways thin. Business rules and authorization live in services.
- Treat PostgreSQL as the source of truth for messages, permissions, and identities. Redis is **not** permanent message storage.
- Choose explicit migrations (`synchronize: false`) from the first real entity.
- Never trust a user ID, channel ID, room name, SteamID, permission set, or file path received from the client.
- Avoid installing libraries or launching infrastructure before a feature needs them.
- Keep the API usable for **both** future web and desktop clients; do not depend on browser-only assumptions in service code.
- Include success, failure, authorization, and retry tests in every feature's definition of done.

**Recommended development order:** foundation → auth → guilds/channels → chat → voice → Steam → production hardening. Steam can move after auth if product validation needs it sooner.

---

## 2. Prerequisites

Recommended for a fresh setup:

| Tool | Recommendation | Check |
| --- | --- | --- |
| Node.js | Supported LTS (Node.js 26 LTS as of this document's date; 24 LTS is also viable) | `node --version` |
| pnpm | Current compatible release managed with Corepack or an explicit project pin | `pnpm --version` |
| Docker Engine/Desktop | Recent release with Compose v2 | `docker --version` |
| Docker Compose | Compose plugin | `docker compose version` |
| Git | Recent | `git --version` |
| LiveKit server | Install later for voice milestone | `livekit-server --version` |
| PostgreSQL client (optional) | `psql` for inspection | `psql --version` |

The exact NestJS, Node.js, TypeScript, and package-manager versions should be **pinned in your repository and CI** once the first successful install is complete. Avoid copying unbounded `latest` dependencies into production by accident.

On Linux, ensure your user can run Docker without unsafe permission workarounds. Avoid unnecessarily exposing database or Redis ports on the network.

---

## 3. Bootstrap the repository

All commands in this section run from the new repository root unless stated otherwise.

### 3.1 Create a pnpm workspace

```bash
mkdir guildcore
cd guildcore
mkdir -p apps packages infra/docker .github/workflows

git init
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Create the root `package.json`:

```json
{
  "name": "guildcore",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev:api": "pnpm --filter @gaming/api start:dev",
    "build:api": "pnpm --filter @gaming/api build",
    "test:api": "pnpm --filter @gaming/api test"
  }
}
```

The root package is private; individual workspaces use scoped names to make commands unambiguous.

### 3.2 Generate NestJS under `apps/api`

The current NestJS CLI defaults to **ESM + Vitest** when not told otherwise. This guide deliberately selects **CommonJS + Jest**, matching the proposed stack and conventional TypeORM CLI workflow:

```bash
pnpm dlx @nestjs/cli new api \
  --directory apps/api \
  --type cjs \
  --package-manager pnpm \
  --skip-git \
  --skip-install \
  --no-observe \
  --skip-skills \
  --no-interactive
```

Then edit `apps/api/package.json` and change only its `name` to `@gaming/api` (keep the generated dependencies and scripts):

```json
{
  "name": "@gaming/api"
}
```

> The JSON above shows **only the field to update**, not a replacement for the complete generated package file.

Install workspace dependencies:

```bash
pnpm install
```

If you would rather use modern ESM, that is also valid; in that case follow the generator's Vitest defaults and use the ESM-specific TypeORM commands throughout. **Do not mix** the two module systems accidentally.

### 3.3 Install backend dependencies

```bash
pnpm --filter @gaming/api add \
  @nestjs/config \
  @nestjs/typeorm typeorm pg \
  @nestjs/swagger \
  @nestjs/websockets @nestjs/platform-socket.io socket.io \
  class-validator class-transformer \
  argon2 cookie-parser

pnpm --filter @gaming/api add -D \
  @types/cookie-parser \
  dotenv
```

`dotenv` is needed by the migration CLI example below; for normal NestJS startup `@nestjs/config` already loads environment files. `cookie-parser` exposes the cookie values to your HTTP/session middleware. Choose a durable session implementation before building login; `cookie-parser` itself is **not** a session store.

Later, install features at the milestone that requires them:

```bash
# When implementing voice:
pnpm --filter @gaming/api add livekit-server-sdk

# When implementing jobs and Redis-backed state:
pnpm --filter @gaming/api add @nestjs/bullmq bullmq ioredis

# When enabling a multi-instance Socket.IO deployment:
pnpm --filter @gaming/api add @socket.io/redis-adapter
```

The `@socket.io/redis-adapter` has its own Redis client setup and is unnecessary with one API instance. Use a Redis client library compatible with the chosen adapter; do not assume a BullMQ connection is automatically suitable for Socket.IO.

### 3.4 Git hygiene

Add to the repository root `.gitignore` (or verify the generated ignore rules cover them):

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
```

**Commit** `.env.example` and the lockfile (`pnpm-lock.yaml`). **Never commit** real keys, credentials, session cookies, JWTs, or Steam API keys.

---

## 4. Run local infrastructure

Start with **PostgreSQL and Redis in Docker**, and the NestJS process on your host for watch mode. Redis can remain unused at first; running it locally establishes a predictable integration environment.

Create `infra/compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_USER: gaming
      POSTGRES_PASSWORD: gaming_dev
      POSTGRES_DB: gaming_platform
    ports:
      - '127.0.0.1:5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U gaming -d gaming_platform']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ['redis-server', '--appendonly', 'yes']
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Run:

```bash
docker compose -f infra/compose.yaml up -d

docker compose -f infra/compose.yaml ps

docker compose -f infra/compose.yaml exec postgres \
  psql -U gaming -d gaming_platform -c 'SELECT 1;'

docker compose -f infra/compose.yaml exec redis \
  redis-cli ping
```

Expected: PostgreSQL returns a `1` row; Redis replies `PONG`.

Stop without deleting data:

```bash
docker compose -f infra/compose.yaml down
```

To **delete all local data** (destructive):

```bash
docker compose -f infra/compose.yaml down -v
```

The usernames and passwords above are **development-only** examples, not production secrets. In production do not publish PostgreSQL or Redis ports broadly and require appropriate network isolation/authentication.

---

## 5. Configure the NestJS application

### 5.1 Environment variables

Create `apps/api/.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://gaming:gaming_dev@localhost:5432/gaming_platform
REDIS_URL=redis://localhost:6379
WEB_URL=http://localhost:5173
API_URL=http://localhost:3000

# Voice milestone (LiveKit --dev defaults only)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Steam milestone; obtain through Valve's supported process
STEAM_WEB_API_KEY=
```

Create a local ignored file:

```bash
cp apps/api/.env.example apps/api/.env
```

These values assume NestJS runs on the **host**. If you later containerize the API, `localhost` inside that container refers to the API container, not PostgreSQL: use Docker service names such as `postgres` and `redis` on the Compose network.

### 5.2 Validate configuration at startup

Do not allow a server with invalid `DATABASE_URL`, port, or production secrets to start silently.

Initial approach using `@nestjs/config`:

```ts
// apps/api/src/app.module.ts (excerpt)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
```

Add schema validation before expanding modules. A dedicated `config/validation.ts` can use Zod or a small validated environment parser. Validate optional secrets **conditionally** (Steam/LiveKit keys should not prevent the early foundation from booting before their modules exist). In production, fail startup if a required secret is missing or still equals a development default.

### 5.3 Configure HTTP, versioned routes, and Swagger

In `apps/api/src/main.ts`, preserve the generated bootstrap and add these calls after creating the app, before `listen()`:

```ts
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

app.setGlobalPrefix('api/v1');

app.enableCors({
  origin: process.env.WEB_URL ?? 'http://localhost:5173',
  credentials: true,
});

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);

const swaggerConfig = new DocumentBuilder()
  .setTitle('Gaming Platform API')
  .setDescription('Gaming community platform backend')
  .setVersion('1.0')
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api/docs', app, document);
```

This is a **bootstrap excerpt**, not a standalone `main.ts`. The `app` variable must be the Nest application created by `NestFactory.create(AppModule)`.

The initial HTTP endpoints become:

```text
GET http://localhost:3000/api/v1/...
GET http://localhost:3000/api/docs
```

For real production credentials, set an explicit origin allowlist; do not enable `origin: '*'` with cookies. Before shipping, choose whether Swagger should be public, protected, or disabled in production.

### 5.4 Add a health endpoint

Create a controller with `GET /health` to produce `GET /api/v1/health`, and register it in `AppModule`. Initially return a small JSON response. As infrastructure grows, add readiness checks for essential dependencies and keep liveness independent of transient database hiccups.

Example response:

```json
{
  "status": "ok",
  "service": "api"
}
```

### 5.5 Run the API

From the repository root:

```bash
pnpm dev:api
```

Once you add the health controller, test:

```bash
curl http://localhost:3000/api/v1/health
```

**Foundation exit criteria:** API starts from a fresh clone, Swagger loads, health responds, tests pass, and Compose dependencies are available.

---

## 6. Set up PostgreSQL and migrations

### 6.1 App database configuration

Use `TypeOrmModule.forRootAsync()` with `ConfigService`. The snippet below belongs in the imports of `AppModule` (add imports of `TypeOrmModule` and `ConfigService` accordingly):

```ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    url: config.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
  }),
});
```

`autoLoadEntities: true` discovers entities registered with `TypeOrmModule.forFeature()` in imported modules. It does not automatically create tables: **you must run migrations**.

### 6.2 Separate DataSource for the migration CLI

Create `apps/api/src/database/data-source.ts`:

```ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for migrations');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: ['src/modules/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
```

For this **CommonJS development setup**, the paths are relative to `apps/api` and intentionally target TypeScript source. A production migration strategy should run compiled JavaScript migrations with a production DataSource (or an equivalent tested build artifact); do not assume the TypeScript development CLI is a production deployment script.

Install TypeORM TypeScript CLI support:

```bash
pnpm --filter @gaming/api add -D ts-node
```

From `apps/api` (not repository root):

```bash
cd apps/api

# Create an empty migration; good for explicit review:
pnpm exec typeorm-ts-node-commonjs migration:create \
  src/database/migrations/CreateUsers

# Or generate one from the current entity diff:
pnpm exec typeorm-ts-node-commonjs migration:generate \
  src/database/migrations/InitialSchema \
  -d src/database/data-source.ts

# Apply pending migrations:
pnpm exec typeorm-ts-node-commonjs migration:run \
  -d src/database/data-source.ts

# Inspect history:
pnpm exec typeorm-ts-node-commonjs migration:show \
  -d src/database/data-source.ts

# Revert the last migration in local development only:
pnpm exec typeorm-ts-node-commonjs migration:revert \
  -d src/database/data-source.ts

cd ../..
```

> Generated migration content must always be **reviewed**. A generated destructive change must never be deployed blindly. If the source uses ESM instead, switch the executable to `typeorm-ts-node-esm` and follow the ESM instructions in the official docs.

Suggested migration milestones:

```text
001_create_users_and_credentials
002_create_auth_identities_and_sessions
003_create_guilds_and_members
004_create_roles_and_member_roles
005_create_channels_and_channel_members
006_create_messages
007_create_steam_profiles
```

Actual TypeORM filenames typically include timestamps. The numbers are a **logical order**, not a required filename format.

### 6.3 Database quality checklist

- [ ] Foreign keys and unique constraints express actual business invariants.
- [ ] Every user-facing query is authorized, even if it uses an apparently unguessable UUID.
- [ ] Timestamps are timezone-aware and serialized as ISO UTC strings.
- [ ] An index supports channel message history queries.
- [ ] A unique constraint enforces Steam provider identity ownership.
- [ ] Message idempotency includes `(author_id, client_message_id)` uniqueness.
- [ ] Migrations run against an empty database and against an older schema.
- [ ] No local or production startup relies on `synchronize: true`.

---

## 7. Build authentication and users

**Goal:** a user can register, log in, inspect their profile, and securely log out. Do this before chat or Steam linking.

### 7.1 Suggested endpoints

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/users/me
PATCH  /api/v1/users/me
```

Suggested DTOs:

```ts
interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}
```

**Never** return the password hash or raw session secret in `UserResponse`.

### 7.2 Implement session authentication

1. Add `users`, `auth_credentials`, and `sessions` tables.
2. Validate and normalize usernames; reject duplicate normalized values.
3. Hash passwords using Argon2id and verify using the library's safe comparison mechanism.
4. Generate a random session secret after successful login, store only a server-side hash/lookup representation, set an `HttpOnly` cookie.
5. Build a session guard that looks up active sessions and exposes the trusted authenticated user to request handlers.
6. Revoke/delete the session on logout and clear the cookie.
7. Add authentication throttling, sensible expiry/rotation, audit records for sensitive changes, and CSRF defenses.
8. Confirm secure cookie behavior in HTTPS production and develop a local HTTP strategy without weakening production defaults.

The **exact** cookie name, session store, expiry, and CSRF mechanism should be implemented and tested together; do not bolt on `cookie-parser` and assume secure login is finished.

### 7.3 Essential tests

- Valid registration and login work; duplicate username is rejected.
- Invalid password cannot establish a session; response does not expose which credential was wrong.
- Protected endpoints return `401` with no valid session.
- Logout makes both HTTP and Socket.IO authentication invalid.
- Expired or revoked session is rejected.
- CSRF and origin checks reject malicious cross-site requests.
- Password hashes and session tokens are absent from API responses and logs.

---

## 8. Implement guilds, channels, and permissions

### 8.1 Start with the minimum domain model

Create tables for:

```text
guilds
guild_members
roles
member_roles
channels
channel_members  # DM/group DM when supported
```

Suggested first API slice:

```http
POST   /api/v1/guilds
GET    /api/v1/guilds/:id
POST   /api/v1/guilds/:id/channels
GET    /api/v1/guilds/:id/channels
```

Add membership/invite and role-management endpoints as soon as multiple real users need to join a guild; a guild without membership controls is not yet a usable collaborative feature.

### 8.2 Permission evaluation

Create a service, for example:

```ts
interface ChannelAccessService {
  canViewChannel(userId: string, channelId: string): Promise<boolean>;
  canSendMessage(userId: string, channelId: string): Promise<boolean>;
  canJoinVoice(userId: string, channelId: string): Promise<boolean>;
}
```

The service must evaluate permissions based on **server-side** membership and role data. Keep permissions independent of controllers so chat history, message writes, Socket.IO subscriptions, and LiveKit join tokens can all reuse the same policy.

Minimum initial permissions:

```text
ADMINISTRATOR
MANAGE_GUILD
MANAGE_CHANNELS
VIEW_CHANNEL
SEND_MESSAGES
CONNECT_VOICE
SPEAK_VOICE
MODERATE_MEMBERS
```

Decide whether channel-level overrides are included in MVP; if not, guild roles should still be designed so overrides can be layered on later. Handle DM/group DM separately via channel membership. Distinguish absent resource (`404`) from forbidden access (`403`) consistently, avoiding private resource enumeration.

### 8.3 Tests

- A guild owner can create a channel.
- A normal member without permission cannot administer channels.
- A non-member cannot view a private guild's channel messages.
- A DM participant can access its messages; unrelated users cannot.
- Removing membership immediately revokes HTTP/socket/voice authorization.
- Role assignment cannot cross guild boundaries.

---

## 9. Implement text messaging

### 9.1 First HTTP slice

```http
GET    /api/v1/channels/:id/messages?cursor=...&limit=50
POST   /api/v1/channels/:id/messages
PATCH  /api/v1/messages/:id
DELETE /api/v1/messages/:id
```

Example create payload:

```json
{
  "clientMessageId": "8f2ab5c5-d4a0-4d74-9f72-79b62a1a181e",
  "content": "Anyone playing tonight?"
}
```

Create flow:

1. Authenticate the session.
2. Verify channel type and `SEND_MESSAGES` permission.
3. Validate nonempty content, length, and allowed formatting.
4. Insert the message in a database transaction. Enforce idempotency with `(author_id, client_message_id)`.
5. Return the committed message and a stable identifier.
6. Broadcast `message.created` to eligible sockets **after** commit.

For an idempotent retry, return the original message and avoid an unnecessary duplicate broadcast. Recheck the user's ability to access the original message before returning it.

### 9.2 Cursor pagination

Prefer **keyset pagination** to deep `OFFSET` for channel history. Example ordering:

```sql
SELECT *
FROM messages
WHERE channel_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4;
```

The request cursor must be validated and scoped to the channel. Its ordering fields should come from a previously returned message or signed/opaque cursor, not blindly trusted client input. Define response `nextCursor`, ordering direction, and whether soft-deleted rows appear as tombstones. Clamp page size (for example `1..100`).

### 9.3 Add Socket.IO as a **delivery channel**

Install and configure a NestJS gateway. On connection:

1. Resolve and validate the session from the handshake.
2. Associate the socket with the authenticated user.
3. Permit subscription only to authorized `channel:{id}` rooms.
4. Propagate server events for created/edited/deleted messages.
5. Remove room membership or disconnect on access revocation.

A typed event contract might be:

```ts
interface MessageCreatedEvent {
  id: string;
  channelId: string;
  authorId: string;
  clientMessageId: string | null;
  content: string;
  createdAt: string;
}
```

Use event names such as `message.created`, `message.updated`, `message.deleted`, `channel.typing`, and `user.presence_changed`. Put public schemas in `packages/contracts`, not TypeORM entities.

### 9.4 Reconnect and duplicate handling

- The HTTP response proves the message was accepted; Socket.IO delivery is not a durable receipt.
- Client records a last-seen history cursor per channel.
- After reconnect, client requests missed messages via REST and reconciles on `id`/`clientMessageId`.
- Typing and online indicators are ephemeral and expire after a short timeout.
- For more robust broadcasting later, add a transactional outbox; for multiple API replicas, add the Redis adapter and load-balancer behavior deliberately.

### 9.5 Tests

- Authorized users can send/receive; unauthorized sockets cannot subscribe.
- A retry with the same client ID inserts exactly one message.
- Two simultaneously connected clients see created/edited/deleted updates.
- History pagination has no gaps/duplicates at equal timestamps.
- Reconnect fetches messages missed while offline.
- XSS payloads are displayed safely by the client as untrusted content.
- Rapid sending is rate-limited; overlong payloads are rejected.

---

## 10. Add voice with LiveKit

### 10.1 Run LiveKit locally

Install `livekit-server` following the official instructions for your operating system, then run:

```bash
livekit-server --dev
```

Local default credentials:

```text
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

These are **only** safe for local development. Running a public service with development credentials is insecure. `LIVEKIT_URL` is the URL given to the **client**; some SDK/server administration operations may use an HTTP(S) endpoint derived from the deployment's address.

### 10.2 Implement token issuing in `VoiceModule`

Install the server SDK if not already installed:

```bash
pnpm --filter @gaming/api add livekit-server-sdk
```

Illustrative NestJS service method:

```ts
import { AccessToken } from 'livekit-server-sdk';

async function createVoiceToken(input: {
  apiKey: string;
  apiSecret: string;
  userId: string;
  channelId: string;
  canSpeak: boolean;
}): Promise<string> {
  // The caller MUST first verify the user's current guild and voice permissions.
  const token = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.userId,
    ttl: '10m',
  });

  token.addGrant({
    roomJoin: true,
    room: `voice:${input.channelId}`,
    canPublish: input.canSpeak,
    canSubscribe: true,
    canPublishData: false,
  });

  return await token.toJwt();
}
```

**Security warning:** this helper demonstrates token construction; it does **not** authorize anyone by itself. Call it only after checking authenticated session, guild membership, channel type, `CONNECT_VOICE`, and whether speaking is permitted. Set `canPublish` based on `SPEAK_VOICE` and consider restricting the publishable media to audio. Resolve how simultaneous devices should map to LiveKit participant identities before supporting more than one connection per user per voice room.

Expose:

```http
POST /api/v1/voice/channels/:id/join
```

Example response:

```json
{
  "url": "ws://localhost:7880",
  "token": "<short-lived-LiveKit-JWT>"
}
```

### 10.3 Client integration and state

The React client uses `livekit-client` / React components later; it receives only a short-lived token and public room URL, **never** `LIVEKIT_API_SECRET`.

The server should:

- Verify LiveKit webhook authenticity; reconcile participants on join/leave, rather than guessing occupancy from application WebSocket state.
- Support moderator removal and permission changes through server-side LiveKit APIs.
- Disconnect a participant when guild/channel access is revoked; block reissue of tokens.
- Handle dropped audio devices, page refreshes, reconnects, and user-initiated disconnects.
- Avoid conflating *local mute* with server-enforced *permission to speak*.

### 10.4 Test on more than one machine before release

Local loopback tests prove little about NAT, firewalls, TURN, Wi-Fi packet loss, or real bandwidth. Test with two users, two browsers, different networks, microphone permission denial, room switching, revoked access, and failed reconnection. Use LiveKit's recommended production networking/TLS/TURN configuration for self-hosting.

Do not add call recording until you have explicit consent, access, retention, and deletion requirements.

---

## 11. Connect Steam accounts

### 11.1 Distinguish identity from data access

Steam website sign-in uses **OpenID 2.0** to verify a SteamID64. This is not a general OAuth 2.0 access token for a user's private Steam profile or owned games.

Implementation components:

```text
integrations/steam/
├── steam.controller.ts
├── steam.service.ts
├── steam-openid.service.ts
├── steam-api.client.ts
├── steam-sync.processor.ts       # added with BullMQ
└── steam.module.ts
```

### 11.2 Secure linking sequence

1. A **logged-in** user opens `/api/v1/integrations/steam/connect`.
2. Backend creates a short-lived one-time **link intent** bound to user/session, and starts the Steam OpenID redirect.
3. User authenticates on Steam's domain.
4. Steam redirects to the server's known callback URL.
5. Server validates all required OpenID fields, response authenticity, provider identity, and the link intent; never trust `openid.claimed_id` without verification.
6. Extract SteamID64 as a **string** and insert `auth_identities` in a transaction with the unique `(provider, provider_user_id)` constraint.
7. On conflict, return a controlled error; **never** attach a Steam identity already owned by a different account.
8. Redirect to a safe fixed success/failure page; do not leak credentials or raw assertions in logs.

Suggested endpoints:

```http
GET    /api/v1/integrations/steam/connect
GET    /api/v1/integrations/steam/callback
DELETE /api/v1/integrations/steam
```

A robust implementation must account for OpenID callback state across cookies/redirects. Design the intent store, expiry and one-time consumption explicitly; write tests for replay, mismatched sessions, and account-switch attempts. Consider using a maintained OpenID library, but review its security and maintenance status since OpenID 2.0 is a legacy protocol.

### 11.3 Read permitted Steam profile data

Once linked, introduce an API client for the supported Web API endpoints, e.g. public player summaries and—when accessible—owned games. Make provider calls server-side; never ship the API key to React/Electron.

Example cached record:

```ts
interface SteamProfileSnapshot {
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  visibilityState: number | null;
  syncedAt: string | null;
}
```

Use `last_synced_at`, bounded refresh, failure backoff and graceful private-profile responses. A successful link **does not** authorize reading private games. Do not promise game ownership data if the user's settings or the API restrict it.

### 11.4 Test cases

- Valid Steam OpenID response links identity to the current account.
- Invalid/replayed/tampered callback is rejected.
- One SteamID cannot be linked to two platform users.
- SteamID is never converted to a lossy JavaScript number.
- Private profile does not break the user's account page.
- API timeout/retry does not block normal chat functionality.
- Unlink revokes the association without deleting unrelated platform data.

---

## 12. Introduce background work and infrastructure

### 12.1 Redis: use clear namespaces

Example key conventions:

```text
presence:user:{userId}        # calculated online state / heartbeat TTL
presence:socket:{socketId}    # active connection marker
rate-limit:{action}:{id}      # abuse controls
steam:refresh:{steamId}       # deduplication/locking where appropriate
```

Do not persist every heartbeat in PostgreSQL. Online means **recently observed** and may lag under network failure. Multiple sockets must aggregate to a single user presence value.

### 12.2 BullMQ: introduce when the first job exists

Common jobs:

- Refresh a Steam profile.
- Retry transient provider failures.
- Process/scan uploaded attachments (later).
- Clean up orphaned uploads and expired transient records (later).

Worker principles:

1. A job can be delivered or run more than once: make handlers **idempotent**.
2. Use attempt limits, exponential backoff and jitter for transient errors.
3. Split retryable network errors from permanent errors (e.g. revoked/invalid identity).
4. Avoid mixing API HTTP latency and long-running provider work.
5. Track failure counts and queue lag; alert before backlog becomes a user-facing issue.

### 12.3 When to introduce other infrastructure

| Feature | Introduce |
| --- | --- |
| Redis-backed Socket.IO adapter | Only when running multiple NestJS instances |
| S3-compatible object storage | Before allowing attachments or user-uploaded avatars |
| CDN | When public static content volume or geography requires it |
| Search engine | If PostgreSQL search proves insufficient under actual load |
| Separate worker process | When queued work impacts HTTP responsiveness |
| Transactional outbox | When reliably emitting events across crashes is a requirement |

**Caution:** the standard Socket.IO Redis adapter coordinates broadcasting but does not itself provide Socket.IO connection-state recovery. HTTP long-polling across multiple instances may require sticky sessions.

---

## 13. Prepare the React and Electron clients

### 13.1 React web app

Add an `apps/web` workspace when M2/M3 is underway. A React + TypeScript app (for example Vite) is sufficient for the first client.

Recommended data split:

| Kind of state | Technique |
| --- | --- |
| Fetching history, users, guilds | REST + TanStack Query |
| New messages and status updates | Socket.IO subscriptions |
| Voice audio and room participants | LiveKit client SDK |
| UI-only state | React state or a small store |
| Shared payload types | `@gaming/contracts` |

Keep a clear strategy for cache invalidation and reconnect catch-up; avoid one massive global Redux-like store for every server message if a query cache plus normalized message reconciliation is sufficient.

### 13.2 Shared contracts

Create `packages/contracts` when the first cross-client DTO/event becomes useful. Share **public** request/response/event schemas and constants, not ORM entities or environment secrets.

Example package metadata:

```json
{
  "name": "@gaming/contracts",
  "private": true,
  "version": "0.1.0"
}
```

Configure `exports` and build output when the package starts shipping consumable TypeScript/JavaScript to multiple workspaces. Add it as a workspace dependency (e.g. `"@gaming/contracts": "workspace:*"`) in consumers. Public API contracts should be versioned intentionally as the clients may not all update together.

### 13.3 Electron later

Electron is **not** the first milestone. When introducing it:

- Reuse the web UI and the same NestJS API.
- Perform account sign-in in the **system browser** and return via a carefully validated deep link or equivalent safe protocol.
- Evaluate OS-protected credential storage and device session revocation.
- Use `contextIsolation: true`, `nodeIntegration: false`, sandboxing where applicable, minimal preload APIs, and a strict navigation policy.
- Avoid automatically opening untrusted external URLs with privileged shell APIs.
- Model an in-game overlay separately; cross-platform window layering, game restrictions, and anti-cheat compatibility are **not** solved by merely packaging the UI in Electron.

---

## 14. Testing, CI/CD, and release readiness

### 14.1 Test pyramid

| Layer | Tool | Focus |
| --- | --- | --- |
| Unit | Jest | Service policy, role calculation, cursor encoding, provider edge cases |
| HTTP integration/e2e | Jest + Supertest | Login, protected endpoints, message CRUD, response codes |
| Database integration | Test PostgreSQL instance / test containers | Schema, migrations, transactions, uniqueness |
| Socket.IO integration | Real server + socket client | Handshake, unauthorized join, notifications, revocation |
| Voice integration | LiveKit dev/test environment | Join grants, audio permissions, webhook verification |
| Steam | Mocked OpenID and Web API | Callback replay, duplicates, private profiles, rate limits |
| Load | k6/Artillery or equivalent | Message bursts, concurrent connections, latency |

Do not mock every repository in integration tests: the main risk is often a missing DB constraint or incorrect transaction behavior.

### 14.2 Definition of done for any feature

- [ ] Endpoint/event contract documented.
- [ ] Authentication and object-level authorization enforced.
- [ ] DTO validation and useful error responses.
- [ ] Database schema change accompanied by reviewed migration (if needed).
- [ ] Unit and at least one relevant integration/e2e test.
- [ ] Success, permission-denied, invalid-input and retry/reconnect cases covered.
- [ ] Logs contain request context but no sensitive tokens/secrets.
- [ ] No undocumented change to shared contracts or public API behavior.
- [ ] README / relevant Markdown docs updated.

### 14.3 Minimal CI pipeline

Each pull request should:

1. Install the pinned Node.js/pnpm version and run `pnpm install --frozen-lockfile`.
2. Run formatting/lint and `tsc`/application build.
3. Start an isolated PostgreSQL for tests and apply migrations.
4. Run unit and integration suites, then build the API.
5. Optionally scan dependencies and container images.

Avoid running migrations implicitly at application startup in a multi-replica production deployment. Apply reviewed migrations as a distinct release step with rollback/forward-fix planning.

### 14.4 Observability and operations

Before pilot release:

- Structured logging and request/correlation IDs.
- Liveness and readiness endpoints; deploy health checks.
- Monitoring for HTTP errors/latency, active sockets, message write duration, DB connections, queue failures and LiveKit packet loss/jitter.
- Backups with a **tested restore procedure**.
- Rate limits and abuse reporting/moderation plan.
- Secret rotation policy, dependency updates, HTTPS, and restricted service networking.
- Data export/deletion and retention policy appropriate to the intended market and applicable laws.

### 14.5 Threat model checkpoints

Think like an attacker at each boundary:

| Boundary | Abuse to prevent |
| --- | --- |
| HTTP API | Accessing messages in another guild by guessing a channel ID |
| Socket.IO | Subscribing to `channel:{id}` without membership |
| Steam OpenID | Linking a verified Steam identity to the wrong logged-in account |
| LiveKit | Joining/speaking in a room after permissions are revoked |
| File storage | Downloading private guild attachments through a public object URL |
| Electron | Remote content accessing Node.js or OS privileges |
| Logs | Session or API-token leakage into debugging output |

---

## 15. Roadmap and acceptance criteria

### M1 — Foundation

**Tasks**

- [ ] Create workspace and NestJS API.
- [ ] Add Compose PostgreSQL and Redis.
- [ ] Configure `.env.example`, validation, and CORS.
- [ ] Add OpenAPI and health endpoint.
- [ ] Establish TypeORM DataSource and migration workflow.
- [ ] Configure linting, formatting, tests and CI baseline.

**Acceptance:** another developer can clone the repo, run documented commands, and receive a healthy API plus reachable PostgreSQL/Redis without sharing private credentials.

### M2 — Identity

**Tasks**

- [ ] `users`, `auth_credentials`, `sessions` migrations.
- [ ] Register/login/logout and `/users/me`.
- [ ] Argon2id password hashing and server sessions.
- [ ] Session guard, CSRF/rate limiting, auth tests.

**Acceptance:** users cannot access protected resources without a valid, nonrevoked session.

### M3 — Guilds and channels

**Tasks**

- [ ] Guild CRUD, guild membership/invites.
- [ ] Roles and permission evaluation.
- [ ] Text and voice channel CRUD.
- [ ] Guild ownership and authorization tests.

**Acceptance:** two users can belong to the same guild but have different allowed actions.

### M4 — Chat

**Tasks**

- [ ] Message migrations, CRUD and cursor history.
- [ ] Idempotent create messages.
- [ ] Socket.IO authentication and authorized rooms.
- [ ] Reconnect catch-up, typing, basic presence.

**Acceptance:** two browser sessions exchange and persist messages; one client can disconnect and retrieve the missed messages without duplicates.

### M5 — Voice

**Tasks**

- [ ] Local LiveKit.
- [ ] Authorized token endpoint.
- [ ] Join/leave, mute/deafen, participant status.
- [ ] Revoke access and moderator controls.
- [ ] Multi-network voice testing.

**Acceptance:** two users can talk; an unauthorized/revoked user cannot join or remain in a restricted room.

### M6 — Steam

**Tasks**

- [ ] Link intent, Steam OpenID verify callback, `auth_identities`.
- [ ] Unlink flow and unique SteamID ownership.
- [ ] Steam profile cache and refresh job.
- [ ] Private-profile and provider-error handling.

**Acceptance:** a Steam identity can be safely linked and viewed without requiring private user data.

### M7 — MVP release

**Tasks**

- [ ] Production deployment and HTTPS.
- [ ] Managed DB/backup and production LiveKit decision.
- [ ] Error monitoring, rate limits, moderation/privacy readiness.
- [ ] Load smoke tests, disaster restore test, launch checklist.

**Acceptance:** a controlled pilot can register, join guilds, chat, use voice, and connect Steam reliably.

---

## 16. Troubleshooting and common traps

| Symptom | Likely cause / action |
| --- | --- |
| API cannot reach PostgreSQL | Verify Compose status, port mapping, `DATABASE_URL` and whether API runs on host or in Docker. |
| Migrations see no entities | Run from `apps/api`, check path globs, and verify CommonJS vs ESM CLI choice. |
| Tables appear without migrations | Check `synchronize`; keep it `false` and use explicit migrations. |
| Cookies not included in requests | Check `credentials`, CORS origin, cookie flags, HTTPS and same-site topology. |
| WebSocket connects but no messages | Verify authenticated handshake, room authorization, and subscription. |
| Duplicate messages after retries | Add/verify unique `(author_id, client_message_id)` and idempotent result handling. |
| Missing messages after reconnect | Socket.IO is not a message history store; fetch the missed interval via REST. |
| Voice works on localhost but not remotely | Check LiveKit TLS/TURN/firewall/media ports and real network tests. |
| Voice user stays connected after removal | Revoke via LiveKit API and verify webhook/state reconciliation. |
| Steam link always fails | Inspect OpenID callback URL/realm matching, provider verification, and link-intent lifetime. Do not log secrets. |
| Steam games are missing | Profile privacy/API permissions may prevent retrieval; handle unavailable data gracefully. |
| Electron links open privileged content | Restrict navigation, preload IPC, external URL schemes, and renderer privileges. |

### Common design mistakes to avoid

1. **Voice over Socket.IO:** use WebRTC/SFU instead.
2. **A microservice per feature on day one:** retain one modular backend until measured needs arise.
3. **No permission checks for socket rooms:** membership must be verified before subscribe and on revocation.
4. **SteamID as a JavaScript `number`:** it is a 64-bit identifier; keep it as a string.
5. **Relying on Socket.IO to persist messages:** write to PostgreSQL and implement reconnect synchronization.
6. **Using TypeORM automatic schema synchronization in production:** use migrations.
7. **Putting provider API secrets in React/Electron:** only backend services hold privileged credentials.
8. **Adding abstractions before their use cases:** prefer small, testable modules and evolve deliberately.

---

## 17. References

Prefer current official documentation when a CLI flag, SDK function, or deployment requirement changes:

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [pnpm workspaces](https://pnpm.io/workspaces/)
- [NestJS CLI `new` options](https://docs.nestjs.com/cli/usages)
- [NestJS — first steps](https://docs.nestjs.com/first-steps)
- [NestJS — TypeORM](https://docs.nestjs.com/data/typeorm)
- [TypeORM — migration setup](https://typeorm.io/docs/migrations/setup/)
- [TypeORM — executing migrations](https://typeorm.io/docs/migrations/executing/)
- [NestJS — OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Socket.IO — delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)
- [Socket.IO — Redis adapter](https://socket.io/docs/v4/redis-adapter/)
- [LiveKit — running locally](https://docs.livekit.io/transport/self-hosting/local/)
- [LiveKit — server token generation](https://docs.livekit.io/frontends/reference/tokens-grants/)
- [Steamworks — authentication/Steam OpenID](https://partner.steamgames.com/doc/features/auth)
- [OWASP — password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP — session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP — CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Electron — security](https://www.electronjs.org/docs/latest/tutorial/security)

---

## First action to take

**Complete M1 before starting chat implementation.** Create the workspace, generate the NestJS API, run PostgreSQL/Redis locally, add a health endpoint, document/test the migration workflow, and commit the setup. Then implement authentication as your first business-facing vertical slice. Follow [ARCHITECTURE.md](./ARCHITECTURE.md) when making cross-module or infrastructure decisions.
