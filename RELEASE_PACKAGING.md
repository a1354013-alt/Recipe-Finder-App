# Release Packaging Rules

## Goal

Formal release artifacts must contain only the files needed to install, verify, build, and deploy the application in a clean environment.

## Must Include

- application source files
- `package.json`
- `pnpm-lock.yaml`
- checked-in configuration and documentation
- static assets under `client/public/`
- shared source under `client/`, `server/`, `shared/`, and `drizzle/`

## Must Exclude

- `.git/`
- `node_modules/`
- `dist/`
- local env files such as `.env`
- temporary logs and debug folders
- unrelated archives and artifacts from other projects

## Standard Process

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm release:prepare
```

`pnpm release:prepare` creates `release/recipe-finder-app/` as the clean staging directory for final packaging.
