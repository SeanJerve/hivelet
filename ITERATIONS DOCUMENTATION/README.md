# Iterations documentation

Screenshots of the same twelve screens in three versions of Hivelet, for the iterative (Agile)
development record in the manuscript. Made on 2026-10-02 from the project's own git history.

| | Version | Commit | Where it stood |
| :--- | :--- | :--- | :--- |
| **Iteration 1** | 28 Aug 2026 | `1438595` (branch `design-from-lloyd`) | End of the first build phase: every module present (ledgers, tenants, repairs, inquiries, audit trail, installable app), first design system applied 21 Aug |
| **Iteration 2** | 19 Sep 2026 | `4eaff4e` (branch `design-from-lloyd`) | The day after the redesign (18 Sep): green brand, plain-language screen names, the owner's own workbook layout |
| **Iteration 3** | 2 Oct 2026 | `main` as deployed on 2 Oct | After the client review (26 Sep), the testing day (30 Sep) and the 1-2 Oct revisions; the version presented to the technical evaluators on 3 Oct |

Between Iteration 1 and Iteration 2 there are 729 commits on that branch.

## Folders

- `iteration-1_2026-08-28/`, `iteration-2_2026-09-19/`, `iteration-3_2026-10-02/`: one PNG per
  screen, the same file names in each.
- `side-by-side/`: the three versions of each screen on one image, labelled, ready for a figure.

| File | Screen | Size |
| :--- | :--- | :--- |
| `01_landing` | Public landing page | 1366 x 768 |
| `02_landing_phone` | Public landing page | 390 x 844 (phone) |
| `03_unit_category` | Studio units (public) | 1366 x 768 |
| `04_sign_in` | Sign-in | 1366 x 768 |
| `05_admin_overview` | Owner's Overview | 1366 x 900 |
| `06_admin_overview_phone` | Owner's Overview | 390 x 844 (phone) |
| `07_monthly_income` | Monthly Income | 1366 x 900 |
| `08_monthly_expenses` | Monthly Expenses | 1366 x 900 |
| `09_rooms_and_rates` | Rooms and rates | 1366 x 900 |
| `10_tenants` | Tenants | 1366 x 900 |
| `11_tenant_overview_phone` | Tenant's Overview | 390 x 844 (phone) |
| `12_tenant_payments_phone` | Tenant's Payments and billing | 390 x 844 (phone) |

## How they were made (state this with any figure that uses them)

Each version was checked out from git, built, and opened in a headless Chromium browser
(Playwright), light theme. The same data was given to all three, so differences are the software's,
not the data's:

- **Units and rates are real**: the 33 units, their rates and status, read from the live site's
  public unit list on 2 Oct 2026 (the same information any visitor sees).
- **Tenant names and money figures are sample data**: "Sample Tenant 1A" and so on, with payments
  made up from each unit's published rate, Jan to Oct 2026. No tenant's real name or payment record
  appears in any image. Nothing was signed in to the live site and nothing was written to it.
- No version was changed to make it look better. Where an older version shows a wrong or missing
  figure with this data, that is how it behaved.

## What changed, by screen

The reasons are from the project's records: the client review rows in Chapter 4, the session notes
in `CONTINUE_HERE.md`, and the commit messages.

| Screen | Iteration 1 (28 Aug) | Iteration 2 (19 Sep) | Iteration 3 (2 Oct) | Why |
| :--- | :--- | :--- | :--- | :--- |
| Landing | Dark blue corporate header; a statistics row whose unit and floor counts were wrong (the property has 33 units on four levels) | Full-screen photograph of the gate, the business name over it | Photograph of the building, the business name large, two plain links (Inquire now, Sign in) | Wrong figures found by looking at the page (17 Sep); the owner's own photographs |
| Owner's Overview | "Executive Operations Overview", four KPI cards and a line chart of the year | "Good afternoon, Michelle"; what needs attention first, then a month-by-month bar chart | Same structure; on a phone a + button holds the three actions; plainer sub-labels | Client review: one name per page, owner's words; mobile review (23 Sep) |
| Monthly Income | "Monthly Income & Collections Ledger", four totals and a dense table with filters on the page | "Money coming in", four equal tiles and two charts | "Monthly Income": one dark card for this month (rent, water, 50% Share) and the year beside it, split by cluster; filters moved into one Filters dialog | The page names were changed back to the two sheets of her workbook (28 Sep); "the feature says MONTHLY" (2 Oct) |
| Monthly Expenses | "Monthly Operating Expenses": three totals cards (all spending, utilities, repairs and janitorial) over the ledger | "Money going out": the period's spending, and a bar of where it landed by property area | "Monthly Expenses": a dark card for this month (utilities, repairs and cleaning), the year by area beside it; the same layout as Monthly Income | The workbook sheet names (28 Sep); "the feature says MONTHLY", one look for both ledgers (2 Oct) |
| Rooms and rates | "Room & Rate Directory": four count cards that disagreed with each other (the total shown was one less than the units it counted as occupied), cards with Specs and Edit | "Rooms and rates": units by cluster, status chips as filters, Look and Edit on each card | The cluster reads "Boarding House" instead of "BH", no Look button (the editor already shows the unit), filters in one Filters dialog | Client review: the owner's words (26 Sep); 2 Oct revisions |
| Tenant payments (phone) | "All Rent Accounts Settled" shown with no bill raised, and an empty table | "Nothing is due", payment record below | The amount due, the period it covers, and Pay with GCash; rent and water itemised | A tenant must see what is owed from what is recorded (the standing, 24 Sep) |

These rows describe what the images show. When a figure is placed in Chapter 4, cite the image file
and the date of the version, and keep the sample-data note with it.

## Regenerating

The scripts that made these are not kept in the repository. To make them again: check out each
commit into its own worktree (`git worktree add <dir> <commit>`), `npm ci` and `npx vite build` in
its `frontend/`, serve the build, and capture with Playwright using stubbed `/api` answers (the live
public unit list, sample ledgers). The first version needs no service worker; serve without `sw.js`
so every version renders from its own files.
