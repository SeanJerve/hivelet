# Testing Day Guide: tenants and the owner, 30 September 2026

**Written 2026-09-29 for the first test of Hivelet by its real users.** Read it tonight, all of it,
once. Tomorrow you will only need the checklists and `TESTING_DAY_TEST_CASES.md`.

**What tomorrow is, in one sentence:** three to five real tenants and the owner use the live system
for their own real tasks while the team watches, measures and writes everything down, and then
they answer the ISO/IEC 25010 survey.

**Why it matters for the manuscript.** Every pending table in Chapter 4 is filled from what
happens tomorrow, and a panel will ask how the testing was done. This guide *is* the answer:
follow it and the method section writes itself.

| What tomorrow produces | Goes into | File here that uses it |
| :--- | :--- | :--- |
| Admin walkthrough results (26 steps) | Chapter 4, §4.3.4, Table 10 | `TESTING_DAY_TEST_CASES.md`, part A |
| Tenant task results (success, time, errors) | Chapter 4, §4.3.7, Table 11C (new) | part T |
| Simultaneous use, offline, install, weak signal | Chapter 4, §4.3.7, Table 11D; compared with §4.3.6, Tables 11A and 11B | parts C, O |
| Page load times on the real laptop and phone | Chapter 4, §4.3.5, Table 11 | part PF |
| Passive security scan grades | Chapter 4, §4.4.8 | part S |
| Survey answers | Chapter 4, §4.4, Tables 12 to 22 | `docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md` |
| Owner's signed acceptance, consent forms, photos | Appendices | `TESTING_DAY_FORMS.md` |

The measurements already taken on 29 September (automated checks, offline behaviour, simultaneous
users, weak-signal behaviour) are in `PRE_TESTING_AUDIT_2026-09-29.md`. Tomorrow repeats the parts
that need a person and a real device, so the chapter can report both.

---

## 1. Read this first: five rules for the day

1. **The system is live and holds the owner's real business.** There is no practice copy.
   Everything a tenant or the owner saves is real. That is the point of the day, and also why the
   steps below say exactly what may be saved.
2. **Nobody types a password for someone else.** Each tenant types their own. The team never
   photographs, reads aloud or keeps a tenant's password. See §4.
3. **Nobody completes a GCash payment unless the plan says so.** The gateway runs on Adyen's test
   account: no real money moves, but a finished test payment lands in the owner's verification
   queue against a real bill and must be rejected. Tenants open the payment screen, see the GCash
   button, and close it.
4. **Write down what happened, not what should have happened.** A failed step recorded honestly
   is worth more to the manuscript than a pass written from memory. Chapter 4 says so in its
   rules: never fill a result from expectation.
5. **Nobody deploys during testing.** Sean's polish work must be pushed and live **before** the
   first session starts, or held until after the last. A deploy mid-session changes the system
   under the testers and makes the results unrepeatable. Write down the commit that was live
   (§3, step 4).

---

## 2. People and their seats

Seats, not names: whoever sits in the seat does its job. Five seats for five members fits well.

| Seat | Does | Needs |
| :--- | :--- | :--- |
| **Facilitator** | Greets, explains, reads the task cards aloud, never touches the tester's device, never says "click there" | Task cards (part T), a watch |
| **Observer** | Writes the observation sheet: what the tester did, where they hesitated, what they said, time per task | Observation sheets, pen, stopwatch |
| **Recorder** | Screen recordings and photos, file naming, keeps the evidence folder tidy | Phone for photos, tripod or stand if available |
| **Technical lead** | Admin laptop with the repository, `.env` and the backend, watches `/api/health`, re-issues a password if a slip is lost, handles any incident | Laptop, charger, hotspot as backup internet |
| **Survey and forms** | Consent forms before, survey link after, collects the signed acceptance at the end | Printed consent forms, survey QR code |

Suggested: the technical lead is whoever holds `.env` (Sean or Loyd). The owner's session needs
the calmest facilitator.

---

## 3. Tonight: the checklist

Tick each box and commit this file with the ticks, as `TESTING_REHEARSAL.md` asks. A ticked sheet
is evidence.

**System**

