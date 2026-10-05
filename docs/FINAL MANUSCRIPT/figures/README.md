# Chapter 4 figures

Placed in `CHAPTER_4_RESULTS_AND_DISCUSSION.md` and embedded in its `.docx` by
`scripts/build-chapter-4-docx.mjs`. Two kinds: diagrams drawn from the system (Figures 4 to 9) and
screenshots of it (Figures 10 to 14).

## Diagrams (Figures 4 to 9)

Drawn on 5 October 2026 by `scripts/build-chapter-4-diagrams.mjs`, which writes each as SVG to
`diagrams/` and renders it to PNG at twice its size with headless Chrome. Black on white, Arial, so
they print in mono.

| File | Figure | What | Drawn from |
| :--- | :--- | :--- | :--- |
| `figure-4-current-process.png` | 4 | The owner's process before the system (swimlanes) | Section 4.1.1 and Table 5; the booking channel is left general until the owner answers Table 5's question |
| `figure-5-system-architecture.png` | 5 | System architecture | `vercel.json`, the two `package.json` files, Table 7 |
| `figure-6-context-diagram.png` | 6 | Context diagram (level 0) | The API routes and `backend/src/config/rbac.ts` |
| `figure-7-data-flow-level-1.png` | 7 | Level 1 data flow diagram, Yourdon-DeMarco notation | As above; stores named for the tables behind them |
| `figure-8-use-case-diagram.png` | 8 | Use case diagram (UML) | `rbac.ts` and Table 7C |
| `figure-9-entity-relationship.png` | 9 | Entity-relationship diagram, Crow's Foot | **The live database catalogue** (`pg_attribute`, `pg_constraint`, `pg_index`) on 5 October 2026: 21 tables, 37 foreign keys, nullability as enforced |

**If the system changes, change the diagram in the script and run it again:**

    node scripts/build-chapter-4-diagrams.mjs          (all six)
    node scripts/build-chapter-4-diagrams.mjs erd      (one: as-is, architecture, context, dfd, use-cases, erd)

Never take the ERD from `database/FULL_DATABASE_SCHEMA.sql`; it does not describe this database
(CLAUDE.md rule 2). Ask the catalogue. Each diagram was checked by eye after rendering; the script
cannot tell whether a label collides with a line.

## Screenshots (Figures 10 to 14)

Made on 5 October 2026 from `main` as deployed that day, light theme, by headless Chrome
(`chrome --headless=new --screenshot`, a throwaway profile), at twice the screen's resolution
(three times for the phone). Numbered 4 to 8 until the diagrams were added the same night.

| File | Figure | Screen | Size (CSS px) | Data |
| :--- | :--- | :--- | :--- | :--- |
| `figure-10-rooms-and-rates.png` | 10 | Rooms and rates (administrator) | 1366 x 900 | Units, rates, status real; tenants sample |
| `figure-11a-public-unit-catalogue.png` | 11 (top) | Studio units, public site | 1366 x 900 | The live site as any visitor sees it |
| `figure-11b-inquiry-form.png` | 11 (bottom) | Send an inquiry, public site | 1366 x 900 | The live site, empty form |
| `figure-12-monthly-income.png` | 12 | Monthly Income (administrator) | 1366 x 900 | Sample receipts from each unit's real rate |
| `figure-13-repairs-board.png` | 13 | Repairs board (administrator) | 1366 x 900 | Sample repair requests |
| `figure-14-tenant-portal-phone.png` | 14 | Tenant Overview on a phone | 390 x 844 in a frame | Sample tenant in unit 1E at its real rate |

**Sample data, and why.** The signed-in screens were drawn by the real application with every
`/api` answer supplied by a local page, so no tenant's name or payment record appears and nothing
was signed in to or written on the live site. The 33 units, rates and status are the live site's
public list on 5 October 2026; every tenant is "Sample Tenant" plus the unit code; payments are
each unit's published rate plus ₱200 water per occupant, January to October 2026; expenses,
repairs and inquiries are invented. The administrator is shown as Michelle. Chapter 4, Section 4.2,
says so in one sentence at the start of Section 4.2. Keep that sentence with the figures.

**To make them again:** the two pages that supply the records (`frontend/_harness-figures.html`,
`frontend/_harness-figures-tenant.html`, and the phone frame `_harness-figures-phone.html`) are
local and gitignored with the other harnesses. With the dev server on 5173, for example:

    chrome --headless=new --hide-scrollbars --user-data-dir=<temp> --window-size=1366,900
      --force-device-scale-factor=2 --virtual-time-budget=25000
      --screenshot=figure-10-rooms-and-rates.png
      "http://localhost:5173/_harness-figures.html?route=/admin/directory"

A phone view needs the frame page: headless Chrome lays out a window narrower than about 500 px
wider than asked, which cut the right edge off the first attempt.
