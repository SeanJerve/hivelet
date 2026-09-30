# Part CO. Compatibility matrix, CO-01 to CO-06

**Owner: Eljohn.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Compatibility (§4.4.5) and the deployment environment table (versions of the devices and browsers actually used).

> **Done by:** Eljohn · **Date:** 30 Sep 2026 · **Device and browser:** Dell XPS 15 (Chrome v128, Edge, Firefox v130) / Samsung Galaxy S21 & S22, iPhone 13 (Safari) · **Network:** Office Wi-Fi / 5G Broadband
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: CO_BROWSERS_Eljohn.md filled` (pull first).

**How to fill it:** For each device and browser **actually used today** (by testers or the team), write **Pass**, **Fail** or **n/a** in each column, and the browser version in Notes. Rows for devices nobody used: NT.

---

Tick each browser and device the system was actually used on tomorrow, with the result.

| ID | Device and browser | Sign-in | Tenant pages | Admin pages | Install | Notes |
| :-- | :--- | :-- | :-- | :-- | :-- | :--- |
| CO-01 | Android, Chrome | Pass | Pass | n/a | Pass | PWA install prompt appeared as expected |
| CO-02 | Android, Samsung Internet (if a tenant has it) | Pass | Pass | n/a | Pass | Tested on Samsung Galaxy S21 |
| CO-03 | iPhone, Safari | Pass | Pass | n/a | Pass | Added to Home Screen successfully |
| CO-04 | Windows laptop, Chrome | Pass | Pass | Pass | Pass | Full functionality verified |
| CO-05 | Windows laptop, Edge | Pass | Pass | Pass | Pass | Minor UI alignment ok |
| CO-06 | Any, Firefox | Pass | Pass | Pass | n/a | Tested on Windows 11 Firefox v130 |
