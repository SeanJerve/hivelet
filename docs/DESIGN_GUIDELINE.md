# Hivelet design guideline

**Status: in use from 2026-09-18.** It replaces `UI_DESIGN_SYSTEM_GUIDELINES.md` and
`UI_DESIGN_SPECIFICATION.md`, which describe the look being retired. Screens move onto this system
one at a time. The overviews and the workspace sidebar have moved. Everything else still uses the
older roles until it is rebuilt.

**Where it came from:** three dashboard references Sean chose on 2026-09-17: a soft green
workspace, a sage and teal HR board, and an ink and cyan board. Also the Scoville Design and UI
skills, and the pre-redesign audit `docs/OVERVIEW_AUDIT_2026-09-17.md`.

**What was taken from the references:**
- a soft tinted canvas with borderless rounded tiles
- one dark or saturated tile that carries the most important thing
- pill-shaped controls, and a round arrow button on a tile that leads somewhere
- hatching for a figure that is missing

**What was not taken:** stock photos of people, decorative gauges, and invented numbers.

---

## 1. Five rules

1. **Put the person's first question first.**
   - The landlady's first question is what needs her action: payments to verify, urgent repairs.
   - The resident's first question is what they owe and how to pay.
   - Monitoring comes after. On a phone, the source order is the priority order.
2. **One loud tile per screen.** `night` or `brand` marks the tile that asks for action. A second
   dark tile is allowed only for a second, different call to action.
3. **Never present an absence as a fact.** A failed load, a month not yet entered, and a real zero
   are three different things, drawn three different ways (section 5). `HANDOFF_TO_DESIGN.md`
   section 4 still binds every screen.
4. **Size and shade make hierarchy, not weight.**
   - Use weights 400, 500 and 600 only.
   - No tracked uppercase eyebrows. A group label is sentence case in `ink-faint`.
5. **Every tile leads somewhere or says why not.**
   - If a tile summarises a ledger, its round arrow opens that ledger.
   - A tile with nowhere to go has no arrow.

---

## 2. Colour roles

Tokens live in `frontend/src/index.css` under **Workspace system**. They are exposed as Tailwind
utilities (`bg-canvas`, `text-ink-soft`, `bg-brand`, `border-line` and so on). Do not write hex
values in components. `check:tokens` counts them and the budget only goes down.

| Role | Token | Value | Job |
| :--- | :--- | :--- | :--- |
| Canvas | `canvas` | `#edf1ee` | Page background behind tiles. Separates tiles without borders |
| Tile | `tile` | `#ffffff` | Every ordinary tile |
| Ink | `ink` | `#101713` | Headings, figures, primary text |
| Ink soft | `ink-soft` | `#45524a` | Secondary text |
| Ink faint | `ink-faint` | `#5d6962` | Labels, captions, scale ticks |
| Line | `line` | `#e2e8e3` | Dividers inside tiles. Never the only cue for anything |
| Brand | `brand` | `#17603f` | Primary action, selected state, the resident's amount-due tile |
| Brand strong | `brand-strong` | `#0e4a30` | Hover on brand |
| Brand soft | `brand-soft` | `#e2f0e7` | Active navigation, the paid status, soft tiles |
| Brand bright | `brand-bright` | `#3f9a6b` | Data marks that are not selected |
| Night | `night` | `#0f1b15` | The landlady's attention tile, the resident's repair tile |
| On night soft | `on-night-soft` | `#a9baaf` | Secondary text on night |
| On brand soft | `on-brand-soft` | `#d3e8db` | Secondary text on brand |
| Hatch | `hatch` | `#7a8c81` | Hatching for a known gap, dashed outlines |
| Verify | `verify` / `verify-soft` | `#8a5300` / `#fcefd6` | Waiting for verification, due soon, partial failure banner |
| Overdue | `overdue` / `overdue-soft` | `#b3261e` / `#fde6e3` | Overdue, urgent, negative net income |

**Measured contrast, 2026-09-18, in the browser against the live tokens.** Re-measure after
changing any value.

