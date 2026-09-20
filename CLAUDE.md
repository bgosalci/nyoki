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

## Git

Remote is the **personal** account: `https://github.com/bgosalci/nyoki` over
HTTPS. Not Gosalci-Org, which is the gosalci.com work org and uses SSH.
