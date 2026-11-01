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
- **The red** (`nyoki-red`, #85302c) is derived, not read from a file: the
  logo's sage turned to the far side of the colour wheel, half saturated, at
  navy's lightness, so it sits with the palette and a name in red weighs the
  same as the navy names beside it. A test works it out from sage and navy.
  Approved on the page's beige (7.7:1), for a department's name in the
  header; added 31 October 2026 for CHRISTMAS.
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
  `<body>` carries it too, for browser extensions: Grammarly writes
  `data-gr-ext-installed` onto it, and the dev overlay showed that as a
  hydration error on every page. Each covers only its own attributes.
- `pnpm brand:board` regenerates docs/brand/theme-board.html from the module.
  Never edit the board by hand.
- **The logo's files are named only in `src/lib/brand/logo.ts`** (`LOGO`,
  `LOGO_SMALL`, `LOGO_ON_SAGE`), which every page and the board draw from; a
  test fails on any other `/brand/...logo` path. The 2026 wordmark came on
  white and was cut out onto a clear ground, each pixel its own ink exactly,
  and set in the first logo's frames, so the headers kept their layout. A new
  logo gets new file names: the image optimiser and browsers cache by
  address. The first logo is in `docs/brand/old-logo/`, still the source of
  sage, sage-light and navy - the 2026 inks are a little bluer, and the
  palette has not followed them.

## Promo codes

- `DiscountCode` is a code a shopper types at checkout; a `Sale` needs no code
  and applies automatically. Both live in the CMS, and they are separate things.
- `codeRedeemability()` decides whether a code can be used. Every unavailable
  reason reads identically on purpose - naming the reason confirms the code
  exists. A minimum spend is the exception, since the shopper can act on it.
- Codes are deleted outright: an order records the discount it was given in
  pence, so nothing about it depends on the code surviving.
- A code is applied at checkout, in the order's summary: off the goods at
  the prices they sell at (a sale's included), never off delivery. Its
  `usedCount` goes up when payment is confirmed, which is not built yet.

## Products list

- Rows carry checkboxes and the list offers bulk actions. Archiving and
  deleting are both offered because they differ: archiving is reversible,
  deleting is not.
- Deleting a product is safe for order history - a line snapshots the name,
  price and code it sold at, and its product reference is SetNull rather than
  cascading - but it also removes the photos from storage, so it asks first.

- **The order is set by dragging**, and it is the shop's order too: one
  order for the whole catalogue (`Product.sortKey`, read highest first), so
  category pages, the Shop page, the home page's pieces, each category
  tile's photo and the automatic You may also like pieces follow it. The list keeps drafts, then active, then archived
  apart (`PRODUCT_LIST_ORDER`), each in that order, and a piece moves only
  among its own status. It was by last saved, which moved a piece to the top
  on every edit, and the shop by newest created; neither could be chosen.
- `sortKey` is a **sequence**, so a new product - made in the admin,
  imported from a file or from Shopify - takes the highest key and lands on
  top with no code of its own. A move (`moveUpdates`,
  `src/lib/products/ordering.ts`) never makes a key up: it hands the keys of
  the rows it passes round among them, so a moved piece cannot rise above a
  newer one, and what it passes keeps its order among itself. The migration
  started every key from the shop's old order, newest highest.
- Dragging works in a filtered view (a category, a search): the piece lands
  just before or after the one it was dropped on, in the whole order.
- **A row drags from anywhere on it with the mouse** (dnd-kit 6.3.1 /
  sortable 10.0.0, pinned; its pointer listener sits on the `<tr>`), after
  4px of travel, so a click still ticks the box or opens the piece. It first
  shipped dragging only by a small handle of faint dots, and "unable to
  change position" was the result. A row dropped among another status's
  rows lands at the nearest end of its own group - an active piece dragged
  up past the drafts becomes the first active one - rather than snapping
  back without a word.
- **The handle is the keyboard's and the finger's way in**: on touch the
  rest of the row scrolls the page. The keyboard is ours, not dnd-kit's
  KeyboardSensor: space picks up, an arrow moves one place within the
  group, space puts down and saves, escape puts back, each said aloud. The
  sensor scrolled the page instead of moving the row whenever the next row
  was below the middle of the screen - with 129px rows, nearly always - so
  in a real browser the arrows did nothing; jsdom, with short fake rows,
  passed. Keep the drag tests' rows short only for the mouse.
- A move shows at once and is saved behind it (`moveProduct`, which works
  the move out afresh from the database); one that cannot be saved is put
  back and says so. dnd-kit's announcements live in a `role="status"`
  region of its own (`DndLiveRegion-…`), which tests looking for the page's
  notices skip.

- **Each row shows its categories** under the name, as pills, by their
  places in the tree (`categoryPaths`/`pathsOf`, as its Details tab shows
  them), or says "In no category". Filled (`ui.badgeQuiet`), not outlined
  like the filter's pills above, which are links: these only say.
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

## A category's colour in the header

- **Each category's name can take a colour in the shop's header** - the
  department row and the drop-down menus - set on its own page in the admin
  (`Category.labelColour`, a brand token, navy to begin with). The choice is
  by swatch (`SwatchField`), with the name previewed on the page's beige.
- Both the row and its menus sit on the page's beige, so the colours offered
  are those approved as text on it (`src/lib/categories/label-colour.ts`):
  navy, then ink, text dark, red and sage deep, the clearest first. Sage and white
  barely show on beige and are not offered. A colour no longer offered draws
  in navy.
- Saving a category redraws the shop's layout, since the header shows its
  name and colour. Only the header takes the colour: the footer's list and
  every page's tiles keep their own.

## Category order

- **The categories list is dragged into the shop's order**, as the products
  list is: the departments among themselves, the types within each. The
  header's departments and their menus, the footer and every page's tiles
  follow it, through `departments()` and
  `shopCategories()` (`src/lib/storefront/queries.ts`); the product page's
  category chooser and the products list's pills read it too.
- **The shop lists only categories with a piece on it**: the header's row,
  its menus and the footer leave out any with no active piece in it or
  anywhere beneath it (`stockedDepartments`,
  `src/lib/storefront/departments.ts`), as the tiles already did
  (`categoryTiles`). A draft fills nothing; a piece filed only in a type
  fills the department above it, however deep. It first listed every
  category, and half of Clothing's menu led to empty pages. An empty
  category's page still opens, saying "Nothing here just yet", so a
  bookmark or a home page tile leading there is not broken.
- `Category.position` is a **sequence read lowest first**, compared only
  among siblings (`CATEGORY_ORDER`, ties by name), so a new category - from
  the admin or the Shopify import - lands last in its group with no code of
  its own. A move hands the group's keys round (`moveAmongSiblings`,
  `src/lib/categories/ordering.ts`). The migration started from the old
  alphabetical order.
