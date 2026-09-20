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

## Brand

- The CMS uses the class recipes in `src/lib/brand/ui.ts`; the brand tests
  check every recipe against the approved pairings. Do not add ad-hoc colour
  classes to admin components.
- Colours are owned by `src/lib/brand/palette.ts` and its tests. The Tailwind
  tokens (`--color-nyoki-*` in globals.css) are pinned to it by a test, so
  change the module first. Every value traces to a file in `public/brand/` or
  `docs/brand/`.
- Text goes only in an approved pairing (`APPROVED_TEXT_PAIRINGS`). **White on
  sage and navy on sage both fail WCAG AA**; on sage the text colour is ink.
  Sage-light is the wordmark script and is decorative only.
- `pnpm brand:board` regenerates docs/brand/theme-board.html from the module.
  Never edit the board by hand.

## Sales

- A batch sale is one `Sale` row joined to many products through the picker
  on the sale form (`src/components/admin/sale-form.tsx`). Every product is
  always rendered and only non-matching rows are hidden, so a selection
  survives being filtered out of view.
- Percentages are whole numbers only; 12.5% produces sub-penny discounts.
- Sales are **deleted**, products are **archived**: nothing snapshots a sale,
  and an order records the price actually paid, not which sale produced it.
- Updating a sale replaces its product set inside one transaction.

## Product photos

- The upload format is decided by **sniffing the first bytes**, never by the
  declared MIME type or filename - both come from the client. See
  `src/lib/images/validate.ts`. Do not relax this: an HTML file relabelled
  image/png would otherwise be served from our own domain.
- Storage goes through the `ImageStorage` interface (`src/lib/storage`). A
  `BLOB_READ_WRITE_TOKEN` selects Vercel Blob; without one, development writes
  to `public/uploads` (gitignored) and **production refuses to start** rather
  than write to Vercel's ephemeral disk.
- Image positions are renumbered 0..n-1 after every delete or move, in one
  transaction. Moving swaps the two `position` values, not the array slots.
- Removing a photo deletes the stored file first, then the row. A product's
  images are always looked up scoped to that product id, so a forged image id
  cannot touch another product's photos.

## Catalogue import

- `src/lib/import/shopify.ts` is pure (string in, products out) and fully
  tested; `scripts/import-shopify.ts` does the database and network work.
- Idempotent by slug: a product already present is skipped, never updated, so
  re-running cannot clobber Njomza's edits. Gift cards are skipped.
- Images go through the same byte-sniff validation and ImageStorage as uploads.

## Accounts

- Settings lets anyone change their own password and lets an OWNER add, edit
  (name, role, password reset) or remove accounts. `removalBlockedBecause()` in `src/lib/admin/removal.ts` is
  the rule: no removing yourself, no removing the last owner, staff remove
  nobody. It runs on the server for every removal.
- A new account's password is generated and returned to the owner once; it is
  never stored in plain text and never shown again.
- Passwords are never trimmed - a leading space is a legitimate character.

## CMS accounts

`pnpm admin:create "<email>" "<name>" [OWNER|STAFF]` creates or updates an
account. It upserts, so re-running resets the password - that is the password
reset path until Settings grows account management. Pass `-C <project path>` to
run it from another directory.

## Git

Remote is the **personal** account: `https://github.com/bgosalci/nyoki` over
HTTPS. Not Gosalci-Org, which is the gosalci.com work org and uses SSH.
