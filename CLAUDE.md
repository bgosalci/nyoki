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

## Stopping the dev server

- Stop it by its **listening** socket: `lsof -ti:3000 -sTCP:LISTEN`. Plain
  `lsof -ti:3000` also lists every process *connected* to the port - the
  browser and the Claude app among them - and killing that list kills them.

## Testing on the network

- `next dev` serves to the whole LAN, but Next blocks its own dev resources -
  `/_next/hmr`, the client chunks, the fonts - from any host but localhost
  unless it is listed in `allowedDevOrigins` (next.config.ts). Unlisted, a
  page opened from another device **server-renders correctly and never
  hydrates**: the bulk bar, live filtering and the hearts all go dead while
  the page looks perfect. The only clue is a warning in the dev server log.
  Dev-only setting; it does not exist in a build.
- Cookies are scoped per hostname, so `localhost` and `<mac>.local` are two
  separate sessions. Being signed in on one says nothing about the other.
- Use `next dev` for LAN testing, never `pnpm build && pnpm start`: a
  production build refuses to boot without `BLOB_READ_WRITE_TOKEN`, and its
  session cookies are `secure`, so nobody could stay signed in over plain
  http on a LAN address.

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
- **After a migration, restart `next dev` as well as regenerating.** The
  running server holds the old client in memory, and the failure reads as a
  code bug: `Invalid customer.findUnique() invocation` on a column that plainly
  exists, or `Cannot read properties of undefined` on a whole new model.
- Server-only tests need `@jest-environment node`; the pg driver needs Node
  crypto, which jsdom lacks.

## Brand

- The CMS uses the class recipes in `src/lib/brand/ui.ts`; the brand tests
  check every recipe against the approved pairings. Do not add ad-hoc colour
  classes to admin components.
- **Dark mode uses the night neutrals**, not the brand ink: ink is a saturated
  blue-purple and reads as blue when used as a ground. Ground `nyoki-night`,
  panels `nyoki-night-panel`, borders and lifted controls `nyoki-night-rule`,
  text beige, muted blue-grey. Navy is a mid tone - a border or a raised
  control in the dark, never a surface. Tests enforce both rules.
- Colours are owned by `src/lib/brand/palette.ts` and its tests. The Tailwind
  tokens (`--color-nyoki-*` in globals.css) are pinned to it by a test, so
  change the module first. Every value traces to a file in `public/brand/` or
  `docs/brand/`.
- Text goes only in an approved pairing (`APPROVED_TEXT_PAIRINGS`). **White on
  sage and navy on sage both fail WCAG AA**; on sage the text colour is ink.
  Sage-light is the wordmark script and is decorative only.
- The page declares `color-scheme: light dark`, which is what makes the
  browser draw its own controls - checkboxes, scrollbars, date pickers - in
  the theme in use. Without it a checkbox is a white box on the dark admin.
