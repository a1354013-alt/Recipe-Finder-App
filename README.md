# Recipe Finder App

Recipe Finder App is a full-stack recipe application built with React, Vite, Express, tRPC, and Drizzle ORM. The repository is standardized on `pnpm`, uses `server/_core/index.ts` as the only server entry, and is kept in a state where install, typecheck, test, build, and deployment commands stay aligned.

## Stack

- Frontend: React 19, Vite 7, TanStack Query, tRPC, Tailwind CSS
- Backend: Express 4, tRPC 11, Drizzle ORM, MySQL/TiDB
- Tooling: TypeScript, Vitest, esbuild, pnpm

## Project Layout

```text
client/                    React app and public assets
server/_core/index.ts      Only server entry point
server/routers/            tRPC routers
server/services/           Business logic and orchestration
server/services/providers/ Recipe provider implementations
shared/                    Shared types and constants
drizzle/                   Database schema
```

## Package Manager

This repository uses `pnpm`.

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm start
pnpm preview
pnpm release:prepare
```

If `pnpm` is not installed yet:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
```

## Environment Setup

Create a local env file from the checked-in template:

```bash
cp .env.example .env
```

Required production variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `OAUTH_PORTAL_URL` or `VITE_OAUTH_PORTAL_URL`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `PUBLIC_BASE_URL`

Optional variables:

- `SPOONACULAR_API_KEY`
- `OWNER_OPEN_ID`
- `POST_LOGIN_REDIRECT`

If `SPOONACULAR_API_KEY` is missing, recipe search falls back to the local catalog instead of failing the app.

## Development

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

The dev command runs `server/_core/index.ts`.

## Database

```bash
pnpm db:push
```

## Build and Preview

```bash
pnpm build
pnpm preview
```

Build output:

- Server bundle: `dist/index.js`
- Client assets: `dist/public`

Production static serving is wired to `dist/public`, so build output and runtime behavior match.

## Clean Release Packaging

Source control metadata, installed dependencies, and stale build output are not part of the release artifact. To produce a clean staging directory:

```bash
pnpm release:prepare
```

This creates `release/recipe-finder-app/` and excludes:

- `.git/`
- `node_modules/`
- `dist/`
- temporary logs and debug folders
- unrelated archives and local env files

If you need a zip or tarball, archive that generated directory instead of packaging the repository root.

## Health and Readiness

HTTP endpoints for deployment probes:

- `GET /api/health`
- `GET /api/ready`

tRPC endpoints for internal callers:

- `system.health`
- `system.ready`

## Tests

The test suite covers real runtime behavior, including:

- `auth.logout` cookie clearing
- favorites add/remove/check/list
- shopping list ownership and item deletion
- AI history ownership
- recipe provider fallback/error behavior
- CSRF middleware
- env validation

Run all tests with:

```bash
pnpm test
```

## Deployment

Recommended release flow:

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm start
```

Deployment probes should target:

- `GET /api/health`
- `GET /api/ready`

## Release Cleanliness

Build artifacts are generated into `dist/` and should be recreated during CI or deployment. The repository should stay free of unrelated archives, stale dist folders, and transient log directories. Use `pnpm release:prepare` when producing a formal deliverable.
