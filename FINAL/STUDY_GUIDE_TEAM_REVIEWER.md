# Study guide: the team reviewer

**The whole capstone in one sitting**, for every member of the team, whatever part you worked on. Read
it top to bottom once (about 40 minutes), then use Section 4 (the numbers) and Section 9 (the
self-quiz) the night before. Everything here is taken from the final chapters in this folder and the
user manual (Appendix K), checked against the system as it stood on 10 November 2026 and against the
paper as committed on 12 November 2026. If a chapter changes, the chapter wins.

| Read next | For |
| :--- | :--- |
| `STUDY_GUIDE_DEFENSE_QA.md` | The panel's likely questions, each with an answer and the section that proves it |
| `STUDY_GUIDE_CODE.md` | Where each feature is in the code, and how to debug it |
| `STUDY_GUIDE_REFERENCES.md` | Every source: what it found and where the paper uses it |
| `DEMO_SCRIPT.md` | The live demonstration, minute by minute, with the safe test data |
| `appendices/APPENDIX_K_USER_MANUAL.md` | Every screen, as the landlady and the tenants use it |

---

## 1. The capstone in 90 seconds

Learn this well enough to say it in your own words. Anyone on the team should be able to open the
defense with it.

> The Fe Galang Da Silva Boarding House in Legazpi City has **33 units**. Its landlady kept her income
> and expenses in a workbook on a **USB flash drive**, wrote invoices in a paper book, collected rent in
> **cash**, and received repair requests and inquiries by message or in person, with no record.
> When we moved her records into a database, **937 income rows and 1,327 expense allocations**, they
> showed the real problem: **43% of the income rows** had no anniversary date and no deposit, and
> **five invoice numbers** had each been used twice. The records were not missing; they were
> **not connected**.
>
> **Hivelet** connects them. It is a web application that installs on a phone like an app, a
> **Progressive Web App**. The landlady records payments in her own ledger layout; tenants see their
> rent, can try the optional **GCash through Adyen** (it runs in Adyen's test environment and takes no
> real money), and report repairs; and visitors ask about a
> vacant unit without an account, which the landlady answers, can mark Reserved and moves the person
> in from. Nothing is booked or paid for online. We built it in **three Agile iterations** with Vue, Express and
> PostgreSQL, and it runs on her real records.
>
> We tested it at three levels: **82 of 83 tests passed (98.8%)**, with no critical defect, and three
> tenants completed **all 34 task attempts, 31 without help**. On **ISO/IEC 25010**, fourteen users of the
> redesigned system (the landlady, 10 tenants, 3 prospects) rated it **4.84 out of 5**, and five
> technical evaluators **4.90**, both **Very High Quality**. All four objectives were met.

---

## 2. The story in five beats (and the slides that carry it)

| Beat | What to say | Slides | Paper |
| :--- | :--- | :--- | :--- |
| **1. The problem** | Four areas, four separate records; the landlady's own data proved it | 2, 3 | 1.1, 4.1 |
| **2. The aim** | One general and four specific objectives | 4 | 1.2 |
| **3. The gap** | Related systems solve one function, or suit big properties | 5, 6 | 2.1.6, 2.2, 2.3 |
| **4. The build** | Agile in three iterations; the stack; six features; security | 7 to 12 | 3.2, 4.2 |
| **5. The proof** | 82 of 83 tests; real users; 4.84 and 4.90; measured and rated agree on six of eight; conclusions; recommendations | 13 to 19 | 4.3, 4.4, 5 |

The slide deck is `HIVELET DEFENSE SLIDES.pptx` (20 slides). **Slide 1 still has square brackets** for
the team members, the adviser and the defense date: fill them in.

---

## 3. The four objectives, and how each was met

