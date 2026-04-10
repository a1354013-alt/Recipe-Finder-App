# Deployment Checklist

## Preflight

- `pnpm install`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `.env` is created from `.env.example`
- Production secrets and URLs are populated

## Runtime Contract

- Only server entry: `server/_core/index.ts`
- Server build output: `dist/index.js`
- Client build output: `dist/public`
- Health endpoint: `/api/health`
- Readiness endpoint: `/api/ready`

## Production Commands

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm start
```

## Probe Validation

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

Expected behavior:

- `/api/health` returns `200`
- `/api/ready` returns `200` only when the database is reachable

## Build Validation

- `dist/public/index.html` exists
- `dist/public/assets/*` exists
- `dist/index.js` exists
- `pnpm start` serves the built frontend successfully

## Smoke Test

- OAuth login succeeds
- Favorites flow works
- Shopping list flow works
- AI history page loads
- Placeholder image URLs resolve
