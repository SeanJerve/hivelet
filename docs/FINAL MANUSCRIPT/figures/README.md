# Chapter 4 figures

Made on 5 October 2026 from `main` as deployed that day, light theme, by headless Chrome
(`chrome --headless=new --screenshot`, a throwaway profile), at twice the screen's resolution
(three times for the phone). Placed in `CHAPTER_4_RESULTS_AND_DISCUSSION.md` and embedded in its
`.docx` by `scripts/build-chapter-4-docx.mjs`.

| File | Figure | Screen | Size (CSS px) | Data |
| :--- | :--- | :--- | :--- | :--- |
| `figure-4-rooms-and-rates.png` | 4 | Rooms and rates (administrator) | 1366 x 900 | Units, rates, status real; tenants sample |
| `figure-5a-public-unit-catalogue.png` | 5 (top) | Studio units, public site | 1366 x 900 | The live site as any visitor sees it |
| `figure-5b-inquiry-form.png` | 5 (bottom) | Send an inquiry, public site | 1366 x 900 | The live site, empty form |
| `figure-6-monthly-income.png` | 6 | Monthly Income (administrator) | 1366 x 900 | Sample receipts from each unit's real rate |
| `figure-7-repairs-board.png` | 7 | Repairs board (administrator) | 1366 x 900 | Sample repair requests |
| `figure-8-tenant-portal-phone.png` | 8 | Tenant Overview on a phone | 390 x 844 in a frame | Sample tenant in unit 1E at its real rate |

**Sample data, and why.** The signed-in screens were drawn by the real application with every
`/api` answer supplied by a local page, so no tenant's name or payment record appears and nothing
was signed in to or written on the live site. The 33 units, rates and status are the live site's
public list on 5 October 2026; every tenant is "Sample Tenant" plus the unit code; payments are
each unit's published rate plus ₱200 water per occupant, January to October 2026; expenses,
repairs and inquiries are invented. The administrator is shown as Michelle. Chapter 4, Section 4.2,
says so in one sentence above Figure 4. Keep that sentence with the figures.

**To make them again:** the two pages that supply the records (`frontend/_harness-figures.html`,
`frontend/_harness-figures-tenant.html`, and the phone frame `_harness-figures-phone.html`) are
local and gitignored with the other harnesses. With the dev server on 5173, for example:

    chrome --headless=new --hide-scrollbars --user-data-dir=<temp> --window-size=1366,900
      --force-device-scale-factor=2 --virtual-time-budget=25000
      --screenshot=figure-4-rooms-and-rates.png
      "http://localhost:5173/_harness-figures.html?route=/admin/directory"

A phone view needs the frame page: headless Chrome lays out a window narrower than about 500 px
wider than asked, which cut the right edge off the first attempt.