| Pair | Ratio | Needs |
| :--- | :--- | :--- |
| ink on tile | 18.2 | 4.5 |
| ink-soft on tile / on canvas | 8.21 / 7.20 | 4.5 |
| ink-faint on tile / on canvas | 5.73 / 5.03 | 4.5 |
| on-brand on brand | 7.55 | 4.5 |
| on-brand-soft on brand | 5.87 | 4.5 |
| on-night-soft on night | 8.70 | 4.5 |
| brand on brand-soft | 6.42 | 4.5 |
| verify on verify-soft | 5.56 | 4.5 |
| overdue on overdue-soft | 5.48 | 4.5 |
| brand-bright on tile (data mark) | 3.47 | 3 |
| hatch on tile (graphic) | 3.56 | 3 |

**Colour is never the only cue.**
- Status is always written in words: "Waiting for verification", "Not entered yet", "Overdue by 3
  days".
- Hatching and dashed outlines repeat the meaning in shape.

**Swapping the palette.** The three references differ mainly in hue. To move to the teal or the ink
and cyan direction, change `--brand`, `--brand-strong`, `--brand-soft`, `--brand-bright`,
`--night` and `--canvas`, then re-run the contrast table. The components need no edit.

---

## 3. Type

**One family:** Plus Jakarta Sans, already loaded in `index.html`. Figures use `tabular` so digits
align.

| Role | Size / leading | Weight | Example |
| :--- | :--- | :--- | :--- |
| Page greeting (h1) | 30 to 34 px / tight | 500 | Good morning, Fe |
| Hero figure | 48 px / 1 | 600 | ₱253,697 |
| Figure | 30 to 36 px | 600 | 32/33 |
| Tile title (h2) | 15 px / 20 | 600 | Collected in September |
| Body | 14 px / 20 to 24 | 400 | Operating expenses leave out personal costs |
| Label, caption | 12 px / 16 | 400 to 500 | Rent and water of the units occupied now |
| Pill | 12 px / 16 | 600 | Not entered yet |

No text below 12 px.

---

## 4. Shape, spacing, controls

- **Tiles:** `rounded-tile` (24 px), padding 20 px on phones and 24 px from `sm`, gap 16 px
  between tiles. No border and no shadow on tiles. Popovers keep `shadow-lift`.
- **Buttons** are pills, at least 44 px tall. Use these CSS classes only:
  - `pill-btn` is secondary.
  - `pill-btn-brand` is the one primary action in a header.
  - `pill-btn-light` sits on a brand or night tile.
  - `pill-btn-night` exists for a dark action on a light tile.
  - `icon-btn` is a 44 px circle that needs an `aria-label`. On a dark tile add
    `icon-btn-on-dark`.
- **Focus:** wrap a screen in `ws-focus`. Keyboard focus then shows a 3 px ring, dark on light
  surfaces and light inside `on-dark` tiles. Never remove it.
- **Motion:** colour transitions only. Reduced motion is honoured inside `ws-focus`. No fade-up on
  load, and no skeleton shown when the data is already in memory.

---

## 5. Data states

Every figure on a tile is in exactly one of these states, and they never share a look.

| State | Meaning | Drawn as | Words |
| :--- | :--- | :--- | :--- |
| Recorded | Entries exist | Solid mark, height is the value | "₱273,050 recorded" |
| Not entered yet | The period has passed or begun and nothing is entered | Hatched across the whole track | "Not entered yet" |
| Expected | A future period with a real basis for an estimate | Dashed outline at the estimated height | "₱176,300 expected" |
| No basis | A future period with nothing to estimate from | Empty dashed track | "Nothing to estimate from" |
| Could not load | The request failed | `UnavailableNote`: dashed box, plain sentence, Try again | "Collections could not be loaded. That is not the same as nothing being collected." |
| Loading | The first request is still out | Skeleton tiles in the final grid | Screen reader: "Loading the overview" |
| Empty | Loaded, and there is genuinely nothing | A plain sentence | "No repair requests are open." |

