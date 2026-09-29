# The Hivelet video: every scene and where it comes from

About 90 seconds, 1920x1080, 30 fps. Built from `VIDEO PRESENTATION DOCS/MOTION VIDEO PROMPT.md`
(on Sean's laptop; that folder is gitignored).

**The rule:** every frame is either a real screen of the app or a verified fact. The screens
are the actual Vue pages from `frontend/src`, rendered by `capture/harness.html` against
invented sample data (made-up tenants, sample amounts, the property's real 33 unit codes and
clusters) and filmed with Playwright. Nobody signs in, and nothing reaches the live API or
database: every request that is not localhost or Google Fonts is aborted, and the harness
answers the app's own API calls.

| # | Time | Shows | Source | On screen |
| :-- | :-- | :--- | :--- | :--- |
| 1 | 0:00 | The building, then 33 / 5 / 1 | `frontend/public/fe-galang-building.webp` (the site's own photo) | Fe Galang Da Silva Boarding House, Legazpi City. 33 units, 5 clusters, 1 owner |
| 2 | 0:06 | Four cards: spreadsheet, receipt book, cash, Messenger | Fact list (Chapter 5, 5.1). Icons from lucide, the set the app uses | Her records lived in four places. / None of them talked to each other. |
| 3 | 0:15 | 937, 43%, 5 | Fact list (Chapter 5, 5.1) | When her records were moved in |
| 4 | 0:22 | App icon and name | `frontend/public/icon-512.png` | One place for rooms, tenants, money and repairs. |
| 5 | 0:26 | Rooms and rates, by cluster; unit 1A lifted | `/admin/directory`, `views/RoomDirectoryView.vue` | All 33 units, in one place. / Who lives there, and what each rents for. |
| 6 | 0:33 | Ledger rows; Record payment with the OR number; the second-payment warning | `/admin/income`, `views/IncomeCollectionsView.vue`, `components/modals/OnsitePaymentModal.vue` (the confirmation's overlap warning) | Laid out like her own workbook. / Her paper receipt number stays on the record. / It flags a second payment for the same unit and month. |
| 7 | 0:45 | Overview with the year picker and the collections chart; Monthly Expenses, where it landed | `/admin/overview`, `views/AdminOverviewView.vue`; `/admin/expenses`, `views/ExpensesLedgerView.vue` | Money in and money out, for any year. / What was spent, and where it went. |
| 8 | 0:51 | Tenant on a phone: Amount due, Pay with GCash, then the repair form | `/tenant`, `views/TenantOverviewView.vue`; `/tenant/tickets`, `views/TenantTicketsView.vue` | Tenants see what they owe. / Pay by GCash if they want. She confirms it. / Report a repair from their phone. |
| 9 | 1:02 | Repairs board, then the notification bell | `/admin/tickets`, `views/MaintenanceDispatchView.vue`; `components/layout/NotificationPopover.vue` | Requests land in one list, not a chat thread. |
| 10 | 1:08 | Public two-bedroom page, the inquiry form, then Inquiries | `/category/two-bedroom`, `views/CategoryRoomsView.vue`; `/inquire`, `views/InquireView.vue`; `/admin/inquiries`, `views/InquiriesView.vue` | Guests browse rooms and send an inquiry. / She sees it, with the unit they asked about. |
| 11 | 1:14 | Activity, "Can entries be changed? No"; then the installable app icon | `/admin/audit-logs`, `views/AuditLogsView.vue`; `frontend/public/icon-512.png` (web manifest icon) | Every change is logged, and none can be edited. / Installs on a phone like an app. |
| 12 | 1:20 | 937, 1,327, 20 | Fact list (CLAUDE.md, Chapter 4 Table 8) | Built on her real records. |
| 13 | 1:26 | Name, address, team | Fact list | Hivelet, hivelet.vercel.app, Group 4, Bicol University, IT 124 Capstone Project 2 |

## Voice

Six lines only (`src/voice-lines.mjs`), generated with edge-tts, voice `en-PH-RosaNeural`.
A second set in `en-US-AvaMultilingualNeural` is in `public/voice/ava/`; set `VOICE` in
`src/timeline.ts` to switch.

## Music

None is bundled. Put a track at `public/music.mp3` and render again: it plays under the voice,
lowered while a line is spoken, and fades out at the end.

## Corrections made to the prompt's table

- **Palette.** The prompt named the blue `--primary` tokens in `index.css`. The screens use the
  green "workspace system" tokens (`--brand #17603f`, `--canvas #edf1ee`), so the video does too.
- **App icon.** It was still the first theme's blue gradient on a green app. Fixed in the app
  itself (commit `4bf952c`, `capture/render-app-icons.mjs`), so the icon in the video is the one
  a tenant installs.
- **Scene 5** reads "All 33 units, in one place." (the page's own subtitle says "All 33 units
  across 5 clusters").
- **Scene 6's voice** says every payment "is checked before it is saved", not "recorded once":
  the check warns about an earlier payment for the same period and lets her record it anyway
  when it settles a balance.
- **Scene 10** adds the owner's side ("She sees it..."), since the inquiry lands in her
  Inquiries page with the unit attached.
- **Scene 11** says entries cannot be edited, which is what the Activity page itself states.

## Rebuilding

```bash
npm install
npx playwright install chromium
python -m pip install edge-tts
npm run dev:frontend        # from the repository root, in another terminal
node capture/capture.mjs    # the screens
node capture/voice.mjs      # the voice
node capture/storyboard.mjs # a contact sheet for review
npm run render              # out/hivelet.mp4
```