- [ ] 1. **Sean's polish is pushed and live**, or explicitly held until after testing. Agree a cutoff
      time tonight.
- [ ] 2. `git pull` on the admin laptop; `npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"`.
      Expect every row `pass` **except** `check:api`, whose ten tenant-side checks read FAIL with
      status **428** since the tenant reset (B-82). That 428 means "this tenant must change the
      password first", which is correct. Any other FAIL, or a tenant check failing with anything
      other than 428: stop and fix before tomorrow.
- [ ] 3. `curl https://hivelet.vercel.app/api/health` returns `"status":"online"` and
      `"database":{"status":"connected"...}`.
- [ ] 4. Write down the commit that is live: `git log --oneline -1`. It goes in the method section
      ("tested on build `xxxxxxx`").
- [ ] 5. `npm run backup` once tonight and **again tomorrow morning** before the first session.
      Note the folder name of the morning backup here: `backups/________________`.

**Accounts**

- [ ] 6. Open `credentials/tenant-starting-passwords.html` (on the admin laptop only), print it,
      and cut out **only the slips of the tenants who agreed to test**. Put each in a folded paper
      or envelope with the tenant's name on the outside. The rest stay in the file, unprinted, until
      those tenants are onboarded properly (§4).
- [ ] 7. Record who received which slip in `credentials/tenant-starting-passwords.csv` (columns
      `handed_over_by`, `handed_over_on`). That CSV never leaves the laptop and never goes into git.
- [ ] 8. The owner can sign in with **her** password. If only the team knows the admin password,
      decide tonight whether she changes it tomorrow at the start of her session (recommended: she
      should be the only one who knows it once she runs the business on it).

**Participants**

- [ ] 9. **Choose three to five tenants** and confirm a time with each. Aim for variety: at least
      one who pays on site in cash, one older or less used to apps, one on an iPhone and one on
      Android if possible, and different clusters (a BH room, the Back or Front Apartment).
      Write their unit codes only, not names, on the schedule you print.
- [ ] 10. Every tester brings **their own phone**, charged, with mobile data or the house wifi.

**Materials**

- [ ] 11. Print from `TESTING_DAY_FORMS.md`: consent forms (one per tester plus the owner), one
      observation sheet per tester, the defect log, the timing sheet, the attendance sheet, the
      acceptance certificate.
- [ ] 12. Build the Google Form from `ISO_25010_SURVEY_INSTRUMENT.md` (change "Resident" to
      "Tenant" in the form, nothing else). Walk all three branches in preview. Print its link as a
      QR code.
- [ ] 13. Make the evidence folder on the team's shared drive (**not in the repository**; it will
      hold tenants' faces and personal screens):
      ```
      Hivelet Testing 2026-09-30/
        00_admin_laptop/        backups taken, check:all output, live commit
        01_owner/               screen recording, photos, observation sheet scan
        02_tenant_T1/ ... 06_tenant_T5/
        07_simultaneous/        the all-at-once session
        08_offline_install/     airplane-mode and install screenshots per device
        09_performance/         DevTools screenshots, PageSpeed reports
        10_security_scans/     the four scanner grades
        11_survey/              the exported sheet
        12_signed_forms/        consent, attendance, acceptance (scans or photos)
      ```
- [ ] 14. On the admin laptop: Chrome with DevTools, the Lighthouse panel, a screen recorder that
      works (Windows: **Win+Alt+R** with Xbox Game Bar, or OBS). Test that it records audio.

---

## 4. Accounts: how tenants sign in for the first time

**What was done on 29 September.** Every tenant account was reset
(`scripts/reset-tenant-accounts.mjs`): each tenant has their own starting password, printed on a
slip, and the system **will not show the tenant anything until they choose their own password**.
Every session opened before the reset was signed out, including the ones the team used during
development. The owner's account was not touched.

**Why not one shared password with a forced change:** a shared password lets anyone who knows it
and a neighbour's phone number sign in as that neighbour first. A slip only one person holds does
not.

**The first sign-in, step by step** (this is also test case T-01):

