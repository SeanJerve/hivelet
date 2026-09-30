# INSTRUCTIONS FOR TESTING

**The one set of instructions for the testing day, 30 September 2026.** From getting the papers
ready to the last tester leaving, then the evening hand-over. Do the batches in order and tick each
box. **If another document tells you something different about how to run the day, this page wins.**

The other files are reference material this page points to, not instructions:

| File | What it is | Where |
| :--- | :--- | :--- |
| `TESTING_DAY_TEST_CASES.md` (print the `_PRINT.html`) | Every task card and check: A landlady, T tenants, PR prospects, P public site, N new today, C together, O offline, PF timings, S security, CO browsers | `docs/FINAL MANUSCRIPT/` |
| `TESTING_DAY_FORMS.md` (print the `_PRINT.html`) | Form 2 observation sheet, Form 3 defect log, Form 4 timing sheet, Form 5 attendance, Form 6 acceptance certificate | `docs/FINAL MANUSCRIPT/` |
| `CONSENT_FORM.pdf` / `.docx` | The consent form (Form 1), one A4 page | `docs/FINAL MANUSCRIPT/` |
| `TENANT_QUICK_GUIDE_PRINT.html` | The one-page tenant guide, two per sheet | `docs/FINAL MANUSCRIPT/` |
| `SURVEY_FORM_REVIEW.md` | The six fixes to the Google Form, with text to copy | here |
| `ISO_METRICS_TOOLS_GUIDE.md` | Click-by-click use of each measuring website | here |

**Three groups test the system, and everyone watches the Hivelet video first:**

| Group | Who | What they use | Cases |
| :--- | :--- | :--- | :--- |
| Landlady | Michelle, the administrator | The admin side, on the laptop | A-01 to A-36 |
| Current tenants | 3 to 5 tenants | Their own account, on their own phone | T-01 to T-18 |
| Prospective tenants | 2 to 3 people who do not live there | The public website, on their own phone | PR-01 to PR-09 |

Technical evaluators (IT faculty or professionals) are a fourth survey group; they answer on their
own time after reading the repository, not on the day.

**The method (set by the adviser): observe, do not interview.** People use the system while the
team watches, times and writes down what happens and what they say. Help only when they are stuck,
by the help ladder (Batch 2), and write down that you helped.

---

## The eight rules for the whole day

1. **The system is live.** Everything saved is real. Tests use the vacant unit **PH** and names or
   messages starting **TEST** or **REHEARSAL**.
2. **Nobody types a password for someone else**, and nobody photographs a password or a slip.
3. **Nobody completes a GCash payment.** Open it, look, close it. (It is Adyen's test account: no
   money moves, but a finished payment lands in the landlady's queue against a real bill.)
4. **At most two inquiries from the same wifi in 15 minutes.** After that, use mobile data.
5. **Nobody deploys or pushes to main while testing is running.**
6. **Nobody runs `npm run check:all`, `check:api` or `check:relations` today.** They sign in as the
   landlady and fill her Activity page with test entries.
7. **Write what happened, not what should have happened.** A failure written down honestly is worth
   more to Chapter 4 than a pass from memory.
8. **Tester codes, never names**, on every sheet and file: PR1, PR2 ... (prospects), T1 to T5
   (tenants), L (landlady).

---

## BATCH 0. This afternoon: get everything ready (1 to 2 hours)

### 0.1 Fix the Google Form (15 minutes; before anyone answers)

Open `SURVEY_FORM_REVIEW.md` and make its fixes in the form:

- [ ] Settings: turn **off** "Limit to 1 response" (it forces a Google sign-in).
- [ ] Delete the **Full Name** question (the form promises anonymity).
- [ ] Add the **Portability** grid (3 rows) to the landlady's section.
- [ ] Add the prospects' choice to "Which best describes you?" and **Section 5** (text in the
      review). Set "After section 4" to **Submit form**.
- [ ] Make the open comments **optional** and add "What was difficult, confusing, or missing?" to
      every group.
- [ ] Turn on **Require a response in each row** on every grid.
- [ ] Optional: the Filipino rows for tenants (text in the review).
- [ ] **Preview** (eye icon) and walk each path: landlady, tenant, technical, prospect, and "No, I do
      not agree". Each must end at Submit after its own section.
- [ ] Responses tab: **delete any test responses**.
- [ ] Make a **QR code** of the form's link and print it or keep it on a phone to show.

### 0.2 Print (Chrome > Print > A4, margins Default, scale 100%)

