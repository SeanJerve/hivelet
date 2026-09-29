# Hivelet motion video: the build prompt

Written 2026-09-29 from Sean's answers: text on screen carries it with a few AI-voiced lines,
real screens with sample names, 60 to 90 seconds, for the panel and the public at once.

Paste everything below the line into a fresh Claude Code session opened in the Hivelet repository.

---

Read CLAUDE.md first. Then build a 60 to 90 second motion-graphics video that presents Hivelet:
the client's problem, its context, and how each feature answers it. Output 1920x1080, 30 fps,
H.264 MP4. It will be shown to our capstone panel and to people who have never heard of the
project, so use plain words, no technical terms on screen, and one short proof moment with real
numbers.

## The one rule: nothing invented

Every frame is one of two things:

1. **A real screen of the app**, rendered from the actual Vue components in frontend/src with
   sample data, or
2. **A real fact** from the list below.

No hand-drawn mock-up UI, no fake charts, no feature the app does not have, and no filler
(particles, abstract shapes, stock footage, placeholder text). Motion is allowed only when it points
at something: a zoom into the part being described, a highlight ring, a cursor or a tap. For every
scene, write in video/SCENES.md which route and which .vue file it shows. A scene that cannot name
its source is cut.

## Facts you may use (verified)

- Fe Galang Da Silva Boarding House, Legazpi City, near Bicol University. 33 units in 5 clusters,
  run by one owner, Mrs. Fe Galang Da Silva.
- Before Hivelet: a spreadsheet workbook on a USB drive, a handwritten receipt book, rent collected
  in cash at the door, and repair requests by Messenger or in person. Nothing checked one against
  another.
- Moving her records in showed what that cost: of 937 income records, 43% had no anniversary date
  or deposit on file, and 5 receipt numbers had each been used for two payments.
- Hivelet holds her real records: 937 income records and 1,327 expense records across 33 units.
- 20 automated check suites run against the live system, all passing.
- Cash stays her main way of being paid. GCash through Adyen is optional, and a GCash payment
  counts only after she confirms it.
- Group 4, Bicol University, IT 124 Capstone Project 2. Team: Loyd, Sean, Eljohn, Vince, Kiel.
  Live at hivelet.vercel.app.

Never say or show: "mock", "simulator" or "pending" about the payment gateway; that real money
moves through GCash (it runs on Adyen's test account); "32 units" as the total; any "2% annual
increase"; the word "Resident" (it is Tenant); anything about the 50% Share column. No em dashes
in on-screen text.

## Story (about 85 to 90 seconds; cut to fit, never pad)

| # | Time | Shows | On-screen text, one line at a time | Voice |
| :-- | :-- | :--- | :--- | :--- |
| 1 | 0-6 | Photo of the building, then the public home page (/public) in a laptop frame | Fe Galang Da Silva Boarding House, Legazpi City. / 33 units. 5 clusters. One owner. | "One owner runs thirty-three units near Bicol University." |
| 2 | 6-16 | Four plain icons appear in turn: spreadsheet on a USB drive, receipt book, cash, chat bubble | Her records lived in four places. / None of them talked to each other. | "Her records lived in a spreadsheet, a receipt book and a chat thread." |
| 3 | 16-24 | Numbers count up | 937 income records. / 43% had no anniversary date or deposit. / 5 receipt numbers were used twice. | none |
| 4 | 24-28 | Hivelet logo | One place for rooms, tenants, money and repairs. | "Hivelet puts it all in one place." |
| 5 | 28-35 | Rooms and rates (/admin/directory), grouped by cluster | All 33 units. / Who lives there, and what each rents for. | none |
| 6 | 35-46 | Monthly Income (/admin/income), then the Record payment dialog | Laid out like her own workbook. / Her paper receipt number stays on the record. / It flags a second payment for the same unit and month. | "Cash still comes first, and every payment is recorded once." |
| 7 | 46-52 | Overview (/admin/overview), then Monthly Expenses (/admin/expenses) | Money in and money out, for any year. | none |
| 8 | 52-64 | Phone frame: tenant Overview (/tenant) with the amount due and Pay with GCash, then the repair request on Repairs (/tenant/tickets) | Tenants see what they owe. / Pay by GCash if they want. She confirms it. / Report a repair from their phone. | "Tenants see their own bill, and report repairs from their phone." |
| 9 | 64-70 | Repairs board (/admin/tickets) and the notification bell | Requests land in one list, not a chat thread. | none |
| 10 | 70-76 | Public rooms page (/category/...), the inquiry form (/inquire), then Inquiries (/admin/inquiries) | Guests browse rooms and send an inquiry. | none |
| 11 | 76-81 | Activity (/admin/audit-logs), then the app icon from the web manifest | Every change is logged. / Installs on a phone like an app. | none |
| 12 | 81-86 | Numbers | Her real records: 937 income, 1,327 expenses. / Checked by 20 automated suites. | "Her real records, checked every time the system changes." |
| 13 | 86-90 | Logo, address, team | Hivelet. hivelet.vercel.app / Group 4, Bicol University, IT 124 Capstone Project 2 / Loyd, Sean, Eljohn, Vince, Kiel | none |

Before building, read each .vue file named above and correct any row that does not match what the
screen really shows: a label, a button name, a status pill. **The screen wins over this table.**
Report every correction you make.

## The look: a product film, not an AI video

Present it the way Apple, Linear, Stripe and Vercel present a product: the real interface is the
hero, one message per frame, large confident type, lots of empty space, and slow, precise camera
moves. It should look like a company made it on purpose, and like Hivelet, not like a template.

**Use only Hivelet's own theme**, the "workspace system" tokens in frontend/src/index.css (the
older blue --primary tokens in the same file are not what the screens show; checked on the
rendered pages 2026-09-29):

