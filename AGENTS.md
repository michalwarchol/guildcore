# AGENTS.md — Guildcore

> Repository-wide instructions for AI coding agents (including Cursor).  
> Product: **Guildcore** (`guildcore.gg`) — a gaming community platform with text chat, voice channels, and Steam account linking.  
> Status: **planned / incremental implementation**. Never assume a feature exists until verified in the repository.

## 1. Read this first

Before making changes:

1. Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) for system boundaries, technology decisions, data models, and security requirements.
2. Read the relevant section of [`GUIDE.md`](./GUIDE.md) for the current milestone and acceptance criteria.
3. Inspect the **actual** repository, package scripts, dependency versions, and existing conventions. Documentation is a plan, not proof of implementation.
4. If these documents conflict with working code, explain the discrepancy and propose the smallest consistent resolution. Do not silently replace established decisions.

**Priority:** explicit task requirements → this file → `ARCHITECTURE.md` → `GUIDE.md` → existing local conventions. When requirements are ambiguous or an architectural decision would be expensive to reverse, ask before proceeding.

## 2. Product and architecture

- **Web first:** React browser client; Electron desktop client later. Both use the same backend.
- **Backend:** NestJS + TypeScript, organized as a **modular monolith**. Do not introduce microservices, Kafka, Kubernetes, CQRS/event sourcing, or GraphQL without a concrete approved need.
- **HTTP:** versioned REST API under `/api/v1`; OpenAPI/Swagger for documentation.
- **Real-time:** Socket.IO for events such as messages, typing, presence, and membership changes. **Do not transport voice media through Socket.IO.**
- **Voice:** LiveKit / WebRTC. NestJS authenticates users, authorizes voice-room access, and issues narrowly scoped, short-lived LiveKit tokens; LiveKit handles media.
- **Persistence:** PostgreSQL + TypeORM; explicit migrations; `synchronize: false`.
- **Ephemeral state:** Redis for sessions, presence, caching, rate-limit coordination, and/or Socket.IO scaling when needed. Redis is **not** the source of truth for messages.
- **Background jobs:** BullMQ when required (e.g., Steam profile synchronization); do not add speculative workers.
- **Steam:** OpenID **2.0** for account identity, Steam Web API for permitted public/authorized profile data. Respect privacy and rate limits; never assume Steam OAuth 2.0 or access to private game libraries.
- **File storage:** S3-compatible object storage when attachments are introduced; store metadata and permissions in PostgreSQL.
- **Repo:** pnpm workspaces; shared client/server contracts in `packages/contracts` without leaking TypeORM entities.

## 3. Target repository layout

The following is a **target**, not a requirement to create empty folders immediately:

```text
guildcore/
├── apps/
│   ├── api/                    # NestJS API
│   ├── web/                    # React client (later)
│   └── desktop/                # Electron shell (later)
├── packages/
│   ├── contracts/              # Shared DTO/event contracts
│   └── config/                 # Shared tooling configuration
├── infra/
│   ├── compose.yaml
│   └── docker/
├── ARCHITECTURE.md
├── GUIDE.md
├── AGENTS.md
├── pnpm-workspace.yaml
└── package.json
```

Use package names such as `@guildcore/api`, `@guildcore/web`, and `@guildcore/contracts`. Prefer feature-based modules under `apps/api/src/modules/`:

`auth`, `users`, `guilds`, `channels`, `messages`, `voice`, `presence`, `integrations/steam`, `notifications`, and `attachments` (only when implemented).

Within a module, keep controllers/gateways thin, services responsible for use cases and authorization, and repositories responsible for persistence. Avoid importing another module's private repository directly; use explicit exported services/interfaces. Do not introduce elaborate abstractions for a single simple use case.

## 4. Implementation workflow

For each requested change:

1. **Understand:** identify the affected milestone, modules, API contracts, migrations, and authorization boundary.
2. **Inspect:** search for existing patterns, tests, config, and scripts; avoid duplicating functionality.
3. **Plan briefly:** for non-trivial tasks, describe the files and behavior to change; flag destructive or irreversible steps.
4. **Implement narrowly:** make the smallest coherent vertical slice. Avoid unrelated refactors and speculative features.
5. **Test:** run the relevant formatting, linting, type checks, unit/integration tests, and build **using scripts that actually exist**. Add tests for new behavior.
6. **Report:** summarize changed files, decisions, commands run, results, and any remaining risks or manual steps. Never claim a test passed unless it was executed.