| What | How many |
| :--- | :--- |
| Consent form (`CONSENT_FORM.pdf`, or the `.docx` after typing the adviser's name) | One per tester, plus 3 spare |
| Forms print file: Form 2 observation sheet | One per tester |
| Forms print file: Form 3 defect log, Form 4 timing sheet, Form 5 attendance | Two each |
| Forms print file: Form 6 acceptance certificate | One |
| Test cases print file | One per facilitator, one per observer, one for the team's own checks |
| Tenant quick guide (two per sheet, cut on the dashed line) | One per testing tenant |
| Tenant sign-in slips: `credentials/tenant-starting-passwords.html` (**Lloyd's laptop only**) | Only the slips of the tenants who test |

- [ ] Put each slip in a folded paper or envelope with the tenant's name on the outside. Record who
      received which in `credentials/tenant-starting-passwords.csv` (`handed_over_by`,
      `handed_over_on`). That file never leaves the laptop. The other tenants' slips stay unprinted.

### 0.3 People and seats

| Seat | Does | Never does |
| :--- | :--- | :--- |
| **Facilitator** | Consent, the video, reads each task card aloud, gives help by the ladder | Points, touches the device, says "click there", explains the screen |
| **Observer** | Times each task and fills Form 2 | Talks to the tester during a task |
| **Recorder** (optional) | Photos and screen recordings, file names, copies them to the evidence folder | |
| **Technical lead** (Lloyd or Sean) | The laptop, the watch, a lost slip, any incident, clean-up | |

- [ ] One facilitator and one observer per session. Two pairs let the prospects run while the
      landlady tests.
- [ ] Choose **3 to 5 tenants** with variety: at least one Android and one iPhone, one less used to
      apps, one who pays in cash on site, more than one cluster. Each brings their own phone,
      charged, with data or the house wifi.
- [ ] Choose **2 to 3 prospects** (people who do not live there).
- [ ] Agree a time with Michelle. **She goes first**, before the tenants. Ask her to bring her
      receipt book.

### 0.4 The laptop

- [ ] `git pull` in the repository.
- [ ] Chrome up to date; DevTools opens with F12; a screen recorder that records sound (Windows:
      **Win+Alt+R**). Test the sound.
- [ ] The Hivelet trailer video on the laptop, played once to check sound.
- [ ] The evidence folder on the team's shared drive (**not in the repository**; it will hold faces
      and personal screens): `00_admin_laptop`, `01_landlady`, `02_tenant_T1` ... `06_tenant_T5`,
      `07_prospects`, `08_simultaneous`, `09_offline_install`, `10_performance`,
      `11_security_scans`, `12_survey`, `13_signed_forms`.

### 0.5 How to name and capture evidence (tell the recorder)

- **Name every file** `CASEID_who_device_HHMM.ext`, for example `T-08_T3_iphone11_1014.png` or
  `A-10_L_laptop_0932.mp4`. The case ID links the file to its row and the row to its table.

| Case | Capture |
| :--- | :--- |
| Any task | The Form 2 line (Batch 2) |
| A pass | One screenshot of the result |
| A fail or anything surprising | A screenshot **and** a line in the defect log (Form 3): what they did, what they expected, what happened, device, time. Do not fix it on the spot |
| Offline and install | A screenshot of each state: the icon, the app from the icon, "No connection", the failed send, "Back online" |
| Timings | The DevTools Network bottom bar, and the PageSpeed report |
| The landlady's session | A screen recording with voice, if she agrees |

- **Screen recording on phones:** Android, quick settings > **Screen recorder**; iPhone, Control
  Centre > the **record** button. The tester starts and stops it themselves.
- **Before any image leaves the team's drive**, blur names, phone numbers, emails and amounts.

---

## BATCH 1. At the house, 30 to 45 minutes before the first tester

- [ ] `npm run backup`. Write the backup folder name in `00_admin_laptop`.
- [ ] Write down the live commit: `git log --oneline -1` (the method section says "tested on build
      xxxxxxx").
- [ ] Open https://hivelet.vercel.app/api/health: it must answer online and connected.
- [ ] `npm run check:ledger`: must end **ALL CHECKS PASSED**. Screenshot it into `00_admin_laptop`.
- [ ] Start the read-only watch in its own window and leave it running:
      `node scripts/testing-day-watch.mjs --every=60`
      It shows accounts activated, anyone **LOCKED**, failed tries, repairs, receipts, and any GCash
      payment waiting.
- [ ] Message the group: **"Testing started. No pushes to main until I say."**
- [ ] Open https://hivelet.vercel.app/public: the pop-up should say **"1 unit is vacant right now"**.
- [ ] Lay out per seat: consent forms, Form 2 sheets, task cards, pens, a stopwatch, the survey QR.

---

## BATCH 2. Every session starts and ends the same way

**Start (5 minutes per person):**

1. **Consent.** Read it aloud in Filipino if they prefer. They tick each box separately (take part,
   screen recording, photos, face) and sign. Nothing starts without it.
2. **Attendance** (Form 5).
3. **The video:** the Hivelet trailer once, start to finish, and no demonstration of your own. The
   observer writes "video shown at HH:MM" on Form 2.
4. **Read this, the same way every time:**
   > "Ang website po ang sinusubukan namin, hindi kayo. Walang maling sagot. Pakisabi po nang malakas
   > ang tinitingnan at iniisip ninyo, kahit maliit na bagay tulad ng 'ang bagal' o 'saan ito?'.
   > Babasahin ko po ang mga gagawin. Hindi ko po maituturo kung saan pipindot, pero tutulong ako
   > kapag kayo ay na-stuck."
5. If they agreed, they start their own screen recording.

**During each task:** the facilitator reads the card, the observer starts the stopwatch, both stay
quiet. Stop when they finish, reach the result, or give up.

**The help ladder** (use the lowest step that gets them moving; write the level and the time):

| They are | Facilitator says | Code |
| :--- | :--- | :--- |
| Working, even slowly | Nothing | P |
| Silent and stuck about 30 seconds | "Ano po ang hinahanap ninyo?" | P |
| Still stuck about a minute later | Where, not how: "Nasa menu po" | PH |
| Still stuck, or upset | Show it, then go to the next task | F |

A task not tried is **NT**.

**What the observer writes on Form 2, per task:**

| Column | Write |
| :--- | :--- |
| Start, End | Clock time, `HH:MM:SS` if possible |
| Success | P, PH, F or NT |
| Errors | Wrong turns: a tap that went somewhere they did not mean, a wrong value corrected |
| Help given | The level and when |
| What they said / did | **Their exact words**, in their language, in quotes, with a code: **S** slow, **C** confusing, **N** lost, **E** error, **+** liked |

Write what you see, not what it means: *tapped Payments twice, said "saan ang bayad ko?"*, not
*found the menu confusing*.

**End:**

1. **The survey, straight away**, before any talk about the system. Show the QR code, step away, do
   not look at their phone or suggest scores.
2. Only then, one question: *"May gusto pa po ba kayong sabihin?"* Write the answer. No more
   questions.
3. The observer checks every case has a code, and signs Form 2.
4. The recorder copies that person's photos and recordings to the evidence folder **now**, and
   checks they open.

---

## BATCH 3. The landlady: Michelle (60 to 90 minutes, first)

The laptop; facilitator and observer beside her; screen recording with her permission. Cards
**A-01 to A-36** (test cases, Part A). Begin with Batch 2.

1. **A-01 to A-04:** she signs in with her own password (nobody else types it), reads the Overview,
   finds where to record a payment, opens the bell (a **dot** means something new).
2. **Her real work first (the most valuable test of the day):** she records the **receipts she has
   collected since 31 August** in **Monthly Income > Record payment** (A-23 done for real). Write
   down each real receipt number and unit: they are needed at clean-up.
3. **The walkthrough, A-05 to A-32**, only on unit **PH** and the name **REHEARSAL Test**:
   - **A-08, A-09 change her password.** She chooses a new one she will remember; after this only she
     knows it.
   - A-11: PH's rate to ₱30,500 (A-32 puts it back to ₱30,000).
   - A-12: move "REHEARSAL Test" into PH. **From A-12 until A-31, PH is occupied and the public
     pop-up says no unit is vacant. Run the prospects before A-12 or after A-31.**
   - A-15 and A-36: sign in as the rehearsal tenant in a **private (Incognito) window**.
   - A-19: open GCash, **do not pay**.
   - A-20 raises a real bill on PH: **write down its date and amount** (Activity page, "Bill
     created"). No screen deletes a bill; Sean removes it later.
   - A-26: reply to an inquiry (**Save reply**) and close it. If a prospect has sent one, reply to
     theirs so they can do PR-08b.
   - A-29: download Monthly Income and Monthly Expenses and open them in Excel. **Known:** the
     Monthly Expenses months for 2025 and 2026 do not yet match her own sheet (B-86, fixed by
     migration 064, Sean's call). Write down what she says; do not explain it away.
   - A-30: unplug the laptop's internet and reload: the money tiles show "—", never ₱0.00.
   - A-31: move the rehearsal tenant out (never delete the profile). A-32: PH back to ₱30,000.
4. **A-33 to A-35:** Activity page, the verification queue, and "What would you use first tomorrow
   morning?" (her words).
5. Batch 2's ending (survey choice: "Property owner or administrator").
6. **Form 6, the acceptance certificate:** only if she is willing. An honest "not yet" is a result.
7. If she wants something changed, write it down as a request. Nothing is changed on the day.

---

## BATCH 4. Prospective tenants (10 to 15 minutes each; before A-12 or after A-31)

Their own phone, at `hivelet.vercel.app`, no account. Cards **PR-01 to PR-09** (test cases, Part
PR). Begin with Batch 2.

- PR-01 to PR-07: what the place is, unit kinds, the studio rate, what is vacant, one unit's floor
  and capacity, how water is charged, location and contact.
- **PR-08:** one inquiry with their own name and number and **TEST** in the message. They see "Your
  inquiry is sent", **Open your conversation**, **Copy the link** and a reference code.
- **PR-08b** (only if Michelle replies while they are there): they open their inquiry, read her
  answer, and write back.
- **PR-09:** "Was anything slow, confusing or missing?" Their words; code **NT**.
- Rule 4: two inquiries per wifi per 15 minutes, then mobile data.
- Batch 2's ending (survey choice: "Looking for a room").

---

## BATCH 5. Current tenants, one at a time (20 to 30 minutes each)

Private: one tenant, their own phone, facilitator and observer. Cards **T-01 to T-18** (Part T).
Begin with Batch 2, then before they sign in say:
*"Ang 'Amount due' ay batay lang sa mga bayad na naitala na ng landlady."*

- **T-01, T-02:** hand them their slip (you never type it); they sign in and choose their own
  password (10+ characters, a letter and a number). A window asks for the slip password again, then
  the new one twice; it cannot be skipped.
- **T-03 to T-06:** unit and rent, what they owe, their payments, how the bill is made up. At T-05
  they find **Your rent, month by month** on Payments: ask whether the months and amounts are right
  and write the answer (this also fills **N-01**).
- **T-07 to T-11:** a repair request (something real, or a title starting TEST), a photo, a note,
  the status.
- **T-12, T-13:** their details; the bell.
- **T-14:** open GCash and close it. **They do not pay.** Opening it can raise a bill for their
  current month if none exists; that bill is correct and real.
- **T-15 to T-17:** type `/admin` (sent back), sign out and press Back (nothing shows), sign in
  again with the new password.
- **T-18:** "May nakalito po ba?" Their words.
- Batch 2's ending (survey choice: "Resident of the boarding house"). Give them the tenant quick
  guide; they keep or destroy their slip themselves.

---

## BATCH 6. Everyone at once (20 minutes, after the tenant sessions)

All tenants still present, and Michelle on the laptop. Cards **C-01 to C-08** (Part C). Write the
start time, how many people, and the network.

1. On a countdown, every tenant refreshes their Overview (C-01). Note the slowest.
2. Everyone checks the name and unit on screen: **only their own** (C-02).
3. Every tenant posts a note on their repair within the same minute while Michelle watches Repairs,
   then refreshes (C-03, C-04).
4. Michelle moves two requests to In Progress: only those two tenants are notified (C-05).
5. Two tenants double-tap Send on a note: one copy only (C-06).
6. Michelle opens Monthly Income for the whole year while tenants are active (C-07, C-08).

---

## BATCH 7. Offline and installing the app (20 minutes, one Android and one iPhone)

Cards **O-01 to O-12** (Part O). Screenshot every state.

1. Install: Android Chrome **⋮ > Install app**; iPhone Safari **Share > Add to Home Screen**. Open
   from the icon (O-01 to O-03).
2. Airplane mode **on**: "No connection"; pages still open, never ₱0.00; sending a note fails but
   keeps the text (O-04 to O-06).
3. Airplane mode **off**: "Back online"; send again, it goes once (O-07).
4. O-08 to O-10: reopen offline; sign out offline (nothing personal shows); the public units page
   offline.
5. O-11 and O-12 on the laptop (DevTools > Network > Slow 3G; then a custom 60,000 ms profile).

---

## BATCH 8. The team's own measurements (any quiet time; no tester needed)

Save every result as a screenshot **with the date showing**. Clicks for each website are in
`ISO_METRICS_TOOLS_GUIDE.md`. **Passive tools only:** never an active scanner, a form-filling
crawler or a password tester against the live site.

- [ ] **Timings, PF-01 to PF-08** (Form 4), on the laptop in Chapter 3's Table 2 and the phone in
      Table 3 (write the models). Three runs each; the middle one counts. First loads with the cache
      off (laptop: F12 > Network > Disable cache; phone: a private tab).
- [ ] **PageSpeed Insights** (PF-09) on `/public`, Mobile and Desktop. Also `/inquire` and `/login`
      (the automated run could not score them on mobile).
- [ ] **Mozilla Observatory** (S-01), **securityheaders.com** (S-02), **SSL Labs** (S-03).
- [ ] **WAVE** on `/public`, `/inquire`, `/category/studio`, `/login`, `/privacy`.
- [ ] **PWABuilder** on `https://hivelet.vercel.app`.
- [ ] **UptimeRobot:** two 5-minute monitors (`/api/health`, `/public`); leave them running.
- [ ] **S-04 to S-12:** most happen inside the sessions (T-15, T-16, T-17, A-22). S-04 (five wrong
      passwords) **only on the rehearsal tenant, never a real account**.
- [ ] **CO-01 to CO-06:** tick every phone and browser actually used today.
- [ ] **P-06, P-06b and Part N:** a team member sends one inquiry with their own details; Michelle
      replies; open it on the same phone, then on another phone at `/inquiry` with the reference
      code and phone number; write back once. N-02: on `/category/studio`, tap units quickly; the
      floor plan always shows. N-03: the pop-up's count on a real phone.

---

## If something goes wrong

| What happens | Do |
| :--- | :--- |
| **A tester sees someone else's data** (another name, bill or request) | **Stop the session.** Screenshot, do not close the page. The technical lead records time, address and account. Tell Sean at once. No more tenant sessions until it is understood |
| A figure looks wrong | Do not edit it. Screenshot, defect log, carry on |
| The site does not load | The technical lead opens `/api/health`. If it is down, pause and note the time and how long: that is a Reliability result |
| A button spins a long time | Wait. After 25 seconds (a page) or 45 (a save) it says it could not reach the server. On a save, **check the list before sending again**: it may have gone through |
| Five wrong passwords | The account locks for 15 minutes, then opens by itself. Do not keep trying |
| "Too many failed sign-in attempts from this connection" | Everyone on the house wifi shares this counter (30 in 15 minutes). Switch to mobile data, or wait |
| Lost slip or forgotten new password | Michelle: **Tenants > Edit (pencil) > Reset password**, confirm; she hands over the new one-time password. Backup: the technical lead runs `node scripts/reset-tenant-accounts.mjs --only 09XXXXXXXXX` and prints the slip it writes |
| A tenant has no phone with them | They may use a team device **only in a private window**, then sign out and close it. Note it on Form 2 |
| A tester is upset or confused | Stop the task; "the system is being tested, not you". Note it: it is usability data |

---

## BATCH 9. Before anyone leaves (15 minutes)

- [ ] Every Form 2 has a code for every case, the times, and the observer's signature. A blank
      becomes **NT**, never P.
- [ ] A signed consent form for every name on the attendance sheet.
- [ ] The survey's response count matches the number of testers; anyone missing gets the link now.
- [ ] Every photo and recording is copied off the phones.
- [ ] Form 6, if Michelle signed it.

---

## BATCH 10. Clean-up on the live system (30 minutes; the technical lead with Michelle)

Only test records are removed. Real records stay as real work.

- [ ] **Repairs:** each request titled TEST: open it, **Delete repair**.
- [ ] **Inquiries:** each with TEST in the message: open it, **Close inquiry** (it stays on record as
      Closed; there is no delete).
- [ ] **Monthly Income > verification queue:** any GCash payment waiting: **Reject**, and write it in
      the defect log.
- [ ] **REHEARSAL:** the rehearsal tenant moved out (never delete the profile), REHEARSAL-001
      deleted, PH back to ₱30,000.
- [ ] Write down the **A-20 bill** (date and amount) for Sean.
- [ ] `node scripts/testing-day-watch.mjs` once, and `npm run check:ledger`. The ledger must show
      **952 income rows plus the real receipts Michelle recorded today**, nothing else. Screenshot
      both into `00_admin_laptop`.
- [ ] Stop the watch (Ctrl+C). **Do not run `check:all`.**
- [ ] Message the group: **"Testing finished."** Pushes resume when Sean says.

---

## BATCH 11. This evening: type up and hand over to Claude (1 to 2 hours)

1. Make a folder **outside the repository**: `Desktop/hivelet/hivelet-results-2026-09-30/`.
2. Copy the templates from `scripts/survey/`, delete their example rows, and type the sheets in:

   | File | Copy of | One row per | Columns |
   | :--- | :--- | :--- | :--- |
   | `observations.csv` | `uat-observations-template.csv` | person per task (PR, T and the landlady's A cases) | tester, device, case, start, end, success, errors, help_given, said |
   | `walkthrough.csv` | `walkthrough-results-template.csv` | walkthrough step (A-05 to A-32) | step, result, actual, notes |
   | `timings.csv` | `timings-template.csv` | timing case per device | case, device, run1, run2, run3 |
   | `responses.csv` | Google Forms > Responses > green Sheets icon > File > Download > CSV | respondent | as exported; do not edit or sort |

   **Typing rules:** `success` exactly **P, PH, F** or **NT** (PR-09 is always NT); times `10:02` or
   `10:02:10`, blank if not timed; `errors` a number (blank = 0); `help_given` like `level 2 at
   10:14`; `said` in their own words with the code in front, e.g. `C "saan ang bill ko?"`; the
   walkthrough `result` exactly **Pass, Fail, Pass after fix** or **Not done**; timings with a
   decimal point; save as **CSV UTF-8** (Excel: Save As > "CSV UTF-8").
3. Add to the folder: photos of the defect log, Part C, Part CO, Part N, and the scan screenshots.
4. Open Claude Code in the repository and paste:
   > Testing is done. Results are in `../hivelet-results-2026-09-30/`: observations.csv,
   > walkthrough.csv, timings.csv, responses.csv, the defect log, Part C, CO and N photos, and the
   > scan screenshots. Testers: N prospects, N tenants (units ...), and Michelle. Real receipts
   > Michelle recorded today: (list). The A-20 bill: (date, amount). Anything unusual: (one or two
   > lines). Fill Chapters 4 and 5 from them.

---

## After the hand-over: what the results become

| Result | Goes to | Done by |
| :--- | :--- | :--- |
| Tenants' lines | Table 11C (`scripts/survey/compute-uat.mjs`) | Claude |
| Prospects' lines | A proposed Table 11E, or a paragraph in §4.3.7 (the team chooses) | Claude, team decides |
| The landlady's walkthrough | Table 10 (`scripts/survey/fill-walkthrough.mjs`) | Claude |
| Timings | Table 11 (`scripts/survey/fill-timings.mjs`) | Claude |
| Part C | Table 11D | Claude |
| The survey | Tables 12 to 22 (`scripts/survey/compute-survey.mjs`; it reads the grid form) | Claude |
| Scan screenshots | §4.4.8 and the other §4.4 sections | Claude |
| Quotes and the defect log | The interpretation paragraphs; Table 23; code fixes queued in `BLOCKED_FOR_SEAN.md` | Claude |
| The video, the help ladder, prospects as a fourth group | Chapter 3, via `FIXES_TO_CHAPTERS_1_TO_3.md` H4 (paste only what happened) | Vince |
| All of the above | Chapter 5 and the Abstract | Claude, then the team |

**Decisions for the team:** a Table 11E for prospects or text only (a table if three or more tested);
the survey's composite method if not settled (QUESTIONS_FOR_THE_TEAM Q11); which defects are fixed
before the defense and which become Chapter 5 recommendations.

**Waiting for Sean:** migration 064 (B-86, expense dates), removing the A-20 bill, and any defect from
today that needs code. Pushes, deploys and `check:all` at his word.

---

## Timeline (an example; adjust to when people are free)

| When | Batch | Who |
| :--- | :--- | :--- |
| This afternoon | 0. Form fixes, printing, seats, laptop | Whole team |
| 45 minutes before | 1. Set-up at the house | Technical lead |
| Start | 3. The landlady (Batch 2 first) | Michelle + pair A |
| During her A-01 to A-11, or after her A-31 | 4. Prospects | Pair B |
| After the landlady | 5. Tenants, one at a time | Pairs A and B |
| After the last tenant | 6. Everyone at once, then 7. Offline and install | All |
| Any quiet time | 8. Team measurements | Team |
| End | 9. Before anyone leaves, then 10. Clean-up | Technical lead + Michelle |
| Evening | 11. Type up and hand over | Team |