- A modal dims the page with `ui.scrim`, which is plain black. Every brand
  colour is a tint; ink especially (#0b063c) lays a blue-purple wash over
  whatever is behind it rather than dimming it.
- The admin can be set to light or dark outright; the storefront cannot,
  and stays light. The choice marks `<html>` with `data-theme`, and the
  `@custom-variant dark` in globals.css is what every `dark:` utility in the
  CMS compiles against - one arm for the media query, one for the attribute.
  Following the system means *no* attribute, so CSS answers it alone: no
  JavaScript, no flash. `THEME_BOOTSTRAP` runs inline ahead of React for an
  outright choice, which is why `<html>` carries `suppressHydrationWarning`.
- `pnpm brand:board` regenerates docs/brand/theme-board.html from the module.
  Never edit the board by hand.

## Promo codes

- `DiscountCode` is a code a shopper types at checkout; a `Sale` needs no code
  and applies automatically. Both live in the CMS, and they are separate things.
- `codeRedeemability()` decides whether a code can be used. Every unavailable
  reason reads identically on purpose - naming the reason confirms the code
  exists. A minimum spend is the exception, since the shopper can act on it.
- Codes are deleted outright: an order records the discount it was given in
  pence, so nothing about it depends on the code surviving.
- Redemption itself waits on checkout.

## Products list

- Rows carry checkboxes and the list offers bulk actions. Archiving and
  deleting are both offered because they differ: archiving is reversible,
  deleting is not.
- Deleting a product is safe for order history - a line snapshots the name,
  price and code it sold at, and its product reference is SetNull rather than
  cascading - but it also removes the photos from storage, so it asks first.

- The bulk bar carries "Clear selection" beside the count, away from Delete.
- The bulk bar changes prices across many pieces at once; a single piece is
  priced on its own Price tab. "Make active" skips anything not yet priced
  and says which.
- **Bulk price changes** live in `src/lib/products/repricing.ts`, which is
  pure. Percentages are carried as TENTHS of a percent, so 12.5% is exact -
  unlike a sale, where a fractional percentage would produce sub-penny
  discounts off every basket, the result here is rounded once and stored.
- Nothing records what a price used to be, so a bulk change cannot be undone.
  The dialog answers that by previewing every change first, and it sends the
  figures that were typed, never the prices it worked out: the action
  recalculates from the database rows.
- Two rules the module enforces: a bulk change never produces a free product
  (the floor is a penny), and a was-price the new price has caught up with is
  cleared, since the product form rejects that combination anyway.

## Pricing

- A product's costing is its `CostLine` rows - a label, a unit cost in pence,
  and a quantity in **hundredths** (yarn is bought by the half skein). A
  product with no lines has not been costed. The maths is
  `src/lib/costing/costing.ts`, pure and integer throughout, and its tests are
  rows from Njomza's own price lists, so the admin provably agrees with them.
- **VAT is per product** (`Product.vatRate`, a whole percent), not per shop:
  cards carry 20%, and her clothes sheet zero-rates children's clothing. VAT is
  taken out of a VAT-inclusive price with the VAT fraction (a sixth at 20%),
  rounded to the nearest penny, as HMRC works it on a single price.
- The discount ladder reuses the shop's own `discountPenceFor`, so "at 20% off
  you make £4.46" is true of a real 20% sale, not an approximation of one.
- Not On The High Street's 30% is taken off the price the shopper pays. Her
  cards sheet works it that way; her clothes sheet divides by 1.3, which only
  takes about 23%. The code follows the cards.

## Stepping between products

- A product's page has **Previous** and **Next**, stepping through the list
  it was opened from - in that order, under those filters - on the same tab,
  so pieces can be priced one after another without going through the list.
- The list is remembered by `ProductTable` as it renders (`rememberProductList`,
  sessionStorage, per tab) rather than worked out again on the product page:
  the list is sorted by what was edited last, so saving a piece moves it to
  the top, and a "next" recalculated after every save sends you back to the
  start. See `src/lib/products/browse.ts`.
- **The steps are always there.** A piece opened some other way - a reload, a
  bookmark, a new tab - steps through the whole list in its usual order
  (`PRODUCT_LIST_ORDER`, shared with the list page), which the layout sends
  as `fallback`; that is then remembered too, so a save cannot reorder it.
  It first shipped with no fallback, and a reloaded page simply had no
  buttons.
- The server cannot see sessionStorage, so the page arrives with the whole
  list and switches after hydration. The effect that remembers the fallback
  reads storage afresh: the render during hydration is the server's, and
  trusting it would overwrite the list the piece really came from. A test
  hydrates for real to hold this.
- `parseProductList` treats storage as untrusted: the way back only ever
  leads to `/admin/products`.
- Leaving a product's Details or Price with unsaved edits asks first - see
  Unsaved changes.
- `BackLink` is a bordered button, not underlined text, on every item page.
- **Save is at the top as well as the bottom** of a product's Details and
  Price tabs, and the new-product page: `SaveSlot` sits beside the title,
  and each form draws a `TopSaveButton` into it through a portal. Drawn by
  the form, it shares the form's pending state ("Saving…", no second press)
  though it sits outside the form's markup; its `form` attribute ties it
  back, so it submits exactly as the bottom button does.
- The slot is found through `SaveSlotProvider` - it registers itself, in
  React state, when it is put on the page - **not by searching the page**.
  It first shipped with `document.getElementById`, and Njomza saw no Save on
  the Price tab; it could not be reproduced by any route to that tab, but a
  search made while React draws can find a header on its way out (moving to
  another product replaces the whole header), and state cannot.
- **The whole product header stays pinned** beneath the top bar while the
  page scrolls (`ProductHeader`, `sticky top-14`, painting the page ground):
  Back, Previous and Next, the name and its Save, and the Details and Price
  tabs.

## Unsaved changes

- `UnsavedChanges` (`src/components/admin/unsaved-changes.tsx`) guards a
  form: a link away asks "Leave without saving?" in a `ConfirmDialog`, and
  closing or reloading the tab gets the browser's own warning
  (beforeunload - the browser allows nothing else there). Used by a
  product's Details and Price forms.
- **Changed** means the form would post something different from when the
  page loaded or was last saved (`formSnapshot`, read from the form itself,
  so controlled and uncontrolled inputs alike, and a removed row counts). A
  change typed and put back is no change; fields in `ignore` - the margin and
  rounding on the Price tab, which only work the price out - never count.
- Links are caught by a click listener on the **window in the capture
  phase**, which runs before React's root listener and so before next/link's
  onClick. This covers every link on the page. Next's own recipe
  (`onNavigate` on each Link, via context) only covers links someone
  remembered to change. Choosing to leave clicks the same link again, so it
  navigates exactly as it would have.
- A form reports a save by passing a **new** `saved` object (the action
  state when it succeeded, else null); what it holds then is the new
  baseline. `ignore` must be a constant, since it is an effect dependency -
  and so is its default: it once defaulted to a fresh `[]`, which re-ran the
  baseline effect on every render and took whatever was typed as
  "unchanged" (a controlled form re-renders on every keystroke).
- **Not covered: the browser's own Back button.** Next handles popstate
  itself and there is no clean way to cancel it.

## Rejected saves keep what was typed

- React 19 resets a `<form action={fn}>` after the action returns - **even
  when the server rejected the save** - so a validation error put every
  uncontrolled field back to what was last saved, and wiped a new product's
  form entirely.
- `useActionForm` (`src/lib/forms/action-form.ts`) replaces `useActionState`
  for forms of uncontrolled fields: `<form ref={formRef} action={formAction}
  onSubmit={onSubmit}>`. It **keeps React's reset** - after a save that went
  through, that is what shows the server's tidied values (a web address built
  from the name) - and undoes it for a rejected one: React resets during the
  commit that brings the result, and a layout effect puts back what was
  submitted (`restoreFormValues`) before the page paints.
