# Audit — Admin Overview and Tenant Overview

**2026-09-17. Read-only.** No file under `frontend/`, `backend/` or `database/` was changed to
produce this. Screens audited: `/admin/overview` (live year and the 2025 archive) and `/tenant`.
Kiel is on the public landing page, so it is out of scope here.

Method: the two Scoville skills installed today, in their read-only modes: **Design** (critique)
and **UI** (audit). Both rank project rules above their own advice, so `CLAUDE.md`,
`HANDOFF_TO_DESIGN.md` § 3–6, `docs/SCREEN_CONTRACT.md` and `docs/13_AUDIT_JUDGEMENT_LOG.md` § 3
were read first. Nothing below overturns a deliberate call recorded in § 3.

---

## Status after the redesign, 2026-09-18

Both overviews were rebuilt on the workspace system in `docs/DESIGN_GUIDELINE.md`. Each result
below was checked in the browser at 375, 768 and 1440 px, with a forced failed load, unless
marked otherwise. `check:all` passes 17 / 17. The screen contract is unchanged at 59 calls and
30 writes.

**Resolved on screen:**

| Finding | What changed |
| :--- | :--- |
| **F1** | One load flag drives every money figure on the tenant page. On a failed load, the amount due, the bill and the payments all say they could not be loaded, and no ₱0 appears |
| **F3** | Amenities, "Submetered Power (₱12.50/kWh)", "Garbage Collection Fee Included (₱0)", "Electric Submeter" and the unconditional lease badge are gone. Only stored facts show |
| **F4** | The archive's 50% Share card uses the permitted wording |
| **F5** | Months not entered are hatched and labelled *Not entered yet*. Only months with entries are *recorded* |
| **F6** | Every section that depends on a failed source says so, including sections still holding older figures. A banner says some figures could not be loaded |
| **F7** | All year labels read the clock. Cash flow lists every month with entries |
| **F10** | "Unit Unit 1A" is fixed. Invented fallbacks (room 1A, cluster BH, floor 1) now read *Not on file* |
| **F11** | The tenant's amount due and Pay button are in the first screen on a phone. Refresh is visible at every width |
| **F12** | The chart is HTML with 12 px labels. It scrolls sideways inside its tile on phones, and each month is a button that states its value |
| **F13** | No scroll boxes inside tiles for short lists |
| **F14** | The year menu is a click disclosure with `aria-expanded`. It closes on Escape (focus returns) and on an outside click |
| **F15** | Both "100%" reassurances are removed |
| **F17** | *Needs your attention* links to the verification queue and to maintenance dispatch |
| **F18** | Months paid are in calendar order. Column headings say what the cells hold |
| **D1–D9** | Rebuilt: one family at weights 400–600, semantic tokens, no nested cards, no dead animation classes, no instant-switch skeleton, no duplicate floating button |
| **D11** | Both old design documents carry a *replaced* banner |
| **U1–U7** | Tabs, labels, disclosures and chart semantics added. Designed focus ring. Contrast is measured in the guideline |

**Left for Sean (behaviour):**
- **F2:** the settled branch still takes water from the newest bill. The page no longer prints a
  false equation, but a bill with ₱0 water beside one registered occupant is still visible.
- **F8:** the projection model still comes out about a third below recorded months. It is now
  labelled separately as *Expected each month*.
- **F9:** the next due date still assumes the 5th. It is marked with a TODO in the code.
- **F16:** there are still two definitions of vacant.
- **Test tickets:** migration 027 is written and not applied (`BLOCKED_FOR_SEAN.md` B-05).

**Not verified:**
- **Keyboard activation:** Enter and Space on buttons. The browser tool's keypresses do not click
  any native button, including ones this redesign did not touch. The controls are native
  `<button>` elements.
- **First-load failure:** only failure after a successful load was rendered.
- **Screen reader:** not tested.

---

## 0. How to read this

Every finding carries an **owner**, a **severity** and the **evidence** behind it.

