# The Hivelet film: every scene and where it comes from

About 118 seconds, 1920x1080, 30 fps. A synthesized score and soft object sounds; no voice.
Headlines are short on purpose (two to four words a line, few sentences under them).

Fifth cut, 2026-09-29, after Sean's notes on the fourth: a sixth problem (inquiries arriving by
social media, text and in person), a slower sheet-to-drive beat, the problems bending into
hexagons with their icons instead of fading out, the floor plan on the public page, a sound for
the repair card moving between columns, and shorter typing at a person's uneven pace.

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
| Act 1 | 0-1270 | Her spreadsheet typed into by hand ("33 units. Every peso. Every tenant.", "One spreadsheet."); the sheet shrinks into her workbook file and slides into a removable drive; the camera travels to each problem: two receipts with one number, the incomplete rows, repairs in a chat, a tenant asking what they owe, inquiries by social media, text and walk-in; all six on a ring around "Nothing connected." with the links between them breaking; each bends into a hexagon with its icon, the hive forms, and its centre grows into the icon: "One connected system." | Illustrations of the old way; the icon is `frontend/public/favicon.svg` | Chapter 4 and 5: two sheets on removable storage, receipt numbers used twice, 402 of 937 rows with no anniversary date and no deposit, requests by message. **Inquiries by social media, text and walk-in are from Sean (2026-09-29); the manuscript does not state them yet.** |
| For the landlady | 1270-1330 | Chapter card | | |
| Overview | 1330-1600 | The Overview assembles; the attention tile; the month's collections count up; the whole year | `views/AdminOverviewView.vue`, `components/overview/*` | Sample figures |
| Rooms and rates | 1600-1780 | All 33 unit cards flip in; 1A steps forward | `views/RoomDirectoryView.vue` | 33 units, B3B vacant (sample) |
| Monthly Income | 1780-2140 | The ledger fills; Record payment; unit 2B; OR number typed; the second-payment warning | `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue` | The warning's wording is the modal's own |
| For the tenants | 2140-2200 | Chapter card | | |
| Tenant | 2200-2700 | Amount due; Pay with GCash; her attention tile; "Settled"; a repair typed and sent, moving across her board column by column; "Your repair is done" | `views/TenantOverviewView.vue`, `views/TenantTicketsView.vue`, `views/MaintenanceDispatchView.vue`, notification from `backend/src/routes/admin.ts` | A GCash payment counts once she verifies it |
| For guests | 2700-2760 | Chapter card | | |
| Guests | 2760-3180 | Vacant unit B3B with its floor plan drawn in and the unit marked; the plan lifted for a closer look; "Ask about unit B3B"; the question typed and sent; it lands in her Inquiries | `views/CategoryRoomsView.vue` (showcase, `lib/floorPlans.ts`, the inquiry dialog), `views/InquiriesView.vue`; the plan is `frontend/public/floorplans/back3rdfloor.png` | B3B is on the back apartment's 3rd floor; each unit has a floor plan |
| Proof | 3180-3345 | 937, 1,327, 20 | | CLAUDE.md, Chapter 4 Table 8 |
| End | 3345-3525 | Icon, name, "One connected system for the Fe Galang Da Silva Boarding House.", address, team | | Group 4, Bicol University, IT 124 Capstone Project 2 |

## Sound

`capture/score.mjs` writes `public/score.wav` to the same timeline: a drone and a quickening
heartbeat under the old way, a low hit on each problem and on the links breaking, a tension
cluster under "Nothing connected", a rising tone and a moment of silence, a deep brass hit as the
icon appears. Then a hopeful groove in A (I-V-vi-IV at 96 bpm): pads swell under the icon, and on
"For the landlady" a soft kick, claps, a shaker, a bass line and plucks come in, the pads ducking
with the kick. The groove steps aside for each chapter card, lifts for the proof, and resolves on
a held chord under the end card. No swells or risers made of noise.

`capture/sfx.mjs` writes the object sounds. **Every sound belongs to something moving on
screen**, and `src/cues.mjs` is the one list of them: frame, sound, volume, and what it belongs
to. Camera moves are silent. Cards and tiles settling get a soft thud (`settle-*`), paper a
rustle, the circled receipt number a pen, rows and cascades small wooden ticks, messages a
two-note pop (`sms` for a text), the walk-in's note a dry tap, the floor plan a few pencil
strokes, the repair card a low slide between columns and a rising note as it lands in each
(`status-1..3`), the hive's cells a click as each locks in.

Typing is written once in `src/typing.mjs`: short text at an uneven, human pace. The same times
put each character on screen and play its key, so a key is only heard as its letter appears.

## Checking picture against sound

```bash
node capture/cuecheck.mjs          # a still at every cue, labelled, in out/cues-N.png
node capture/frames.mjs act1 0-120/20   # any frames of one scene, side by side, in out/frames.png
```

Read every cue sheet: the thing named under each still must be moving or arriving in it.

## Rebuilding

```bash
npm install
node capture/sfx.mjs         # effects
node capture/score.mjs       # score, timed to src/timeline.json
node capture/storyboard.mjs  # contact sheets for review
npm run render               # out/hivelet.mp4
```

Change a scene's length in `src/timeline.json` and run `score.mjs` again, so the music still
lands on the cuts; move a scene's events and move its cues in `src/cues.mjs` with them.

## Checking that each sound can be heard

```bash
node capture/levels.mjs    # every product-scene sound against the music under it; exits 1 if any is 4 dB off
```

The groove's energy is in the bass, so a broadband comparison says every effect is buried; it
compares above 1 kHz, where clicks, taps and ticks are heard. Targets: small object sounds a
little under the music, pointer clicks a little over, notifications clearly over. The first
measurement found the landing thuds 16 to 28 dB under the music, inaudible, which is why each
`settle-*` now has a soft contact tap in the mids.
