# The eighth cut: what must change before the film is rendered again

Written 13 November 2026, after checking the seventh cut (16 October) against the final paper and
the app as it is now. Read this and `SCENES.md` before changing anything.

## Why a new cut

1. **The proof card shows an old result.** `src/scenes/End.tsx` counts up to **4.59**, the first
   round's rating of 19 October. The paper's main result is now the second round, on the redesigned
   system.
2. **Every app screen in the film is from before the redesign.** The seventh cut rebuilt each screen
   from the Vue source of 16 October. The third iteration (from 1 November) then redesigned all of
   them. Changes to each source file since the seventh cut (`git diff e9826077 HEAD`):

   | Film scene | App source | Lines changed since 16 Oct |
   | :--- | :--- | --: |
   | Overview | `views/AdminOverviewView.vue` | 1,740 |
   | Rooms and rates | `views/RoomDirectoryView.vue` | 83 |
   | Monthly Income | `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue` | 545 and 92 |
   | Tenant | `views/TenantOverviewView.vue`, `TenantPaymentsView.vue`, `TenantTicketsView.vue`, `MaintenanceDispatchView.vue` | 610, 472, 225, 304 |
   | Guests | `views/CategoryRoomsView.vue`, `InquiriesView.vue`, `InquiryThreadView.vue` | 191, 319, 377 |
   | Every scene | `components/layout/AppSidebar.vue` | 72 |

   The film's own rule (SCENES.md) is that every piece of the app on screen is the app's own
   component with its exact labels, sizes and colours. Today it would show the panel an app that no
   longer exists.

## What to change

### 1. The proof card (`src/scenes/End.tsx`, and `SCENES.md`'s Proof row)

Keep **937** income records ("carried over from her workbook") and **82 / 83** tests passed ("98.8%,
none of them critical"). Replace 4.59 with the second round's result:

- **4.84**, rated by its users (the landlady, 10 tenants and 3 prospective tenants), and **4.90**,
  rated by three IT evaluators. Both **Very High Quality** on ISO/IEC 25010.
- If only one number fits the design, use **4.84**, "rated by its users", with "4.90 by IT
  evaluators" in the line under it. Do not show 4.59, and do not average the two.
- Source: Chapter 4, Section 4.4.3 and Table 4-17.

### 2. Rebuild every app screen from the current source

For each row of the table above: read the Vue file as it is now and rebuild `src/ui/` to match it,
the layout, labels, sizes, colours and the glass style of the redesign. Use the sample-data harness
(`frontend/_harness-figures.html?route=/admin/...`, and `_harness-figures-tenant.html` and
`_harness-figures-phone.html` for the tenant's screens) to see each screen. Never the live site and
never `_harness-tenant-real.html`, which show real tenants. Labels already known to differ:

| In the film | In the app now |
| :--- | :--- |
| A vacant unit card reads "None" (`src/ui/Admin.tsx`) | "No tenant" |
| "Your message about unit B3B is saved", with "Copy the link" (`src/ui/Public.tsx`, `src/cues.mjs`) | "Your inquiry is sent" (`CategoryRoomsView.vue`); check what the dialog shows now, link button included |
| An old inquiry's status "Nothing came of it" (`src/ui/Admin.tsx`) | "Closed" (`InquiriesView.vue`) |

Check every other string on screen the same way: the greeting, the tiles, the sidebar, the payment
form, the tenant's months, the repair board and the visitor's conversation page.

### 3. Rules that stay

- **Sample people and amounts only.** No real tenant's name or amount. "Michelle" is the landlady's
  greeting, as the app shows it.
- **Words:** the landlady, never "the owner" for her. Tenant, never Resident. Inquiry for what a
  visitor sends (nothing is booked or paid online). No email anywhere.
- **GCash:** works end to end in Adyen's test environment and takes no real money. Never call it a
  mock, a simulator or pending.
- **Facts:** 33 units. The landlady's workbook had two sheets on a USB flash drive.
- **Credits:** Group 4, Bicol University, IT 124 Capstone Project 2: Lloyd, Sean, Eljohn, Vince, Kiel.

### 4. After the changes

1. If any scene's length changes, update `src/timeline.json` and `src/cues.mjs`, then
   `npm run score` so the music still lands on each beat.
2. `node capture/cuecheck.mjs` and look at every still (`out/cues-N.png`).
3. `npm run render` (about 16 minutes): `out/hivelet.mp4`.
4. Add an "Eighth cut" paragraph to `SCENES.md` saying what changed and why.
5. Copy the new film to the defense fallback (`FINAL/DEMO_SCRIPT.md`, the day before, step 5).

## The prompt for the Fable session

```text
Read CLAUDE.md, then video/SCENES.md and video/NEXT_CUT_BRIEF.md. Make the eighth cut of the Hivelet
film exactly as the brief says: the proof card's new result, and every app screen rebuilt from the
current Vue source after the third iteration's redesign, with the app's exact labels and sample data
only. Keep the film's story, timing and style unless a screen's new layout needs more time. Check
every frame with cuecheck before rendering, render it, update SCENES.md, and commit in small pieces
with real messages. Do not touch the paper, the backend or the database.
```