| Owner | Meaning |
| :--- | :--- |
| **Behaviour** | What the screen computes, fetches or asserts. Sean's lane: fix before or alongside the redesign, because a restyle would carry it forward |
| **Redesign** | Look, layout, hierarchy, responsiveness, interaction. The skills-driven rework |
| **Owner question** | Only Mrs. Da Silva can answer it. Points at `CLIENT_MEETING_QUESTIONS.md` where the question already exists |
| **Check gap** | An automated check passed while the defect was on screen |

| Severity | Meaning |
| :--- | :--- |
| **S1** | A real person is shown a false or unbacked claim about money or status |
| **S2** | Wrong or missing information, or a task that cannot be completed on some device or input |
| **S3** | Quality, consistency, generic design |

| Evidence | Meaning |
| :--- | :--- |
| **R** | Rendered and viewed in the browser, condition stated |
| **M** | Measured in the live DOM |
| **S** | Source only, not rendered. Treat as a strong lead, not a proof |

Failure states were produced by making `fetch` reject for `/api/` inside one browser tab **after
a successful load**, then pressing Refresh. Nothing was sent to the database. Two demo accounts
signed in normally (the admin and one tenant); that records an ordinary login and nothing else.

---

## 1. The six that matter most

1. **The tenant's statement says "PAID, all dues cleared, ₱0.00" while the card beside it says the
   account could not be loaded.** Same page, same moment, opposite claims about what a resident
   owes. (F1)
2. **Every resident is told things the system does not know**: garbage "Included (₱0)", power
   "Submetered (₱12.50/kWh)", "Private T&B", "Bed & Mattress". Two of them are open questions on the
   client sheet. (F3)
3. **The admin archive breaks the BR-035 wording lock**, and `check:canon` passed it. (F4)
4. **August and September are drawn as verified ₱0.** They are the two months not yet typed in
   (client sheet 2b), not months with no income. (F5)
5. **Only the four admin tiles know when loading failed.** The pending tile's subline, the chart,
   the cash flow and the cluster matrix keep asserting figures, labelled Verified. (F6)
6. **Both screens are the same dashboard template with the nouns changed**, and neither puts the
   person's first question first. On a phone the tenant's Pay button is two screens down and the
   admin chart's labels render under 3 px tall. (D1, D2, F11, F12)

---

## 2. Behaviour findings

### F1 — Tenant statement contradicts a failed load · S1 · Behaviour

- **R** (1440 px, load forced to fail after a good one): the *Account Status* tile shows "—" and
  *"Could not be loaded — this is not the same as nothing being owed"*. The *Monthly Statement*
  beside it still shows **PAID · Payment Settled · All dues are cleared · Total Amount Due ₱0.00**
  in green. The status tile keeps its green tick.
- **S**: `TenantOverviewView.vue` guards only the status tile (lines 456–464). The statement
  (539–605) and the tile's icon (448–454) never read `tenantDataLoadFailed`. On a **first** load
  that fails, `totalAmountDue` is 0 and `dueBadgeText` is empty, so the countdown resolves to
  `safe` and draws a green banner over *"Due date on ."* and ₱0.00. Not rendered.
- This is exactly the class `HANDOFF_TO_DESIGN.md` § 4 describes, fixed on one card and still
  open on its neighbour.
- **Carry into the redesign:** one load state drives every money figure on the page.

### F2 — Statement arithmetic contradicts itself · S1 · Behaviour

- **R** (1440 and 375 px, settled account): *"Water Allocation (1 × ₱200/head) ₱0.00"*, and the tile
  reads *"₱0 / ₱200 per registered occupant monthly"*.
- **S**: in the settled branch the water figure comes from `billsData[0].water_amount` (lines
  276–281). Why that is 0 for this account is **inferred, not confirmed**: most likely the newest
  bill is not the covered period. The multiplier text uses a literal ₱200 (line 588) while the tile
  uses the fetched rate (439–441). `check:liveness` pins the literal to the configured rate, so the
  number itself is safe. The product shown beside it is not.

### F3 — Unbacked facts printed to every resident · S1 · Behaviour + Owner question

