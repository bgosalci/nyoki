@AGENTS.md

# Nyoki

Storefront for **nyoki.co.uk**. Next.js 16 (App Router) + React 19 + Tailwind 4,
TypeScript, deployed to Vercel.

## Working rules

- **Test-first, always.** Write the failing test, watch it fail for the right
  reason, then implement. No implementation lands without a test that covers it.
- Tests live in `__tests__/` at the repo root, named `*.test.ts(x)`.
- `pnpm test`, `pnpm lint` and `pnpm build` must all pass before a commit.

## Toolchain notes

- Jest runs through `next/jest` (SWC), **not** ts-jest. SWC has no per-test
  cold-cache warm-up, which is the cause of the intermittent timeout flakes on
  gosalci.com. Do not swap this for ts-jest.
- `pnpm-workspace.yaml` uses the pnpm 11 `allowBuilds` key to allowlist the only
  two packages permitted to run install scripts. The pnpm 10 spelling
  (`onlyBuiltDependencies`) is silently ignored by pnpm 11 and will make
  `pnpm install` exit 1 on Vercel.

## Domain rules

- **Money is always an integer number of pence.** Never a float, never pounds.
  Stripe uses the smallest currency unit too, so amounts pass straight through.
- Overlapping sales do **not** stack. The single best discount for the customer
  wins - see `src/lib/pricing.ts`.
- Order line items snapshot product name, price and SKU. Renaming or archiving a
  product must never change what an old order says it sold.

## Database

- Prisma 7 (CLI pinned to 7.x - `pnpm add -D prisma` resolves to an 8.0 RC with
  a completely different CLI, which does not match @prisma/client).
- Node **24.x**. Prisma 7 supports 20.19+/22.12+/24.x and rejects Node 25.
- Migrations must not run through a connection pooler; `prisma.config.ts`
  prefers the unpooled URL. See the comment there for why.
- The generated client is gitignored, so `pnpm build` runs `prisma generate`
  first. Removing that breaks Vercel deploys.
- Server-only tests need `@jest-environment node`; the pg driver needs Node
  crypto, which jsdom lacks.

## Git

Remote is the **personal** account: `https://github.com/bgosalci/nyoki` over
HTTPS. Not Gosalci-Org, which is the gosalci.com work org and uses SSH.
