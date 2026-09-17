# Handoff — Kiel, UI/UX — 2026-09-17

**Written for Kiel ("Kel") and for whoever is working alongside him.** The interface is being
reworked: **a different look, the same functions.** That sentence is the whole brief, and the
second half of it is the part this document exists to protect.

> [!IMPORTANT]
> **Role note, and it needs settling on paper.** The submitted Module 02 answer sheet
> (`CAPSTONE ACTS/Module 02 - System Construction and Development.md`) records **Kiel Hedrix V.
> Relos — Quality Assurance / Systems Analyst** and **Eljohn Paulo C. Loterte — Frontend
> Developer / UI/UX Designer**. The split assigned on 2026-09-17 is the other way round.
> Both can be true — roles change — but the answer sheet is a **submitted** deliverable that
> names who did which requirement. Either it gets a dated amendment or the panel reads a
> contradiction. **That is Vince's item** (`HANDOFF_TO_VINCE.md` § 5); it is flagged here only so
> nobody is surprised by it mid-defense.

---

## 0. Read the five rules first

`CLAUDE.md` at the repository root. Two of the five land directly on the interface:

- **The database is LIVE.** 937 income rows, 1,327 expense allocations, 33 units, 32 occupied.
  There is no staging copy. A screen you are restyling talks to the owner's real records.
- **BR-035 wording is locked**, and so are three other phrasings. `npm run check:canon` **fails
  the build** on any file that breaks them — including a `.vue` template. See § 4.

---

## 1. The one document that defines "the same functions"

**`docs/SCREEN_CONTRACT.md`.** Every screen, every call it makes, and **which ones write**.

```bash
npm run contract
```

It is **generated**, read out of `frontend/src` each time, so it cannot drift from what the code
actually calls. **Never edit it by hand.**

**19 files make 59 distinct calls, 30 of which write.** Rebuild a screen, then read its row.

Why it was written, in its own words — the risk in a redesign *is not visual*:

> `check:reachable` catches a component nothing renders. `check:endpoints` catches a route
> nothing calls. **Neither catches the middle case**: the screen is there, the endpoint is there,
> and the button that joined them is gone.

The call count per view, so you know which screens carry weight:

| Screen | calls | of which **write** |
| :--- | ---: | ---: |
| `TenantManagementView.vue` | 4 | **4** |
| `IncomeCollectionsView.vue` | 6 | **4** |
| `ExpensesLedgerView.vue` | 5 | **3** |
| `MaintenanceDispatchView.vue` | 4 | **3** |
| `InquiriesView.vue` | 2 | **2** |
| `TenantTicketsView.vue` | 5 | **2** |
| `TenantOverviewView.vue` | 6 | **1** |
| `CategoryRoomsView.vue` | 3 | **1** |
| `PublicGuestView.vue` | 2 | **1** |
| `TenantProfileView.vue` | 2 | **1** |
| `AdminOverviewView.vue` | 1 | 0 |
| `AuditLogsView.vue` | 1 | 0 |
| `TenantPaymentsView.vue` | 2 | 0 |

**Read the verbs literally.** `writes` means it changes the owner's data.

---

## 2. Four checks stand between a restyle and a silent loss

Run from the repository root. All four run on a bare clone except `check:fields`, which needs
`.env`.

| | What it catches | Why it exists |
| :--- | :--- | :--- |
| `check:reachable` | a file under `frontend/src` that no import chain reaches from the entry point | On 2026-08-26 a commit titled "complete UI visual audit… header harmonization" removed the notification centre from `AppHeader.vue` — the import, the bell, the badge, the polling. `NotificationPopover.vue` became unrenderable and **nothing said so for twenty days**, while the backend went on writing notification rows on five events. The table held 20 rows, every one unread, because nothing in the product could read one |
| `check:tokens` | a colour that no longer resolves to the hex it replaced, and a rise in raw hex literals | `src/index.css` declared about fifty named roles and **not one component used them**: 1,879 hex literals across 32 files, 270 of them `#0c66e4` — while the token called `--primary` held a different colour entirely. The palette was documentation, not configuration |
| `check:liveness` | a screen presenting cached, seeded or empty state as a live figure | Three separate money defects were this same defect. See § 6 |
| `check:fields` | a form field that does not match the column it writes to | needs `.env` |