- **R** (1440 px) on the tenant overview, for every unit:
  - *Standard Amenities & Inclusions* — Private T&B Shower, Bed & Mattress Base, Submetered Power
    (₱12.50/kWh), ₱200/Head Water Rate (lines 522–530)
  - *Monthly Base Rent* subline — "Standard rate · Submetered Power" (427)
  - Statement — **"Garbage Collection Fee: Included (₱0)"** (592–595), "Electric Submeter: Separate
    Bill" (596–599)
  - Badge — "Active Resident Lease", unconditional (479–481)
- The file's own header (lines 52–57) records that *"the system holds none of those facts, and it
  does not model electricity at all"*. The seed was removed and the template kept printing them.
- **Garbage:** `CLIENT_MEETING_QUESTIONS.md` **2a** is open: the fee was ₱20 on every monthly row
  and stopped after June 2025, reason unknown. "Included (₱0)" answers that question to the
  resident before the owner has. Note also that `docs/02_BUSINESS_RULES.md` BR-037 calls the fee
  annual while the ledger count in 2a shows it monthly. That disagreement is recorded here, not
  resolved.
- **Electricity:** client sheet **3b** asks whether ₱12.50/kWh is still true. This page prints it
  too, so the answer governs two screens, not one.
- **Private T&B, bed and mattress** are not on the client sheet at all. They need adding.
- Judgement log § 3.3: *open client decisions are shown, never guessed.*

### F4 — BR-035 wording lock broken in the archive · S1 · Behaviour + Check gap

- **R** (1440 px, `?archiveYear=2025`): the *50% Share* card's subline (`AdminOverviewView.vue`
  lines 1391–1393) gives the figure a purpose, which `CLAUDE.md` rule 4 forbids, and cites
  **BR-032**, which is the canonical unit list and has nothing to do with it.
- `npm run check:canon` passes on this file. Its BR-035 shapes do not cover this phrasing.
  Suggested: add the shape, and mutation-test it against this exact line before fixing the line.
- The CSV export header on line 696 uses the permitted wording, *"50% Share (half of Rent Amount)"*,
  so the right sentence already exists in the same file.

### F5 — Unrecorded months drawn as verified zero · S1 · Behaviour (state) + Redesign (encoding)

- **R** (1440 px): Aug and Sep read **₱0 · Verified**, and the line drops to the baseline and climbs
  back for Oct–Dec.
- **S**: the label is chosen only by `isProjected` (lines 1128–1133). A month that has passed with
  no records is not projected, so it is labelled Verified.
- Client sheet **2b**: the ledger is complete through July and two months are simply not entered.
  The chart turns *not entered* into *verified nothing*. The Collections tile makes the same
  distinction poorly: "₱0 · 0 collections recorded this month", in success green.

### F6 — Failure handling stops at the tiles · S1 · Behaviour

- **R** (800 px, forced failure after a good load):
  - Collections, Occupancy and Maintenance tiles correctly show "—".
  - **Pending Remittances** shows "—" over **"0 remittances awaiting review"**. The subline has no
    guard (lines 1002–1004).
  - The chart, its three summary chips, the cash flow and the cluster matrix keep the previous
    figures, still labelled Verified, with nothing saying the refresh failed. The tiles above them
    say the data is unavailable.
- **S**, first-load failure (not rendered): `expenseRecords` starts empty (comment, lines
  1404–1407) and rooms start at seeded vacant defaults (983–985). Those sections would then draw
  ₱0 months, NOI equal to gross, and 0 % clusters.
- **S**, archive: *Gross Inflow* card (1372–1374), *Annual Inflow* footer (1674), chart, roster and
  unit table read no failure flag.
- **R**: *"Figures unavailable — refresh to retry"* renders in success green (line 960).

### F7 — The current year is still hard-coded · S2 · Behaviour

- **R** (live, 17 Sep): the *Operating Cash Flow* card lists **Jan–Jun only** (`slice(0, 6)`, line
  1215). July has records and is missing.
- **S**: year button label `'2026'` (763), *"Return to Live 2026"* (855), chart title *"(FY 2026)"*
  (1049), subtitle *"(Jan–Jul)"* (1053), tooltip year (1158), cash-flow row year (1220).
