# Final Production Checklist

## Build Integrity

- `pnpm install` succeeds without peer-dependency bypasses
- `pnpm check` passes
- `pnpm test` passes
- `pnpm build` passes

## Runtime Alignment

- `server/_core/index.ts` is the only server entry
- `dist/index.js` is the production server bundle
- `dist/public` is the production static directory
- `/api/health` and `/api/ready` are the deployment probe routes

## Documentation Alignment

- README matches `package.json` scripts
- `.env.example` matches runtime requirements
- Deployment docs reference `pnpm`
- Docs reference only the current server entry and current runtime paths

## Release Cleanliness

- No unrelated archives are included
- No committed build output is required
- Temporary logs and old tool artifacts are excluded
- Shared placeholder image fallback is present and valid

## Architecture

- Provider implementations live under `server/services/providers/`
- `server/services/recipeService.ts` only orchestrates provider selection and fallback
- Unused Google Maps frontend code and typings are removed