> [!WARNING]
> **Vue resolves an unknown tag to nothing.** No error, no build failure — the page renders and
> the element is simply absent, the layout closing over the gap. **`vue-tsc --noEmit` exits 0 on
> it**; that was tested here, not assumed. Moving markup between files and forgetting an import
> is the easiest mistake in this job and the hardest to see. Move markup freely — `check:reachable`
> is what makes that safe.

And the rule for reading any of it:

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

**Read the summary table, not the tail.** `| tail` shows the end of whichever suite ran last, and
a red check has been committed past that way twice. Seventeen suites: **11 run on a bare clone**,
14 with `.env`, all 17 with the backend up and `credentials/creds.txt`.

---

## 3. The design system is configuration, not a mood board

Sources of truth, in this order:

| | |
| :--- | :--- |
| `frontend/src/index.css` | the tokens themselves |
| `frontend/scripts/check-design-tokens.mjs` | the `EXPECTED` map — utility class to the exact hex it must resolve to. This is what makes the migration provably a refactor rather than a repaint |
| `docs/UI_DESIGN_SYSTEM_GUIDELINES.md` | the reasoning: the Jira + Notion + Airtable synthesis, the landlady persona, the status and urgency colour system |
| `docs/UI_DESIGN_SPECIFICATION.md` | the eight sidebar modules and the three workspaces — admin, tenant, public guest |

Standing constraints, not yours to overturn quietly:

- **No emojis anywhere in the product.** SVG / Lucide icons with explicit text labels.
- **Two type roles are fixed:** Plus Jakarta Sans for headings, **JetBrains Mono with tabular
  numerals for every amount, counter, unit code and statistic.** Money that shifts column width
  between rows is a real defect for someone reading a ledger all day.
- **Buttons state their action** — `Record Payment`, `Convert Inquiry`, `Dispatch Ticket`.
- **No silent actions.** Success toast, warning toast, error toast with a resolution, and a
  confirmation modal carrying an impact statement for anything destructive.
- **Mobile is a mandate, not a nice-to-have** — slide-over drawers, stacked cards, horizontal
  table scroll.

The feedback furniture already exists and is worth reusing rather than reinventing:
`components/ui/ToastContainer.vue`, `Skeleton*.vue` (card / detail / table), and six modals under
`components/modals/`.

---

## 4. Do not change money wording while restyling

`npm run check:canon` fails the build on four settled things, and it reads `.vue` files:

1. **BR-035.** `fifty_percent_share` is described **only** as a system-computed figure equal to
   half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet.
   **Never name a party, recipient, purpose or destination.** Not "co-ownership", not "50/50",
   not "owner share".
2. **No rate escalation of any kind.** The owner sets rates by hand; only the change history is
   kept. The "2% annual increase" was withdrawn in full, client-confirmed 2026-09-13.
3. **The property is 33 units, not 32** — 5 clusters (BH 22, Back Apartment 5, Front Apartment 3,
   Penthouse 1, Linda 2), across 3 residential floors plus a rooftop penthouse level: **11 / 11 /
   10 / 1**.
4. **The payment gateway is configured and working** against Adyen's developer sandbox with
   GCash. Never "mock", never "simulator", never "pending consultation".

If a screen's copy genuinely has to change, read `docs/02_BUSINESS_RULES.md` BR-035 first, and
raise it rather than rewording it.

---

## 5. Renaming a screen has a cost outside the frontend

