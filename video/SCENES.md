# The Hivelet film: every scene and where it comes from

About 100 seconds, 1920x1080, 30 fps. A synthesized score and a few soft sound effects; no
voice. Headlines are short on purpose (two to four words a line, few sentences under them). Third cut, 2026-09-29, after Sean's notes on the second: slower, calmer sound with a
trailer-style score, no dot labels, one mention of "33 units", nothing crowding the frame,
sharper graphics, no activity log, and an opening built the way Lloyd's promo opens.

**The rule:** every piece of the app on screen is one of the app's own components, rebuilt in
React from the Vue source (`src/ui/`) with the app's exact labels, sizes and colours. The
people and amounts are invented sample data; unit codes, clusters and room types are the
property's real ones. Every fact comes from the verified list in the build prompt.

**Sharpness:** 3D stages are laid out at twice their size and scaled down by the camera
(`Stage` in `src/fx.tsx`, `camera` in `src/anim.ts`), and zoomed pieces use CSS `zoom`, so
nothing is enlarged from a small raster.

**Layout:** `GRID` in `src/fx.tsx`. Text stays in the left column (x 120 to 860); the app stays
in the zone to its right, masked before it can reach the text.

| Scene | Frames | What happens | App source | Facts |
| :--- | :-- | :--- | :--- | :--- |
| Act 1 | 0-960 | Her spreadsheet typed into by hand ("33 units. Every peso. Every tenant.", "One spreadsheet."); the camera travels to each problem: the workbook going onto a removable drive, two receipts with one number, the incomplete rows, repairs in a chat, a tenant asking what they owe; all five around "Nothing connected one record to another."; each becomes a hexagon, the hive forms, and its centre grows into the icon: "One connected system." | Illustrations of the old way; the icon is `frontend/public/favicon.svg` | Chapter 4 and 5: two sheets on removable storage, 5 receipt numbers used twice, 402 of 937 rows with no anniversary date and no deposit, requests by message |
| For the landlady | 960-1020 | Chapter card | | |
| Overview | 1020-1290 | The Overview assembles; the attention tile; the month's collections count up; the whole year | `views/AdminOverviewView.vue`, `components/overview/*` | Sample figures |
| Rooms and rates | 1290-1470 | All 33 unit cards flip in; 1A steps forward | `views/RoomDirectoryView.vue` | 33 units, B3B vacant (sample) |
| Monthly Income | 1470-1830 | The ledger fills; Record payment; unit 2B; OR number typed; the second-payment warning | `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue` | The warning's wording is the modal's own |
| For the tenants | 1830-1890 | Chapter card | | |
| Tenant | 1890-2340 | Amount due; Pay with GCash; her attention tile; "Settled"; a repair typed and sent, moving across her board; "Your repair is done" | `views/TenantOverviewView.vue`, `views/TenantTicketsView.vue`, `views/MaintenanceDispatchView.vue`, notification from `backend/src/routes/admin.ts` | A GCash payment counts once she verifies it |
| For guests | 2340-2400 | Chapter card | | |
| Guests | 2400-2670 | The vacant two-bedroom; the inquiry typed and sent; it lands in her Inquiries | `views/CategoryRoomsView.vue`, `views/InquireView.vue`, `views/InquiriesView.vue` | |
| Proof | 2670-2835 | 937, 1,327, 20 | | CLAUDE.md, Chapter 4 Table 8 |
| End | 2835-3015 | Icon, name, "One connected system for the Fe Galang Da Silva Boarding House.", address, team | | Group 4, Bicol University, IT 124 Capstone Project 2 |

## Sound

`capture/score.mjs` writes `public/score.wav` to the same timeline: a drone and a quickening
heartbeat under the old way, a low hit on each problem, a tension cluster under "Nothing
connected", a riser and a moment of silence, a deep brass hit as the icon appears. Then a
hopeful groove in A (I-V-vi-IV at 96 bpm): pads swell under the icon, and on "For the
landlady" a soft kick, claps, a shaker, a bass line and plucks come in, the pads ducking with
the kick. The groove steps aside for each chapter card, lifts for the proof, and resolves on a
held chord under the end card.
`capture/sfx.mjs` writes the effects laid over it. Camera moves get a soft "air" swell whose
length matches the move (`air-short`, `air`, `air-long`); arrivals a `blip`; clicks a
`soft-click`; notifications a `bell`; the duplicate-payment warning a `soft-warn`; reveals a
`shimmer`. No sharp whooshes. Both are synthesized, so nothing needs a licence. A track at `public/music.mp3`
replaces the score.

## Rebuilding

```bash
npm install
node capture/sfx.mjs         # effects
node capture/score.mjs       # score, timed to src/timeline.json
node capture/storyboard.mjs  # contact sheets for review
npm run render               # out/hivelet.mp4
```

Change a scene's length in `src/timeline.json` and run `score.mjs` again, so the music still
lands on the cuts.
