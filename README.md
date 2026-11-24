# Guildcore

Guildcore (`guildcore.gg`) is a gaming community platform with text chat, voice channels, and Steam account linking. The first client is the web app; a NestJS modular monolith API is shared with a later Electron desktop client. The product is being built incrementally.

## Directory tree

```text
guildcore/
├── apps/          # NestJS API (@guildcore/api)
├── packages/      # shared workspace packages
├── infra/         # local Docker Compose
├── ARCHITECTURE.md
├── GUIDE.md
├── AGENTS.md
├── package.json
└── pnpm-workspace.yaml
```

## Tech Stack

Installed versions from the lockfile (the range in `package.json` may be wider).

| Technology | Version | Role |
| --- | --- | --- |
| Node.js | >= 24 | Runtime (`engines` in the workspace root) |
| pnpm | 10.20.0 | Package manager |
| TypeScript | 6.0.3 | Language |
| NestJS | 12.6.0 | HTTP and WebSocket framework |
| `@nestjs/config` | 12.1.1 | Configuration |
| `@nestjs/swagger` | 12.1.2 | OpenAPI |
| TypeORM | 1.1.3 | Persistence |
| `@nestjs/typeorm` | 12.0.3 | NestJS TypeORM integration |
| PostgreSQL (`pg`) | 8.23.1 | Database driver; local server image `postgres:17` |
| Redis | 7 (Alpine image) | Local ephemeral store (`infra/compose.yaml`) |
| Socket.IO | 4.8.4 | Real-time events |
| Argon2 | 0.45.2 | Password hashing |
| class-validator | 0.15.1 | Input validation |
| class-transformer | 0.5.1 | DTO transformation |
| cookie-parser | 1.4.7 | Cookie parsing |
| RxJS | 7.8.2 | NestJS reactive utilities |
| Jest | 30.5.2 | Tests |
| oxlint | 1.94.0 | Linting |
| Prettier | 3.10.1 | Formatting |

## Local API

From `apps/api`, with PostgreSQL running:

```bash
pnpm migration:run
pnpm seed
pnpm start:dev
```

`pnpm seed` upserts development users and refuses to run when `NODE_ENV=production`. Every seed password is `password123` and exists only for local testing. One account is `john.doe@michalwarchol.com` (`john_doe`). The others are `jane.doe@michalwarchol.com` and `alex.smith@michalwarchol.com`.

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design
- [GUIDE.md](./GUIDE.md) — setup and milestones