- **A category moves only among its siblings**; giving it another parent is
  its own page's job. A row dropped among another group's rows lands as near
  there as its group allows (`categoryLanding`): a department dropped among
  Cards' types goes straight after Cards, a type dragged out of its group
  stops at its nearest end.
- **A group takes what is inside it along**, and folds its types away while
  it is dragged, so it moves as one row. Which row is being dragged is read
  from dnd-kit (`useDndContext`), never kept in state beside it: a drag let
  go of before it has properly begun ends with neither `onDragEnd` nor
  `onDragCancel`, and state set on start left the group folded for good.
  Found in real Chrome; a test reproduces it.
- Given another parent, a category takes a fresh key from the sequence and
  goes last in its new group; deleting one lifts what was inside it to the
  end of the top level, in its order (`freshPositions`, the codebase's one
  raw query - `nextval` has no Prisma call).
- Rows drag from anywhere with the mouse and from the handle with the
  keyboard, exactly as products do; the row is `SortableRow`, shared.

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
  sessionStorage, per tab) rather than worked out again on the product page.
  It was first needed because the list was sorted by what was edited last,
  so a "next" recalculated after every save sent you back to the start; the
  list is in the dragged order now, but remembering it still keeps its
  filters. See `src/lib/products/browse.ts`.
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
- **A `<select>` with a `defaultValue` is keyed by that value** (a product's
  Status, a category's Parent). React reads a select's `defaultValue` only
  when it first draws it, and resets the form after a save, so an active
  piece saved as a draft went back to showing Active - and the next save,
  of anything, made it active again. React updates a text box's default when
  its prop changes, so they never had this.
- **A controlled `<select>` is a `Select`** (`src/components/admin/select.tsx`)
  in any form React resets. React keeps a controlled text box's default in
  step with its value, so the reset puts back what it shows; it does not for
  a select, which the reset drops to its first option while React still
  holds the one chosen, and nothing re-renders to put it right. A piece saved
  as a Large Letter showed "Not set", and the next save cleared it; a
  zero-rated piece went back to 20% VAT. `Select` keeps the chosen option the
  default. A form that leaves the page on success, or submits through
  `onSubmit` (the bulk price dialog, the shop's customiser), is never reset.
- **A controlled checkbox is a `Checkbox`** (`src/components/admin/checkbox.tsx`)
  in such a form, for the same reason: React sets its default once, from the
  tick it was first drawn with, so the reset put every box back to how the
  page opened. A product's Cards, taken off and saved, showed ticked again
  beside a summary without it, and the next save would have put it back; the
  Customise tab's switches did the same. `SwatchField`'s radios keep their
  own default the same way.
- Controlled text boxes (a product's Price tab, a category's usual costs)
  never lose anything - React owns their values - and have tests saying so.

## A product's Price tab

- A product has two tabs, as routes: **Details** (`/admin/products/[id]`) and
  **Price** (`/admin/products/[id]/price`), sharing a layout that carries the
  way back, the name and the tabs. Routes rather than toggled panels, so a
  price can be linked to and the back button goes back a tab. A card or
  bookmark has a third, **Customise** - see Customising cards and bookmarks.
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

## Customising cards and bookmarks

- **Only cards and bookmarks** can be customised (`customisationGroup`,
  `src/lib/customisation/group.ts`): a category called Cards or Bookmarks,
  singular or plural, the piece's own or anywhere above it. There is no
  Bookmarks category yet; one made later is recognised by its address. The
  Customise tab, its save and the shop page all ask the same function, so a
  piece moved out of Cards stops offering anything, its settings kept.
- The Customise tab (`/admin/products/[id]/customise`) sets three things,
  each with what it costs: a **printed message inside** (cost, longest
  message), **personalisation** (cost, whether it is required, and what can be
  personalised - each thing typed with a character limit, like a name, or
  chosen from a list, like an initial or a star sign) and **packs** (how
  many, at what price). The single card is always the product at its own
  price; packs are the same card. A piece can have all three.
- Stored as `ProductCustomisation` (one row per piece, absent = nothing
  offered), `PersonalisationField` and `ProductPack` rows. Packs are not
  variants: variants are clothing sizes and colours with stock of their own.
- **Every extra is charged per card**, so a pack of three with an 80p message
  pays £2.40 for it, and the page says "+80p a card". A pack carries one
  message and one personalisation, printed in every card.
- **A live sale comes off the single card and the packs**, not the extras
  (`toOffer`, `src/lib/customisation/offer.ts`).
- Required personalisation has no switch on the page; the cost can be £0 when
  the price covers it. Optional personalisation is a switch, off to begin with.
- **A section switched off keeps its settings**: they stay in the form,
  hidden and posted, `parseCustomisation` does not check them, and the save
  writes only the switch. Switching the message back on finds its cost.
- The shop page shows only what a piece offers, in the panels, tiles,
  summary and sticky total bar first built for a standalone card page
  (`src/components/shop/customiser.tsx`). The choices live in
  `CustomiserProvider` around the whole page, so the panels in the details
  column and the bar at the end of the page share them. Nothing starts
  chosen. A piece with options has its details unpinned (`pinDetails`),
  since they can be taller than the screen.
- **The options come after the description**, before Need to know. Above
  it, straight under the price, was tried and not wanted.
- A pack's saving is a sage outline with deep sage text: a sage fill under
  ink read as a heavy grey blob beside the price.
- **Choices are small cards**, a few to a row: the name, then the price or
  what it costs, 44px tall at the least. The first ones were twice the size
  and were too big; "Pack of 3" needs no "3 cards" line beneath it.
  A price and its saving stay on one line: the cards are at least 10.5rem
  wide, so a phone takes one to a row rather than break it.
- The rules - price, what is missing, the summary's words - are
  `src/lib/customisation/choices.ts`, pure, for the basket to check by too.
- Pressed too soon, Add to basket shows what is missing and moves to the
  first of it. With everything chosen it puts the piece in (see Basket);
  while ordering is closed it is `aria-disabled` but never faded, and says
  ordering opens soon.
- **The bar is one slim row** (`CustomiserBar`): the total, a short line of
  what is still to choose (`barHint`, from each missing choice's `short`) or,
  once nothing is, what was chosen (`readyHint`), and Add to basket. Edge to edge on a phone in the page's own colour, as
  `BuyBar` is; a floating card from `md` up. It was a card of three rows -
  total and quantity, the button, a sentence - and took a fifth of a phone's
  screen; quantity has its own panel now, above Your choices. A floating
  pill, a bar that shrinks on scroll and a floating button were drawn as
  well: each would sit right on Safari's own floating bar, where a full-width
  band reads as the page.
- Its notice above the bar, gone after six seconds or the next change, says
  the piece went in (with View basket, on a phone only: a computer has the
  panel from the header's basket), or why not - or, while ordering is
  closed, how to order meanwhile.
- **Delivery straight to the recipient is in checkout**, for every product,
  not here. An emailed receipt waits on an email service.
- Not in the CSV/JSON/XML export or import yet.

## Clothes: colours, sizes and stock

- **Clothing is anything under Clothes** (`isClothes`,
  `src/lib/clothes/group.ts`), itself or anywhere above, told the way cards
  are (`findInLineage`, `src/lib/categories/lineage.ts`). Its Details tab has
  **Colours and Sizes in place of Dimensions**, switching the moment a
  Clothes category is ticked. Dimensions stay in the form, hidden and posted,
  so neither is lost by saving the other, and the shop leaves a clothing
  piece's dimensions off too.
- `Product.colours` and `Product.sizes` are ordered lists, and **each colour
  in each size is a `ProductVariant`** with `colour`, `size` and `stock` (null
  where the piece has no colours, or no sizes). A shopper must choose a colour
  if there are colours and a size if there are sizes.
- **Stock is kept per colour and size**, in the grid beneath the lists. The
  Stock box at the top becomes their total, and `Product.stock` is that total,
  written on every save, so the products list and the export read one number.
  Clothes in no colours or sizes keep the plain Stock box.
- **A variant is updated, never replaced** (`planVariants`,
  `src/lib/clothes/variants.ts`): every row posts the name it was saved under
  (`colourWas`, `sizeWas`), so a stock change or a rename keeps the variant -
  an order line points at it, and it holds Shopify's code and size price. The
  first colour added to a sized piece takes over its sized variants (the
  editor moves their stock under it); removing the last colour hands it back.
- After a save the editor starts again from what was saved, so each row knows
  the name it is now saved under. The editor's rules are
  `src/lib/clothes/editor.ts`, pure.
- **One price for every colour and size.** On 14 imported pieces Shopify had
  the larger sizes £5-£10 dearer; those prices stay on the variants
  (`pricePence`), unused. Chosen, not overlooked.
- On the shop the choices are the customiser's (`ColourPanel`, `SizePanel`),
  by the rules in `src/lib/clothes/stock.ts`: a colour is out of stock with
  none in the size chosen - or in any size, until one is chosen - and a size
  likewise. A combination never stocked has none. Out of stock is a dashed
  tile, its name struck through, that cannot be chosen. **Made to order is
  never out of stock.** The only colour, or only size, starts chosen; a piece
  with nothing left at all says "Out of stock for now".
- A piece moved out of Clothes keeps its colours, sizes and variants but
  offers none of them, and has the plain Stock box again; saving anything
  that is not clothing never touches them.
- The migration turned Shopify's `options` (Colour or Color, and Size) into
  the columns, set each product's lists in variant order, and set its stock
  to its variants' total - the import had left it at 0. The Shopify import
  script now writes them the same way.
- **The products import refuses a Stock change** on clothing in colours or
  sizes, whose total is theirs; its total as it stands is no change, so an
  untouched export still imports. Colours and sizes themselves are not in the
  CSV/JSON/XML export or import yet.

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
  web address, description, materials, dimensions, care, weight, how it goes
  in the post, thickness, lead time, flags - and the photos as full links (stored paths are made absolute with
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

- `/admin/orders` lists orders, capped at the most recent 200 and saying so -
  orders grow without limit where the catalogue does not. Each opens by its
  number (`/admin/orders/NYK-1001`, `OrderDetail`), leading with what to
  make: printed words in full with Copy (never retyped), the personalised
  names, colour and size; then where it goes, the gift note (with Copy) and
  whether the prices are left off; then who ordered it. Read only: marking
  it sent comes with payment.
- **Order numbers come from the database**: `NYK-` and a Postgres sequence
  from 1001 (`order_number_seq`, the column's default), so two checkouts at
  once cannot share one.
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
- The picker's search matches every word typed, in any order, against each
  product's name **and its categories' places in the tree**
  (`categoryPaths`/`pathsOf`), so "christmas" finds every Christmas card,
  named so or not; each row shows its categories. While narrowed, Select and
  Clear act on what is shown ("Select these 21"), so a category goes into a
  sale in two clicks. Enter in the search does not save the sale.
- One matching rule for every admin search box, `matchesEveryWord`
  (`src/lib/search.ts`), shared by the sale picker and the category chooser.
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
- A photo moves with **← and →** ("Move left", "Move right"), since the
  photos run across, at least two to a row at every width; ↑ and ↓ read as
  the wrong way. The action still says `up` (earlier) and `down` (later).
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
  `/shop/[category]`, `/product/[slug]`, `/basket`. Only ACTIVE products are
  visible. Checkout has a group of its own, `(checkout)`, for its quieter
  header (see Checkout).
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
- While ordering is closed, product pages say ordering is coming soon rather
  than showing a button that does nothing.

## Ordering is switched off on the live site

- `orderingOpen()` (`src/lib/ordering.ts`): **open in development, closed in
  production**, until payment is built - a shopper would otherwise reach
  Ready to pay with no way to pay. `ORDERING=open` or `ORDERING=closed`
  says otherwise; anything else set closes it, since taking orders by
  mistake is worse. Payment switches it on.
- Closed, the shop reads as it always has: the header's basket is a disabled
  icon, Add to basket says ordering opens soon, a piece with nothing to
  choose keeps the phone's `BuyBar`, and `/basket`, `/checkout` and their
  actions answer not found or refuse.

## Made on order

- **Made on order** is a switch beside Status on a product's Details tab
  (`Product.madeOnOrder`). The piece keeps a stock count, often low, of
  things quick to make, and goes on selling when it reaches 0: more is made
  once it is ordered. Any quantity can be ordered, in any colour and size.
- The switch (`Toggle`, `src/components/admin/toggle.tsx`) is **green when
  on**: `ui.toggle` draws the track in sage deep (5:1 on the white page, and
  under the white knob), sage itself on the dark admin's night ground; off is
  navy faded to 70%, still 3:1 off the page. It was navy when on, and green
  was wanted.
- **Shoppers are told nothing of it**: no tag, no lead time, no "sent
  together" note, and never "Out of stock". That is what sets it apart from
  **made to order**, which keeps no stock and shows its lead time on the
  card, the page and the basket. Its checkbox says so ("none kept; shoppers
  see the lead time"), since the two names are close.
- One rule for both, `neverRunsOut` (`src/lib/products/stock-limit.ts`):
  the product page's quantity limit, the basket's share-out of stock
  (`stockOf` in review.ts) and clothing's offer (`unlimited`, from
  `toClothingOffer`) all ask it. One of a kind still wins: one in all.
- The products list shows its stock with "made on order" beneath; the
  export and import carry a "Made on order" column (Yes/No).
- When payment takes stock off, a made-on-order piece must stop at 0
  rather than go below it.

## Basket

- **Every piece is bought the same way** once ordering is open: its choices,
  if any, a Quantity panel, and the customiser's slim bar with Add to
  basket. A piece with nothing to choose has just the quantity, and no Your
  choices panel; a one-of-a-kind piece no quantity. A separate row of
  stepper and button beneath the price was built for those, and two ways of
  showing one button was not wanted.
- Kept on the server (`Basket`, `BasketLine`; `src/lib/basket/store.ts`). A
  guest's is named by the httpOnly `nyoki_basket` cookie, which only a
  server action can set; a signed-in shopper's is joined to the account, and
  a guest basket is folded into it the next time the basket is looked at -
  covering sign-in and registering alike. A guest basket already joined to
  an account is not shown to a signed-out visitor.
- **A line keeps the choices, never a price** (`StoredChoices`: variant,
  pack, message, printed words, personalisation, quantity), and only what
  the choices made count - no words for a card left blank. Same piece, same
  choices is one line (`lineKey`, a hash, uniquely indexed); different words
  inside make a second.
- `reviewBasket` (`src/lib/basket/review.ts`, pure) prices every line afresh
  from the piece as it stands, by the page's own `productOffer` and
  `unitPricePence`, and says what changed since it went in: a price, stock
  run short, a piece off the shop, choices that no longer fit
  (`fitsOffer`). `reviewAndSave` writes the corrections back so each is said
  once, at the top of the basket or checkout (`BasketChanges`).
  `addedPricePence` exists only to tell the shopper a price moved.
- **Stock is checked, not held**: on adding, on the basket and on Continue to
  payment. Lines of one piece share its stock in the order they went in; a
  pack of three takes three cards of it; clothing counts by variant; made
  to order never runs out; one of a kind is one in all. Taking stock off
  waits for payment, so an unpaid order cannot empty the shelf. 10 active
  pieces had stock 0 when this landed, and read as out of stock.
- **A piece's page asks no more than there are**, as the basket's stepper
  does (`mostAvailable`, `src/lib/customisation/choices.ts`): the stock of
  the colour in the size chosen - the most of any still possible until both
  are - over the cards in the pack chosen. One more switches off there and
  says "That's all we have"; a number typed past it comes down when the box
  is left, and the total and Add to basket go by the limit meanwhile.
  Choosing a colour, size or pack with fewer brings the quantity down. The
  page is handed the piece's own `stock` (null for made to order), not
  whether it is sold out. What is already in the basket is not counted
  there: adding puts in what there is room for and says so.
- **Only Add to basket puts a piece in.** Enter in a box or on a choice
  does not (`holdEnter`, on the customiser's form): a browser sends a form
  from its fields on Enter, so finishing a quantity bought the piece. Enter
  in the quantity box tidies it, as leaving it does; a message still takes
  Enter as a new line. jsdom never shows the bug - user-event looks for the
  button only inside the form, and this one is outside it, tied by `form` -
  so the tests check that Enter's keydown is cancelled.
- Adding says so in a panel dropping from the header's basket on a computer
  (`BasketAddedProvider` in the shop layout joins the page to the header),
  with how far the basket is from free delivery, and in the bar's notice on
  a phone. The header counts pieces, not lines.
- **Fewer going in than were asked for is said where it cannot be missed.**
  The page's quantity stops at the stock as it loaded, so 10 can be asked
  for and 7 go in: stock sold since, or some already in the basket, which
  the note names when it is the reason. The panel says it first, in a beige
  band above the piece, and the bar's notice says it on a computer too,
  beside the button just pressed. It was a grey line beneath the piece, at
  the top of the screen, and was read past. Put it back says it the same way.
- **Remove asks first** ("Remove ...?", Keep it or Remove), in the shop's own
  `ConfirmDialog` (`src/components/shop/confirm-dialog.tsx`) - the admin's
  carries dark-mode colours. It first took a line out without asking, and
  that was not wanted. Once out, the notice still offers Put it back for ten
  seconds, checked again like any piece going in.
- **The lines keep one place on the page, empty or not** (`BasketView`,
  drawn by the basket page). The empty basket was once a page of its own
  with its own `BasketLines`, so React drew it afresh and the last piece
  taken out could not be put back.

## Checkout

- One page, `/checkout`, in its own `(checkout)` group: the way back to the
  basket, the logo, and nothing else to wander off into. Your details, who
  it is for, where it goes, delivery; the order beside it on a computer,
  folded to a line at the top on a phone, with the total and Continue in the
  slim bar. Built from the customiser's panels, tiles and filled boxes.
- **No account needed.** A guest is a `Customer` with no password, found by
  email; one already there is never changed from checkout. Signed in, the
  email is the account's (the form's is ignored) and saved addresses are
  tiles. Sign in from checkout comes back to it (`afterSignIn`, which only
  ever returns to `/checkout` or `/basket`).
- **A gift goes straight to the recipient**: their address, an optional note
  for the parcel (300 characters), and prices left off the delivery note,
  ticked to begin with.
- **Checkout starts on For me**, always - coming back to an order waiting as
  a gift included, as delivery starts on the free way: it first brought the
  gift back, and For me was wanted as the default. The order's note and
  prices setting wait behind the gift tile, so choosing it again finds them.
  Left on For me, the order is saved as no gift - no note, prices shown.
- UK only for now: the country is not asked and the postcode is checked and
  written as Royal Mail writes it (`normalisePostcode`).
- The total follows every choice live, by `checkoutTotals`
  (`src/lib/checkout/totals.ts`, pure), which the server uses again. Free
  delivery is per option and judged after the code. **VAT is shown, not
  added**: prices include it, and the summary says how much, each line at its
  own product's rate, the code's discount and the delivery charge shared
  between rates by the goods' value, each rate's VAT taken out once and
  rounded.
- **Continue to payment makes the order** (`continueToPayment`): checked
  again, then saved as PENDING ("Not paid") with every line's name, code,
  photo, price, VAT rate and choices in words (`OrderItem.details`), in one
  transaction. A basket that changed on the way stops it and says what.
  Coming back to change something updates the order already waiting for that
  basket (`Order.basketId`), and the form starts from it - all but who it
  is for, which starts on For me, and delivery, which starts on the free way
  (see Delivery options).
- **An order's address is its own row**, joined to no account, so editing a
  saved address cannot move an old order; "Save it to your account" makes a
  second, saved copy.
- `/checkout/pay` (Ready to pay) shows the waiting order, found by the
  basket, never by anything in the address; once the basket has moved on it
  sends the shopper back through checkout (`basketMatchesOrder`). The card
  box is where payment goes. A shopper's own order list leaves out orders
  never paid for (`seenByShopper`).

## Delivery options

- Settings › Delivery (`/admin/settings/delivery`) sets the `ShippingRate`
  rows checkout offers: name, how it is priced, free over (after any code),
  shortest and longest working days, offered or not. With none that takes
  the basket's parcel, checkout says so, points to Contact, and Continue is
  switched off. Deleted outright: an order copies the option's name, what it
  charged and the parcel.
- **Every UK order goes free; faster costs.** Royal Mail Tracked 48 is free
  over £0 - free on every order, "Always" in the list (`freeText`) - and
  Tracked 24 is the paid faster way, at Royal Mail's Tracked 24 price for
  the parcel (not the difference between the two). Both stay priced by
  size and weight, so a free option still drops out for a parcel its list
  cannot take, and checkout strikes through what it would have cost.
- **Checkout starts on the free way** (`freeOption`), always - coming back
  to change an order waiting with Tracked 24 on it included: it first kept
  the way chosen before, and free delivery was wanted as the default. A
  paid way is the shopper's to choose; only with none free does coming back
  keep the one chosen before, and with none chosen nothing starts chosen.

## Postage

- **Priced from Royal Mail's own price list, by the parcel in the basket.**
  Royal Mail has no price API open to shops (its rates API is closed to
  third-party apps), so each option keeps its own list (`ShippingBand`: a
  size, up to a weight, a price) and checkout never waits on anyone else's
  website. An option can still be priced at one price (`byWeight` off);
  whichever is not in use is kept, as a customisation section's settings are.
- **Fill in Royal Mail's prices** fills a list from
  `src/lib/delivery/royal-mail.ts`: the online (Click & Drop) prices for
  Tracked 48, Tracked 24, 1st and 2nd Class, checked against royalmail.com's
  own pages on 27 October 2026, in force from 5 October 2026, and pinned by
  a test. Online, not counter, prices were chosen. When Royal Mail changes its
  prices (usually April) she changes each list and marks them checked
  (`DeliverySettings.pricesCheckedOn`); the module is updated too.
- **The parcel** (`src/lib/delivery/parcel.ts`, pure): the largest of Royal
  Mail's four sizes any piece needs (`ParcelSize`: Letter, Large Letter,
  Small Parcel, Medium Parcel), the weight of every piece, and how thick
  they stack while every piece is letter-shaped - a Letter to 5 mm, a Large
  Letter to 25 mm. Each size's envelope or box is added once
  (`DeliverySettings` packing). An option's price is the cheapest band its
  packed weight is **up to and including**, at that size or any larger one:
  Tracked has no Letter price, so a letter goes at the Large Letter price;
  Tracked takes a Large Letter to 1 kg, 2nd Class only to 750 g, and the
  lists say so themselves. No band fits (over 20 kg): the option is left out.
- **A piece's postage**: its own weight, size and thickness, each falling
  back to its category's **usual postage** (`usualFor`: its nearest category
  with any set, up the tree, taken whole). Usual postage is **read live, not
  copied** - unlike usual costs - so changing Cards' usual moves every card
  using it. A piece with no weight anywhere counts as the set weight and size
  (500 g, Small Parcel), so it can be sold before it is weighed; a letter with
  no thickness counts as thick as its size allows. Neither can undercharge.
- A pack counts every card in it (`PricedLine.units`, the stock it takes);
  extras add nothing. One weight per clothing piece: the largest size's.
- **Small Parcels are judged by weight, not by what fits.** A bulky piece is
  marked Medium Parcel, which makes its whole parcel one.
- Weights are entered three ways: **Weigh pieces** (`/admin/products/weigh`),
  a sheet of every live piece where Enter moves down a row and the last
  column says what each costs to send alone; a category's usual postage; and
  the Postage section of a piece's Details tab, which says what it costs to
  send alone and in each pack - the tab's last section, after You may also
  like, just above Save. The products list links to the sheet with how
  many are not weighed. "Goes as" and "Thickness (mm)" go through the
  export and import beside Weight.
- Shoppers see only a piece's **own** weight, under Need to know; a usual
  weight is for postage alone.
- Checkout and the basket price every option with `ratesFor(lines)`
  (`src/lib/basket/store.ts`); Continue to payment prices it again and copies
  the parcel onto the order (`parcelSize`, `parcelGrams`, `parcelMm`), and the
  order page says it, so the postage bought is the postage charged for. The
  basket says delivery is "from" the cheapest option for its parcel.

## Policies

- **Five policies under `/policies`**: Delivery, Returns and refunds, Terms
  and conditions, Privacy notice, Cookies, and an index. One list,
  `POLICIES` (`src/lib/policies/pages.ts`), names them for the footer's
  Help column, checkout's footer and each page's "other policies"; each page
  is a `PolicyPage`. Change `POLICIES_UPDATED` with the words.
- Researched against NOTHS, Amazon and small UK makers on 1 November 2026
  and kept to UK law as it then stood, but to what a small maker can honour:
  the legal 14 days to change your mind (NOTHS gives 28), the shopper paying
  for a change-of-mind return, the outbound delivery refunded only up to the
  least expensive way (Tracked 48, free), a refund within 14 days of the
  piece or proof of postage.
- **Only a personalised piece is kept back from a change of mind** (printed
  words, a name, anything chosen for it: CCR reg 28(1)(b)). A piece made to
  order exactly as shown - a listed size, colour or pack - is not, and the
  page says so; "made to order" must never read as "no returns". The
  customiser says it beside the words too (`MadeForYouNote`), since the law
  wants it said before the order. Faults are never time-barred short of the
  law, and wear is a deduction, never a refusal.
- **Whose shop it is** comes from `BUSINESS` (`src/lib/policies/business.ts`):
  Nyoki Limited, company 06758218, registered in England and Wales, VAT
  GB 979 8673 25, and its registered office (82 Containerville, from
  Companies House, shown because a company's website must show it), on
  every page's footer and every policy. The address shoppers write to and
  send returns to is the trading address, Unit 302, 3A Howick Place - not
  the registered office, and never a home: it is on every page. The
  `email` is still null, and the pages send people to Contact meanwhile;
  **it is needed before ordering opens**, since the regulations ask for an
  email address, not just a form.
- The cookies page lists `SITE_COOKIES`, built from the constants that set
  each cookie (`basket/cookie.ts`, `account/cookie.ts`, `auth/cookie.ts` -
  apart from the jose code, which jsdom cannot load), so it cannot fall
  behind. Every cookie is strictly necessary, so there is no banner (PECR
  Schedule A1). A cookie for anything else needs this page first.
- The delivery page's table is the options checkout offers
  (`deliveryOptions`, from `rateSources`), so it cannot promise a price
  checkout does not charge.
- **The Channel Islands are refused at checkout** (`isChannelIslands`):
  outside the UK for VAT and customs. The Isle of Man goes as the UK does.
- The regulator is the **Information Commission** (it replaced the ICO on 30
  September 2026); a shopper complains to us first (DPA 2018 s.164A, from 19
  June 2026). With no ADR scheme joined, the terms say nothing about ADR
  (DMCC Act, from 6 April 2026).
- **Promised, not yet built**: deleting unpaid orders after six months and
  answered questions after a year (the privacy notice says so); a written
  confirmation of each order by the time it arrives (CCR reg 16 - email, or
  printed in the parcel); and a pay button that says paying, such as "Pay
  now" (CCR reg 14(3)).

## Shoppers' questions

- **Ask a question** is on every product page, a closed disclosure beneath
  Need to know, and the **Contact page** (`/contact`, linked from the footer
  only - as a third header link it squeezed the logo on a phone) takes
  questions about anything. One form, `QuestionForm`, does
  both. The pages' "get in touch" lines lead to it through `AskLink`, which
  opens the disclosure on the way: not every browser opens a `<details>` it
  is sent to. A disclosure needs `scroll-mt-60` to clear the shop's sticky
  header (206px); `scroll-mt-40` left its title underneath.
- Questions are `Question` rows, listed at `/admin/questions` - waiting, then
  answered - with a count of those waiting on the Overview. **The shop sends
  no email**: Reply by email opens the admin's own mail program, addressed,
  titled and quoting the question (`replyLink`), and she marks it answered.
  An email service, which would also bring password reset and receipts, was
  offered as the next step and is not built.
- **Every admin page hears about new questions** (`QuestionAlertsProvider`,
  in the protected layout): it asks `/admin/questions/waiting` every ten
  seconds - background tabs too - and at once when the tab is come back to.
  The count waiting shows on Questions in the sidebar; a question arriving
  chimes and shows a toast saying who asked about what. Only the Questions
  page and the Overview refresh themselves then: a refresh anywhere else
  could cost an unsaved edit.
- The route counts what arrived after the time asked about **up to the
  moment it looked**, and the next ask starts there, so nothing is counted
  twice. Ten seconds is as instant as a page gets without a push service; a
  notification with the admin closed needs web push or email, not built.
- The chime is made in the browser (Web Audio, no sound file), off with the
  switch on the Questions page, remembered per browser. A browser plays
  sound only after a click or key press on the page, so the first chime
  needs one.
- Each question shows when it was **sent** and when it was **answered**, day
  and time in London (`formatDateTime`). Answered is when it was marked so:
  the shop cannot see the reply email go.
- A question keeps the **piece's name as it was asked** (`productName`), as
  an order line does, and its product reference is SetNull. One about a piece
  taken off the shop since the page was opened is kept without the piece.
- **Spam**: a hidden box only a bot fills in (`HONEYPOT` - a bot is told it
  worked and nothing is kept) and five questions an hour per address
  (`QUESTIONS_PER_HOUR`). No puzzle to solve: it would stop shoppers too.
- What was typed survives a rejected send (`useActionForm`); once sent, a
  thank-you takes the form's place.
- **Kept until deleted.** Each holds a shopper's email address, and the page
  says to delete one once it is no longer needed; nothing expires them yet.
- Pieces imported from Not On The High Street pointed shoppers at its "Ask
  seller a question" button. The migration that made questions rewrote that
  to "'Ask a question' below", matching only the exact quoted wording.

## You may also like

- A product's page shows up to four pieces under "You may also like":
  **Njomza's choices first**, in her order, then pieces from the same
  categories to fill the row (`alsoLike` in `src/lib/products/also-like.ts`),
  so choosing one or two never leaves it short and choosing none keeps it
  fully automatic, as it always was.
- **The Details tab shows the row as the page shows it now**
  (`AlsoLikeField`): four tiles, each marked "Your choice" or "Automatic",
  each with Change, which picks a replacement by photo through the
  PhotoChooser (pieces already in the row left out). An empty slot, where
  the categories found fewer than four, offers "Add a piece".
- **Changing one makes the row hers**: the four she was looking at, with
  her replacement in its place, all stored as her choices - so the row she
  saw is the row that stays, rather than the automatic three shifting
  around her one. "Back to automatic" lets the categories pick again.
- A replacement is offered **nearest first** (`closestFirst`): pieces in
  one of the product's own categories, then in the same group, then
  everything else, each by name - so changing a Christmas card starts with
  Christmas cards and a cardigan comes last. Ranked on the server by the
  categories as saved. A piece in no category can only come last.
- **The chooser finds a piece by its categories as well as its name**, as
  the sale picker does, and shows each one's place in the tree under it:
  searching "christ" first found only the pieces with Christmas in their
  name. Pieces already in the row, and the product itself, are left out.
- The automatic pieces come from one query, `automaticAlsoLike` in
  `src/lib/storefront/queries.ts`, used by the shop page and the admin
  alike, so the admin cannot show one row while the shop shows another.
  A new product is in no category yet, so it starts with empty slots.
- Stored as `AlsoLike` rows (product, piece, position), gone with either
  product. Saved with the details, in the same transaction as the
  categories.
- A chosen piece taken off the shop since is **skipped** on the page and the
  gap filled automatically; the admin says so beneath the row ("... is not
  on the shop, so it is skipped") with a Remove. A deleted one simply goes.
- `parseAlsoLikeIds` drops repeats, blanks and the product itself quietly,
  and refuses more than four; the save drops ids no longer in the database.
- Not in the CSV/JSON/XML export or import yet.

## Home page

- Laid out after the shop's Amazon store, as approved on a design canvas:
  **badges**, a sage **banner**, **photo tiles**, a quiet **band** above the
  pieces, the **pieces**, and a **button** beneath. The header and footer are
  the shop's own. The hero photo, its headline and paragraph, the promise
  strip and "Have a look around" went with that design; the badges say what
  the promises said, and the Kosovo story is on About us.
- **All of it is edited at `/admin/home`**: the badges shown or not, the
  banner's words and colours, every tile's words, their colour, where it
  leads and its photo, the
  band's words, the button's words and where it leads. The `HomePage`
  singleton (one row, id `home`) holds the page; `HomeTile` rows the tiles.
  The rules are `src/lib/home/content.ts`, `tiles.ts` and `links.ts`, pure;
  `loadHome()` (`load.ts`) reads it for the shop and the editor alike, so the
  editor opens on exactly what the shop shows.
- **The badges are artwork**, Njomza's own (`docs/brand/badges-artwork.jpg`),
  each cut out onto a clear ground in `public/brand/badges/` (every pixel the
  artwork's ink, #757b87, its opacity taken from how far it was from white)
  so they sit on the beige rather than in white boxes. Their words cannot be
  edited, only the row shown or hidden. "Since 2009", not "16 years". The
  artwork is about 210px a badge, a little soft on a sharp screen: a larger
  original would be better, cut the same way.
- **Tiles come in blocks of five** - a large tile and four small, the large
  on the left of the first block and the right of the next - one block to
  four, added and removed five at a time. Every tile is square, so the large
  one is exactly two rows tall. A block is written row by row, so on a phone
  it reads two small, the large across, two small.
- The editor draws the mosaic as the shop lays it out, each tile a button
  that opens it beside the picture (`HomeTilesField`). Every tile posts its
  fields as hidden inputs, in order (`tileLabel`, `tileLink`, `tileAddress`,
  `tilePhoto`); tiles that arrive with a field missing are refused rather
  than paired up wrongly.
- **Where something leads** (`HomeLink`): one of the shop's pages, a
  category, or somewhere else by address. A category is kept **by id**, so
  renaming its web address cannot break the page; deleted (SetNull), the link
  goes to the whole shop. An address is a page on the shop (one `/`, never
  `//` or `/\`, which a browser reads as another website) or an `https://`
  website; every other scheme is refused, `javascript:` above all.
- **A tile's photo** is any photo of any piece - not only the first, since a
  piece's second or third is often the one in a scene - or one uploaded for
  the page. None chosen, a tile leading to a category takes the photo of its
  first piece, as that category's own tile does (`leadPhotos`); a tile
  leading anywhere else must have one. A chosen photo deleted since (SetNull)
  falls back the same way, and with nothing to fall back on the tile is drawn
  plainly (`ui.shopTilePlain`) rather than broken.
- **Uploads** (`uploadHomePhoto`) are byte-sniffed and stored like product
  photos, location stripped, as `HomePhoto` rows, straight away so the editor
  can show them. A save deletes every upload no tile uses, file first, so
  replacing a tile's photo leaves nothing behind.
- A save looks every category and photo up again (`missingReferences`): one
  deleted while the editor was open is named on its tile, not saved.
- **Colours are chosen, from the brand's own only** (`src/lib/home/colours.ts`,
  picked by `SwatchField`): the banner's colour and its words', and each
  tile's words. No free colour picker: it would let white onto sage.
- The banner offers every brand colour but the page's beige, and for each
  only the words in an approved pairing on it - its words are always 24px or
  more, so the large-text pairings count - clearest first. Changing the
  colour swaps words that would not read for the first that do; a stored pair
  that stops reading draws as designed (ink on sage) rather than unreadable.
- **One exception, chosen knowingly**: white words on a sage light banner,
  2.0:1 - below even the 3:1 large-text minimum - asked for on 31 October
  2026 with that said. It is `BANNER_EXCEPTIONS` in `colours.ts`, for the
  banner alone, offered after the words that read better; the brand's
  approved pairings and every other surface are untouched. A test lists the
  exceptions, so another cannot slip in unnoticed.
- A tile's words sit on its photo over a fade, since a photograph is no
  approved ground: white or beige over a fade to plain black, navy or ink
  over a fade to plain white for a pale photo (`ui.shopTileLabel*`,
  `ui.shopTileFade`, `ui.shopTileFadeLight`). Neutral fades, for the reason
  the modal scrim is black; each colour is tested readable against its own.
- **Defaults are the approved design**, not placeholder text: `HOME_DEFAULTS`
  for the page and `DEFAULT_TILES` for the mosaic, each tile named by its
  category's and photo's addresses so it holds for any copy of the shop.
  With no `HomeTile` rows at all the page shows them; a save always writes at
  least one block, so none means never saved. An empty banner or band takes
  it off the page.
- The row of pieces shows whatever is marked **featured** on the product,
  in the shop's order, falling back to the first eight in that order when
  nothing is.

## Storefront pages

- A category page opens on a quiet band (`ui.shopBandQuiet`): breadcrumb,
  name, a line about it, the count. Then picture tiles for the types beneath,
  then everything in it. The badges are the home page's alone; a promise
  strip was tried here and was not wanted.
- **No text pills for the types.** They were tried twice. Only the three
  group pages ever had them, and Clothes has thirty types: four rows of
  shouting capitals above tiles that lead to the same places with a photo
  attached. The tiles do the job.
- **The band carries no photograph.** One was tried wide, then upright, then
  cropped and zoomed; the catalogue is shot on white with margins running from
  nothing to 42% of the frame, so no crop suited them all and it was dropped.
- Tiles come from `categoryTiles` in `src/lib/storefront/tiles.ts`, built in
  one pass over `tileProducts()` rather than a query per tile. A child holding
  nothing is left out - a tile leading to an empty page is a dead end. A
  tile's photo is its first piece's, in the shop's order, so dragging a piece
  to the top of a category also gives that category's tile its photo.
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
  an item can be found by. It knows nothing about what it is choosing - it
  takes tiles and hands back an id.
- **It shows every item**, however many. It was capped at 60 "to save
  fetching a few hundred photos", but next/image loads lazily - a photo is
  fetched as it scrolls into view - so the cap saved nothing and left most
  of the catalogue findable only by guessing a word from its name. A test
  pins the lazy loading, since it is what makes showing them all cheap.
- `PhotoField` (`photo-field.tsx`) is the form field around it: a box showing
  what is chosen by its photo and name, Choose, and Clear. **Every
  choose-by-photo field is one**, so they all look alike - a home page tile's
  photo and a piece's price-list row. It holds
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

## Backups

- **Until the shop is live, the catalogue exists only on this Mac**: the
  `nyoki` database and the photos in `public/uploads`, both on the Studio
  drive - and **Time Machine leaves that drive out**. `pnpm backup` is the
  copy; run it from the main checkout after entering products.
- It saves into `BACKUP_DIR` (set in `.env`, a whole path; `~/` is the home
  folder), which is iCloud Drive's `Nyoki backups`: off the Mac, and on the
  internal disk Time Machine does cover. Never a folder on the Studio drive.
- `database/` gets a dump per run (`pg_dump` custom format, named for the
  database and the time in London), so any earlier one can be gone back to;
  about 150 KB each, so none is deleted. A dump is written as `.partial` and
  named only once `pg_restore --list` shows every table's rows in it.
- `uploads/` is the photo folder copied with rsync, **added to, never
  pruned**: a photo deleted since stays for the older dumps that point at it.
- The rules - settings, names, the dump check, the summary - are
  `src/lib/backup/backup.ts`, pure; `scripts/backup.ts` does the copying.
  Its errors name the tool that failed, never its arguments, since one is
  the database's address.
- **Restoring** - to look first, into a database of its own:
  `createdb nyoki_restored`, then
  `pg_restore --no-owner -d postgresql://localhost:5432/nyoki_restored "<dump>"`.
  Over the real one, with the dev server stopped:
  `pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL without ?schema=public>" "<dump>"`,
  and the photos back with `rsync -a "<BACKUP_DIR>/uploads/" public/uploads/`.
  Checked when it was built: a restored dump matched the original row for
  row in all 30 tables, and the photo copy matched file for file.

## Git

Remote is the **personal** account: `https://github.com/bgosalci/nyoki` over
HTTPS. Not Gosalci-Org, which is the gosalci.com work org and uses SSH.