1. The tenant opens `https://hivelet.vercel.app/login` on their own phone.
2. Types their **phone number** (or email) and the **starting password** from their slip.
3. A **"Set your password"** window opens straight away. It asks for the **starting password
   again** (the one on the slip, which they just typed), then a new one twice. The new one must be
   **at least 10 characters, with a letter and a number**, and different from the starting one;
   the window ticks each rule as they type. They cannot skip it. If they want to stop, **Sign out**
   is in the window, and it will be back at their next sign-in.
4. After saving, the page reloads once, shows "Password changed", and they are on their Overview.
   The starting password no longer works.
5. The tenant keeps or tears up the slip. The team does not take it back.

**If something goes wrong**

| Problem | What to do |
| :--- | :--- |
| Wrong password five times | The account locks for **15 minutes**, then unlocks by itself. Wait; do not keep trying. The lock message is expected (it is test case S-04) |
| "Too many failed sign-in attempts from this connection" | Thirty failures from the same wifi in 15 minutes. Everyone on the house wifi shares this counter. Switch the phone to mobile data, or wait |
| Lost slip, or forgot the new password | The technical lead runs `node scripts/reset-tenant-accounts.mjs --only 09XXXXXXXXX` on the admin laptop (phone or email). It prints a fresh slip file in `credentials/`. **The app has no "forgot password" button yet** (B-83); write it in the defect log as a finding, because it is one |
| Tenant has no phone with them | They may use a team device **only in a private/incognito window**, and sign out and close it afterwards. Note it on the observation sheet |

**For the tenants who do not test tomorrow**: their slips stay unprinted. When the owner starts
using the system with everyone, she (or the team) hands each tenant their slip in person. Nothing
else needs doing: every account is already waiting for its owner to set a password.

---

## 5. Consent and privacy (Data Privacy Act of 2012, RA 10173)

Every tester signs the consent form in `TESTING_DAY_FORMS.md` before touching the system. Read it
aloud if they prefer. The points it covers, and the team must keep:

- Taking part is voluntary; they can stop at any time without any effect on their tenancy.
- They use **their own account**, which shows only their own unit, bills, payments and requests.
- Screen recordings and photos are for the research team and the manuscript. **Anything that goes
  in the manuscript has names, phone numbers, emails and amounts blurred**, and faces only with
  their permission (a separate tick box on the form).
- The survey is anonymous.
- Evidence is kept on the team's drive, not in the public repository, and deleted after the
  defense unless the owner asks otherwise.

**The owner signs twice**: as a tester, and (at the end) the acceptance certificate. Her financial
screens are never photographed in a way that shows real tenant names or amounts that can be read,
unless blurred before use.

---

## 6. The day, session by session

Times are a suggestion for one day; adjust to when people are free. The order matters more than
the clock: **admin first, tenants second, all together third**, because the tenant sessions and the
simultaneous session need things the admin session creates.

| # | Session | Who | About | Test cases |
| :-- | :--- | :--- | :--- | :--- |
| 0 | Morning checks | Technical lead | 15 min | Backup, `/api/health`, live commit, check:all table |
| 1 | Owner session | Owner + facilitator + observer + recorder | 60-90 min | A-01 to A-35 |
| 2 | Tenant sessions, one at a time | Each tenant + facilitator + observer | 20-30 min each | T-01 to T-18 |
| 3 | Everyone at once | All tenants + owner, same room or same hour | 20 min | C-01 to C-08 |
| 4 | Offline, weak signal, install | Two tenants (one Android, one iPhone) + team | 20 min | O-01 to O-12 |
| 5 | Performance timings | Team, on the Table 2 laptop and Table 3 phone | 30 min | PF-01 to PF-10 |
| 6 | Passive security scans | Team | 20 min | S-01 to S-12 |
| 7 | Survey | Every tester, right after their own session | 5-10 min each | Google Form |
| 8 | Wrap-up and clean-up | Technical lead + owner | 30 min | §8 below |

### Session 0. Morning checks (before anyone arrives)

1. `npm run backup` and write the folder name in §3 step 5.
2. `curl https://hivelet.vercel.app/api/health`: online and connected.
3. Screenshot the `check:all` summary table into `00_admin_laptop/`.
4. Confirm nobody is deploying. Message the group: "Testing started, no pushes to main until I say."