`TESTING_REHEARSAL.md` walks 26 steps by **sidebar label**, read out of `AppSidebar.vue` rather
than remembered: *Executive Overview, Room & Rate Directory, Active Tenants, Income &
Collections, Monthly Expenses, Maintenance Dispatch, Prospect Inquiries, System Audit Trail* —
and for a resident, *Unit Overview, Payment & Billing, Maintenance Tickets, My Profile*.

**If the redesign renames any of them, rename them in that file in the same commit.** A rehearsal
sheet that sends a person hunting for a screen that no longer exists under that name is worse
than no sheet.

---

## 6. The trap this project keeps falling into, in your lane

A screen showing a **fallback** that is indistinguishable from the truth. Three times:

| | |
| :--- | :--- |
| the dashboard projected **₱12,800** of water a month against a real **₱6,400** | `occupants` was mapped `Math.min(capacity, 2)` — invented from room size — while the real tenancy figure sat unused two lines below |
| the cash form could pre-fill a rent **₱2,000 wrong** | it read the hardcoded seed price, and **30 of 33 no longer match the database** |
| a failed expense fetch would have shown **the year's takings as profit** | `fetchExpenseRecords` caught its own failure, logged a `console.warn` nobody reads, and returned an empty array — which the dashboard subtracts from gross to get NOI. **₱3,745,419.51** of 2025 costs becoming ₱0. Its three sibling loaders all raise a fetch-failed flag; this one did not |

So: **a loader that hands back cached state on failure must raise a `*FetchFailed` flag, must
clear it when it starts, and some `.vue` must actually render it.** `check:liveness` asserts all
three. If the redesign introduces a new loader, build the flag with it.

> `check:liveness` runs **4 of its 7 rules without a backend and still exits 0**, printing `note:`
> lines about what it skipped. A green liveness on a machine with no backend is not the same
> check. Read the notes, not the exit code.

---

## 7. Two open items that are design calls, not engineering ones

1. **`room_photos` is empty.** All 33 units render without a photo. That is expected, not a bug —
   but decide **before filming** what an unphotographed unit should look like on the public
   catalogue, because "broken image" and "deliberately minimal" are the same pixels until someone
   chooses.
2. **`wireframe/` is empty.** If the redesign produces wireframes, that is where they belong, and
   they should be committed — the history on this project is the reasoning.

---

## 8. Working alongside four other people

| | |
| :--- | :--- |
| **Your lane** | `frontend/src/` (views, components, tokens), `docs/UI_DESIGN_*.md`, `wireframe/` |
| **Not your lane** | `backend/src/`, `database/migrations/`, the live data |
| **Shared — pull first, every time** | `CONTINUE_HERE.md`, `TESTING_REHEARSAL.md`, `docs/13_AUDIT_JUDGEMENT_LOG.md`, `docs/SCREEN_CONTRACT.md` |

Pull before you start and before every push. **Commit in small pieces with real messages** — the
history here is the reasoning and is worth more than the diff.

**Never stop because something is out of reach.** Write it into `BLOCKED_FOR_SEAN.md` with the
five fields the template asks for, and move to the next thing. Sean reads it cold, possibly at
midnight, after a day of his own work.

---

## 9. Where everything else is written down

| | |
| :--- | :--- |
| `docs/SCREEN_CONTRACT.md` | your contract. Generated — `npm run contract` |
| `docs/UI_DESIGN_SYSTEM_GUIDELINES.md` | tokens, persona, status colours, the tri-inspiration |
| `docs/13_AUDIT_JUDGEMENT_LOG.md` § 3 | **read before changing anything that looks wrong.** Several things that look like bugs are deliberate and say why |
| `docs/11_FORM_FIELD_AUDIT.md` | a historical defect register. **Its FIX items are substantially stale** — it audits `website/src/`, a directory that no longer exists. Re-check every row against live code before acting on it |
| `TESTING_REHEARSAL.md` | 26 steps, every write path once. No write path has ever been used by a person |
| `CLAUDE.md` | the five rules |
| `BLOCKED_FOR_SEAN.md` | the queue. Add to it rather than stopping |