- What was submitted is read in `onSubmit`, which runs before the action,
  not by wrapping the action - a server action passed straight to the form
  keeps working before the JavaScript loads.
- **Passwords are not put back**: a sign-in or password form clears them
  after a failure, as people expect. The admin login, shop sign-in and
  register forms already send the email back in their state instead, and
  are left as they are.
- Controlled forms (a product's Price tab, a category's usual costs) never
  lost anything - React owns their values - and have tests saying so.

## A product's Price tab

- A product has two tabs, as routes: **Details** (`/admin/products/[id]`) and
  **Price** (`/admin/products/[id]/price`), sharing a layout that carries the
  way back, the name and the tabs. Routes rather than toggled panels, so a
  price can be linked to and the back button goes back a tab.
- The Price tab holds the cost lines, VAT, price and was-price, and works
  every figure out live: profit, margin, what Not On The High Street leaves,
  and each step of a sale on both. Margin is profit as a share of what is
  kept after VAT - not her sheets' "online margin", which is the multiple on
  cost; both are shown.
- **Price and margin drive each other**: whichever was typed last leads, and
  the other follows it - and the costs and VAT - as they change. A typed
  margin sets the price, rounded **up** to 50p or 99p (`priceForMargin`); a
  typed price shows its margin. A typed margin stays as typed rather than
  snapping to the slightly higher margin the tidy price gives: rewriting the
  number under the cursor would fight the typing, and the figures show it.
- **The Details tab has no price.** It shows it read-only with a link to the
  Price tab, and `validateProductInput` does not read one even if posted - a
  test forges exactly that - so saving details cannot change or reset it.
- A new product is created at 0p and **cannot be made active until priced**
  (`activationBlockedBecause`), checked on create, on edit, and in bulk,
  where unpriced pieces are skipped and named rather than listed for free.
- A price changes across many pieces at once from the products list's bulk
  "Change price". There was a separate Pricing section with its own list;
  it was folded into the product, and its "not yet costed" and "selling at a
  loss" views went with it.
- A piece with no costs can choose from **every** unmatched price-list row,
  best guess first (`rankEntriesFor` with no limit), searchable by the words
  in each photo's file name - often the only place a row says what it is.
  The field sits at the top of "What it costs", since that is what it fills.
  Choosing fills the form to be checked and Clear takes the costs and VAT
  back out; only saving records it, and the row's id is re-checked on the
  server as unclaimed.

## Usual costs

- A category can carry **usual costs** (`CategoryCostLine`, edited on its
  page): the lines most of its pieces share. A piece with no costs of its own
  is offered "Start from the usual costs for Cards" on its Price tab.
- **Copied, never linked.** Starting from them fills the form, to be checked
  and saved like any costing; changing a category's usual costs afterwards
  changes nothing already priced. A shared materials list that reprices
  every piece when envelopes go up is a different, bigger feature - it was
  offered and not chosen.
- Which set a piece is offered is `templatesFor`: each of its categories
  looks to itself, then up the tree, and the nearest with lines answers - so
  a type can have its own or fall back to its group's. Each set is offered
  once; a tree that loops cannot hang it.
- Starting from usual costs lets go of a price-list row chosen before, since
  the costs no longer come from it; choosing a row lets go of the usual costs.
- The cost table is one component, `CostLinesTable`, on both the Price tab
  and the category page, and its posted lines are read by one function,
  `parseCostLines`, so both follow the same rules.