### Session 1. The owner

She does her real work, in her own words. The facilitator reads each task card from part A of
the test cases, lets her try, and only helps after she asks twice or is stuck for two minutes
(write down when and why help was given; that is data).

**Real, not rehearsed, wherever possible.** If she has a real payment to record today, record the
real one (A-23, real) with her real receipt number. That is a better test than any rehearsal, and it is
exactly what the system is for. Anything clearly a test uses the **vacant unit `PH`** and a name
starting **REHEARSAL**, as in `TESTING_REHEARSAL.md`, and is undone at the end (§8).

Record the whole session (screen + voice) with her permission. Ask her to think aloud: "say what
you are looking for as you look for it".

### Session 2. Each tenant, one at a time

Private: one tenant, their own phone, the facilitator and the observer. 20 to 30 minutes. The
facilitator reads the task cards (part T, bilingual) one by one. The tenant does them on their own
phone. The observer times each task and writes where they hesitated.

**What a tenant's session writes for real, and why that is fine:**

- their new password (their own account);
- a repair request (T-08). Ask them to report **something real** if they have one ("the faucet
  drips"). If not, the title starts with **TEST** so the owner can close it at the end;
- a message on that request (T-10);
- their own contact details if they choose to correct them (T-12);
- opening "Pay this period" can raise a bill for their current period if none exists. That bill
  is correct and real (it is how the system raises bills, on demand: judgement log § 3.6). They
  **close the payment window without paying** (T-14).

### Session 3. Everyone at once

This is the "multiple users" test. All testers who are still around, plus the owner on her laptop,
at the same time. The facilitator counts down, and at the same moment:

- every tenant refreshes their Overview, then opens Repairs and sends a message on their request;
- the owner has **Repairs** open and watches the new messages arrive, then replies to two of them;
- everyone notes anything slow, wrong or missing.

Then the reverse: the owner changes one request's status while the tenant watches for the
notification. Part C lists exactly what to check. Write down the time it started, how many people,
and on what network (house wifi or mobile data), because Chapter 4 reports it.

### Session 4. Offline, weak signal and installing the app

Part O. Two devices at least: one Android with Chrome, one iPhone with Safari. The tenant does it
on their own phone with the team guiding. In short: install it to the home screen, open it from the
icon, switch on airplane mode, see what still works and what says "No connection", try to send a
message and read what it says, switch airplane mode off, see "Back online", send again.

### Session 5. Timings

Part PF, on **the exact laptop in Chapter 3's Table 2 and the phone in Table 3** (write the brand
and model). Three runs per screen, report the middle one. Chapter 4 accepts measured numbers only.

### Session 6. Security scans

Part S. Passive scanners only (they read the site like a browser). **Never** an active scan, a
form-filling crawler or a password guesser against the live site: those write junk into her
records and lock real accounts.

### Session 7. The survey

Right after each person's session, while it is fresh, hand them the QR code. The team does **not**
look at the phone while they answer and does not suggest scores. Tenants answer the tenant section,
the owner the owner section. Technical evaluators answer on their own time after reading the
repository (they are a separate group, see `QUESTIONS_FOR_THE_TEAM.md` Q7 and Q8).

---

## 7. How to capture the evidence

**Naming.** Every file is named `CASEID_who_device_HHMM.ext`, for example
`T-08_T3_iphone11_1014.png` or `A-10_owner_laptop_0932.mp4`. `T3` is the third tenant, never a
name. The case ID links the file to its row in the test cases, and the row to its table in
Chapter 4.

**What to capture, per case type**

| Case type | Capture |
| :--- | :--- |
| Any task | The observation sheet line: start time, end time, success (yes / with help / no), errors, what they said |
| A pass | One screenshot of the result screen |
| A fail or anything surprising | Screenshot **plus** a defect log line (form in `TESTING_DAY_FORMS.md`): what they did, what they expected, what happened, device and time. Do not try to fix it on the spot |
| Offline and install | Screenshot of each state: installed icon, the app opened from it, the "No connection" banner, the message after a failed send, "Back online" |
| Timings | Screenshot of the DevTools Network tab bottom bar (requests, DOMContentLoaded, Load) and of the PageSpeed report |
| The whole owner session | Screen recording with voice, if she agrees |