- The file's own comment on `CURRENT_YEAR` (lines 82–93) describes this failure and fixed it for
  the data filters only. On 1 January 2027 the labels will say 2026 over 2027 figures.

### F8 — Summary figures mix three kinds of month · S2 · Behaviour + Redesign

- **R**: projected months come out **roughly a third below every recorded month**.
- *Annual Run-Rate* sums recorded, unrecorded (₱0) and projected months. *Monthly Avg* divides that
  by 12. *Peak* can land on a projected month (lines 389–399).
- Three different definitions sit on one card. Decide the metric model before choosing how to draw
  it.

### F9 — Tenant next-due date ignores BR-033 · S2 · Behaviour

- **S**: when settled, the next due date is forced to the **5th** of the month after coverage
  (lines 283–294), and verified payments are assumed to cover to the **25th** (221–222).
- BR-033 derives the cycle from each tenancy's anniversary date, and the comment at lines 105–109
  says so, while the code below it does otherwise.
- **R**: the settled account showed a next-due date months ahead, on the 5th.

### F10 — Tenant header and fallbacks · S2 · Behaviour

- **R**: subtitle **"Unit Unit 1A"** (line 352; `room` already contains "Unit"). Statement row
  **"Room Unit 1A Base Rental"** (582).
- **S**: *Move-in* always reads "not on file", because `moveInDate` is never assigned.
- **S**: when the API omits a field, the page invents one: room `'1A'`, type `'1 Bedroom'`, cluster
  `'BH'`, floor 1, one occupant (lines 181–186). The header comment (43–58) documents why that
  class was removed from the seed.

### F11 — Tenant on a phone · S2 · Redesign

- **R/M** (375 × 812): **no Refresh control exists** (the header actions are `hidden sm:flex`, line
  357, and the FAB has no refresh), yet the failure copy says *"Refresh to retry"*.
- **M**: the *Monthly Statement*, and the Pay button inside it, start at 1,660 px, about **two
  screen heights down**, below four tiles and a 208 px dark photo placeholder.

### F12 — Admin chart on a phone · S2 · Redesign

- **M**: the SVG is `w-full h-64` over a 1200-wide `viewBox`. At 375 px its month labels render at
  **2.9 px**, values at **2.7 px** and status at **2.2 px**. At 1440 px they are 10.5 / 9.6 / 7.9 px.
- **R** (375 px): a thin strip of line inside a tall, mostly empty card.
- **M**: the SVG has no role, title or accessible name, and the per-month tooltip is hover-only.

### F13 — Scroll boxes inside cards hide content · S2 · Redesign

- **M** (1440 × 900): *Operating Cash Flow* shows **4 of 6** rows and *Cluster Occupancy* **3 of 5**
  clusters inside 360 px internal scrollers (176 px and 156 px hidden), while the page has room.

### F14 — The archive is hover-only · S2 · Redesign

- **M**: the year menu stays `display: none` when its button has keyboard focus. It opens on
  `group-hover` only (lines 757–809), with no click or tap toggle and no `aria-haspopup` or
  `aria-expanded`. On keyboard or touch the archive is reachable only by typing
  `?archiveYear=` into the address bar.

### F15 — Reassurances that measure nothing · S2 · Behaviour

- **R**: *"100% Reconciled with Excel"* (line 1743) and *"…with 100% mathematical fidelity"* (1963),
  both static.
- The same file already removed a sibling, *"Active Inventory Fully Synchronized"*, for that reason
  (comment, lines 1345–1347).

### F16 — Two definitions of vacant · S3 · Behaviour

- **S**: the Occupancy tile counts `status === 'vacant'` (line 223). The cluster card footer counts
  `total − occupied` (1349). "Occupied" is any room with a tenant *or* status settled/pending (222).
- A room in maintenance with no tenant is vacant in one and not the other. Not observed today
  (both read 1 vacant).

### F17 — The action queue does not lead anywhere · S2 · Redesign

- **R**: *Pending Remittances* and *Maintenance Alerts* are the two tiles that ask the landlady to
  act. Neither links to the verification queue or to dispatch.
- The sidebar's maintenance badge counts urgent tickets only, and the tile counts all open ones.