Prefer small, reviewable patches. Do not overwrite user changes, rewrite git history, reset the worktree, or run destructive database commands without explicit permission. Do not add dependencies without explaining why they are needed. Keep documentation and `.env.example` aligned with actual behavior.

## 5. TypeScript and NestJS conventions

- Use TypeScript strict typing; avoid `any`, unchecked casts, and non-null assertions unless justified.
- Prefer descriptive names, small functions, explicit return types on public APIs, and dependency injection.
- Validate all external inputs at HTTP and WebSocket boundaries (DTOs/pipes or agreed shared schemas).
- Use consistent error handling and correct HTTP status codes; never leak stack traces, internal IDs unnecessarily, credentials, or raw database errors.
- Use configuration validated at startup; no hard-coded credentials, secrets, origins, or production endpoints.
- Use UTC-aware timestamps (`timestamptz`) and ISO 8601 timestamps in API responses.
- Use UUIDs for internal entity IDs. Represent SteamID64 as a **string**, never a JavaScript `number`.
- Prefer cursor-based pagination for message history; enforce bounded page sizes.
- Favor explicit API/event contract versioning and backward-compatible changes for future Electron clients.
- Use existing formatting/lint conventions; if absent, establish a minimal consistent setup rather than a large tooling overhaul.

## 6. Database rules

- PostgreSQL is authoritative for users, identities, guilds, membership, roles, channels, messages, and persistent metadata.
- Create a migration for every schema change; **never** rely on TypeORM auto-sync in shared environments.
- Add foreign keys, uniqueness constraints, and indexes based on access patterns; consider transaction boundaries.
- For message sending, support an idempotency key such as `client_message_id` scoped to the author to prevent duplicate inserts after retries.
- Do not assume Socket.IO delivery is durable; clients must be able to reconcile missed messages from PostgreSQL.
- Prefer soft deletion only when its retention and visibility semantics are explicitly defined.
- Never store plaintext passwords, session tokens, API keys, or Steam secrets in logs or tables. Store session-token hashes when applicable.
- Do not generate or apply production migrations automatically without explicit instruction and a rollback/backup plan.

## 7. Authentication, authorization, and security

**Treat every client as untrusted.**

- Use server-side, opaque sessions with secure `HttpOnly` cookies for the browser; configure `Secure`, `SameSite`, expiry, rotation/revocation, and CSRF defenses appropriately.
- Hash local passwords with a modern password hashing algorithm (e.g., Argon2id). Do not implement custom cryptography.
- Verify session identity and resource permissions **server-side** on every relevant REST request, Socket.IO subscription/action, and LiveKit token request.
- Check guild membership, role/channel permission overrides, and DM membership before returning content or joining rooms.
- Revoke or remove LiveKit participants when access is withdrawn; token expiry alone is insufficient for immediate removal.
- For Steam linking, verify the OpenID assertion server-side and bind the callback to the initiating authenticated session with anti-CSRF/state protection. Enforce unique `(provider, provider_user_id)`.
- Apply rate limiting to authentication, message posting, account linking, and other abuse-prone operations; add request size limits and safe upload validation.
- Use explicit CORS origins and secure cookie settings for deployed domains; never use wildcard origins with credentialed requests.
- Avoid logging message content, cookies, tokens, secrets, or sensitive profile information unless strictly necessary and approved.
- Never commit `.env`, credentials, private keys, database dumps, or user data. Use `.env.example` with non-secret placeholders.

## 8. Chat and real-time rules

- Start with **REST for message creation/history** and **Socket.IO for fan-out** unless a task explicitly changes the contract.
- Save the message successfully before broadcasting `message.created`; document potential event-loss windows. Add a transactional outbox only when delivery requirements justify it.
- Authenticate Socket.IO connections and authorize each room join. A client-supplied `channelId` does not grant access.
- Use consistent event names, e.g., `message.created`, `message.updated`, `message.deleted`, `channel.typing`, and `user.presence_changed`.
- Use rooms such as `user:{id}`, `guild:{id}`, and `channel:{id}` only after access checks.
- Treat typing and presence as ephemeral. Implement heartbeat/TTL and reconnect reconciliation rather than assuming perfect disconnect events.
- Define reconnection behavior and deduplication in both server and client contracts.