## Export

- "Export" on the products list writes **CSV, JSON or XML**, chosen in the
  `ConfirmDialog` it asks with - naming how many products the file holds and
  that it carries the shop's costs and margins - then downloads through a
  hidden `download` link (`?format=json|xml`; CSV when absent).
- All three are written from one `ExportRecord` per product (`toRecord` in
  `src/lib/export/products.ts`), so they cannot disagree. CSV is flat, for a
  spreadsheet; JSON (`{ shop, exported, products }`) and XML (`<products>`,
  one `<product>` each) carry lists as lists - categories, cost lines,
  photos - and the worked-out figures apart under `workedOut`.
- **Money is text in JSON and XML** ("12.99"), as Shopify's own API writes
  it, never a decimal number: a float can come back a penny out. Nothing is
  `null` in JSON, an empty element in XML.
- XML leaves out the characters XML 1.0 cannot hold at all, even escaped,
  rather than write a file nothing can read.
- It exports **every product field** from
  the database, for the list **as it is filtered** - unfiltered, the whole
  catalogue (`/admin/products/export`, a route handler, which checks the
  account itself: a layout does not wrap a route handler).
- One row per piece: price, VAT, costs, profit, margin, times cost, the NOTHS
  fee and profit, stock, the cost lines in one cell, then every detail -
  web address, description, materials, dimensions, care, weight, lead time,
  flags - and the photos as full links (stored paths are made absolute with
  the request's origin). Every figure comes from `costing.ts`, so the file
  agrees with the Price tab.
- A figure that needs a price, or a price and costs, is **blank** without
  them - an uncosted piece's whole price would otherwise read as profit.
- `src/lib/export/csv.ts`: a byte-order mark so Excel reads £ as UTF-8,
  RFC 4180 quoting, and text starting `= + - @` prefixed with an apostrophe
  so a spreadsheet never runs a product name as a formula. Numbers are a
  separate cell kind, so a loss (-1.70) is not mistaken for a formula.

## Import

- "Import" on the products list (`/admin/products/import`) reads a **CSV,
  JSON or XML** file - our own export, edited, or one made from scratch -
  and shows **exactly what it would change** before anything is written.
- **The format is told by what the file holds** (`detectFormat`: `{` or `[`
  is JSON, `<` is XML, anything else CSV), not its name, and the preview
  says how it was read. `readProducts` (`src/lib/import/source.ts`) turns
  all three into one shape - a record per product, field name to text - so
  everything after it is the same whatever the format. Lists become the text
  a spreadsheet holds ("Cards; Christmas Cards", "Bag 0.05 × 1").
- Field names match however a format writes them: `key()` lowercases and
  drops everything but letters, digits and `%`, so "Product code" is
  `productCode`, and "VAT %" (the rate) is not "VAT" (the amount).
- A field a JSON or XML product **does not mention is left as it is**, per
  product; a CSV row has every column. Rows are "Row n" (spreadsheet
  numbering) and JSON/XML entries "Product n", in every message.
- An XML product giving a field twice is refused, naming it: kept quietly,
  one would be ignored, and a price edited by adding a second `<price>`
  imported as no change - found by editing the real export. JSON cannot be
  checked so: `JSON.parse` keeps the last of two repeated keys.
- XML is read by `parseXml` (`src/lib/import/xml.ts`), ours rather than a
  library: elements, attributes, the five entities, character references,
  CDATA, comments. **A DOCTYPE is refused outright** - it is how XML defines
  entities that expand into gigabytes or read other files - and a reader
  that has no DTD support cannot be tricked by one.
- `planImport` (`src/lib/import/products.ts`) is pure: file, products and
  categories in, a plan out - row by row, new or changed or unchanged, the
  changes as "Price: £6.00 → £6.50", and every problem named by row.
- **Matched by web address**, exactly as stored first and tidied only as a
  fallback: an address imported from Shopify can hold what `slugify` would
  strip (`ice-lolly-brooch-_-yellow`), and tidied first it matched nothing
  and an untouched export added a duplicate. Found by round-tripping the
  real catalogue. A row with a new address, or none, adds a draft; one
  without an address whose name is already taken is refused, not
  duplicated.
- **A column left out changes nothing**; a column present is what the
  product becomes, blank included - except Status, where blank leaves it.
  The worked-out columns (VAT, profit, margin...) are ignored and said to
  be; Photos are not imported.
- The admin's own rules apply: a name, whole-number stock, a lead time for
  made-to-order, no active piece without a price, a was-price above the
  price, one product per code, one row per product.
- **All or nothing.** Any problem imports nothing; the import is one
  transaction. It is checked, then applied in a second request that works
  the plan out afresh and applies it only if its hash matches what was
  seen (`planSignature`) - a product saved in between is not overwritten by
  a preview that no longer holds.
- **Round trip:** importing our own export untouched must change nothing,
  in each format. A test holds this for all three, and it was checked on
  the real catalogue (237 unchanged as CSV, JSON and XML; one price edited
  in each gave exactly that one change).
- `parseCsv` (`src/lib/import/csv.ts`) reads RFC 4180 as Excel and Numbers
  write it: BOM, quoted cells with commas, quotes and line breaks, CRLF or
  LF, empty rows skipped; an unclosed quote is an error naming its row.
- The export's apostrophe before text a spreadsheet would run (`'=...`) is
  taken back on import.
- Write `\uFEFF` (and every invisible or non-character) as the escape in
  source, never the character itself. Something between the writing tools
  and the file turns escapes into the characters they stand for; it did so
  four times. `__tests__/source-hygiene.test.ts` fails on any that land in
  `src`, `__tests__` or `scripts`.

## Price list import

- Her three Numbers files name nothing: every piece is identified by a
  photograph in column A. So matching is by **perceptual hash** of the photo,
  with the filename as a second opinion.
- `scripts/price-lists/extract.py` is Python because nothing in JavaScript
  reads Numbers. It writes JSON and photos, and hashes the catalogue's photos
  too; `pnpm prices:import <dir>` does the database work. `--dry-run` previews
  every match without writing.
- Measured thresholds, pinned by tests in `src/lib/costing/matching.ts`:
  within 8 bits is the same photograph; 9-12 bits was right a third of the
  time; beyond, nothing. A match also needs a clear margin over the next
  product, because colourways shot alike hash alike - and a product claimed
  by two rows gets neither. Everything short of certain waits as a
  `PriceListEntry` to be chosen by eye.
- **The import never changes a price.** It copies costs and the VAT rate; her
  2023 price is kept on the entry for reference only. It never writes over
  costs a product already has, and is idempotent by source.
- Money arrives from Numbers as floats (5p is 0.049999999999999996) -
  `src/lib/costing/import.ts` reads through the noise to the penny meant, and
  rounds a genuine sub-penny cost *up*, since a cost understated is a margin
  overstated. A pack size multiplies every line, postage included, as her
  sheet does; the import reports it rather than correcting her maths.

## Orders

- `/admin/orders` lists orders; an order has no page of its own yet, because
  there is nothing to do on one until checkout exists. The list is capped at
  the most recent 200 and says so - orders grow without limit where the
  catalogue does not.
- Statuses are named for what is left to do (`To send`), not for what the
  payment did (`PAID`), and only a paid order counts as waiting on us.
- Order dates spell their month names out in `src/lib/orders/status.ts`
  rather than taking them from Intl: the en-GB abbreviation moves with the
  runtime's ICU data (recent versions render September as "Sept"), and a date
  must not read differently on Vercel than it does locally.

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
- **Photos go up one per request.** Server Actions take 1MB by default, and
  three phone photos in one request failed with "Body exceeded 1 MB limit".
  `experimental.serverActions.bodySizeLimit` is `11mb`: one photo of the
  largest size allowed (`MAX_IMAGE_BYTES`) plus multipart overhead, and no
  more, since every action accepts that much before any check. A test pins
  it between the two.
- The browser checks the **whole batch** with `validateImageUpload` before
  sending any, so one bad file still adds none; the server checks each again.
- **Large photos are shrunk in the browser before sending**
  (`src/lib/images/shrink.ts`): Vercel refuses request bodies over 4.5MB
  whatever the Next limit says. A photo over 3.5MB, or over 3,000px on its
  long side, is scaled to fit 3,000px and saved again - JPEG at 0.9, down to
  0.7 if still heavy; a PNG or WebP becomes WebP to keep see-through parts,
  or JPEG where the browser cannot write WebP (it hands back another type).
  **Anything smaller goes up byte for byte.** A photo the browser cannot
  read or write is sent as it was; shrinking never stops an upload.
- **Every stored photo loses its location** (`stripLocation`,
  `src/lib/images/metadata.ts`): a phone writes where a photo was taken into
  it, and a product photo is public at its own address - taken at home, it
  would publish the home. `createImageStorage()` wraps whichever backend it
  picks so `put` always strips, and no route - upload, Shopify import,
  price-list import - can store a location.
- **Only the location goes.** The GPS block inside the camera data (EXIF, in
  JPEG APP1, PNG eXIf or the WebP EXIF chunk) is wiped in place, values and
  all, and XMP, which can repeat it, is removed. The picture is never
  decoded, so nothing loses quality, and the **orientation stays**: removing
  the whole EXIF block would show a phone photo on its side. Camera data that
  cannot be read safely is dropped whole instead - a photo on its side is a
  smaller harm than a location left in.
- A PNG chunk's checksum is recomputed after the wipe; a WebP whose XMP goes
  has its VP8X flag cleared and its RIFF size corrected.
- Checked with photos written by Pillow with a real GPS block: GPS gone,
  orientation and camera make kept, pixels identical, same size, and macOS
  still reads them. None of the 674 JPEGs stored before this had a location.
- The canvas work is `browserCodec`, passed in so the rules are tested
  without one (jsdom has no canvas). Checked in real Chrome: a 6.7MB
  4032x3024 photo came out 3000x2250 at 2.4MB.
- Files are chosen with `FilePicker`: a dashed area that is the input's
  label, with a Choose button and room to drop. The bare browser control
  ("Choose files / No file chosen") did not read as something to click.
- jsdom has no `Blob.arrayBuffer()`; `jest.setup.ts` fills it in from
  FileReader for the tests.
- Removing a photo deletes the stored file first, then the row. A product's
  images are always looked up scoped to that product id, so a forged image id
  cannot touch another product's photos.

## Catalogue import

- `src/lib/import/shopify.ts` is pure (string in, products out) and fully
  tested; `scripts/import-shopify.ts` does the database and network work.
- Idempotent by slug: a product already present is skipped, never updated, so
  re-running cannot clobber Njomza's edits. Gift cards are skipped.
- Images go through the same byte-sniff validation and ImageStorage as uploads.
- The importer sets a category's parent only on creation; after changing
  categoryFor(), run `pnpm categories:regroup` (`--dry-run` first).

## Storefront

- Public pages live in the `(shop)` route group: `/`, `/shop`,
  `/shop/[category]`, `/product/[slug]`. Only ACTIVE products are visible.
- The header is two tiers split by a sage rule: utility links (Shop, About us)
  and the logo above it, product departments below. The top row is a three
  column grid whose empty right column is reserved for search, account and
  basket - it keeps the logo centred until those exist.
- Storefront pages are held to one width by `max-w-shop`, generated from the
  `--container-shop` token in globals.css. Change the width there, not per page.
  The About page keeps a narrower measure, since long prose should not run the
  full width.
- The storefront never borrows admin components. The admin's `inputClass`
  carries dark-mode colours, which render as a near-black box on the shop's
  light-only pages.
- The shop is **light-only**: it commits to one warm look (beige ground, Jost)
  where the admin follows the viewer's theme. Corner radii come from the theme
  board, not from holly.co - cards 8px, buttons 4px, tags 3px, bands 6px - and
  live in the `shop*` recipes in `src/lib/brand/ui.ts`, so they stay in one
  place. A full-bleed band keeps square edges, since it has no edges to curve.
- Prices always go through `toCardProduct`/`effectivePricePence` so a live sale
  is what a shopper sees. A sale beats the was-price, because the sale is what
  would actually be charged.
- The "Need to know" panel is built by `productFacts` and hides itself when
  nothing is filled in - most imported cards have no dimensions or care notes.
- No cart yet: product pages say ordering is coming soon rather than showing a
  button that does nothing.

## Home page

- Everything on it that is not simply the catalogue lives in the `HomePage`
  singleton (one row, id `home`) and is edited at `/admin/home`: headline,
  opening paragraph, button label, the promises, the heading above the
  pieces, and which piece leads with its photo.
- `HOME_DEFAULTS` is a **complete page**, not placeholder text. A shop that
  has never opened that screen still reads as written, and the row is only
  created on the first save.
- The chosen hero is scoped to ACTIVE and must still have a photo;
  `heroImageFor` falls back to the newest piece with one. A piece archived
  months after it was picked must not keep leading the page, or empty it.
- The row of pieces shows whatever is marked **featured** on the product,
  falling back to the newest when nothing is. That checkbox existed on the
  product form from the start and did nothing until now.
- Emptying all three promise boxes takes the sage strip off the page.

## Storefront pages

- A category page opens on a quiet band (`ui.shopBandQuiet`): breadcrumb,
  name, a line about it, the count. Then picture tiles for the types beneath,
  then everything in it. The promise strip is the home page's alone - it was
  tried here and was not wanted.
- **No text pills for the types.** They were tried twice. Only the three
  group pages ever had them, and Clothes has thirty types: four rows of
  shouting capitals above tiles that lead to the same places with a photo
  attached. The tiles do the job.
- **The band carries no photograph.** One was tried wide, then upright, then
  cropped and zoomed; the catalogue is shot on white with margins running from
  nothing to 42% of the frame, so no crop suited them all and it was dropped.
- Tiles come from `categoryTiles` in `src/lib/storefront/tiles.ts`, built in
  one pass over `tileProducts()` rather than a query per tile. A child holding
  nothing is left out - a tile leading to an empty page is a dead end.
- Tile photos are square, like the product shots themselves: a landscape crop
  slices a card across the middle. The white around a subject is in the
  photograph, not the layout - trimming it properly means trimming the stored
  images, not the CSS.
- An unwritten category falls back to `categoryIntro`, a line built from its
  name, which also becomes the page's meta description. The shopkeeper's own
  description always wins.

## Overview

- The Overview's figures come from `overviewStats` (`src/lib/admin/overview.ts`):
  live products, drafts, orders to fulfil, running sales, live promo codes -
  each a link to the page behind it (the label's link is stretched over its
  card, so the list stays a list).
- **Sales and codes are counted by the rules the shop and checkout use**:
  `isSaleLive` (switched on and between its dates) and `codeIsLive`
  (switched on, started, not ended, not used up; a minimum spend does not
  count against it). "Running sales" once counted every sale switched on,
  scheduled and ended ones included.
- Beneath running sales and live codes, **how many are scheduled**: switched
  on and still to start ("2 scheduled", "None scheduled"). One switched off
  is not scheduled - it will not start on its own - and a code used up
  before it starts never will.

## Admin chrome

- The admin has a fixed top bar (`AdminTopBar`, h-14) and a fixed footer
  (`AdminFooter`, h-12); the protected layout pads the content by those
  heights. A page that pins its own header uses `sticky top-14` with the page
  ground as background so rows scroll beneath it (see the products list).
- The nav map and `isCurrent`/`sectionTitle` live in `src/lib/admin/nav.ts`,
  a plain module, so server components can import them; `admin-nav.tsx` is
  the client component.
- A list page wraps its title block in `PinnedHeight` with `PINNED_BLOCK_CLASS`
  and uses `Th` for column headers: the block publishes its height as
  `--pinned-height` and each `Th` sticks just beneath it. A table must not sit
  in an overflow container, or its header would stick to that instead of the
  page.
- **The products list's bulk bar lives inside that block**, which is why
  `ProductTable` takes the page's header as a prop and pins it: scrolled away
  from the rows it acts on, "12 selected" is a claim you cannot check. Being
  inside the measured block means the bar's height is already in
  `--pinned-height` and the column headers settle beneath it - no second
  sticky layer to keep in step with the first.
- The products list filters by category with rows of pills (`CategoryPills`,
  server-rendered links): groups, then the chosen group's types, down to the
  selection. The slug lives in the URL as `category`; the page resolves it to
  the category plus its descendants with `subtreeIds`. Anything shared between
  the client form and server pills - `filterHref` - lives in a plain module
  under `src/lib`, never in a "use client" file.
- List thumbnails go through `next/image` (`ProductThumbnail`). The imported
  catalogue has photos up to ~4,900px wide, so a plain `<img>` would download
  the full original for a small square, 240-odd times on one page.
- Two sizes: `row` (56px) and `large` (112px, the products list). The class
  cannot be built from the number - Tailwind reads the source for whole class
  names, so `size-${n}` would never be generated - which is why `SIZES` pairs
  each measurement with its class.
- `ui.tableRow` carries the hover ground as well as the borders, because six
  tables share it and a row that does not answer the pointer leaves you
  counting columns to be sure which one you are on. The brand tests check the
  hover grounds are ones the page's own text still reads on.
- The categories list collapses per group, remembered per browser. What a
  shut parent hides - everything beneath it however deep, whether or not
  those rows are themselves open - is `visibleBranches` in
  `src/lib/categories/collapse.ts`, not the component.
- Filtering is live: the products filter is a client component that writes to
  the URL as you type (debounced) or change a select, so the server component
  re-renders and the view stays bookmarkable. No Filter buttons.

## A product's categories

- The Details tab shows only the **chosen** categories, each by its place in
  the tree ("Cards › Christmas Cards"), with "Change categories" opening the
  whole list and a × on each to take it off (`CategoryChooser`). All forty-
  odd checkboxes down the page at all times was not wanted.
- The list is always in the page, only `hidden`: a hidden checkbox is still
  posted, so the ticks save - and the unsaved-changes warning sees them -
  whether it is open or not. The ticks are held in state so the summary
  follows them.
- The open list has a **search** (the cursor lands in it): every word typed,
  in any order, against each category's place in the tree - so "cards"
  finds a group's types - and each match keeps its group beside it. Rows
  are hidden, never removed, so a tick filtered out of view is still saved.
  The box has no `name`, so it is neither posted nor seen as a change, and
  Enter in it does not save the product.

## Choosing by photo

- `PhotoChooser` (`src/components/admin/photo-chooser.tsx`) is the admin's
  one modal for choosing a thing by looking at it: tiles of photos, a search
  that matches every word typed in any order against whatever the caller says
  an item can be found by, and a cap of 60 with a note to narrow. It knows
  nothing about what it is choosing - it takes tiles and hands back an id.
- `PhotoField` (`photo-field.tsx`) is the form field around it: a box showing
  what is chosen by its photo and name, Choose, and Clear. **Every
  choose-by-photo field is one**, so they all look alike - the home page's
  main photo (through `ProductPicker`) and a piece's price-list row. It holds
  no value itself: the caller keeps it, because choosing a price-list row does
  more than record an id.
- **It labels itself** and is a `role="group"`, rather than sitting inside
  `Field`. A `<label for>` pointed at its Choose button renames that button to
  the field's label, so the button stops announcing what it does.
- Given a `name`, it posts the id in a hidden input, so the surrounding form
  posts it like any other field and the field needs to know nothing about
  what it is for.
- A chosen id that is no longer in the list is kept, not silently cleared -
  the list is filtered to what is eligible, and a piece archived since it was
  chosen must not be dropped by merely opening the form.

## Confirmations

- Destructive actions confirm through `ConfirmDialog`, never `window.confirm`
  (which cannot be styled and looks like the browser, not the shop). It wraps
  the native `<dialog>`, so focus trapping, Escape and returning focus are the
  browser's job. Cancel comes first so the safe choice takes focus, and the
  confirming button says what it does - never "OK".
- The pattern: a `type="button"` opens the dialog, and confirming calls
  `requestSubmit()` on the real form, so the server action is unchanged.

## Accounts

- `requireAdmin()` reads the account live from the database on every request:
  the cookie proves who signed in, the row says whether they still may and as
  what. A promotion applies on the next request; a removed account is sent to
  `/admin/sign-out` (a route handler, since cookies cannot be cleared during a
  page render) and lands on login without looping.

- Settings lets anyone change their own password and lets an OWNER add, edit
  (name, role, password reset) or remove accounts. `removalBlockedBecause()` in `src/lib/admin/removal.ts` is
  the rule: no removing yourself, no removing the last owner, staff remove
  nobody. It runs on the server for every removal.
- A new account's password is generated and returned to the owner once; it is
  never stored in plain text and never shown again.
- Passwords are never trimmed - a leading space is a legitimate character.

## Saved pieces

- The heart is on the product cards, the product page and the header, and
  `/account/favourites` lists them. It is what makes an account worth having
  before checkout exists.
- Signed out, the heart is a **link to the sign-in form**, not a control that
  appears to work and cannot.
- Signed in, it answers immediately through `useOptimistic` and reconciles
  when the server catches up: a heart that waits on a round trip feels broken,
  and being briefly wrong costs nothing worse than a heart that fills and
  empties again.
- `toggleFavourite` is a delete-then-create, not a read-then-branch, so two
  quick clicks cannot collide: `deleteMany` does not mind finding nothing and
  `createMany` skips a duplicate.
- A saved piece that has since come off the shop is dropped from the list
  rather than linking to a page that is no longer there.
- **The product card is no longer a single link.** The link stretches over the
  card (`after:absolute after:inset-0`) so the whole card is still one target
  while the heart stays a control of its own - a button inside a link is
  neither valid nor operable.

## Shopper accounts

- Customer sessions are **kept apart from CMS sessions on purpose**: a
  different cookie, and a `kind: "customer"` claim both verifiers insist on.
  Both are signed with the same `AUTH_SECRET`, so a valid signature proves
  only that we issued a token, not what for - without the claim a shopper's
  cookie would verify as staff. Tests check the rejection both ways.
- `currentCustomer()` reads the row live, like `requireAdmin()` does. A null
  `passwordHash` means the account has been closed back to a guest record and
  its sessions stop working.
- A `Customer` with no `passwordHash` is a guest row from checkout, not an
  account. Registering against that email gives it a password rather than
  creating a second identity, so guest orders stay attached.
- The password floor is **eight** for shoppers against the CMS's twelve, and
  no composition rules - a shopper account holds an order history, a staff
  account holds the shop.
- **Known gaps, all for want of sending email:** registration says plainly
  when an address is taken (an enumeration vector, but the alternative needs
  email we cannot send and strands anyone who forgot they had an account);
  there is no password reset; and changing a password does not invalidate
  sessions elsewhere, which needs a "valid from" column on the customer and
  an `iat` check.

## CMS accounts

`pnpm admin:create "<email>" "<name>" [OWNER|STAFF]` creates or updates an
account. It upserts, so re-running resets the password - that is the password
reset path until Settings grows account management. Pass `-C <project path>` to
run it from another directory.

## Git

Remote is the **personal** account: `https://github.com/bgosalci/nyoki` over
HTTPS. Not Gosalci-Org, which is the gosalci.com work org and uses SSH.
