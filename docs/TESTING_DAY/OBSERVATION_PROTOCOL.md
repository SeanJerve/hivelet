# Observation protocol: watch people use Hivelet, and write down what happens

**For the facilitator and the observer.** Written 2026-09-30. The adviser's direction: **let people
experience the system and observe them; do not rely on interviews.** This page turns that into a
method the team can follow the same way with every person, so the results can be counted and
reported in Chapter 4.

The method has a name the panel will recognise: **observed task-based usability testing with
think-aloud**. It measures the three quality-in-use results of ISO/IEC 25010 (and ISO 9241-11):
**effectiveness** (did they finish the task?), **efficiency** (how long, how many wrong turns?) and
**satisfaction** (the survey afterwards).

---

## 1. The roles (two people per session is enough)

| Seat | Does | Never does |
| :--- | :--- | :--- |
| **Facilitator** | Welcomes, gets consent, plays the video, reads each task card aloud word for word, gives the help the ladder allows (section 3) | Points, touches the device, says "click there", explains the screen, praises or corrects |
| **Observer** | Times each task and writes the observation sheet: success, wrong turns, pauses, exactly what the person says, any error message word for word | Talks to the tester during a task |

A third person (recorder) is useful but optional: screen recordings, photos, file names.

---

## 2. Before the tasks

1. **Consent first** (Form 1). Read it aloud if they prefer. Tick boxes for screen recording, photos
   and faces are separate choices.
2. **The video.** Play the Hivelet trailer once, start to finish. Do not add a demonstration or tips of
   your own. Write "video shown" and the time on the observation sheet. (The method section says every
   tester saw the same short introduction; that is only true if nobody adds to it.)
3. **Their own device** where possible: note brand and browser, and whether it is on the house wifi or
   mobile data.
4. **Read this sentence, the same way every time:**
   > "We are testing the website, not you. There are no wrong answers. Please say out loud what you are
   > looking at and what you are thinking, even small things like 'this is slow' or 'where is it?'.
   > I will read you some things to do. I cannot show you where to tap, but if you get stuck I will help."
   >
   > *"Ang website po ang sinusubukan namin, hindi kayo. Walang maling sagot. Pakisabi po nang malakas
   > ang tinitingnan at iniisip ninyo, kahit maliit na bagay tulad ng 'ang bagal' o 'saan ito?'.
   > Babasahin ko po ang mga gagawin. Hindi ko po maituturo kung saan pipindot, pero tutulong ako
   > kapag kayo ay na-stuck."*
5. Start the screen recording if they agreed (they start it on their own phone).

---

## 3. During a task

**Read the task card, start the stopwatch, then stay quiet.** Stop the watch when they say they are
done, when they reach the result, or when they give up.

**The help ladder.** Use the lowest step that gets them moving again, and write the step down.

| Level | When | What the facilitator says | Result code |
| :-- | :--- | :--- | :-- |
| 0 | Working, even slowly | Nothing | P if they finish |
| 1 | Silent and stuck for about 30 seconds | A neutral prompt only: "What are you looking for?" / "What would you try next?" (*"Ano po ang hinahanap ninyo?"*) | P if they finish |
| 2 | Still stuck after about a minute more | A hint about **where**, not how: "It is in the menu" / "Try the top of the page" | **PH** |
| 3 | Still stuck, or upset | Show it, then let them continue to the next task | **F** |

**Result codes** (the same as Table 11C): **P** done without help (level 0 to 1), **PH** done with help
(level 2), **F** not done (level 3, gave up, or finished with a wrong result), **NT** not tried.

**What the observer writes, per task:**

| Column | Write |
| :--- | :--- |
| Start / End | Clock time, to the second if you can (HH:MM:SS) |
| Result | P, PH, F or NT |
| Errors | Count of **wrong turns**: a tap that led somewhere they did not mean to go, or a wrong value typed and corrected |
| Help | The level used, and when |
| What they said / did | **Their exact words**, in the language they used, in quotes. Tag each with a code: **S** slow, **C** confusing wording or layout, **N** lost their way, **E** an error or something broken, **+** something they liked |

Write what you see, not what you think it means: "tapped Payments twice, said 'saan ang bayad ko?'"
rather than "found the menu confusing". The interpretation is written later, from all the sheets.

**If something breaks** (an error message, a blank screen, a spinner that does not stop): write the
message word for word, the time and the case; take a screenshot; carry on with the next task. If a
tester ever sees **someone else's** name, unit or bill: stop the session and call the technical lead
(guide §9).

---

## 4. The task cards

Read each card aloud, English then Filipino. The **Should happen** column is for the observer only;
do not read it out.

### Prospective tenants (PR): the public website only

People who do **not** live at the boarding house (a friend, a student looking for a room). No account,
no sign-in. **The booking module is not part of this test**; the inquiry form is. On their own phone,
at `hivelet.vercel.app`.