| # | Objective (Section 1.2) | How it was met (Chapter 5, Section 5.2) |
| :--- | :--- | :--- |
| 1 | Analyze the existing practices; set the requirements | Every gap traced to a requirement and a module (Table 4-2); 44 functional requirements, 49 business rules, 10 non-functional requirements |
| 2 | Develop six features: tenant and room management, booking and reservation management (the public unit list, inquiries, Reserved units and moving in, with nothing booked or paid online), financial tracking with optional online payment, maintenance ticketing and notification, role-based access, PWA | All six built and in use on her real records, in her own layout (Sections 4.2.2 to 4.2.7) |
| 3 | Pilot test it for functionality, responsiveness and operational performance | 82 of 83 tests passed (98.8%), above the course's 90%, no critical defect (Table 4-12) |
| 4 | Evaluate and optimize it on ISO/IEC 25010 | Very High Quality: users 4.84, technical evaluators 4.90; 51 changes made in response (Tables 4-17 and 4-19) |

---

## 4. The numbers to know cold

Say a number only if it is on this page or in a chapter. If you forget one, say where it is.

**The property**

| Figure | Value |
| :--- | :--- |
| Units | **33**, in five clusters: Boarding House 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2 |
| Occupied | **32 of 33** (the live site may say 33 during the demo: the test account is on PH) |
| Floors | Three residential floors (12, 11 and 9 units) and the rooftop penthouse (1) |
| Address | 32 Sampaguita Street, Barangay 4 Sagpon, Old Albay District, Legazpi City |

**Her records**

| Figure | Value |
| :--- | :--- |
| Transferred from her workbook | **937** income rows, **1,327** expense allocations |
| Income rows with no anniversary date and no deposit | **402 of 937 (43%)** |
| Invoice numbers used twice | **5** (kept as she wrote them; reported on every run) |

**The requirements and the build**

| Figure | Value |
| :--- | :--- |
| Requirements | **44** functional, **49** business rules, **10** non-functional |
| As worded / in part / not as worded | 33 / 9 / 2 against the final system, 13 Nov (25 / 15 / 1 interface only / 3 in September). App. M, Table M-32 |
| Iterations | **3**, after a first build (24 Jul to 28 Aug): 12 to 14 Sep (22 errors corrected); 15 Sep to 31 Oct; from 1 Nov (interface redesign) |
| Database | **21** tables and 37 foreign keys in the ERD; **24** tables and 238 columns in Appendix N (three are backups from corrections) |
| Routes checked against the permission matrix | **60** (administrator and tenant, 10 Nov); **71** request handlers reviewed for security (2 Oct) |
| App size when installed | about **1.2 MB** |
| Water | **₱200** per occupant per month |

**Testing (Chapter 4, Section 4.3)**

| Figure | Value |
| :--- | :--- |
| Tests executed / passed | **83 / 82 (98.8%)**; course standard 90%; no critical defect |
| Rerun after the redesign (4 Nov) | Of the **114** test cases, **77** were run and passed (21 with wording the redesign changed), **37** need a person and were left for one, **none** failed. Never say "all 114 were rerun" |
| Automated suites | **20 of 20** passed on 29 Sep (a 21st added 12 Oct) |
| Endpoint checks / report reconciliation / gateway / relations | 78 of 78 / 490 of 490 / 73 of 73 / 30 of 30 |
| Screen-versus-database audit | **6** defects found that every suite had missed, all fixed 26 Sep |
| Landlady's walkthrough | 26 steps (30 rows): 24 passed first time, 1 failed (₱0 instead of "—"; fixed, passed 13 Oct), 5 not performed as written |
| Tenant tasks | **34 of 34** completed, **31 without help (91%)**, median **60 s**, 0.2 wrong turns |
| Slowest screen | **3.05 s**, the tenant portal's first load on an iPhone over mobile data |
| Load test (simulated users) | 12 on the public pages, 6 on the landlady's records: **0 of 1,085 and 285** requests failed |
| Offline | Opened on **10 of 10** addresses without a connection, in about 1.5 s |
| Timeouts | A page gives up after **25 s**, a save after **45 s** |
| Defects | **35** found, **32** resolved, **3** accepted (low risk), **0** critical |
| Security scans | **A+** from Qualys SSL Labs, Mozilla HTTP Observatory and securityheaders.com |
| Lockout | **5** wrong passwords lock an account for **15 minutes** |

**The evaluation (Section 4.4)**

