# 4. Design Brief

How every Hivelet screen should look and read, so it stays on brand. The full rulebook is
`docs/DESIGN_GUIDELINE.md`; this is the brief a new designer reads first. Values are the live tokens in
`frontend/src/index.css` as of 7 October 2026.

---

## 1. The idea in one paragraph

A calm, green workspace for one woman running 33 units, and a quiet, editorial public site for people
looking for a room. Soft tinted canvas, borderless rounded tiles, one dark tile per screen for the
thing that needs her, plain words a landlady uses, and honesty about what the records do not know:
a month nobody entered says **Not entered**, never ₱0.

## 2. Colour

Write a role, never a hex value (`check:tokens` counts them, and the count only goes down).

| Role | Light | Dark | Job |
| :--- | :--- | :--- | :--- |
| `canvas` | `#edf1ee` | `#0f1412` | Page background behind tiles |
| `tile` | `#ffffff` | `#1a211d` | Every ordinary tile |
| `ink` | `#101713` | `#e6ece8` | Headings, figures, main text |
| `ink-soft` | `#45524a` | `#b3bfb7` | Secondary text |
| `ink-faint` | `#5d6962` | `#929f97` | Labels, captions |
| `line` | `#e2e8e3` | `#2b3530` | Dividers inside tiles |
| `brand` | `#17603f` | `#5ec08d` | Primary action, selected state, the tenant's amount-due tile |
| `brand-strong` / `brand-soft` / `brand-bright` | `#0e4a30` / `#e2f0e7` / `#3f9a6b` | `#7fd0a5` / `#1a3527` / `#2f8a5c` | Hover; active nav and paid; data marks |
| `night` | `#0f1b15` | `#24332b` | The one "needs your attention" tile, and the public hero |
| `on-night` / `on-night-soft` | `#eef5f0` / `#a9baaf` | | Text on night |
| `verify` / `verify-soft` | `#8a5300` / `#fcefd6` | | Waiting for verification, due soon |
| `overdue` / `overdue-soft` | `#b3261e` / `#fde6e3` | | Overdue, urgent, negative net |

Every text pair was measured at 4.5:1 or better, and data marks at 3:1 (table in the guideline, §2).
**Colour is never the only cue**: status is always in words, and a missing figure is hatched.

## 3. Type

| Use | Family | Notes |
| :--- | :--- | :--- |
| The workspace (owner and tenant screens), body and figures | **Plus Jakarta Sans** | Weights 400, 500, 600 only; figures `tabular` so digits line up |
| Headings and the public pages | **Sora** (display and editorial) | The "Fe Galang Da Silva" hero, "33 Units, 4 Floors" |

Sizes: greeting 30 to 34 px; hero figure 48 px; tile title 15 px semibold; body 14 px; labels 12 px.
**Nothing below 12 px.** No tracked uppercase labels in the workspace; group labels are sentence case
in `ink-faint`. (The guideline's §3 still says "one family"; Sora was added for headings and the
public site.)

## 4. Shape and controls

- **Tiles**: 24 px corners, 20 px padding on a phone, 24 px from 640 px, 16 px gaps, no border, no shadow.
- **Buttons are pills**, at least 44 px tall: one primary (`pill-btn-brand`) per header, secondary
  `pill-btn`, quiet `pill-btn-quiet`. Icon buttons are 44 px with an `aria-label`; only Close (X) and
  Go to (arrow) keep a box, others are plain and appear on hover on a computer.
- **Lists** are narrowed by one toolbar: Search, then dropdown filters that apply the moment they are
  picked; on a phone they open under a **Filters** button. No Apply step, no filter pop-up.
- **Every press** scales to 0.97 over 160 ms, the only feedback a touch screen has.
- **Focus** shows a 3 px ring for keyboard users. Never removed.
- **Motion**: under 300 ms, ease-out curves from the tokens, never `ease-in`, exits faster than
  entrances, nothing grows from zero, reduced motion honoured.

## 5. Every figure has one of seven states

| State | Looks like | Says |
| :--- | :--- | :--- |
| Recorded | Solid mark | "₱273,050 recorded" |
| Not entered yet | Hatched | "Not entered yet" |
| Expected | Dashed outline | "₱176,300 expected" |
| No basis | Empty dashed track | "Nothing to estimate from" |
| Could not load | Dashed box with Try again | "...could not be loaded. That is not the same as nothing." |
| Loading | Skeleton in the final shape | (screen reader: "Loading the overview") |
| Empty | A plain sentence | "No repair requests are open." |

## 6. How each screen is laid out

| Screen | First thing, then the rest |
| :--- | :--- |
| Owner Overview | Greeting and date, **Recently** under it on a phone; Needs your attention (night); this month; occupancy (33 segments); collections by month |
| Tenant Overview | Amount due (brand) with Pay with GCash; Repairs; the current bill |
| Monthly Income / Expenses | The year by cluster or area; the month card (empty months go last); search and filters; the ledger in her layout |
| Rooms and rates / Tenants | A section per cluster, cards on a phone, a table on a computer. Only exceptions wear a pill (Vacant, Reserved), not "Occupied" |
| Repairs | Three columns: to dispatch, in progress, done; one Manage button per card |
| Public landing | Full-bleed photograph (three quarters of the screen), then "33 Units, 4 Floors", the address, the categories |

Layout: one column on a phone, two from 768 px, twelve from 1280 px. The source order is the phone order.
The sidebar is always open from 1024 px and carries the "Recently" list.

## 7. Words

- **Tenant**, never "Resident". "All units", never "Every unit". Search boxes say **Search**.
- **One name per page**, the same in the menu, the tab and the heading: Overview, Rooms and rates,
  Tenants, Monthly Income, Monthly Expenses, Repairs, Inquiries; tenant side Overview, Payments and
  billing, Repairs, My details.
- Plain words that say the result: "Record payment", "Pay with GCash", "Move them in". No rule codes,
  no reassurance that measures nothing, no em dashes or semicolons in interface text.
- A refusal names the field and the reason, with an example.
- Phone numbers are spaced: 0917 123 4567.
- **Locked**: the 50% Share is described only as a system-computed figure equal to half that row's Rent
  Amount, kept for ledger parity with the owner's historical spreadsheet. The gateway is Adyen with
  GCash. 33 units, 32 occupied.
- **Remove rather than add.** Before adding a label, a badge or a line of help, try taking something away.

## 8. Before a screen is done

View it at 375, 768 and 1440 px with real data, in light and dark; force a failed load; tab through it;
run `npm run check:all` and read the table. A green build is not verification: open it and measure.
