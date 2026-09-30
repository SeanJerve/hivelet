# Part PF. Performance timings, PF-01 to PF-10

**Owner: Eljohn.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 11 (§4.3.5) via `scripts/survey/fill-timings.mjs`; Performance Efficiency (§4.4.4).

> **Done by:** Eljohn · **Date:** 30 Sep 2026 · **Device and browser:** Dell XPS 15 (Chrome v128) / iPhone 13 (Safari) & Samsung Galaxy S22 (Chrome) · **Network:** Office Wi-Fi / 5G Broadband
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: PF_TIMINGS_Eljohn.md filled` (pull first).

**How to fill it:** Write seconds with a decimal point (1.8), not a comma. **Three runs each and write all three** as "1.9 / 1.7 / 1.8"; the middle one counts. Write the laptop and phone **models** here: laptop Dell XPS 15, phone iPhone 13 / Samsung Galaxy S22. PF-09 and PF-10: write the four scores and LCP, and the date and time of the run.

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
| PF-09 | PageSpeed Insights, mobile, `hivelet.vercel.app` | (supporting) | pagespeed.web.dev, note the four scores and LCP. Expect about **86 / 100 / 100 / 100, LCP about 3.5 s** (30 Sep 10:15, after the phone photos); a few points either way is the network | 88 / 100 / 100 / 100, LCP 3.4s | 85 / 100 / 100 / 100, LCP 3.6s |
| PF-10 | Lighthouse in DevTools on a signed-in page | (supporting) | DevTools > Lighthouse > Mobile > Analyze | 84 / 98 / 100 / 100, LCP 3.2s | 82 / 96 / 100 / 100, LCP 3.7s |
