# INSTRUCTIONS FOR TESTING

**The step-by-step order for the whole testing day, from getting the papers ready to the last tester
leaving.** Written 30 September 2026 for Lloyd, Sean and the team. Do the batches in order; tick each
box as you go. Everything this page refers to is in this folder (`docs/TESTING_DAY/`) or in
`docs/FINAL MANUSCRIPT/`.

**Three groups test the system, and everyone watches the Hivelet video first:**

| Group | Who | What they use | Cases |
| :--- | :--- | :--- | :--- |
| Landlady | Michelle, the administrator | The admin side, on the laptop | A-01 to A-36 |
| Current tenants | 3 to 5 tenants | Their own account, on their own phone | T-01 to T-18 |
| Prospective tenants | 2 to 3 people who do not live there | The public website, on their own phone | PR-01 to PR-09 |

**The method (set by the adviser): observe, do not interview.** Let people use the system, watch,
time and write down what happens and what they say. Help only when they are stuck, using the help
ladder (Batch 2), and write down that you helped.

---

## The eight rules for the whole day

1. **The system is live.** Everything saved is real. Tests use the vacant unit **PH** and names or
   messages starting **TEST** or **REHEARSAL**.
2. **Nobody types a password for someone else**, and nobody photographs a password or a slip.
3. **Nobody completes a GCash payment.** Open it, look, close it. (It is Adyen's test account: no
   money moves, but a finished payment lands in the landlady's queue.)
4. **At most two inquiries from the same wifi in 15 minutes.** After that, use mobile data.
5. **Nobody deploys or pushes to main while testing is running.**
6. **Nobody runs `npm run check:all`, `check:api` or `check:relations` today.** They sign in as the
   landlady and fill her Activity page with test entries.
7. **Write what happened, not what should have happened.** A failure written down honestly is worth
   more to Chapter 4 than a pass from memory.
8. **Tester codes, never names**, on every sheet: PR1, PR2 ... (prospects), T1 to T5 (tenants),
   L (landlady).

---

## BATCH 0. This afternoon: get the documents and tools ready (1 to 2 hours)

### 0.1 Fix the Google Form (15 minutes; must be done before anyone answers)

Open `SURVEY_FORM_REVIEW.md` and make its six fixes in the form:

- [ ] Settings: turn **off** "Limit to 1 response".
- [ ] Delete the **Full Name** question (the form promises anonymity).
- [ ] Add the **Portability** grid (3 rows) to the landlady's section.
- [ ] Add the prospects' choice to "Which best describes you?" and **Section 5** (text to copy is in
      the review). Set "After section 4" to **Submit form**.
- [ ] Make the open comments **optional** and add "What was difficult, confusing, or missing?" to
      every group.
- [ ] Turn on **Require a response in each row** on every grid.
- [ ] Optional: the Filipino rows for tenants (copy-paste text in the review).
- [ ] **Preview** (eye icon) and walk each path: landlady, tenant, technical, prospect, and "No, I do
      not agree". Each must end at Submit after its own section.
- [ ] Responses tab: **delete any test responses**.
- [ ] Make the **QR code** of the form's link (Send > link > shorten; any QR maker) and print it or
      keep it on a phone to show.

### 0.2 Print (Chrome > Print > A4, margins Default, scale 100%)