## 9. Voice and Steam rules

**Voice:**

- Use LiveKit for audio; no homemade SFU, audio over REST, or audio over Socket.IO.
- A voice join endpoint must authenticate the user, verify channel access, and issue a short-lived token limited to the correct room and capabilities.
- Keep the participant identity tied to the authenticated Guildcore user; do not trust user IDs supplied by clients.
- Use LiveKit room/participant events to reconcile actual voice membership. Plan for disconnects, token expiration, and server-side moderation.
- Keep LiveKit API secrets on the backend only.

**Steam:**

- Use Steam OpenID 2.0 to prove ownership of a SteamID64; it is not an OAuth authorization grant.
- Never promise access to private profiles, owned games, or presence beyond what the Steam Web API actually permits.
- Cache synchronized profile data, respect provider limits, use retry/backoff for transient failures, and degrade gracefully when Steam is unavailable.
- Store linked external identities separately from Guildcore's primary user identity.

## 10. Testing and definition of done

Each meaningful feature should include, as applicable:

- **Unit tests:** business rules and edge cases.
- **Integration tests:** PostgreSQL repositories, migrations, and transaction behavior.
- **E2E tests:** happy path, unauthenticated access, forbidden access, invalid input, and duplicate/retry behavior.
- **Real-time tests:** room authorization, message fan-out, reconnect/deduplication behavior.
- **Voice tests:** token scopes, access denial, and participant removal (mock external services in unit tests).
- **Steam tests:** valid/invalid callbacks, replay/state mismatch, already-linked identities, private profile, and API failure.

A change is complete when it satisfies the requested behavior, tests are added or updated, relevant checks pass, documentation is current, and no secrets or unintended breaking changes are introduced. If dependencies or infrastructure prevent tests from running, say exactly what was not verified.

Do not jump to future milestones without an explicit request. A small dependency needed for the current slice is fine; speculative scaffolding is not.

## 11. Commands and local environment

Consult the repository's actual `package.json` scripts before running commands. Expected development pattern:

```bash
# Infrastructure (when infra/compose.yaml exists)
docker compose -f infra/compose.yaml up -d

# Install workspace dependencies
pnpm install

# Start NestJS (adjust to actual workspace scripts)
pnpm --dir apps/api start:dev
```

The expected local service endpoints are API `localhost:3000`, PostgreSQL `localhost:5432`, Redis `localhost:6379`, and LiveKit `localhost:7880` (only after voice setup). These are development conventions, not production defaults. Never expose PostgreSQL or Redis publicly.

## 12. Working with AI agents

- State assumptions clearly. Ask a focused question if a missing requirement changes the security model, public contract, or schema significantly.
- Prefer explaining **why** a design choice is needed in a concise comment or summary rather than adding excessive inline comments.
- If a task spans multiple milestones, propose a sequence of independently testable changes before implementing a large rewrite.
- Keep answers and code changes aligned with Guildcore terminology: **guild** (internal model), **server** (user-facing community), **channel**, **member**, **message**, **voice room**, and **linked Steam identity**.
- If asked to update architecture, also check whether `GUIDE.md`, API contracts, migrations, or this file need corresponding changes.

## 13. Key references

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — canonical system design and trade-offs.
- [`GUIDE.md`](./GUIDE.md) — setup steps, milestone tasks, and acceptance criteria.
- [NestJS documentation](https://docs.nestjs.com/)
- [Socket.IO documentation](https://socket.io/docs/v4/)
- [LiveKit documentation](https://docs.livekit.io/)
- [Steamworks Web API documentation](https://partner.steamgames.com/doc/webapi_overview)

**Guiding principle:** ship secure, testable vertical slices of a modular monolith. Keep Guildcore simple today without closing off tomorrow's web, desktop, gaming, and voice features.
