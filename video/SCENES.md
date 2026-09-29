# The Hivelet film: every scene and where it comes from

84 seconds, 1920x1080, 30 fps, sound effects only (no voice). Rebuilt on 2026-09-29 after the
first cut, screenshots in a browser frame, was judged a slide deck. The look follows the promo
Lloyd's session made that morning (dark green for the old way, a bright stage for the product,
headlines with one coloured word, a honeycomb, depth of field); the content does not, because
that one invented its own labels.

**The rule:** every piece of the app on screen is one of the app's own components, rebuilt in
React from the Vue source (`src/ui/`) with the app's exact labels, sizes and colours, so it can
move piece by piece. The people and amounts are invented sample data (the same set as
`capture/harness.html`); unit codes, clusters and room types are the property's real ones.
The facts in the story come from the verified list in the build prompt.

| # | Frames | Scene | App pieces, and their source | Facts used |
| :-- | :-- | :--- | :--- | :--- |
| 1 | 0-150 | 33 / 5 / 1 slam in; the building photo opens; the name | `frontend/public/fe-galang-building.webp` | 33 units, 5 clusters, 1 owner, Legazpi City |
| 2 | 150-400 | The old way, 1 to 4: spreadsheet and USB drive, receipt book, cash, repairs in a chat; then the links between them snap | Illustrations of the old way, not app UI | Chapter 5, 5.1: spreadsheet on removable storage, paper receipts, cash, requests by message |
| 3 | 400-580 | 937, 43%, 5 duplicate receipts | none | Chapter 5, 5.1 |
| 4 | 580-690 | A honeycomb builds and becomes the app icon; "Hivelet" | `frontend/public/favicon.svg` mark | none |
| 5 | 690-960 | The Overview assembles in 3D: attention tile, collected, occupancy gauge, collections chart, clusters | `views/AdminOverviewView.vue`, `components/overview/*` | Sample figures |
| 6 | 960-1110 | All 33 unit cards flip in; 1A steps forward | `views/RoomDirectoryView.vue` (card, "Occupied"/"Vacant") | 33 units, 32 occupied, B3B vacant (sample) |
| 7 | 1110-1440 | Monthly Income fills in; Record payment opens; unit 2B chosen; OR typed; the second-payment warning | `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue` (form and its confirmation) | The warning's wording is the modal's own |
| 8 | 1440-1830 | Tenant phone: amount due, Pay with GCash, the owner's attention tile, "Settled"; a repair typed, sent, moved across the board; "Your repair is done" | `views/TenantOverviewView.vue`, `views/TenantTicketsView.vue`, `views/MaintenanceDispatchView.vue`, notification title from `backend/src/routes/admin.ts` | GCash counts once she verifies it |
| 9 | 1830-2040 | Two-bedroom page with B3B vacant; the inquiry form typed and sent; it lands in Inquiries | `views/CategoryRoomsView.vue`, `views/InquireView.vue`, `views/InquiriesView.vue` | Category counts 20 / 8 / 4 / 1 |
| 10 | 2040-2220 | The activity trail streams in; "Can entries be changed? No"; the app icon drops | `views/AuditLogsView.vue` (tags and the tile's own words), `frontend/public/icon-512.png` | Nothing can be edited or removed |
| 11 | 2220-2370 | 937, 1,327, 33; "20 automated check suites, all passing" | none | CLAUDE.md, Chapter 4 Table 8 |
| 12 | 2370-2520 | Name, address, team | none | Group 4, Bicol University, IT 124 Capstone Project 2 |

## Sound

Every effect is synthesized by `capture/sfx.mjs` (camera swipes, mouse clicks, phone taps, pops,
pings, blings, key taps, a riser and an impact), so there is nothing to license. Drop a track
at `public/music.mp3` and render again to lay music under them.

## Rebuilding

```bash
npm install
node capture/sfx.mjs        # the sound effects
node capture/storyboard.mjs # contact sheets for review, three frames a scene
npm run render              # out/hivelet.mp4
```

`capture/capture.mjs` and `capture/harness.html` film the real pages with the sample data; the
film no longer uses those screenshots, but they are the reference the rebuilt components were
checked against. `capture/study.mjs` turns a reference video into contact sheets.
