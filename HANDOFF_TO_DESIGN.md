# Handoff — the design account

**Read this before touching a single file.** You are joining a working system that a real
business runs on. The interface needs redesigning; almost nothing behind it does.

Hivelet is an apartment management system for the **Fe Galang Da Silva Boarding House**, built by
Bicol University Group 4 for IT 124 Capstone Project 2. The owner, Mrs. Fe Galang Da Silva, keeps
her books in it. **The database is live**: 937 income rows, 1,327 expense allocations, 33 units
with 32 occupied. There is no staging copy.

---

## 1. Your remit, and its edges

**You own the visual layer.** Look, layout, typography, spacing, colour, motion, component
structure, responsiveness. The brief is a different style with the same functions — the current
look was generated early and nobody is attached to it.

**You do not own:**

| Not yours | Why |
| :--- | :--- |
| `backend/src/` | Another account owns the API and its behaviour |
| `database/` and every migration | Live financial records. Not a design surface |
| **What a screen fetches, writes, or computes** | You can change how a figure *looks*. Never what it *is* |
| The wording rules in § 3 | They are legal-ish constraints, not style |

If a redesign seems to need a backend change, **say so and stop** — do not reach across. Write it
down and hand it over.

---

## 2. The trap that will bite you, specifically

**Vue renders an unknown component as nothing.** No error, no build failure. The page loads, the
element is simply absent, and the layout closes over the gap as though it was never there.

**`vue-tsc --noEmit` exits 0 on it.** That was tested, not assumed — `<ThisIconDoesNotExist />`
was put into a real view and the typecheck passed.

You are about to move a great deal of markup between files, which is the single easiest way to
drop an import and the hardest to notice. So:

```bash
cd frontend && npm run check:reachable
```

It asserts every component a template renders is imported by that file. Zero violations today.
**Run it after any move.** It also catches a one-letter misspelling — `<AlertCirle>` — which
otherwise renders as a hole in the page.

---

## 3. Wording you cannot change, even while restyling

`npm run check:canon` fails the build on all of these. It has caught its own author five times,
so if it fires on you, you have not done anything unusual.

1. **`fifty_percent_share` is described *only* as a system-computed figure equal to half that
   row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet.** Never
   name a party, recipient, purpose or destination for it. Not in a label, tooltip, heading or
   alt text.
2. **The payment gateway is Adyen with GCash, configured and working.** The words `"mock"`,
   `"simulator"` and `"pending consultation"` must never be applied to it.
3. **The property is 33 units, not 32** — 32 currently occupied.
4. **There is no annual rate increase.** The owner sets rates by hand.

**Rates are facts, not copy.** Forty-two places state a figure in prose — *"₱200 / head monthly
rule"*, and *"(N × ₱200/head)"* printed on a resident's own statement beside the computed total.
`check:liveness` pins every one against the live configured rate. If you reword one, keep the
number, or the build tells you.

---

## 4. What looks like decoration and is load-bearing

**This is the most important section in this document.**

Eleven screens contain states that look like styling detail and are not. Each one exists because
the screen previously showed a **confident wrong number** when a request failed. They were found
and fixed on 17 September, one at a time, against the live ledger.

| Screen | What it does when a fetch fails | What it said before |
| :--- | :--- | :--- |
| `TenantPaymentsView` | amber "your bills could not be loaded" | **"All Rent Accounts Settled"**, in green, with a tick — to the person who owed the money |
| `TenantPaymentsView` | "history could not be loaded" | "No payment records found for 2025" — to someone who paid all year |
| `TenantOverviewView` | an em dash for amount due | a confident **₱0** |
| `AdminOverviewView` | em dashes on the money tiles | **₱0 of costs**, making Net Operating Income equal the whole year's takings |
| `ExpensesLedgerView` | em dashes on three tiles | **₱0.00** totals |
| `RoomDirectoryView` | a banner saying rates are not live | **stale seeded prices**, 30 of 33 of which no longer match the database |
| `CategoryRoomsView` | "live pricing unavailable" banner | same |
| `RoomDetailModal`, `InquiriesView`, `TenantManagementView` | no figure at all | a rate up to **₱1,900** wrong, quoted to a prospect |
| `OnsitePaymentModal`, `IncomeCollectionsView` | refuses to pre-fill, and says why | a rent **₱2,000** wrong on a receipt |

**The pattern:** every one distinguishes *"we could not load this"* from *"there is nothing"*.
A blank state is a claim. `₱0` is a claim. An empty list is a claim.

> **If you restyle these, keep the distinction.** Make the dash beautiful, make the banner fit
> your system — but a screen must never present a fallback as a fact. `check:liveness` enforces
> the structure; it cannot enforce that your new empty state still says the right thing.

**Two more in the same family, easy to lose:**

- The **GBG / garbage fee input** on the on-site payment form is `required` and is added to the
  total the resident is asked to hand over. Until 17 Sep it was recorded as ₱0.00. It is wired
  now. Do not make it optional or hide it.
- The **CSV exports** escape quotes RFC-4180 style. A resident named `Jose "Jojo" Cruz` would
  otherwise shift every column of the owner's income ledger.

---

## 5. The contract each screen must still meet

**`docs/SCREEN_CONTRACT.md`** — every screen, every call it makes, and **which ones write**.
Currently 19 files, 60 calls, 30 writes — but read the totals off the file itself, not from
this sentence. It is generated, so a number quoted here goes stale the moment somebody adds a
call:

```bash
cd frontend && npm run contract
```