### F18 — Archive roster details · S3 · Behaviour + Redesign

- **R**: *Months Paid* lists months in record order ("Jul, Oct, Aug, Nov…").
- *Active Remittances* holds a payment count.
- *Invoice / OR Reference* shows one sample invoice per tenant (line 555), not a list.

---

## 3. Design critique

### D1 — One template, nouns swapped · S3 · Redesign

Both screens: breadcrumb, H1, subtitle, **four equal tiles** each with a tracked uppercase eyebrow
and a tinted icon chip, then bordered cards. The tenant file says so itself: *"4 Top KPI Stat Cards
(Matching Admin Overview Style)"* (line 406).

**Swap test:** replace the boarding-house nouns and the page serves any SaaS product unchanged.
That is level 0–1 on the Design skill's specificity ladder. Signatures present, from its table:
*shell-first dashboard*, *KPI tiles*, *tracked all-caps eyebrow above every heading*, *uniform
radius and shadow*, *decorative accents appended by habit*.

The icon chips repeat their labels (a house beside "Occupancy", a trend arrow beside
"Collections"), and their colour is not status: the Collections chip is green at ₱0.

A pattern alone is not the defect. The defect is that no subject fact shaped any of it (D2).

### D2 — Task order is inverted · S2 · Redesign

**The landlady's recurring decisions**, from the data, the rules and judgement log § 3.6
(collection happens in person):

1. Verify GCash payments waiting in the queue
2. Record a walk-in payment
3. See who has not paid this cycle
4. Dispatch urgent repairs
5. Record expenses split across the five areas

The first screen today is a title, three buttons, four passive tiles and a chart. **No list of who
is pending or unpaid appears anywhere on the overview.**

**The resident's questions:** what do I owe, by when, how do I pay, is my repair moving.

The answer sits in tile 4 and the right-hand column. On a phone it is two screens down. The
largest object on the page is a dark box for a unit photo that does not exist.

### D3 — Everything is said twice · S3 · Redesign

- **Tenant:** the unit appears three times (tile, card header, spec box), rent twice, water twice.
- **Admin header:** says "overview" three times (breadcrumb, H1, subtitle).
- **Restated labels:** *"33-Unit…"*, *"33 Canonical Units"* and *"5 Clusters"* repeat what the rows
  beneath already show.

### D4 — The chart's encoding · S2 · Redesign

- **No scale:** no y-axis or tick labels. Gridlines sit at positions unrelated to values (the `- 40`
  offset, line 1093).
- **Decorative colour:** a left-to-right gradient on the line (1081–1085) encodes nothing.
- **Misleading fill:** the area fill reads as an accumulated quantity.
- **Kinds of month blurred:** recorded, unrecorded and projected months are one continuous smoothed
  line (Bézier, 646–652), told apart only by 7.9 px text.
- **Candidates to compare, not a decision:** separate marks per month with a distinct treatment for
  each of the three kinds, or a table. The Design skill's information-design reference is the
  route.
- **Cash flow:** the mirrored bars are scaled to the chart maximum, and the legend says *Expenses*
  while the rows say *Operating*.

### D5 — Type has no hierarchy left · S3 · Redesign

- **Fonts:** `index.html` loads Plus Jakarta Sans 300–800 and Sora 400/600/700/800. **M:** the loaded
  faces were Sora 700 and 800 and Plus Jakarta Sans.
- **Weights:** `font-black` (900) is requested 46 times in the admin view and 19 in the tenant view,
  and renders as 800. Weights 800–900 cover headings, numbers, labels and eyebrows alike, so weight
  cannot mark a level any more.
- **Sizes:** 28 declarations at 9–11 px in the admin view, 9 in the tenant view. Chart status text
  is 7.9 px at desktop.
- **Faces:** table figures are set in the display face (line 1842). JetBrains Mono is declared in
  the theme and never loaded.

### D6 — Colour bypasses its own tokens · S3 · Redesign

- **Tokens unused:** `index.css` defines success/warning/danger/info with foreground and soft
  variants (lines 36–49). **Neither overview uses one.**