| | |
| :--- | :--- |
| Canvas | #edf1ee, tiles #ffffff, lines #e2e8e3 |
| Text | #101713, soft #45524a |
| Brand green | #17603f (strong #0e4a30, soft #e2f0e7, bright #3f9a6b) |
| Dark surface | #0f1b15, text on it #eef5f0 |
| Attention | #8a5300 on #fcefd6 (to verify), #b3261e (overdue), one per scene at most |
| Headings | Sora |
| Body and captions | Plus Jakarta Sans |
| Numbers | Sora, with tabular figures |

**Real imagery of the place:** frontend/public/fe-galang-building.webp and fe-galang-gate.webp
open scene 1. The logo and app icon come from frontend/public (favicon.svg, icon-512.png).

**Never, anywhere:** emojis; gradient blobs, glows, lens flares or neon; glassmorphism cards;
floating tilted 3D mock-ups; sparkles or confetti; typewriter text; "AI" robot or brain imagery;
stock photos or stock icons in a different style from the app; colors outside the table above;
fonts other than Sora and Plus Jakarta Sans; generic headline phrases ("Revolutionizing...",
"Seamless", "Next-gen", "Unlock"). If a frame would fit any other product's video, it is wrong.

**Consistency:** one 12-column grid and one caption position for the whole video; one easing curve
for everything that arrives (cubic-bezier(0.23, 1, 0.32, 1)), one for every camera move
(cubic-bezier(0.65, 0, 0.35, 1)), and one transition style; device frames flat and minimal (thin
#e7e5e4 border, soft single shadow), always the same frame for the same device; cuts land on the
start of a caption.

## How to build it

1. **Project.** A Remotion project (React rendered to MP4) in a new video/ folder at the
   repository root, with its own package.json. Add nothing to frontend/ or backend/. Add
   video/node_modules and video/out to .gitignore.
2. **Real screens, sample data.** Run the frontend dev server locally and drive it with
   Playwright. Intercept every request with page.route: answer the app's API calls with fixture
   JSON written in video/capture/fixtures/, stub the Supabase session the way the app's auth store
   expects so the route guards let the page render, and abort every request that is not localhost
   (fonts excepted). Read the response shapes from backend/src/routes and docs/SCREEN_CONTRACT.md
   so the fixtures match what the screens expect.
   - Never sign in, never type a password, never call the live API or the live database, and
     never submit anything to the live site.
   - Sample data: invented names, never one copied from the database or the INCOME AND EXPENSES
     PAST RECORDS folder. Use the real unit codes and clusters and plausible amounts. 33 units, 32
     occupied.
   - Capture desktop at 1440x900 with deviceScaleFactor 2 so zooms stay sharp, and phone at
     390x844 with deviceScaleFactor 3. For interactions (opening Record payment, its warning, the
     repair form, the bell), capture each step as a still and animate between them. Use
     Playwright's video recording only where a sequence of stills looks wrong.
3. **Motion.** Follow "The look" above. Scene 2's icons come from the icon set the app already
   uses (see frontend/package.json), drawn in the brand blue. Motion is a smooth zoom and
   pan into the part being described, a highlight ring on whatever the caption names, and short
   cross-fades or slides between scenes. No bounce, spin or glitch effects. One idea per scene, one
   caption at a time, about 8 words at most, each held long enough to read twice (2 seconds
   minimum). Captions sit in the same safe area every time and never cover what they describe.
4. **Voice.** Text carries the video. The voice says only the six lines in the table. Generate them
   with edge-tts (Microsoft neural voices, free, no key needed): try en-PH-RosaNeural first and
   en-US-JennyNeural if it sounds off. Time each voiced scene to its audio. Leave a music slot at
   video/public/music.mp3, lowered under the voice. The video must render and make sense with no
   music file.
5. **Render.** video/out/hivelet.mp4, plus video/out/storyboard.png: a contact sheet with one frame
   from the middle of each scene.

## Review once, then stop

Check every scene on the storyboard against this list, fix everything it shows in one batch,
render once more, and stop:

- Does it show a real screen or a real fact, and does SCENES.md name its source?
- Does the caption say something the screen on it proves?
- Can every word be read on a phone screen? Is there any real name anywhere?
- Does anything break "The look": an emoji, a color or font outside the theme, a glow, a
  template-looking frame?
- Is any second there only to fill time? Cut it.
- Is the total between 60 and 90 seconds?

Commit video/ (source, fixtures, SCENES.md; not node_modules or out) and push. Report the final
length, the scene list with sources, every correction made to the table, and anything that could
not be rendered.