It reads from the source each time, so it cannot drift. **Rebuild a screen, then check it against
its row.** If a call disappeared, you removed a feature; if one appeared, you reached somewhere
you should not have.

Thirty of those calls **write to the live database**. Treat any component that owns one as
load-bearing regardless of how it looks.

---

## 6. Colour, and the one rule about it

```bash
cd frontend && npm run check:tokens
```

The palette in `src/index.css` is the configuration, not documentation. This check exists because
it once was documentation: around fifty named roles declared and **not one component using them**
— 1,879 hex literals across 32 files, including 270 uses of one blue as the primary action colour
while the token named `--primary` held something else entirely.

**Build your new system in the tokens.** Replace their values freely; that is the point of them.
Do not go back to hex literals in components.

`check:tokens` needs a build first: `npx vite build`.

---

## 6b. Three things that reach outside `frontend/src/`

**Renaming a screen has a cost in another file.** `TESTING_REHEARSAL.md` walks 26 steps by
**sidebar label**, read out of `AppSidebar.vue` rather than remembered: *Executive Overview, Room
& Rate Directory, Active Tenants, Income & Collections, Monthly Expenses, Maintenance Dispatch,
Prospect Inquiries, System Audit Trail* — and for a resident, *Unit Overview, Payment & Billing,
Maintenance Tickets, My Profile*. **If you rename any of them, rename them there in the same
commit.** A rehearsal sheet that sends a person hunting for a screen that no longer exists under
that name is worse than no sheet.

**`room_photos` is empty**, so all 33 units render without a photo. That is expected, not a bug —
but decide **before filming** what an unphotographed unit should look like on the public
catalogue. "Broken image" and "deliberately minimal" are the same pixels until someone chooses.

**`wireframe/` at the repository root is empty.** If this redesign produces wireframes, that is
where they belong, and they should be committed — the history here is the reasoning.

---

## 7. How to verify anything

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

Seventeen suites. **Read that summary table, not the tail** — `| tail` shows the end of whichever
suite ran last, and a red check has been committed past that way twice.

The four that matter to you: **`check:reachable`**, **`check:tokens`**, **`check:liveness`**,
**`check:canon`**. All four run on a bare clone with no credentials.

> `check:liveness` runs **4 of its 7 rules without a backend and still exits 0**, printing `note:`
> lines about what it skipped. Read the notes, not the exit code.

---

## 7b. Asked for on 18 Sep — the landing page's unit section

**Sean asked for this out loud rather than in a document, so it is written here before it is
lost.** It is the public landing page, which is your lane, not the workspace side.

**Two changes, and they are one idea:** the section that currently shows unit categories becomes a
**floor plan showcase**, and the unit selector moves out of it into its own section underneath.

| | |
| :--- | :--- |
| **The first section** | Floor plans for the 1st, 2nd and 3rd floors. One image per floor, in place of the unit photographs that are there now |
| **Keep** | **The same collage layout.** Sean was explicit that the arrangement he likes stays; only what sits inside it changes |
| **The second section, new, below it** | The unit selector, moved down out of the first section |
| **In that selector** | **No images.** It reveals on click rather than showing a photograph per unit |

**What is not yet decided, and needs Sean before you build it:**

- **Where the floor plan images come from.** There are none in `frontend/public/` today — it holds
  `galang-compound.jpg`, `galang-building.jpg` and `property-map.png`. Three floor plans have to be
  drawn or photographed and handed over.
- **The fourth floor.** The property has four — 1 to 3 residential and the rooftop penthouse
  (`PublicGuestView` says so, and `RoomDirectoryView` repeats it). Sean named 1st to 3rd. Ask
  whether the penthouse gets a fourth plan, is folded into the third, or is deliberately left out.
- **What "on click only" reveals.** A unit's rate and availability are already public through
  `/public/rooms`. Whether the click opens the same detail the category cards show today, or
  something shorter, is a design decision that is yours once the content is settled.

**One thing to carry over rather than rebuild:** whatever the selector becomes, it still has to
survive `/public/rooms` failing. `B-01` in `BLOCKED_FOR_SEAN.md` is exactly that fault on this
page — every unit read as vacant when the fetch failed — and a rebuilt selector can reintroduce it
in a morning.

---

## 8. Where everything else is

| | |
| :--- | :--- |
| `CLAUDE.md` | Loads automatically. The five project rules |
| `docs/SCREEN_CONTRACT.md` | Your contract. Generated, never hand-edited |
| `docs/13_AUDIT_JUDGEMENT_LOG.md` § 3 | Things that look like bugs and are deliberate. **Read before "fixing" anything** |
| `TESTING_REHEARSAL.md` | 26 steps through every write path. Step 23b is the one that proves the states in § 4 |
| `BLOCKED_FOR_SEAN.md` | The queue. Add to it rather than stopping |

---

## 9. Working here

- **Commit in small pieces with real messages.** The history is the reasoning and is worth more
  than the diff.
- **Pull before you start and before every push.** Two other accounts share this repository —
  one on `backend/src/` and `database/`, one on `docs/`. **You are on `frontend/src/`.**
- **Never stop because something is out of reach.** Write it into `BLOCKED_FOR_SEAN.md` with
  enough detail to act on cold, and move to the next thing.
- **Ask rather than decide** when a change would alter what a screen *does* rather than how it
  looks. Nobody here minds being asked; everybody minds finding out later.

**Start by running `npm run check:all`, opening `docs/SCREEN_CONTRACT.md`, and reading § 4 of
this file twice.**