| Figure | Value |
| :--- | :--- |
| Respondents | **17** on the redesigned system: the landlady, 10 tenants and 3 prospective tenants (31 Oct to 10 Nov), and 3 technical evaluators (12 Nov). Table 4-14. First round: 10, with 5 technical evaluators (4 of them on the demo copy). App. M, M-28 |
| Overall | Users **4.84**, technical evaluators **4.90**, both **Very High Quality** (users 4.80 if every answer is averaged together). Table 4-17 |
| Why two columns | The groups answer different questions, and only the evaluators rated Maintainability |
| Before the redesign | Five users (landlady, 3 tenants, 1 prospect) gave **4.75** (Appendix M, Tables M-28 and M-29) |
| Second-round tasks | 10 tenants did 151 of 160 without help (94%), 4 prospects 31 of 32 (97%), none failed. No times this round (Table M-30) |
| Lowest | Users: Reliability **4.78**. Evaluators: Maintainability **4.73**. Before the redesign: users 4.75, evaluators 4.34 |
| If asked when the evaluators reviewed | In October, before the redesign. Say so plainly; the redesign added no module, their 14 comments were all acted on, and 77 rerun test cases passed. Never say they rated the redesign |
| Sub-characteristics | **31**: 27 measured, 25 rated, 2 neither (UI aesthetics, reusability) |
| Changes made in response | **51**; the evaluators' **14** comments, all addressed |
| Scale | 4.21 to 5.00 Very High; 3.41 to 4.20 High; 2.61 to 3.40 Moderate; 1.81 to 2.60 Low; 1.00 to 1.80 Very Low |

**The eight characteristics, one line each** (the two means, then the evidence beside them)

| Characteristic | Users | Evaluators | Measured evidence |
| :--- | --: | --: | :--- |
| Functional Suitability | 4.80 | 4.93 | All six features present; 96 to 100% of correctness checks passed |
| Performance Efficiency | 4.86 | 4.89 | No request failed under load; every screen usable within 3.05 s on a phone |
| Compatibility | 4.79 | 5.00 | 5 of 5 device and browser combinations; gateway and spreadsheet exchange correct |
| Usability | 4.80 | 4.87 | 91% of tasks without help; 0 accessibility violations in 76 scans |
| Reliability | 4.78 | 4.83 | No critical defect; both offline defects passed on re-test, 13 Oct |
| Security | 5.00 (landlady) | 4.93 | Every protection tried held; A+ from three outside scanners |
| Maintainability | not rated | 4.73 | 20 of 20 suites pass without writing; every change a migration; but 154 of 204 database calls inside handlers |
| Portability | 4.83 | 5.00 | No screen wider than its window at four widths; installed on two phones without a store |

---

## 5. A tour of the system, by who uses it

Open hivelet.vercel.app and follow along. **Never sign in to the landlady's account in front of anyone
without her permission**: it shows real names and money. For practice, the demo copy at
**hivelet-demo.vercel.app** has invented data and its own sign-ins (ask Sean for the file
`credentials/demo-evaluator-accounts.txt`; it is never in the repository).

### A visitor (no account)

1. **The public site** shows each unit category with its rates, read live from the database. Vacant
   units show their **floor plan**.
2. **Ask about a unit**: their name, a Philippine mobile number and the question, then **Send
   inquiry**. No email is asked for anywhere on the site.
3. The visitor gets a **private link** and a **reference code**. Either one (the code with their
   phone number) opens **"Your inquiry"**, where the landlady's answer appears and they can write back.
   No account is needed, and no text or email is sent: they come back to the page.

### A tenant (phone)

1. **Sign in** with the **login ID** (for example HV-48213) and the starting password from the
   landlady; choose a new password and give their mobile number on first sign-in. After that they
   sign in with the login ID or that number. An empty box gets its own message, such as "Enter your
   password."
2. **Overview**: the amount due and when it is due, **Pay with GCash**, their unit with its own floor plan, recent payments, and **Request a repair** at the top right
   (the round button on a phone).
