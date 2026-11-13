# The Hivelet film: every scene and where it comes from

About 138 seconds, 1920x1080, rendered at 60 fps (timed in 30 fps frames, which every frame number
below uses). A synthesized score and soft object sounds; no voice.
Headlines are short on purpose (two to four words a line, few sentences under them).

Fifth cut, 2026-09-29, after Sean's notes on the fourth: a sixth problem (inquiries arriving by
social media, text and in person), a slower sheet-to-drive beat, the problems bending into
hexagons with their icons instead of fading out, the floor plan on the public page, a sound for
the repair card moving between columns, and shorter typing at a person's uneven pace.

Sixth cut, 2026-09-30, after Sean's notes: the walk-in is now two people talking (a spoken
question leaves no record); the hive's cells close up and its outline straightens into the one
mark, instead of the icon growing out of the centre; tenants see their rent month by month; and
a guest's question is answered inside Hivelet and the guest writes back, no account needed.

Seventh cut, 2026-10-16, for the defense: **rendered at 60 frames a second** (the scenes keep their
30 fps timings and are drawn twice as often, see `useFrame` in `src/anim.ts`), so every move is
smoother; **every app screen brought up to the finalized system** from the app's own code and a fresh
capture of it (the Overview's year menu and three quick actions, "Rent and water" tiles, cards with
no Occupied badge, Monthly Income's new tiles and ledger by cluster with no garbage fee or 50% Share
column, the payment form with occupants, invoice or ACK and months covered, the tenant's due card and
photo box, the repair card, the chat-style reply box, the visitor's dialog and "Boarding house" on
their page, the wordmark-only header and the bell's dot); **the proof shows the study's results**
(937 records, 82 of 83 tests, 4.59 Very High Quality; 4.53 until the survey reached ten respondents on 19 Oct); and **Lloyd** is spelled right in the credits.
The two typefaces now ship with the film (`public/fonts/`, SIL Open Font License), so it renders the
same with no connection.

Eighth cut, 2026-11-13, after the app was redesigned in November (NEXT_CUT_BRIEF.md; the paper's second iteration): Act 1 says
"invoice" where it said "receipt", as the paper and the app do; **every app
screen rebuilt from the app as it is now**, read off the running app on the sample-data harness (text,
sizes and colours measured from the page, not copied from the seventh cut), in the redesign's glass
style: the soft green wash behind everything, sections on the page with no card, glass tiles and
dialogs, tinted-glass buttons, a status as a coloured word. What that changed on screen: the Overview
opens on the whole workspace with its sidebar, then Needs your attention (payments to verify, urgent
repairs, inquiries), Rent for September with who is due this week, Occupancy as one bar, and Income
and expenses; Rooms and rates is the page by cluster, a vacant unit reading "No tenant"; Monthly
Income has Income by cluster, Records and its toolbar, and Record payment as a sheet that rises from
the bottom edge; the tenant's month chart, which the app no longer has, is the Record tab's list of
months; there is no "Settled" tile any more, so her payment reads "Waiting for verification" and then
"Verified"; the GCash dialog carries the app's own sentence that it runs in a test mode and takes no
real money; the repairs board holds the other requests and the card takes Mark resolved while in
progress; the visitor's dialog asks for no email address and reads "Your inquiry is sent" with "Copy
the code"; Inquiries answers a saved reply with "Reply saved"; and the visitor's page is the redesigned
conversation. **The proof shows the second round's result**, 4.84 from its users and 4.90 from three
IT evaluators, side by side and never averaged, keeps 937 records and 82 of 83 tests, and says the
one failure was fixed and passed when re-tested; the scene is 51 frames longer so four results can be
read. Wording follows the app and the paper: "Her records", the invoice number, "She verifies it", and
GCash "in Adyen's test environment". Nothing reads zero before it is counted: a section's figures
appear with the count, not ahead of it.

**The rule:** every piece of the app on screen is one of the app's own components, rebuilt in
React from the Vue source (`src/ui/`) with the app's exact labels, sizes and colours. The
people and amounts are invented sample data; unit codes, clusters and room types are the
property's real ones. Every fact comes from the verified list in the build prompt.

**Sharpness:** 3D stages are laid out at twice their size and scaled down by the camera
(`Stage` in `src/fx.tsx`, `camera` in `src/anim.ts`), and zoomed pieces use CSS `zoom`, so
nothing is enlarged from a small raster.

**Layout:** `GRID` in `src/fx.tsx`. Text stays in the left column (x 120 to 860); the app stays
in the zone to its right, masked before it can reach the text.

**Glass:** the tokens are `GL` in `src/theme.ts`, from `frontend/src/glass.css`. In the app a dialog
blurs what is under it with a backdrop filter; a backdrop filter cannot see the film's 3D stage, so
the scene blurs the layer underneath instead (`under` in `src/ui/Kit.tsx`). The app multiplies a
floor plan into the page; `capture/plans.mjs` writes each plan as ink on nothing, which gives the
same picture under the film's masks and cameras.

| Scene | Frames | What happens | App source | Facts |
| :--- | :-- | :--- | :--- | :--- |
| Act 1 | 0-1328 | Her spreadsheet typed into by hand ("33 units. Every peso. Every tenant.", "One spreadsheet."); the sheet shrinks into her workbook file and slides into a removable drive; the camera travels to each problem: two invoices with one number, the incomplete rows, repairs in a chat, a tenant asking what they owe, inquiries by social media, text and in person (a visitor walks up to the landlady and asks; she answers; nothing is written down); all six on a ring around "Nothing connected." with the links between them breaking; each bends into a flat-topped hexagon with its icon and the hive forms; the cells close up into one piece, their colours become one green, and the hive's outline straightens into the mark, whole on the brass hit: "One connected system." | Illustrations of the old way; the mark is `frontend/public/favicon.svg` (`HEX_PATH` and the roof and H in `src/ui/Kit.tsx`) | Chapter 4 and 5: two sheets on removable storage, five invoice numbers each used twice, 402 of 937 rows with no anniversary date and no deposit, requests by message. **Inquiries by social media, text and walk-in are from Sean (2026-09-29); the manuscript does not state them yet.** |
| For the landlady | 1328-1388 | Chapter card | | |
| Overview | 1388-1658 | Her whole workspace assembles: the sidebar (the seven pages, what is new on Repairs and Inquiries, Recently), "Good afternoon, Michelle", the year menu, Move someone in/out, Record expense, Record payment; close on Needs your attention (a payment to verify, an urgent repair; an inquiry beside them); Rent for September counts up and the three tenants due this week arrive; Income and expenses, the year by month | `views/AdminOverviewView.vue`, `components/overview/*`, `components/layout/AppSidebar.vue`, `components/overview/RecentActions.vue` | Sample figures; the Recently sentences are the ones `backend/src/services/recentActions.ts` writes |
| Rooms and rates | 1658-1838 | One move up the whole page, from Linda Units past the vacant B3B ("Vacant", "No tenant") to the Boarding House, all 33 units standing up cluster by cluster; 1A steps forward under the pointer's highlight | `views/RoomDirectoryView.vue` | 33 units in five clusters, B3B vacant (sample tenants and rates) |
| Monthly Income | 1838-2198 | Rent for September and Income by cluster; Records, its toolbar and the Boarding House's records filling in, newest first; Record payment, a sheet rising from the bottom; unit 2B; occupants set the water; the invoice number typed ("Saved as INV#5120"); the second-payment warning, "Record it anyway" | `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue`, `components/ui/PillSelect.vue` | The warning's wording is the dialog's own |
| For the tenants | 2198-2258 | Chapter card | | |
| Tenant | 2258-2960 | Amount due; the phone goes to Payments, Record: one row a month, October now due and not recorded yet, January to September each verified ("Every month, in the open."); back to pay with GCash: the dialog opens the payment page, confirms, "Payment sent"; the Amount due tile makes way and the payment waits for verification; it arrives in her Needs your attention and she opens Payments to verify; the phone's row turns to Verified; a repair typed and sent, moving across her board column by column; "Your repair is done" | `views/TenantOverviewView.vue`, `views/TenantPaymentsView.vue`, `components/modals/AdyenPaymentModal.vue`, `views/TenantTicketsView.vue`, `views/MaintenanceDispatchView.vue`, notification from `backend/src/routes/admin.ts` | A GCash payment counts once she verifies it. GCash works end to end in Adyen's test environment and takes no real money: the dialog says so in the app's own words, and the headline says "In Adyen's test environment" |
| For guests | 2960-3020 | Chapter card | | |
| Guests | 3020-3730 | Vacant unit B3B with its floor plan drawn in and the unit marked; the plan lifted for a closer look; "Ask about unit B3B"; a name, a phone number and the question, sent; the dialog becomes "Your inquiry is sent" with "Open your conversation", "Copy the code" and reference K7QM-3XRD ("Ask here." / "No account needed."); it lands in her Inquiries, she answers, "Reply saved", and it reads Answered ("She answers in Hivelet."); the visitor's page, "Your inquiry", shows the boarding house's answer and they write back ("Hear back here.") | `views/CategoryRoomsView.vue` (showcase, `lib/floorPlans.ts`, the inquiry dialog), `views/InquiriesView.vue`, `views/InquiryThreadView.vue`, `components/ui/ToastContainer.vue`; the plan is `frontend/public/floorplans/back3rdfloor.webp` | B3B is on the back apartment's 3rd floor; no email address is asked for; a reply moves an inquiry from Pending to Contacted (`routes/admin.ts`); the reference code is a sample |
| Proof | 3730-3946 | 937 income records; 82 of 83 tests passed (98.8%, none critical, the one failure fixed and passed when re-tested); 4.84 rated by its users (the landlady, 10 tenants and 3 prospective tenants) and 4.90 rated by three IT evaluators, both Very High Quality on ISO/IEC 25010 | | Chapter 4: Table 11E and Table 23A for the tests, Section 4.4.3 and Table 4-17 for the ratings |
| End | 3946-4126 | Icon, name, "One connected system for the Fe Galang Da Silva Boarding House.", address, team: Lloyd, Sean, Eljohn, Vince, Kiel | | Group 4, Bicol University, IT 124 Capstone Project 2 |

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
a rising tone as they arrive, a saved reply a sent-message pop, and an answer reaching the visitor a bell.

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
node capture/plans.mjs       # the two floor plans, as ink on nothing (public/floorplans/)
node capture/sfx.mjs         # effects
node capture/score.mjs       # score, timed to src/timeline.json
node capture/storyboard.mjs  # contact sheets for review
npm run render               # out/hivelet.mp4, 60 fps, about 16 minutes on four cores
```

The building photo and the app icon are copied from `frontend/public/` by `capture/capture.mjs` (or
by hand into `public/`); the floor plans are written by `capture/plans.mjs`.

`capture/harness.html` mounts the real app on invented sample data, for looking at a screen before
rebuilding it: copy it to `frontend/_harness-video.html`, run the frontend, and open
`/_harness-video.html?role=admin&route=/admin/overview` (roles `admin`, `tenant`, `public`). It
answers every call itself and nothing is written anywhere. `inquiry=0..3`, `repair=0..3` and `paid=1`
in the address set how far the film's story has got. On a machine that cannot download Remotion's own
browser (a sandbox, a proxy), name one: `REMOTION_BROWSER_EXECUTABLE` for the stills scripts, and
`--browser-executable=` on `npm run render`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for the contact sheets
and `capture.mjs`. Neither is needed on a normal laptop.

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
