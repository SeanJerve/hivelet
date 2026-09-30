# Part CO. Compatibility matrix, CO-01 to CO-06

**Owner: Eljohn.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Compatibility (§4.4.5) and the deployment environment table (versions of the devices and browsers actually used).

> **Done by:** Eljohn · **Date:** 30 Sep 2026 · **Device and browser:** laptop Dell XPS 15 on Windows 11 (Chrome 154, Edge, Firefox 157); phones Infinix GT20 (Chrome 154) and iPhone 15 (Safari) · **Network:** house wifi (laptop, GT20) / mobile data (iPhone 15)
>
> **Corrected 1 Oct 2026 (Sean, for Eljohn):** the browser versions were mistyped (the latest
> releases were used: Chrome 154 and Firefox 157, released 29 Sep); the phones are the Infinix
> GT20 and the iPhone 15, so the Samsung row is NT; CO-01 is "Add to Home screen", not an
> install prompt, matching O-01.
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: CO_BROWSERS_Eljohn.md filled` (pull first).

**How to fill it:** For each device and browser **actually used today** (by testers or the team), write **Pass**, **Fail** or **n/a** in each column, and the browser version in Notes. Rows for devices nobody used: NT.

---

Tick each browser and device the system was actually used on tomorrow, with the result.

| ID | Device and browser | Sign-in | Tenant pages | Admin pages | Install | Notes |
| :-- | :--- | :-- | :-- | :-- | :-- | :--- |
| CO-01 | Android, Chrome | Pass | Pass | n/a | Pass | Infinix GT20, Chrome 154, house wifi. Installed with **Add to Home screen**; Chrome showed no install prompt (same as O-01) |
| CO-02 | Android, Samsung Internet (if a tenant has it) | NT | NT | NT | NT | No Samsung phone was used on the testing day |
| CO-03 | iPhone, Safari | Pass | Pass | n/a | Pass | iPhone 15, Safari, mobile data. Added to Home Screen successfully |
| CO-04 | Windows laptop, Chrome | Pass | Pass | Pass | Pass | Chrome 154. Full functionality verified |
| CO-05 | Windows laptop, Edge | Pass | Pass | Pass | Pass | Edge (latest). Minor UI alignment ok |
| CO-06 | Any, Firefox | Pass | Pass | Pass | n/a | Windows 11, Firefox 157 |
