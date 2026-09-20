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

## Conventions

Development is test-first: the failing test comes before the implementation.
Tests live in `__tests__/`. See [CLAUDE.md](CLAUDE.md) for the full working rules.

## Licence

_TODO_