- **Counts:** raw Tailwind palette classes 106 (admin) and 46 (tenant). Hex literals 26 and 3. The
  `.badge-*` classes are hex (349–378). `check:tokens` passes regardless.
- **Four neutral families at once:**
  - stone: `#fafaf9`, `#1c1917`, `#e7e5e4`
  - zinc: `#71717a`, `#a1a1aa`
  - slate: `#475569`, `#64748b` in the sidebar
  - an Atlassian navy set: `#172b4d`, `#dfe1e6`, `#f4f5f7`
- **The screens disagree:** the tenant view heads in `#1c1917` with `#e7e5e4` borders, the admin view
  in `#172b4d` with `#dfe1e6` borders.
- **Status colours carry no status:**
  - "Figures unavailable" is green
  - "0 collections" is green
  - zero pending is amber
  - live cash-flow NOI is green even when negative (line 1222 is unconditionally emerald)
- **Unused token:** `--ring` is amber and nothing uses it.

### D7 — Cards inside cards · S3 · Redesign

- **Two card definitions:** `.surface-card` (index.css 199–204) is re-declared on most sections
  with `rounded-2xl border-border-strong bg-white shadow-xs`.
- **Nesting:** cluster rows (1310), archive cash-flow rows (1630) and tenant spec boxes (507–518)
  are bordered cards inside bordered cards, with pills inside those.

### D8 — Motion that does nothing, loading that loads nothing · S3 · Redesign

- **Dead classes:** `animate-in`, `fade-in`, `zoom-in-95` have no plugin behind them.
- **Fake loading:** switching year shows a skeleton for 180 ms although every figure is already in
  memory (lines 142–163). That is a loading state with nothing loading.
- **Invalid class:** `py-0.2` (1978) is not a valid class.

### D9 — Phone layout duplicates actions · S3 · Redesign

- **R** (375 px, admin): Record Payment, Record Expense and Refresh sit in the header **and** in a
  floating button.
- **Overlap:** the floating button covers the Pending Remittances tile on the admin view and the
  Account Status tile on the tenant view.
- **Mechanics:** it exposes no expanded state and its backdrop has no Escape.
- **Desktop sidebar:** a full-height white panel, mostly empty.

### D10 — Copy · flagged, not decided

Wording belongs to Scribe and `check:canon`, and some of it is locked. Flagged only:

- **Inflated titles:** "Executive Operations Overview", "Cluster Occupancy & Contribution Matrix",
  "Deep Ledger Drilldown".
- **Rule codes shown to users:** "BR-032" on a card, and *"(BR-031)"* in the offline banner.
- **Jargon:** the toast *"Authoritative synchronization active"*.

### D11 — Two design documents will pull the redesign back · S2 · Redesign lead

- **The first doc:** `docs/UI_DESIGN_SYSTEM_GUIDELINES.md` opens *"All AI agents, developers, and
  team members MUST adhere strictly to these guidelines"* and specifies the current
  Jira + Notion + Airtable look.
- **The second doc:** `docs/UI_DESIGN_SPECIFICATION.md` agrees on the idea but not the details.
- **They disagree with each other:** body font Inter in one, Plus Jakarta Sans in the other.
- **Both disagree with `index.css`:** canvas `#f4f5f7` against `#fafaf9`, figures in JetBrains Mono
  against Sora.
- **The risk:** an agent redesigning with the skills will treat these as the incumbent design owner,
  because the UI skill ranks *"design-system documentation"* above its own defaults.
- **Before the rework starts:** give them the record banner `check:canon` already recognises, or
  replace them.

---

## 4. Interface mechanics and accessibility

| # | Finding | Evidence |
| :--- | :--- | :--- |
| U1 | Year menu hover-only (F14) | M |
| U2 | Collapse toggles are icon-only, 24 × 24, named by `title` only, no `aria-expanded` | M |
| U3 | Income / Expense ledger tabs have no tab role or selected state | M |
| U4 | Archive search box and cluster filter have no label | M |
| U5 | Chart has no accessible name, 36 unlabelled text nodes, hover-only detail (F12) | M |
| U6 | `#a1a1aa` labels (chart "Run-rate", "Personal (not deducted)") measure **2.56:1** and **2.45:1**, below 4.5:1 at 7.9–10 px. The status colours in use measure 4.6–7.6:1 and pass | M |
| U7 | No designed focus style (0 `:focus-visible` rules). Chrome's default ring is visible (checked at 800 px), so this is a floor, not a design | S + R |
| U8 | The 2025 archive renders 436 table rows at once. Performance not measured | M |