3. **Payments and billing**: the bill to pay, named by its month, shown only while something is to
   pay, and the **Payment record** under it, with two tabs. **History** (first) lists every payment,
   a GCash payment that is waiting or was not accepted included. **Record** lists one row per month:
   a receipt the landlady verified, or **"Not recorded"** for a month with no receipt, never "owed".
   The deposit is on the tenant's Overview, in the unit card.
4. **Pay with GCash** (optional): Adyen's own payment window takes the payment, in Adyen's test
   environment, so no real money moves; the dialog says so. It shows as **waiting for the
   landlady** until she verifies it; then the bill is settled.
5. **Repairs**: a title, details, how urgent, an optional photo, **Send request**; it moves across
   the board as the landlady works on it, and they are notified when it is done. They can cancel it
   before work starts.
6. **My details** (their phone and **Emergency contact**, then **Save**), notifications (the bell),
   and **Install** (Add to Home Screen).

### The landlady (laptop or phone)

| Screen (side menu) | What it is for |
| :--- | :--- |
| **Overview** | Needs your attention (payments to verify, urgent repairs), **Rent for** this month (the rent filed under it, whenever paid) and **Due this week** (whose rent falls due in seven days, with the period it pays for), Occupancy (32 of 33, each cluster's count), **Income and expenses** month by month (tap a month for its Income, Operating expenses and Net income, with arrows on the first two to their pages), and the three buttons: **Move someone in/out**, **Record expense**, **Record payment** |
| **Monthly Income** | The month's **Rent for** figure and **Income by cluster** (its green word switches it to **month**, as bars). Her income records, by cluster, in her workbook's layout, on the **Records** tab beside **To verify** (it opens on To verify when GCash payments are waiting); **Record payment**; verify or reject GCash payments; correct a payment in **Edit this payment** (Water is worked out from Occupants and cannot be typed); void a receipt; **Download** for Excel |
| **Monthly Expenses** | **Expenses** for the month, and **Expense by area** (switchable to **month**, red bars). Expenses split across property areas; her thirteen categories plus her own; **Record expense** asks **Record this expense?** with **Go back** and **Record it**; Download |
| **Tenants** | Move in, move out, edit, reset a password, see the login ID |
| **Rooms and rates** | Every unit's rate and status, including **Reserved** for a unit held after an inquiry. Every rate change is recorded. A unit nobody lives in reads **No tenant**, and its status stays **Vacant** |
| **Repairs** | The board (to dispatch, in progress, done). Clicking a card opens **Manage this repair** (send a technician, change the status), and a repair in progress has **Mark resolved** on its card. **Log a repair** she was told about in person, even for an empty unit |
| **Inquiries** | Read and answer inquiries; move a person in from one; close it. A Closed or Moved in inquiry has no reply box, and **Delete** appears only on those. An empty search says **Nothing matches**, as on every list |

Also: the **bell** (notifications, with a dot when unread), **Recently** (her last three actions),
**light or dark** appearance, and offline viewing. The record of who did what is kept in the database
and is not shown in the app since 1 October 2026.

**Recording a cash payment, in one breath:** Monthly Income > Record payment > the unit > occupants
(water follows at ₱200 each) > rent fills in > the invoice number, or ACK for a slip with no number >
how they paid > months covered > date paid > Record payment > check the summary > **Record it**.
If the unit already has a payment for that period, it says so first and the button reads **Record it
anyway**.

---

## 6. Words to understand (and say correctly)

| Term | What it means here |
| :--- | :--- |
| **PWA** (Progressive Web App) | A website that installs from the browser and opens in its own window, with a **service worker** that keeps its files on the device and a **manifest** that names it; no app store |
| **Frontend / backend / API** | The screens in the browser (Vue) / the server program that applies the rules (Express) / the set of addresses the screens call on the server |
| **Row-level security (RLS)** | The database itself refuses to return rows a request may not see, even if a program asks |
| **Role-based access control** | Each role (visitor, tenant, administrator) may use only its functions, set in one permission matrix (Table 4-7) |
| **bcrypt, salt** | Passwords are stored only as one-way hashes, each mixed with its own random salt, so two equal passwords look different |
| **Audit trail** | A permanent record of who did what and when; the application cannot edit, delete or empty it |
| **Migration** | A numbered file that changes the database, reviewed before it runs; nothing is changed by hand |
| **Webhook, HMAC** | Adyen calls our server to report a payment; the message is signed (HMAC) so a forged one is refused |
| **Pending Verification** | A GCash payment that arrived but does not count until the landlady verifies it |
| **Void** | A receipt marked as cancelled, with who, when and why, but kept, never deleted |
| **Anniversary date** | The day of the month a tenancy started; the rent period runs from it (for example the 13th to the 12th) |
| **Remitted amount** | Rent plus water |
| **50% Share** | Only ever: *a system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet* |
| **ACK** (acknowledgement receipt) | A payment slip with no invoice number |
| **Agile** | Building in short iterations, each with requirements, design, development, testing, deployment and review, and changing course on feedback |
| **ISO/IEC 25010** | The software quality model: eight characteristics, 31 sub-characteristics, plus quality in use |
| **ISO/IEC 25040** | The five-step evaluation process: establish requirements, specify, design, execute, conclude |
| **ISO/IEC 25023 / 25022** | How quality and quality in use are measured, as ratios X = A / B |
| **ISO/IEC/IEEE 29119** | The test levels: unit and integration, system, acceptance |
| **SQuaRE** | The ISO/IEC 25000 family that 25010, 25022, 25023 and 25040 belong to |
| **Weighted mean** | WM = Σ(f × w) / N; f is how many chose a rating, w the rating, N the respondents |
| **Mean of group means** | Each group averaged first, then the groups, so one landlady is not outweighed by three tenants |
| **Likert scale** | 5 Strongly Agree to 1 Strongly Disagree |
| **Purposive and convenience sampling** | Chosen for a purpose (cash payers, Android and iPhone, several clusters) from those available that evening |
| **Measured vs rated quality** | What the tests showed vs what the respondents said; the paper reports both side by side (Table 4-18) |
| **Screen-versus-database audit** | Comparing every figure on screen with a direct query of the database for the same records |
| **Simultaneous saves** | The same request arriving twice at once (a double click, a retry); the database keeps one |
| **Lighthouse, PageSpeed, CLS, LCP** | Google's page-speed tools; layout shift (how much the page jumps) and largest element drawn (how soon the main content shows) |
| **WCAG, axe-core** | The web accessibility guidelines, and the tool that scanned the screens against them |

---

## 7. Tips and tricks for the defense

**Studying**
- **Split the paper, but everyone knows Sections 1 and 4 of this guide.** Then each person owns one
  area deeply: the problem and literature (Chapters 1 and 2), the system (Chapter 4.2 and the code
  guide), testing (4.3), evaluation (4.4), and the demo.
- **Read Chapter 5 last and aloud.** It is short (three to five pages) and repeats every key number;
  if you can explain each conclusion, you can answer most questions.
- **Practise answering in three parts:** the answer, one number, where it is (see the Q&A guide).
- **Use the system yourself for twenty minutes** on the demo copy: record a payment, answer an
  inquiry, send a repair. Panels can tell who has used it.

**Presenting**
- Lead with the story (Section 1 above), not the technology. Panels remember "43% of her rows had no
  anniversary date" longer than "Vue 3".
- Keep slide 13 (82 of 83) and slide 16 (4.84 and 4.90) on screen long enough for the panel to read them.
- Say the limits before the panel does: seventeen respondents, three of them technical evaluators, the users' forms given out not counted,
  no task times in the second round, Adyen on its test
  account, the system still running beside her records. Each is in the paper; naming them shows you know the work.

**Words to use, and words never to use**
- **33 units, 32 occupied.** Never "32 units".
- **Adyen with GCash** is configured and working, on Adyen's **test account**: optional, not live,
  takes no real money. Going live needs the owner's merchant onboarding documents, which the study
  did not do. Never describe the gateway with words that suggest it is not real, and never say it
  is "under development": it is built.
- The **50% Share**: only the exact sentence in Section 6. Do not say who it is for.
- **Rates are set by the landlady by hand**, and every change is recorded. There is no automatic yearly
  increase.
- **"Invoice"**, not "OR", for the landlady's numbered slips (the screens say invoice).
- **"Not recorded"**, not "unpaid", for a month with no receipt.
- **One name for each thing**: tenant, prospective tenant, unit, inquiry, repair request. Say
  **Inquiry**, not "Booking Inquiry", and **Maintenance Ticketing**, not "Issue Ticketing System"
  (Section 2.4). Never say the system takes bookings: booking and reservation management means the
  public unit list, the inquiry, a unit marked Reserved and the move-in.
- Say **"the landlady"**, as the paper does, and never "the owner" for her: she manages the boarding house for its owner. Do not name the family.

**The demo**
- Follow `DEMO_SCRIPT.md` exactly; it uses the test account loydtest on unit PH so no real tenant's
  name or the landlady's money appears on the projector.
- Install the app on the demo phone the day before and **open it once after the last update**, or it
  shows the previous version.
- **Reject** the demo GCash payment, never verify it (verifying writes a receipt into her ledger).
- One failed sign-in: stop and switch to the figures. Five wrong tries lock the account for 15 minutes.
- Airplane mode is the easiest proof of the PWA: the app still opens and shows the last figures.
- Have the defense film and `CLAUDE MANUSCRIPT/images/` on the laptop, offline, as the fallback.

**Answering**
- Listen to the whole question. Pause. Answer the question asked, not the one you prepared.
- A question you cannot answer: "We did not measure that; what we measured is..." Never guess a number.
- A criticism the paper already accepts: agree, and point to where the paper says it. That is a strong
  answer, not a weak one.
- Pass to the teammate who owns that area; agree the hand-offs before the day.

---

## 8. Five things the panel may notice on the live site

| What they see | Why, and what to say |
| :--- | :--- |
| No vacant unit (33 of 33) | The test account is the tenant of PH for the demo; the property has 32 occupied |
| September to November mostly not entered | The landlady enters her receipts when she collects them. On 10 November her records in the system were full to August, with two September receipts and none after. The system shows "Not recorded", never "owed" (Chapter 5, recommendation 1) |
| "Move-in date not recorded" | Her workbook never recorded it; the system does not invent one (Section 4.2.2) |
| Five invoice numbers flagged | From her historical book, kept as written (Section 4.1.1) |
| A GCash payment marked "Not accepted" | The demo payment, rejected on purpose so it does not enter her ledger |

---

## 9. Self-quiz

Cover the answers and test yourself, or quiz each other. The answer to every question is above.

<details><summary>1. How many units, and how many are occupied?</summary>33 units in five clusters; 32 occupied.</details>
<details><summary>2. What did her own records show when transferred?</summary>937 income rows and 1,327 expense allocations; 402 of 937 (43%) with no anniversary date and no deposit; five invoice numbers each used twice.</details>
<details><summary>3. State the general objective.</summary>To design, develop and evaluate Hivelet, a web-based apartment management system that improves administrative workflow integration, communication and operational control for a small, resource-constrained boarding house.</details>
<details><summary>4. Name the six features.</summary>Tenant and room management; booking and reservation management (inquiries and Reserved units, nothing booked online); financial tracking with optional online payment; maintenance ticketing and notifications; role-based access control; PWA support.</details>
<details><summary>5. What were the three iterations?</summary>After a first build (24 Jul to 28 Aug), Iteration 1 was verification and correction (12 to 14 Sep, 22 errors corrected), Iteration 2 was consolidation and testing (15 Sep to 31 Oct), and Iteration 3 was the interface redesign (from 1 Nov).</details>
<details><summary>6. What is the stack?</summary>Vue 3 and TypeScript (PWA), Express in TypeScript, PostgreSQL on Supabase, Adyen with GCash, hosted on Vercel.</details>
<details><summary>7. How many tests passed?</summary>82 of 83 (98.8%), no critical defect, course standard 90%.</details>
<details><summary>8. What was the one failed test?</summary>Walkthrough step 23b: ₱0 shown instead of "—" with no connection; fixed and passed on 13 Oct.</details>
<details><summary>9. What did the screen-versus-database audit find?</summary>Six defects every automated suite had missed, all fixed on 26 Sep.</details>
<details><summary>10. How did the tenants do?</summary>Round 1: all 34 attempts completed, 31 without help (91%), median 60 seconds; help only at first sign-in and finding their unit and rent. Round 2: ten tenants, 151 of 160 without help (94%); four prospects, 31 of 32 (97%); none failed; no times recorded.</details>
<details><summary>11. Overall rating, highest and lowest?</summary>Users 4.84, technical evaluators 4.90, both Very High Quality. Users' highest Performance Efficiency 4.86, lowest Reliability 4.78; evaluators' highest Compatibility and Portability 5.00, lowest Maintainability 4.73. Before the redesign: users 4.75, evaluators 4.34.</details>
<details><summary>12. Who were the respondents?</summary>Seventeen on the redesigned system: the landlady, ten tenants, three prospective tenants and three technical evaluators. The first round, before the redesign, had ten: five users (4.75) and five technical evaluators (4.34), Appendix M.</details>
<details><summary>13. Why the mean of group means?</summary>So one landlady is not outweighed by ten tenants on functions only she uses. Averaging every user's answer gives 4.80 instead of 4.84, same interpretation.</details>
<details><summary>14. Why is Maintainability low?</summary>Only the technical evaluators rated it: 4.73 from the three of the second round (4.40, 5.00, 4.80), 4.32 from the five of the first, none of whom inspected the code; the code itself shows 154 of 204 database calls written inside request handlers. It is still Very High Quality. Recommendation 6.</details>
<details><summary>15. What are the two security weaknesses left?</summary>The sign-in token in browser storage; no second sign-in factor. Recommendation 3.</details>
<details><summary>16. How is water computed?</summary>₱200 per occupant per month.</details>
<details><summary>17. What is the 50% Share?</summary>A system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet.</details>
<details><summary>18. When does a GCash payment count?</summary>Only after the landlady verifies it; until then it is Pending Verification.</details>
<details><summary>19. What happens offline?</summary>The installed app opens and shows the last loaded figures with their time; nothing can be saved or paid; the copy is removed at sign-out.</details>
<details><summary>20. What happens if the same receipt is saved twice at once?</summary>The database keeps one and refuses the other (except receipts with no invoice number or acknowledgement receipts, a named limit).</details>
<details><summary>21. Which ISO standards, and for what?</summary>25010 the quality model; 25040 the evaluation process; 25023 and 25022 the measures; 29119-1 the test levels.</details>
<details><summary>22. Why 2011 and not the 2023 edition of 25010?</summary>The approved proposal and the instrument used the 2011 characteristics; Table M-21 maps the results to 2023.</details>
<details><summary>23. How many changes came from the evaluation?</summary>51; all 14 of the technical evaluators' comments were addressed by 5 Oct.</details>
<details><summary>24. Is the system the landlady's main record now?</summary>Not yet: it runs beside her own records until both agree (deployment stage 5).</details>
<details><summary>25. Name three recommendations.</summary>Any three of: enter each receipt on Monthly Income; have backups taken; GCash live, if the owner wants it, with the owner's merchant onboarding documents, plus refunds, a protected cookie and a second factor; automated browser tests of the walkthrough, and the duplicate rule for receipts with no invoice number; faster phone pages; strengthen Maintainability and Usability; test against real data; evaluate longer with every tenant.</details>
<details><summary>26. Is the landlady the owner?</summary>No. She manages the boarding house for its owner and is the system's only administrator. That is why the paper says the landlady, and why going live with GCash needs the owner's merchant onboarding documents (Section 2.4).</details>
<details><summary>27. Did you rerun all 114 test cases after the redesign?</summary>108 of them, from 4 to 13 November: 99 passed, the 9 timings were taken (0.35 to 2.11 s on a laptop), and none failed. Not run: four cases of several tenants acting at once (no time), the Samsung browser (no Samsung phone), and two timings. Appendix L, last part.</details>