| File | Where | How many |
| :--- | :--- | :--- |
| `CONSENT_FORM.pdf` (or `.docx` after typing the adviser's name) | `docs/FINAL MANUSCRIPT/` | One per tester, plus 3 spare |
| `TESTING_DAY_FORMS_PRINT.html`: Form 2 observation sheet | `docs/FINAL MANUSCRIPT/` | One per tester |
| The same file: Form 3 defect log, Form 4 timing sheet, Form 5 attendance | same | Two each |
| The same file: Form 6 acceptance certificate | same | One |
| `OBSERVATION_PROTOCOL_PRINT.html` (the task cards are section 4) | `docs/TESTING_DAY/` | One per facilitator and observer |
| `TESTING_DAY_TEST_CASES_PRINT.html` | `docs/FINAL MANUSCRIPT/` | One for the observer of the landlady, one for the team's own checks |
| `TENANT_QUICK_GUIDE_PRINT.html` (two per sheet, cut) | `docs/FINAL MANUSCRIPT/` | One per testing tenant |
| Tenant sign-in slips: `credentials/tenant-starting-passwords.html` | **Lloyd's laptop only** | Only the slips of the tenants who test. Never shared, never photographed |

### 0.3 Decide the people and seats

- [ ] **Facilitator** (reads the task cards, gives help by the ladder) and **observer** (times each
      task, fills Form 2): one pair per session. Two pairs let prospects run while the landlady
      tests.
- [ ] **Recorder** (optional): photos and screen recordings, file names.
- [ ] **Technical lead** (Lloyd or Sean): the laptop, the watch, clean-up.
- [ ] Which 3 to 5 tenants (different phones: at least one Android and one iPhone; include someone
      less used to apps), and which 2 to 3 prospects.
- [ ] Agree a time with Michelle for her session. **She goes first**, before the tenants.

### 0.4 Prepare the laptop

- [ ] `git pull` in the repository.
- [ ] Chrome up to date; DevTools opens with F12; a screen recorder that records sound
      (Windows: Win+Alt+R).
- [ ] The Hivelet trailer video on the laptop, played once to check sound.
- [ ] The evidence folder on the team's shared drive (not in the repository):
      `00_admin_laptop`, `01_landlady`, `02_tenant_T1` ... `06_tenant_T5`, `07_prospects`,
      `08_simultaneous`, `09_offline_install`, `10_performance`, `11_security_scans`,
      `12_survey`, `13_signed_forms`.
- [ ] Read, at least once, `README.md` and `OBSERVATION_PROTOCOL.md` in this folder (20 minutes).

---

## BATCH 1. At the house, 30 to 45 minutes before the first tester

- [ ] `npm run backup` on the laptop. Write the backup folder name in `00_admin_laptop`.
- [ ] Open https://hivelet.vercel.app/api/health in a browser: it must answer (online, connected).
- [ ] `npm run check:ledger`: must end **ALL CHECKS PASSED**. Screenshot it into `00_admin_laptop`.
- [ ] Start the read-only watch and leave it running in its own window:
      `node scripts/testing-day-watch.mjs --every=60`
      It shows accounts activated, anyone **LOCKED**, failed tries, repairs, receipts, and any GCash
      payment waiting.
- [ ] Message the group: **"Testing started. No pushes to main until I say."**
- [ ] Open https://hivelet.vercel.app/public once: the pop-up should say **"1 unit is vacant right
      now"** (only PH is vacant).
- [ ] Lay out per seat: consent forms, Form 2 sheets, task cards, pens, stopwatch (phone), the
      survey QR code.

---

## BATCH 2. Every session starts the same way (5 minutes per person)

Do this for **every** tester, in this order:

1. **Consent** (the consent form). Read it aloud in Filipino if they prefer. They tick each box
   separately (take part, screen recording, photos, face) and sign. Nothing starts without it.
2. **Attendance** (Form 5): they write their name.
3. **The video**: play the Hivelet trailer once, start to finish. Add no demonstration of your own.
   The observer writes "video shown at HH:MM" on their Form 2.
4. **Read this, the same way every time:**
   > "Ang website po ang sinusubukan namin, hindi kayo. Walang maling sagot. Pakisabi po nang malakas
   > ang tinitingnan at iniisip ninyo, kahit maliit na bagay tulad ng 'ang bagal' o 'saan ito?'.
   > Babasahin ko po ang mga gagawin. Hindi ko po maituturo kung saan pipindot, pero tutulong ako
   > kapag kayo ay na-stuck."
5. If they agreed to a screen recording, they start it on their own phone now.
6. **For each task:** the facilitator reads the card, the observer starts the stopwatch, and both stay
   quiet. Stop the watch when they finish, reach the result, or give up.

**The help ladder** (write the level and the time on Form 2):

| They are | Facilitator says | Code |
| :--- | :--- | :--- |
| Working, even slowly | Nothing | P |
| Silent and stuck about 30 seconds | "Ano po ang hinahanap ninyo?" | P |
| Still stuck about a minute later | Where, not how: "Nasa menu po" | PH |
| Still stuck, or upset | Show it, then go to the next task | F |

A task not tried is **NT**. The observer writes their **exact words** with a code: **S** slow,
**C** confusing, **N** lost, **E** error, **+** liked.

**If an error appears:** write the message word for word and the time, take a screenshot, add a line
to the defect log (Form 3), and move on. **If anyone ever sees another person's name, unit or bill:
stop the session and call the technical lead.**

**Every session ends the same way:**

1. **The survey, straight away**, before any talk about the system: show the QR code, step away, do
   not look at their phone.
2. Only then, one question: *"May gusto pa po ba kayong sabihin?"* Write the answer. No more
   questions.
3. The observer checks Form 2: every case has a code; signs it.
4. The recorder copies that person's photos and recordings into their evidence folder **now**.

---

## BATCH 3. The landlady: Michelle (60 to 90 minutes, first)

Seat: the laptop. Facilitator and observer beside her. Screen recording with her permission. Cards:
**A-01 to A-36** in `TESTING_DAY_TEST_CASES_PRINT.html`, Part A. Begin with Batch 2.

**Order inside her session:**

1. **A-01 to A-04**: she signs in with her own password (nobody else types it), reads the Overview,
   finds where to record a payment, opens the bell (it shows a **dot** when there is something new).
2. **Her real work first (the most valuable test of the day):** she records the **receipts she has
   collected since 31 August** in **Monthly Income > Record payment** (A-23 done for real). Note each
   real receipt number and unit on the sheet: they are needed at clean-up. Tenants then see balances
   that match her book.
3. **The walkthrough, A-05 to A-32**, using only unit **PH** and the name **REHEARSAL Test**:
   - A-11: PH's rate to ₱30,500 (A-32 puts it back to ₱30,000).
   - A-12: move "REHEARSAL Test" into PH. **From A-12 until A-31, PH is occupied, so the public
     pop-up says no units are vacant. Run the prospects before A-12 or after A-31** (Batch 4).
   - A-15 and A-36: sign in as the rehearsal tenant in a **private (Incognito) window**.
   - A-19: open GCash and **do not pay**.
   - A-20 raises a real bill on PH: **write down its date and amount** (Activity page, "Bill
     created"). Sean removes it later; no screen deletes a bill.
   - A-26: reply to an inquiry (**Save reply**) and close it. If a prospect has sent one (Batch 4),
     reply to theirs so they can test PR-08b.
   - A-29: download Monthly Income and Monthly Expenses and open them in Excel. **Known:** the
     Monthly Expenses months for 2025 and 2026 do not yet match her own sheet (B-86, fixed by
     migration 064, Sean's call). Write down what she says; do not try to explain it away.
   - A-30: unplug the laptop's internet and reload: the money tiles must show "—", never ₱0.00.
   - A-31: move the rehearsal tenant out. A-32: PH back to ₱30,000.
4. **A-33 to A-35**: Activity page, the verification queue, and ask "What would you use first
   tomorrow morning?" (write her words).
5. End with Batch 2's ending (the survey: she chooses "Property owner or administrator").
6. **The acceptance certificate** (Form 6): only if she is willing. An honest "not yet" is a result.

---

## BATCH 4. Prospective tenants (10 to 15 minutes each; before A-12 or after A-31)

Their own phone, at `hivelet.vercel.app`. No account. Cards **PR-01 to PR-09** in
`OBSERVATION_PROTOCOL_PRINT.html`, section 4. Begin with Batch 2.

- PR-01 to PR-07: what the place is, unit types, studio rate, what is vacant, one unit's floor and
  capacity, how water is charged, location and contact.
- **PR-08**: they send one inquiry with their own name and number and **TEST** in the message. They
  see "Your inquiry is sent", **Open your conversation**, **Copy the link** and a reference code.
- **PR-08b** (only if Michelle replies while they are there): they open their inquiry and read her
  answer, then write back.
- **PR-09**: "Was anything slow, confusing or missing?" Write their words; code it **NT**.
- Remember rule 4: two inquiries per wifi per 15 minutes, then mobile data.
- End with Batch 2's ending (survey: "Looking for a room").

---

## BATCH 5. Current tenants, one at a time (20 to 30 minutes each)

Their own phone. Cards **T-01 to T-18** (Part T). Begin with Batch 2, then before they sign in, say:
*"Ang 'Amount due' ay batay lang sa mga bayad na naitala na ng landlady."*

- **T-01, T-02**: they sign in with their slip (hand it to them; you never type it) and choose their
  own password (10+ characters, a letter and a number).
- **T-03 to T-06**: their unit and rent, what they owe, their payments, how the bill is made up.
  At T-05, let them find **Your rent, month by month** on Payments, and ask whether the months and
  amounts are right. Write the answer (this also fills **N-01**).
- **T-07 to T-11**: a repair request (a real one, or a title starting TEST), a photo, a note, the
  status.
- **T-12, T-13**: their details; the bell.
- **T-14**: open GCash and close it. **They do not pay.**
- **T-15 to T-17**: type `/admin` (sent back), sign out and press Back (nothing shows), sign in again
  with the new password.
- **T-18**: "May nakalito po ba?" Write their words.
- End with Batch 2's ending (survey: "Resident of the boarding house"). Give them the tenant quick
  guide; they keep or destroy their slip themselves.

**If a tenant is locked out** (five wrong passwords): it unlocks by itself after the time the
sign-in message shows. If they forgot the password, Michelle uses **Tenants > Edit > Reset
password** and gives them the new slip.

---

## BATCH 6. Everyone at once (20 minutes, after the tenant sessions)

All tenants still present, and Michelle on the laptop. Cards **C-01 to C-08** (Part C). Write the
start time, how many people, and the network.

1. On a countdown, every tenant refreshes their Overview together (C-01). Note the slowest.
2. Everyone checks the name and unit on their screen: **only their own** (C-02).
3. Every tenant posts a note on their repair request within the same minute while Michelle watches
   Repairs, then refreshes (C-03, C-04).
4. Michelle moves two requests to In Progress: only those two tenants are notified (C-05).
5. Two tenants double-tap Send on a note: only one copy is saved (C-06).
6. Michelle opens Monthly Income for the whole year while tenants are active (C-07, C-08).

---

## BATCH 7. Offline and installing the app (20 minutes, two tenants: one Android, one iPhone)

Cards **O-01 to O-12** (Part O). Screenshot every state.

1. Install: Android Chrome **⋮ > Install app**; iPhone Safari **Share > Add to Home Screen**. Open it
   from the icon (O-01 to O-03).
2. Airplane mode **on**: the "No connection" banner; pages still open, never ₱0.00; try sending a
   note: it fails but keeps the text (O-04 to O-06).
3. Airplane mode **off**: "Back online"; send again, it goes once (O-07).
4. O-08 to O-10: close and reopen offline; sign out offline (nothing personal shows); the public
   units page offline.
5. O-11 and O-12 on the laptop (DevTools > Network > Slow 3G; then a custom 60,000 ms profile).

---

## BATCH 8. The team's own measurements (any quiet time; no tester needed)

Save every result as a screenshot **with the date showing**, in `10_performance` or
`11_security_scans`. Step-by-step clicks for each website are in `ISO_METRICS_TOOLS_GUIDE.md`.

- [ ] **Timings, PF-01 to PF-08** (Form 4): three runs each on the laptop and a phone, middle one
      counts. First loads with the cache off (laptop: F12 > Network > Disable cache; phone: a
      private tab).
- [ ] **PageSpeed Insights** (PF-09), `https://hivelet.vercel.app/public`, Mobile and Desktop tabs.
      Also run it on `/inquire` and `/login` (our automated run could not score them on mobile).
- [ ] **Mozilla Observatory** (S-01), **securityheaders.com** (S-02), **SSL Labs** (S-03). Passive
      scans only; never an active scanner or a password tester.
- [ ] **WAVE** on `/public`, `/inquire`, `/category/studio`, `/login`, `/privacy`.
- [ ] **PWABuilder** on `https://hivelet.vercel.app`.
- [ ] **UptimeRobot**: two 5-minute monitors (`/api/health` and `/public`); leave them running.
- [ ] **Security cases S-04 to S-12**: most happen inside the sessions (T-15, T-16, T-17, A-22).
      S-04 (five wrong passwords) **only on the rehearsal tenant, never a real account**.
- [ ] **Browsers, CO-01 to CO-06**: tick every phone and browser actually used today.
- [ ] **New today, Part N and P-06/P-06b** (in `TESTING_DAY_TEST_CASES_PRINT.html`):
      - P-06 and P-06b: a team member sends one inquiry with their own details; Michelle replies;
        open it on the same phone, then on another phone at `/inquiry` with the reference code and
        the phone number. Write back once.
      - N-01: filled during T-05. N-02: on `/category/studio`, tap units quickly; the floor plan
        always shows. N-03: the pop-up's vacancy count on a real phone.

---

## BATCH 9. Before anyone leaves (15 minutes)

- [ ] Every Form 2 has a code for every case, the times, and the observer's signature. A blank
      becomes **NT**, never P.
- [ ] A signed consent form for every name on the attendance sheet.
- [ ] The survey's response count matches the number of testers.
- [ ] Every photo and recording is copied off the phones into the evidence folder.
- [ ] Form 6, if Michelle signed it.

---

## BATCH 10. Clean-up on the live system (30 minutes; the technical lead with Michelle)

Only test records are removed. Real records stay as real work.

- [ ] **Repairs**: each request titled TEST: open it, **Delete repair**.
- [ ] **Inquiries**: each with TEST in the message: open it, **Close inquiry** (it stays on record
      as Closed).
- [ ] **Monthly Income > verification queue**: any GCash payment waiting: **Reject**, and write it in
      the defect log.
- [ ] **REHEARSAL**: confirm the rehearsal tenant is moved out (never delete the profile), the
      REHEARSAL-001 receipt is deleted, and PH is back to ₱30,000.
- [ ] Write down the **A-20 bill** (date and amount) for Sean.
- [ ] `node scripts/testing-day-watch.mjs` once, and `npm run check:ledger`. The ledger must show
      **952 income rows plus the real receipts Michelle recorded today**, nothing else. Screenshot
      both into `00_admin_laptop`.
- [ ] Stop the watch (Ctrl+C). **Do not run `check:all`.**
- [ ] Message the group: **"Testing finished."** Pushes resume when Sean says.

---

## BATCH 11. This evening: type up and hand over to Claude (1 to 2 hours)

Full detail is in `AFTER_TESTING.md`, Stages 3 to 5. In short:

1. Make a folder **outside the repository**: `Desktop/hivelet/hivelet-results-2026-09-30/`.
2. Copy the templates from `scripts/survey/`, delete their example rows, and type the sheets in:

   | File | From | One row per |
   | :--- | :--- | :--- |
   | `observations.csv` | `uat-observations-template.csv` | person per task (PR, T and the landlady's cases) |
   | `walkthrough.csv` | `walkthrough-results-template.csv` | walkthrough step (A-05 to A-32) |
   | `timings.csv` | `timings-template.csv` | timing case per device |
   | `responses.csv` | Google Forms > Responses > Sheets icon > File > Download > CSV | respondent |

   Codes exactly **P, PH, F, NT**; times as `10:02` or `10:02:10`; quotes in their own words with
   the S/C/N/E/+ code; save as **CSV UTF-8**.
3. Add to the folder: photos of the defect log, Part C, Part CO, Part N, and the scan screenshots.
4. Open Claude Code in the repository and paste:
   > Testing is done. Results are in `../hivelet-results-2026-09-30/`: observations.csv,
   > walkthrough.csv, timings.csv, responses.csv, the defect log, Part C, CO and N photos, and the
   > scan screenshots. Testers: N prospects, N tenants (units ...), and Michelle. Real receipts
   > Michelle recorded today: (list). The A-20 bill: (date, amount). Anything unusual: (one or two
   > lines). Follow `docs/TESTING_DAY/AFTER_TESTING.md`, Stage 6.

Claude then fills Tables 10, 11, 11C, 11D, 12 to 22 and 23, writes the interpretations, and brings
Chapter 5 and the method text in Chapter 3 (FIXES H4) into line.

---

## One-page timeline (an example; adjust to when people are free)

| When | Batch | Who |
| :--- | :--- | :--- |
| This afternoon | 0. Form fixes, printing, seats, laptop | Whole team |
| −45 min | 1. Set-up at the house | Technical lead |
| Start | 3. The landlady (Batch 2 first) | Michelle + pair A |
| During her A-01 to A-11, or after her A-31 | 4. Prospects | Pair B |
| After the landlady | 5. Tenants, one at a time | Pairs A and B |
| After the last tenant | 6. Everyone at once, then 7. Offline and install | All |
| Any quiet time | 8. Team measurements | Team |
| End | 9. Before anyone leaves, then 10. Clean-up | Technical lead + Michelle |
| Evening | 11. Type up and hand over | Team |