---

## 5. Worth keeping

- **Honest failure copy where it exists**: *"this is not the same as nothing being owed"* is the
  best sentence on either screen. The pattern needs extending (F1, F6), not rewording.
- The separation of operating from personal expense (OD-05), with the reason shown in a tooltip.
- Money right-aligned in tables, `tabular-nums` on headline figures.
- BR-029's current-month default, and the fiscal-year figure kept beneath it.
- CSV export escaping (RFC 4180).
- No horizontal overflow at 375 px on either screen (**M**), and the earlier 390 px wrap fixes in
  the cash-flow header.
- Buttons are 40 px tall. Status text contrast mostly passes (U6).

---

## 6. Inputs for the redesign brief

**Protected, whatever the new look:**

- `HANDOFF_TO_DESIGN.md` § 4: *could not load* is never shown as *nothing*.
- The wording locks and `check:canon`. Rates are facts: keep the number when a sentence changes.
- `docs/SCREEN_CONTRACT.md`:
  - **Admin overview:** one call, `GET /admin/payments`. The rest comes from shared state.
  - **Tenant overview:** six calls. **One writes**: `POST /tenant/payments/checkout`, GCash through
    Adyen. The Pay button is load-bearing.
- Judgement log § 3.5: Linda is excluded from grand totals on purpose.

**Subject facts that could shape visual decisions.** These are hypotheses to test against the
swap test, not decisions:

| Fact (source) | What it could shape |
| :--- | :--- |
| Five clusters (BR-032), on three residential floors and a rooftop level | Occupancy as the building's shape rather than five bars |
| Collection happens in person; GCash payments wait for verification (§ 3.6, BR-017) | An action queue first on the admin screen |
| Each tenancy bills from its own anniversary date (BR-033) | Due dates per person, not one month-end |
| Water per registered head (BR-014) | The tenant statement explaining its own arithmetic |
| The ledger mirrors her spreadsheet, receipt numbers and all | Tables that read like her book, not like a SaaS grid |
| She is not technical (UI guidelines persona) | Fewer, plainer words; nothing that needs a legend |

**Owner questions this audit adds:**

- **Amenities:** are a private T&B and a bed with mattress true of every unit? If not, which? (F3)
- **Garbage (2a) and electricity (3b):** already on the client sheet. The tenant portal now depends
  on both answers too.

---

## 7. Coverage

| Surface | Conditions actually examined |
| :--- | :--- |
| Admin, live year | R 1440 × 900 · R 800 × 500 · R/M 375 × 812 · M nested scroll, focus, chart text, contrast · R forced failure after a good load (800) |
| Admin, 2025 archive | R/M 1440 × 900 |
| Tenant | R/M 1440 × 900 · R/M 375 × 812 · R forced failure after a good load (1440) |
| Source | Both views read in full; `index.css`, `App.vue`, `AppSidebar.vue`, `index.html`, the contract rows, BR-013/014/029/032/033/035/037, judgement log § 3 |

**Not examined, and each stays unverified:**

- **Failure on first load:** only the stale-store case was rendered.
- **Viewport widths:** only 375, 800 and 1440 were rendered. Tablet widths between them (768–1023)
  and 200 % zoom were not.
- **Assistive tech:** a screen reader and a full keyboard tab order were not tested.
- **Tenant variants:** an unpaid, overdue or partially paid account. Only a settled account existed,
  and making one would mean writing to the live database. A unit that has a photo was also not seen.
- **Admin variants:** the archive on a phone, and the floating-button menu opened.
- **Dark mode:** none exists.

**Checks:** `npm run check:all` 17 / 17 pass after pulling Kiel's push, no skip notes. That did not
catch F4, F7, F15 or D6, which is why they are here.