| ID | Task card (read aloud) | Should happen | ISO/IEC 25010 |
| :-- | :--- | :--- | :--- |
| PR-01 | "You are looking for a room near Bicol University. Open this website and tell me what the place is." *"Naghahanap po kayo ng kwarto malapit sa Bicol University. Buksan ang website at sabihin kung ano ang lugar na ito."* | Understands it is a boarding house with 33 units | Usability |
| PR-02 | "What kinds of units do they have?" *"Anong mga uri ng unit ang mayroon sila?"* | Finds the four categories (Studio, One-bedroom, Two-bedroom, Three-bedroom) | Functional |
| PR-03 | "Find how much a studio unit costs per month." *"Hanapin kung magkano ang upa sa isang studio kada buwan."* | Opens Studio; reads a rate (₱6,000 to ₱8,500) | Functional |
| PR-04 | "Is any unit available right now?" *"May bakante po bang unit ngayon?"* | Reads the status on the units (Occupied / Available) | Functional, Reliability |
| PR-05 | "Pick one unit and find which floor it is on and how many people can stay." *"Pumili ng isang unit at hanapin kung anong palapag ito at ilang tao ang puwede."* | Opens a unit's details | Functional |
| PR-06 | "How is water charged?" *"Paano sinisingil ang tubig?"* | Finds Policies & guidelines: ₱200 per occupant a month | Usability |
| PR-07 | "Find where the boarding house is and how to contact them." *"Hanapin kung saan ang boarding house at paano sila kokontakin."* | Finds Location / Contact (the phone number) | Usability |
| PR-08 | "Ask the landlady about a unit you like. Use your own name and number, and write 'TEST' in the message." *"Magtanong sa landlady tungkol sa unit na gusto ninyo. Gamitin ang sariling pangalan at numero, at isulat ang 'TEST' sa mensahe."* | "Ask about unit" or Inquire now; the confirmation appears; empty or wrong fields say what to fix | Functional, Usability |
| PR-09 | "Was anything slow, confusing or missing?" *"May mabagal, nakakalito, o kulang po ba?"* | Write their words exactly; result code **NT** (it is a question, not a task) | (survey context) |

At most **two inquiries from the same wifi in 15 minutes**, then use mobile data. The site allows ten
per connection per 15 minutes, shared by everyone on the house wifi; the team keeps well under it so
a real visitor is never blocked. Each inquiry reaches Michelle's Inquiries list: close the TEST ones at clean-up.

### Current tenants (T): their own account

On the tenant's own phone, signing in with their slip. The cards are **T-01 to T-18** in
`../FINAL MANUSCRIPT/TESTING_DAY_TEST_CASES.md`, Part T (English and Filipino), in that order. Before
they sign in, say: *"Ang 'Amount due' ay batay lang sa mga bayad na naitala na ng landlady."* (the
amount due counts only receipts already recorded).

### The landlady (A): her real work on the admin side

Michelle, on the admin laptop. The cards are **A-01 to A-36** in the same file, Part A (A-05 to A-32
are the walkthrough, Table 10). Her real work comes first where it exists: **recording the receipts
she has collected since 31 August** is the best test the day can have (A-23, real).

---

## 5. After the tasks

1. **The survey, straight away**, before any conversation about the system (a chat first changes the
   answers). Hand them the QR code and step away; do not look at their phone.
2. **Only then**, one open question is fine: *"Is there anything else you want to tell us?"* Write the
   answer. This is not an interview; do not follow up with more questions.
3. Tenants get the tenant guide (`TENANT_QUICK_GUIDE_PRINT.html`) and keep their slip.
4. The observer checks the sheet is complete (every case has a result code) and signs it.

---

## 6. How this becomes Chapter 4

| From the sheets | Becomes | Command |
| :--- | :--- | :--- |
| Tenant lines (T cases) | Table 11C: completed alone / with help / not done, median time, wrong turns, completion rate | `node scripts/survey/compute-uat.mjs observations.csv` |
| Prospect lines (PR cases) | A proposed Table 11E, Prospective Tenant Task Results (same columns as 11C), and the per-case breakdown | same command; it prints 11E whenever PR lines are present |
| The landlady's walkthrough lines | Table 10 | `node scripts/survey/fill-walkthrough.mjs results.csv` |
| Quotes tagged S, C, N, E, + | The interpretation paragraphs, and fixes in Table 23 | read by Claude |
| The survey | Tables 12 to 22 | `node scripts/survey/compute-survey.mjs responses.csv` |

Type every observation line into a copy of `scripts/survey/uat-observations-template.csv` (one row per
person per task: tester code, device, case, start, end, result, errors, help, what they said). Tester
codes: **PR1, PR2 ...** for prospects, **T1 ... T5** for tenants, **L** for the landlady. Never a name.
