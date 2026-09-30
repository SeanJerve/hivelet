# Part O. Offline, weak signal and installing the app, O-01 to O-12

**Owner: Sean.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** The paragraph after Table 11D, compared with Table 11A (measured 29 Sep); Reliability and Portability (§4.4.7, §4.4.10).

> **Done by:** Sean · **Date:** 30 Sep 2026 · **Device and browser:** Android ____________ / iPhone ____________ · **Network:** ____________ · **Evidence:** none kept
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: O_OFFLINE_Sean.md filled` (pull first).

**How to fill it:** Fill the **Android** and **iPhone** columns separately with **Pass**, **Fail** or **NT**; say what happened in Evidence when it differs. If only one phone type was used, mark the other column NT.

---

At least one Android phone with Chrome and one iPhone with Safari. The system is designed so that
**the app itself opens offline, public unit information is shown from the phone's memory, and
personal and financial data is never kept on the phone** (Chapter 4, §4.2.7; the delimitation in
§1.4). These cases check exactly that promise, no more.

| ID | ISO | Req | Do | Should see | Android | iPhone | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :-- | :--- |
| O-01 | PO | FR-030 | Android Chrome: menu ⋮ > **Install app** (or Add to Home screen) | Hivelet icon on the home screen | | n/a | **Android result not stated when read out: confirm Pass/Fail.** |
| O-02 | PO | FR-030 | iPhone Safari: Share > **Add to Home Screen** | Hivelet icon on the home screen | n/a | Pass | |
| O-03 | PO | FR-030 | Open it from the icon | Opens full screen, no address bar, green top bar | Pass | Pass | Read out as "success" without naming the phone; recorded for both. Confirm. |
| O-04 | RE | FR-030 | Sign in, open Overview, then switch on **airplane mode** | Banner: "No connection. You can read what is already loaded, but nothing can be saved or paid until it is back." | Pass | Pass | |
| O-05 | RE | FR-030 | Still offline: move between the tenant pages | The app still opens each page, and says it cannot load data; **never shows ₱0.00 or an empty list as if true** | Pass | Pass | |
| O-06 | RE | FR-021 | Still offline: try to send a note on a request | A message that it could not reach the server; the typed text is **kept** | Pass | Pass | |
| O-07 | RE | FR-030 | Switch airplane mode off | "Back online" notice; send the note again: it works, once | Pass | Pass | |
| O-08 | RE, SE | FR-030 | Close the app fully, airplane mode on, open it from the icon | App opens; the tenant is **not** signed out; banner shows | Pass | Pass | |
| O-09 | SE | FR-030 | Sign out, airplane mode on, open the app | No personal data visible anywhere | Pass | Pass | |
| O-10 | RE | FR-003 | Offline: open the public units page | Units shown from memory, or a notice that availability cannot be shown (never a made-up list) | Pass | Pass | |
| O-11 | RE | NFR-006 | **Weak signal**: on the laptop, DevTools > Network > **Slow 3G**; open Repairs and send a note | It gets there, slowly; the button shows "Sending…" and cannot be pressed twice | Pass | Pass | Read out as passing on both phones. The case is written for the laptop (DevTools > Slow 3G): note how it was run on the phones. |
| O-12 | RE | NFR-006 | Weak signal that stops answering (walk to a dead spot, or on the laptop DevTools > Network > throttling > **Add** a custom profile with **60000 ms** latency, select it, then send) | Within 45 seconds a message says it cannot tell whether it was saved and to **check before sending again** | Discrepancy | Pass | **Android: "a bit of discrepancy". Describe what happened** (no message? a different message? took longer than 45 s?). |

O-12 depends on the request deadline added on 29 September (`frontend/src/lib/api.ts`). If that
change is not live yet, a save on a dead connection spins until the browser gives up; record what
happens either way.

DevTools **Offline** does not reproduce O-12: it fails the request at once or lets the reply through, so it shows O-06's "could not reach the server" or a normal save, never the 45-second message. Use the 60000 ms profile.