**Screen recording on phones.** Android: pull down quick settings, **Screen recorder**. iPhone:
Control Centre, the **record** button (add it in Settings > Control Centre if missing). Ask the
tenant to start and stop it themselves; it records their screen, so it is their choice.

**At the end of each session**, the recorder copies everything into that session's folder the
same hour and checks the files open. Evidence lost at night cannot be recreated.

**What the manuscript needs from the evidence**: Figures 4 to 8 (screens), photos of the testing
(with permission, faces optional), and the filled forms for the appendices. Blur names, phone
numbers, emails and money amounts before any image leaves the team's drive.

---

## 8. After the last session: clean-up and hand-over

**Clean-up (technical lead and owner together)**

- [ ] Every **TEST** repair request: the owner marks it Resolved, then deletes it (Repairs).
      Real requests stay: she handles them as real work.
- [ ] Any **REHEARSAL** record from the owner session: undo in the order of
      `TESTING_REHEARSAL.md` Phase 5 (vacate the rehearsal tenant, never delete the profile; void
      or delete `REHEARSAL-001`; set `PH` back to ₱30,000).
- [ ] If any GCash payment was completed by mistake: **Reject** it in the verification queue, and
      write it in the defect log.
- [ ] Enquiries sent as tests: reply and close.
- [ ] `npm run check:ledger`. The income row count should be 937 **plus any real receipts the
      owner recorded today**, and nothing else. Write down which receipts were real.
- [ ] `npm run check:all` and screenshot the table into `00_admin_laptop/`.
- [ ] Message the group: "Testing finished, pushes allowed."

**Hand-over to Claude (the next session)**. Put these in the chat, or in a folder and point to it:

1. The observation sheets (photos are fine) and the defect log.
2. The timing sheet with device, browser, network and date.
3. The four scanner grades with dates.
4. The exported survey sheet.
5. Which tenants took part (unit codes only), on which devices.
6. Anything the owner said out loud that stood out, especially complaints.

Claude then fills Tables 10, 11, 11C, 11D and 12 to 22, writes each interpretation from the numbers,
turns defects into fixes (or queues them for Sean), and brings Chapter 5 into line. See
`START_HERE_CHAPTERS_4_AND_5.md`.

---

## 9. If something goes wrong during a session

| What happens | Do |
| :--- | :--- |
| **A tester sees someone else's data** (another tenant's name, bill or request) | **Stop the session.** Screenshot. Do not close the page. Technical lead records the time, URL and account. This is a security defect of the highest priority; tell Sean immediately. Do not continue the tenant sessions until it is understood |
| A figure looks wrong | Do not edit it. Screenshot, defect log, carry on. The owner decides later with the team what is right |
| The site does not load | Technical lead opens `https://hivelet.vercel.app/api/health`. If it is down, pause, note the time and duration: it is a Reliability result |
| A button spins for a long time | Wait. After 25 seconds (a page) or 45 seconds (a save) the system says it could not reach the server. On a save it tells you to **check the list before trying again**, because the save may have gone through. Check before re-sending, then log it |
| A tester gets upset or confused | Stop the task, reassure them the system is being tested, not them. Note it. It is usability data |
| The owner wants to change something she sees | Write it down as a request. Nothing is changed on the day |

---

## 10. Words to use with testers

- "We are testing the system, not you. If something is hard, that is the system's fault, and it
  is exactly what we need to find."
- "Please say out loud what you are looking for."
- "I can't tell you where to click, but I'll help if you're stuck."
- Filipino: *"Ang sistema po ang sinusubukan namin, hindi kayo. Kung may mahirap, iyon po mismo ang
  kailangan naming malaman."*

---

*The method in this guide, described for Chapter 3 (§3.2.4 and §3.3), is in
`FIXES_TO_CHAPTERS_1_TO_3.md` section H. The test cases are in `TESTING_DAY_TEST_CASES.md`, the
printable forms in `TESTING_DAY_FORMS.md`, and what was already measured on 29 September in
`PRE_TESTING_AUDIT_2026-09-29.md`.*
