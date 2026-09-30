# The Hivelet film: every scene and where it comes from

About 136 seconds, 1920x1080, 30 fps. A synthesized score and soft object sounds; no voice.
Headlines are short on purpose (two to four words a line, few sentences under them).

Fifth cut, 2026-09-29, after Sean's notes on the fourth: a sixth problem (inquiries arriving by
social media, text and in person), a slower sheet-to-drive beat, the problems bending into
hexagons with their icons instead of fading out, the floor plan on the public page, a sound for
the repair card moving between columns, and shorter typing at a person's uneven pace.

Sixth cut, 2026-09-30, after Sean's notes: the walk-in is now two people talking (a spoken
question leaves no record); the hive's cells close up and its outline straightens into the one
mark, instead of the icon growing out of the centre; tenants see their rent month by month; and
a guest's question is answered inside Hivelet and the guest writes back, no account needed.

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
| Act 1 | 0-1328 | Her spreadsheet typed into by hand ("33 units. Every peso. Every tenant.", "One spreadsheet."); the sheet shrinks into her workbook file and slides into a removable drive; the camera travels to each problem: two receipts with one number, the incomplete rows, repairs in a chat, a tenant asking what they owe, inquiries by social media, text and in person (a visitor walks up to the landlady and asks; she answers; nothing is written down); all six on a ring around "Nothing connected." with the links between them breaking; each bends into a flat-topped hexagon with its icon and the hive forms; the cells close up into one piece, their colours become one green, and the hive's outline straightens into the mark, whole on the brass hit: "One connected system." | Illustrations of the old way; the mark is `frontend/public/favicon.svg` (`HEX_PATH` and the roof and H in `src/ui/Kit.tsx`) | Chapter 4 and 5: two sheets on removable storage, receipt numbers used twice, 402 of 937 rows with no anniversary date and no deposit, requests by message. **Inquiries by social media, text and walk-in are from Sean (2026-09-29); the manuscript does not state them yet.** |
| For the landlady | 1328-1388 | Chapter card | | |
| Overview | 1388-1658 | The Overview assembles ("Good afternoon, Michelle"); the attention tile; the month's collections count up; the whole year | `views/AdminOverviewView.vue`, `components/overview/*` | Sample figures |
| Rooms and rates | 1658-1838 | All 33 unit cards flip in; 1A steps forward | `views/RoomDirectoryView.vue` | 33 units, B3B vacant (sample) |
| Monthly Income | 1838-2198 | The ledger fills; Record payment; unit 2B; OR number typed; the second-payment warning | `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue` | The warning's wording is the modal's own |
| For the tenants | 2198-2258 | Chapter card | | |
| Tenant | 2258-2960 | Amount due; the phone goes to Payments: "Your rent, month by month", October 2025 to September 2026, one month with nothing recorded, "Paid up to October 4, 2026", 11 of 12 paid ("Every month, in the open."); back to pay with GCash; her attention tile; "Settled"; a repair typed and sent, moving across her board column by column; "Your repair is done" | `views/TenantOverviewView.vue`, `views/TenantPaymentsView.vue`, `components/overview/PaymentMonths.vue`, `MonthCapsules.vue`, `lib/tenantPaymentMonths.ts`, `views/TenantTicketsView.vue`, `views/MaintenanceDispatchView.vue`, notification from `backend/src/routes/admin.ts` | A GCash payment counts once she verifies it. The app would also draw October 2026 as a dashed Due month from a week before; the film stops at September, the month it is set in |
| For guests | 2960-3020 | Chapter card | | |
| Guests | 3020-3730 | Vacant unit B3B with its floor plan drawn in and the unit marked; the plan lifted for a closer look; "Ask about unit B3B"; the question typed and sent; the dialog becomes "Your message about unit B3B is saved" with "Open your conversation", "Copy the link" and reference K7QM-3XRD ("Ask here." / "No account needed."); it lands in her Inquiries, she answers and presses Save reply, and it reads Answered ("She answers in Hivelet."); the visitor's page, "Your inquiry", shows Michelle's answer and they write back ("Hear back here.") | `views/CategoryRoomsView.vue` (showcase, `lib/floorPlans.ts`, the inquiry dialog), `components/public/InquiryConversationLink.vue`, `views/InquiriesView.vue`, `views/InquiryThreadView.vue`; the plan is `frontend/public/floorplans/back3rdfloor.png` | B3B is on the back apartment's 3rd floor; the landlady is `LANDLADY.name` (Michelle) in `lib/systemState.ts`; a reply moves an inquiry from Pending to Contacted (`routes/admin.ts`); the reference code is a sample |
| Proof | 3730-3895 | 937, 1,327, 20 | | CLAUDE.md, Chapter 4 Table 8 |
| End | 3895-4075 | Icon, name, "One connected system for the Fe Galang Da Silva Boarding House.", address, team | | Group 4, Bicol University, IT 124 Capstone Project 2 |

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
two-note pop (`sms` for a text), the walk-in's two footsteps on a tiled floor (`step-a`, `step-b`), the floor plan a few pencil
strokes, the repair card a low slide between columns and a rising note as it lands in each
(`status-1..3`), the hive's cells a click as each locks in (the cells closing into the mark have
no effect of their own: the brass hit in the score lands as it becomes whole), the tenant's months
a rising tone as they grow, a saved reply a sent-message pop, and an answer reaching the visitor a bell.

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