**When one source fails, every section that depends on it shows *Could not load*.** That includes
sections that still hold figures from an earlier load. The screen also shows one banner saying some
figures could not be loaded.

---

## 6. Components

All of them are in `frontend/src/components/overview/`. Types are in `types.ts`.

| Component | Use it for | Do not use it for |
| :--- | :--- | :--- |
| `OverviewTile` | Every tile. `tone`: plain, soft, brand, night. `to` adds the arrow link | Nesting a tile inside a tile |
| `StatusPill` | A status in words. Tones: paid, verify, overdue, neutral, unentered, expected, on-dark | Decoration or a count |
| `UnavailableNote` | Any section whose data failed to load. `dark` on brand or night tiles | Empty states |
| `MonthCapsules` | Twelve months of one amount, with the four month kinds. Keyboard: arrows, Home, End | Unordered categories |
| `OccupancyArc` | The 33 units as one segment each, grouped by cluster, vacant hatched | Percentages of anything else |
| `SegmentBar` | A true part-to-whole: rent and water on one bill, expenses and net within one month's income | Parts that do not add up to the whole shown |

---

## 7. Layout

- **Grid:** one column on phones. Two columns from `md`. Twelve columns from `xl`.
- **Order:** source order is the phone order, so put tiles in priority order in the markup. Do not
  use CSS `order` to rearrange.
- **Scrolling:** no scroll boxes inside tiles for short lists. Show all the months and all the
  clusters. Only long ledgers (hundreds of rows) get a bounded scroll with a sticky header.
- **Charts on narrow screens** keep a readable size and scroll sideways inside their tile. They do
  not shrink below 12 px labels.

**Screen layouts in use:**

| Screen | Row order |
| :--- | :--- |
| Admin overview, live year | Needs your attention (night) · Collected this month · Occupancy · Collections by month · Units by cluster · Operating cash flow · Open repair requests |
| Admin overview, archive year | Collected (brand) · 50% Share · Operating expenses · Net operating income · Collections by month · Collected by cluster · Month by month · Tenants · Units · Ledger entries |
| Tenant overview | Amount due (brand) · Current or latest bill · Repairs (night) · Payments · Unit |
| Repairs (dispatch) | Filters · a board of three columns: to dispatch, in progress, done. A ticket is a card with one Manage button |
| Income | Four figure tiles · tabs: Ledger or To verify · the queue is one decision card per payment, the ledger keeps its grouped tables |
| Expenses | Spent in this view · Where it landed (one bar across the five property areas) · filters · ledger table |
| Room directory | Inventory tiles · filters · a section per cluster, headed by one mark per unit, then the unit cards |
| Tenant payments | Bills, one card each with Pay · Payment record with filters and a table |

**Tables stay tables** when the task is exact lookup: ledgers, the tenant
directory, the audit trail. They get `.ws-table`, a sticky head and right
aligned figures, not a redesign.

---

## 8. Words

- **Punctuation:** complete sentences, periods and commas. No em dashes, en dashes or semicolons
  in interface text.
- **Plain words:** say the actual result, for example "Record payment", "Review payments", "Pay
  with GCash". Do not use business-rule codes in interface text ("BR-032"). Do not use
  reassurance that measures nothing ("100% reconciled").
- **Wording locks** from `CLAUDE.md` apply everywhere:
  - The 50% Share is described only as half of each row's Rent Amount, computed by the system and
    kept for ledger parity with the owner's historical spreadsheet.
  - The gateway is Adyen with GCash.
  - The property is 33 units, 32 of them occupied.
- **Print only facts the system holds.** If a fact is an open question for the owner, the screen
  says nothing about it until it is answered.

---

## 9. Before you call a screen done

- `npm run check:all`: read the summary table and any `note:` lines.
- `cd frontend && npm run contract`: the call counts for the screen must not change unless that
  was the point.
- View it at 375, 768 and 1440 px wide, with real data.
- Force a failed load and confirm no section still shows a figure.
- Tab through it and confirm the focus ring shows on every control.
- Measure contrast for any new colour pair.
