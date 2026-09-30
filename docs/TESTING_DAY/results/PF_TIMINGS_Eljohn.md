# Part PF. Performance timings, PF-01 to PF-10

**Owner: Eljohn.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 11 (§4.3.5) via `scripts/survey/fill-timings.mjs`; Performance Efficiency (§4.4.4).

> **Done by:** Eljohn · **Date:** 30 Sep 2026 · **Device and browser:** laptop Dell XPS 15 (Chrome 154); phones Infinix GT20 (Chrome 154) and iPhone 15 (Safari) · **Network:** house wifi (laptop, GT20) / mobile data (iPhone 15)
>
> **Corrected 1 Oct 2026 (Sean, for Eljohn):** the browser versions were mistyped (the latest
> stable Chrome was used: 154 on 30 Sep); the phones are the Infinix GT20 and the iPhone 15.
>
> **Runs:** three runs were timed per cell, but only **one value per cell was written down** (the
> first run). Chapter 4 reports each as a single recorded run, not the median of three, and says so.
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: PF_TIMINGS_Eljohn.md filled` (pull first).

**How to fill it:** Write seconds with a decimal point (1.8), not a comma. **Three runs each and write all three** as "1.9 / 1.7 / 1.8"; the middle one counts. Write the laptop and phone **models** here: laptop Dell XPS 15, phones Infinix GT20 / iPhone 15. PF-09 and PF-10: write the four scores and LCP, and the date and time of the run.

---

On the **Table 2 laptop** and the **Table 3 phone**. Write the model, browser, network and date on
the timing sheet. **Three runs each, report the middle one.** First load = cache cleared (laptop:
DevTools > Network > Disable cache; phone: a private tab). Laptop times from DevTools' Network tab
(**DOMContentLoaded** and **Load** at the bottom); "usable" = stopwatch until the figures you came
for are on screen.

| ID | Screen | Table 11 row | How | Laptop (s) | Phone (s) |
| :-- | :--- | :--- | :--- | :-- | :-- |
| PF-01 | Public home, first load | Public home page, first load | Cache cleared | 1.85 | 2.42 |
| PF-02 | Public home, second load | (supporting) | Normal reload | 0.62 | 0.95 |
| PF-03 | Sign in to Overview | Sign-in to dashboard | Stopwatch from pressing Sign in to figures shown | 2.10 | 2.88 |
| PF-04 | Monthly Income, full year | Income ledger, one full year | Stopwatch to the last row visible | 1.45 | n/a |
| PF-05 | Monthly Income workbook export | Excel export of one year | Stopwatch from click to file saved | 2.30 | n/a |
| PF-06 | Tenant Overview, first load | Tenant portal, first load | Cache cleared | 2.15 | 3.05 |
| PF-07 | Tenant Payments | (supporting) | Stopwatch | 1.20 | 1.78 |
| PF-08 | Send a repair request | (supporting) | Stopwatch from Send to confirmation | 1.65 | 2.10 |
| PF-09 | PageSpeed Insights, mobile, `hivelet.vercel.app` | (supporting) | pagespeed.web.dev, note the four scores and LCP. Expect about **86 / 100 / 100 / 100, LCP about 3.5 s** (30 Sep 10:15, after the phone photos); a few points either way is the network | 88 / 100 / 100 / 100, LCP 3.4 s | 85 / 100 / 100 / 100, LCP 3.6 s |
| PF-10 | Lighthouse in DevTools on a signed-in page | (supporting) | DevTools > Lighthouse > Analyze, on the laptop. **Laptop column = Desktop mode; Phone column = Mobile mode** (Lighthouse's emulated phone, run on the laptop, not on a real phone) | 84 / 98 / 100 / 100, LCP 3.2 s | 82 / 96 / 100 / 100, LCP 3.7 s |

**PF-09 and PF-10 scores are in the order** Performance / Accessibility / Best Practices / SEO.
PageSpeed runs on Google's servers, so the device it is started from does not change the result;
the two PF-09 cells above are two runs of the mobile test.

### PF-09 evidence: PageSpeed re-run after midnight, 1 Oct 2026 (with screenshots)

The 30 Sep PF-09 values above have no screenshot. These runs, on the same deployment a few hours
later, do. Chapter 4 cites these.

| Run | Captured | Form factor | Scores | FCP | LCP | TBT | CLS | Speed Index | Evidence |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 (Sean) | 1 Oct 2026, 12:36 AM GMT+8 | Mobile (Moto G Power, slow 4G) | 87 / 100 / 100 / 100 | 2.4 s | 3.6 s | 0 ms | 0.014 | 2.4 s | [`PF-09_pagespeed_mobile_87_2026-10-01_0036_fullreport.pdf`](evidence/PF-09_pagespeed_mobile_87_2026-10-01_0036_fullreport.pdf) |
| 2 (Claude) | 1 Oct 2026, 12:40 AM GMT+8 | Mobile (Moto G Power, slow 4G) | 86 / 100 / 100 / 100 | 2.6 s | 3.6 s | 0 ms | 0.014 | 2.6 s | [`PF-09_pagespeed_mobile_86_2026-10-01_0040.png`](evidence/PF-09_pagespeed_mobile_86_2026-10-01_0040.png) |
| 3 (Sean) | 1 Oct 2026, 12:37 AM GMT+8 | Desktop | 98 / 100 / 100 / 100 | 0.7 s | 1.1 s | 0 ms | 0.003 | 0.8 s | [`PF-09_pagespeed_desktop_98_2026-10-01_0037_fullreport.pdf`](evidence/PF-09_pagespeed_desktop_98_2026-10-01_0037_fullreport.pdf) |
| 4 (Claude) | 1 Oct 2026, 12:40 AM GMT+8 | Desktop | 95 / 100 / 100 / 100 | 0.7 s | 0.9 s | 0 ms | 0 | 2.0 s | [`PF-09_pagespeed_desktop_95_2026-10-01_0040.png`](evidence/PF-09_pagespeed_desktop_95_2026-10-01_0040.png) |

Mobile Performance across all four runs (30 Sep and 1 Oct): 85 to 88, LCP 3.4 to 3.6 s. Desktop:
95 and 98, LCP 0.9 and 1.1 s. Accessibility, Best Practices and SEO are 100 in every run. The
largest opportunities PageSpeed names: render-blocking CSS and Google Fonts (about 1.0 s), and
the two home-page photos (about 183 KiB).

### PF-10 evidence: Lighthouse on the signed-in Overview, 1 Oct 2026

The landlady's Overview (`/admin/overview`), signed in, in a fresh Chrome 154 profile with no
extensions (the equivalent of an Incognito window), storage kept so the session stayed signed in.
Lighthouse 13.5.0, simulated throttling, no run warnings.

| Run | Captured | Mode | Scores | FCP | LCP | TBT | CLS | Speed Index |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 (Sean, DevTools) | 1 Oct 2026, about 12:55 AM | Mobile (page picture is a phone) | 61 / 100 / 100 / 66 | 0.6 s | 0.9 s | 7,040 ms | 0.067 | (not in screenshot) |
| 2 (Claude, Lighthouse 13.5.0) | 1 Oct 2026, 1:05 AM GMT+8 | Desktop | 85 / 100 / 100 / 66 | 0.3 s | 0.3 s | 160 ms | 0.221 | 0.7 s |
| 3 (Claude, Lighthouse 13.5.0) | 1 Oct 2026, 1:05 AM GMT+8 | Mobile | 81 / 100 / 100 / 66 | 0.1 s | 0.9 s | 700 ms | 0.078 | 1.2 s |

- **Run 1 is not comparable.** Lighthouse warned that stored data affected it: it was not an
  Incognito window, and 7.7 s of the CPU time was "Unattributable" (browser extensions), against
  about 1.2 s for Hivelet's own scripts. Runs 2 and 3 are the clean ones and agree with Eljohn's
  30 Sep values (84 desktop, 82 mobile).
- **SEO 66 is by design.** The only failed audit is "Page is blocked from indexing": the admin
  pages carry a `noindex` meta tag and are disallowed in `robots.txt` so the owner's books never
  appear in search results. The public pages score 100 (PF-09).
- **What holds the Performance score down:** layout shift on desktop (CLS 0.221, the cards
  settling as the figures arrive) and blocking time on the emulated phone (700 ms).
- **Screenshots:** they show the owner's signed-in Overview with her figures, so they are **not
  committed**. They were saved on Lloyd's laptop; a team member decides whether to add them here
  (blur the figures first if they go in the manuscript).
