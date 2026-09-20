# nyoki

Storefront for [nyoki.co.uk](https://nyoki.co.uk).

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5.9 |
| Tests | Jest 30 + React Testing Library, via `next/jest` |
| Package manager | pnpm 11 |
| Hosting | Vercel |

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server runs at http://localhost:3000.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve a production build |
| `pnpm test` | Run the test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with a coverage report |
| `pnpm lint` | ESLint |

## CMS accounts

The CMS lives at `/admin`. Create or update an account with:

```bash
pnpm -C /Volumes/Studio/nyoki admin:create "person@nyoki.co.uk" "Their Name" STAFF
```

The `-C` flag means it works from any directory; drop it if your shell is
already in the project. Roles are `OWNER` or `STAFF`.

A password is generated and printed once. To choose one instead, set
`ADMIN_PASSWORD` for that command so it stays out of your shell history:

```bash
ADMIN_PASSWORD='...' pnpm admin:create "person@nyoki.co.uk" "Their Name" STAFF
```

Re-running for an existing email resets that account's password and role, so
this doubles as the password-reset path until account management exists in the
CMS itself.

## Conventions

Development is test-first: the failing test comes before the implementation.
Tests live in `__tests__/`. See [CLAUDE.md](CLAUDE.md) for the full working rules.

## Licence

_TODO_
