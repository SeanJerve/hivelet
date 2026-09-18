# ISO/IEC 25010 evaluation survey — ready to build in Google Forms

**Prepared 2026-09-18** for Chapter 4 §4.4. Hivelet, Group 4, IT 124 Capstone 2.

**Everything below is paste-ready.** Build it as **one form with branching**, not three separate
forms — the responses land in a single sheet, which is what you need to compute Table 4.7's
distribution and every composite mean without merging spreadsheets by hand.

> [!IMPORTANT]
> **The wording here and the wording in Chapter 4's tables must match exactly.** If you reword an
> item in the form, reword it in the `.docx` too. A thesis table that states an indicator
> differently from the instrument that produced the number is the kind of thing a panel opens with.

**Scale, for every rated item** — matches Table 4.8:

| 5 | 4 | 3 | 2 | 1 |
| :--- | :--- | :--- | :--- | :--- |
| Strongly Agree | Agree | Neutral | Disagree | Strongly Disagree |

In Google Forms use **Linear scale, 1 to 5**, labelled `1 = Strongly Disagree` and
`5 = Strongly Agree`. Do not use Multiple Choice Grid unless you are comfortable with how it
exports — linear scale gives one clean column per item.

---

## Who answers what, and why

| Group | Characteristics they rate | Reasoning |
| :--- | :--- | :--- |
| **Owner / administrator** | 7 — everything except Maintainability | She uses every function daily. She cannot judge whether the code is maintainable |
| **Residents** | 5 — Usability, Reliability, Performance Efficiency, Compatibility, Portability, plus 3 tenant-facing functional items | They only ever see the resident portal. Asking them about admin billing produces noise, not data |
| **Technical evaluators** | All 8, and they are the only source for Maintainability and the security internals | This is what they are for |

**Item counts:** owner ~30, residents ~20, technical evaluators ~34. Residents should finish in
under five minutes or your completion rate suffers.

---

# How to build it — step by step

**Budget about 45 minutes.** Do the steps in this order; two of them do not work in reverse.

### 1. Create the form
Go to **forms.google.com** → **Blank form**. Paste the title and description from *Form setup*
below.

### 2. Set the three settings
**⚙ Settings** tab → *Collect email addresses* **off**, *Limit to 1 response* **off**, and under
**Presentation** turn *Show progress bar* **on**, *Shuffle question order* **off**.

> Leave *Limit to 1 response* off. It requires a Google sign-in, and several residents will not
> have an account on the device they answer from.

### 3. Create all four sections now, while they are still empty
Click the **⧉ Add section** icon (bottom of the right-hand toolbar) **three times**. You will have
Section 1 of 4 through Section 4 of 4. Name them:

```
Section 1 — About you
Section 2 — Owner and administrator
Section 3 — Residents
Section 4 — Technical evaluators
```

> **This step must come before the branching.** Google Forms can only point a branch at a section
> that already exists, so building the questions first means going back and redoing Q1.

### 4. Make each group's section end the form
On **Section 2**, **3** and **4**, use the dropdown at the foot of the section —
*After section N* — and set each to **Submit form**.

> Without this, someone who finishes the residents' section carries straight on into the technical
> evaluators' questions.

### 5. Build Section 1 and set the branch
Add Q1, Q2, Q3 from *Section 1* below. On **Q1**, open the **⋮** menu at the bottom-right of the
question and choose **Go to section based on answer**. Then set:

| Answer | Goes to |
| :--- | :--- |
| Property owner or administrator | Section 2 |
| Resident of the boarding house | Section 3 |
| Technical evaluator | Section 4 |

### 6. Build the rated questions — use duplicate, do not type each one
Create **one** question, set it to **Linear scale**, range **1 to 5**, label `1` and `5` per the
scale above, and mark it **Required**. Then click the **⧉ duplicate** icon on that question for
every remaining item and change only the text. Thirty questions take about ten minutes this way and
about an hour the other way.

### 7. Group items with a title block, not a new section
For each characteristic heading — *Usability*, *Reliability* and so on — use
**Tt Add title and description**, **not** *Add section*.

> **Adding a section here would break the branching**, because a branch sends the respondent to one
> section and everything after it, not to a group of questions. Title blocks are visual only, which
> is exactly what you want.

### 8. Preview and walk every branch
Click the **👁 eye** icon and complete the form **three times**, once per answer to Q1. Confirm each
route reaches its own questions and then ends. This is where a mis-set branch shows up, and it is
much cheaper to find now than after you have sent the link out.

### 9. Send it
**Send** → the **🔗 link** tab → tick *Shorten URL* → **Copy**. Share the short link. Responses
appear under the **Responses** tab; the green **Sheets** icon exports them.

---

# FORM SETUP

**Title**

```
Hivelet System Evaluation — ISO/IEC 25010 Software Quality Assessment
```

**Description**

```
Thank you for helping us evaluate Hivelet, a web-based apartment management system developed for
the Fe Galang Da Silva Boarding House by Group 4, BS Information Technology, Bicol University
College of Science.

This survey measures the quality of the system using the ISO/IEC 25010 international standard for
software product quality. It takes about 5 to 10 minutes.

Please answer based on your own experience of using the system. There are no right or wrong
answers, and an honest low rating is more useful to us than a polite high one.

Your responses are used only for this academic study. Your name is not required and individual
answers are not shown to anyone outside the research team.

---

Salamat sa pagtulong sa amin na suriin ang Hivelet, isang web-based na sistema para sa pamamahala
ng apartment na ginawa para sa Fe Galang Da Silva Boarding House ng Group 4, BS Information
Technology, Bicol University College of Science.

Sinusukat ng survey na ito ang kalidad ng sistema gamit ang pamantayang ISO/IEC 25010. Aabutin ito
ng humigit-kumulang 5 hanggang 10 minuto.

Sagutin po batay sa sarili ninyong karanasan sa paggamit ng sistema. Walang tama o maling sagot,
at mas nakakatulong sa amin ang tapat na mababang marka kaysa sa magalang na mataas na marka.

Ang inyong mga sagot ay gagamitin lamang para sa pag-aaral na ito. Hindi kinakailangan ang inyong
pangalan at hindi ipinapakita ang indibidwal na sagot sa sinumang wala sa pangkat ng mananaliksik.
```

**Settings to switch on**

- Collect email addresses: **off** (responses are anonymous)
- Limit to 1 response: **off** (respondents may not have Google accounts)
- Show progress bar: **on**
- Shuffle question order: **off** — item order must match the table order

---

# SECTION 1 — About you

*Feeds Table 4.7, Distribution of the Evaluation Respondents.*

**Q1. Which best describes you? / Alin ang naglalarawan sa inyo?** · Multiple choice · **Required**
· *This is the branching question*

```
Property owner or administrator / May-ari o administrador ng apartment
Resident of the boarding house / Nangungupahan sa boarding house
Technical evaluator (IT professional, developer, or IT faculty) / Technical evaluator
```

Set **"Go to section based on answer"**:
- Property owner or administrator → **Section 2**
- Resident → **Section 3**
- Technical evaluator → **Section 4**

**Q2. How long have you been using or reviewing the system? / Gaano na kayo katagal gumagamit o
sumusuri sa sistema?** · Multiple choice · Required

```
Less than one week / Wala pang isang linggo
One to two weeks / Isa hanggang dalawang linggo
More than two weeks / Higit sa dalawang linggo
```

**Q3. Which device did you mainly use? / Anong device ang pangunahin ninyong ginamit?** ·
Multiple choice · Required

```
Desktop or laptop computer / Desktop o laptop
Mobile phone / Cellphone
Tablet / Tablet
Both computer and mobile phone / Parehong computer at cellphone
```

---

# SECTION 2 — Owner and administrator

*After this section: **Submit form**.*

### Functional Suitability → Table 4.9

```
1. The system lets me manage tenant records, units, and the number of occupants in each unit.
2. The system computes rent and water charges correctly, without me doing the arithmetic myself.
3. Payments I receive in person are recorded accurately against the correct unit and month.
4. Online payments made by tenants appear correctly for me to verify before they are settled.
5. Maintenance requests can be submitted, followed, and closed within the system.
6. The financial reports the system produces match the records I keep.
```

### Performance Efficiency → Table 4.10

```
7. The system responds quickly when I move between screens.
8. Financial reports are produced without a long wait.
9. The system stays responsive even when many records are shown at once.
```

### Compatibility → Table 4.11

```
10. The system works correctly in the browser I normally use.
11. Reports exported from the system open correctly in my spreadsheet program.
12. I can use the system at the same time as the other applications on my device.
```

### Usability → Table 4.12

```
13. I can tell what each screen is for without being taught.
14. The words and labels used match the way I actually talk about my property.
15. Before anything is changed or deleted, the system asks me to confirm and tells me what will happen.
16. When something goes wrong, the message tells me what to do about it.
17. I was able to learn the system without technical help.
```

### Reliability → Table 4.13

```
18. The system is available whenever I need it during the day.
19. Records I enter are still there when I come back to them.
20. When information cannot be loaded, the system says so instead of showing a wrong amount.
21. After an interruption, nothing I had already recorded was lost.
```

### Security → Table 4.14

```
22. Only I can reach the financial records.
23. A tenant can see only their own information.
24. I can see a record of the actions taken in the system and who took them.
25. I can change my password myself when I need to.
```

### Portability → Table 4.16

```
26. The system works on the devices I already own.
27. I can install the system on my phone without going to an app store.
28. I did not need to install any other software to use the system.
```

### Open comments

**Q29.** Paragraph · Not required
```
What worked best for you in the system?
```

**Q30.** Paragraph · Not required
```
What was difficult, confusing, or missing? Please be specific — this is the most useful answer you can give us.
```

---

# SECTION 3 — Residents *(bilingual — English and Filipino)*

*After this section: **Submit form**.*

> **Paste both lines into the question title**, English first, Filipino underneath. Google Forms
> keeps the line break inside a question title, so the respondent sees both without you needing a
> second form. Residents who read English comfortably simply ignore the second line.

**Scale labels for this section** — set the linear-scale end labels to:

```
1 = Lubos na Hindi Sumasang-ayon (Strongly Disagree)
5 = Lubos na Sumasang-ayon (Strongly Agree)
```

*The middle points carry no label in a linear scale, so put the full key in the section
description instead:*

```
5 — Lubos na Sumasang-ayon (Strongly Agree)
4 — Sumasang-ayon (Agree)
3 — Walang Kinikilingan (Neutral)
2 — Hindi Sumasang-ayon (Disagree)
1 — Lubos na Hindi Sumasang-ayon (Strongly Disagree)
```

### Functional Suitability, tenant-facing only → Table 4.9

```
1. I can see my own unit details, my bill, and what I still owe.
Nakikita ko ang detalye ng aking unit, ang aking bill, at kung magkano pa ang dapat kong bayaran.
```
```
2. I can submit a maintenance request and follow what happens to it.
Nakakapagpasa ako ng request para sa pagpapakumpuni at nasusubaybayan ko kung ano ang nangyayari dito.
```
```
3. I can see a record of the payments I have made.
Nakikita ko ang talaan ng mga bayad na naibigay ko na.
```

### Usability → Table 4.12

```
4. I can tell what each screen is for without being taught.
Nauunawaan ko kung para saan ang bawat screen kahit walang nagturo sa akin.
```
```
5. The words used in the system are easy to understand.
Madaling maintindihan ang mga salitang ginamit sa sistema.
```
```
6. It is clear how much I owe and what the amount is made up of.
Malinaw kung magkano ang dapat kong bayaran at kung paano ito nabuo.
```
```
7. When something goes wrong, the message tells me what to do about it.
Kapag may mali, sinasabi ng mensahe kung ano ang dapat kong gawin.
```
```
8. I was able to use the system without anyone explaining it to me.
Nagamit ko ang sistema kahit walang nagpaliwanag sa akin.
```

### Performance Efficiency → Table 4.10

```
9. The system opens quickly.
Mabilis magbukas ang sistema.
```
```
10. The system responds without delay when I move between screens.
Mabilis tumugon ang sistema kapag lumilipat ako ng screen.
```

### Reliability → Table 4.13

```
11. The system is available whenever I try to use it.
Magagamit ang sistema sa tuwing kailangan ko ito.
```
```
12. The information shown to me is correct and up to date.
Tama at napapanahon ang mga impormasyong ipinapakita sa akin.
```
```
13. When something cannot be loaded, the system says so instead of showing a wrong amount.
Kapag may hindi mabuksan o ma-load, sinasabi ito ng sistema sa halip na magpakita ng maling halaga.
```

### Compatibility → Table 4.11

```
14. The system works correctly in the browser I normally use.
Gumagana nang maayos ang sistema sa browser na karaniwan kong ginagamit.
```
```
15. I can use the system at the same time as my other apps.
Nagagamit ko ang sistema kasabay ng iba kong mga app.
```

### Portability → Table 4.16

```
16. The system works on my own phone or computer.
Gumagana ang sistema sa sarili kong cellphone o computer.
```
```
17. I can open the system on more than one device.
Nabubuksan ko ang sistema sa higit sa isang device.
```
```
18. I did not need to install anything extra to use it.
Hindi ako kinailangang mag-install ng kahit anong karagdagang app para magamit ito.
```

### Open comments

**Q19.** Paragraph · Not required
```
What did you find most useful?
Ano ang pinakanakatulong sa iyo?
```

**Q20.** Paragraph · Not required
```
What was difficult, confusing, or missing?
Ano ang nahirapan kang gawin, nakalito sa iyo, o kulang sa sistema?
```

---

# SECTION 4 — Technical evaluators

*After this section: **Submit form**.*

> Give this group access to the repository and the documentation before they answer. Sections on
> maintainability cannot be answered honestly from the interface alone.

### Functional Suitability → Table 4.9

```
1. The system provides the functions required for tenant, unit, and occupancy management.
2. Rent and water charges are computed correctly and consistently.
3. Payment recording and verification behave correctly for both in-person and online payments.
4. The maintenance ticketing workflow supports submission, tracking, and closure.
5. Generated reports agree with the records held in the database.
```

### Performance Efficiency → Table 4.10

```
6. Response times are acceptable for the expected number of users and records.
7. Report generation completes within a reasonable time.
8. The system uses client and server resources efficiently.
```

### Compatibility → Table 4.11

```
9. The system operates correctly across current mainstream browsers.
10. Exported files conform to formats that other applications can read.
11. The system coexists with other applications without interference.
```

### Usability → Table 4.12

```
12. The interface is understandable without prior training.
13. Terminology is consistent across the system and appropriate to the users.
14. Destructive actions require confirmation and state their consequence.
15. Error messages are actionable rather than technical.
16. The interface is operable for users with limited technical background.
```

### Reliability → Table 4.13

```
17. The system handles failure of a request without presenting incorrect data.
18. Recorded data is retained reliably.
19. The system distinguishes clearly between "no data" and "data could not be loaded".
20. The system recovers from interruption without data loss.
```

### Security → Table 4.14

```
21. Access to functions and records is correctly restricted by role.
22. A tenant account cannot reach administrative data.
23. Administrative actions are recorded in an auditable trail.
24. Credentials are handled and stored appropriately.
25. Authentication and session handling follow accepted practice.
```

### Maintainability → Table 4.15

```
26. The codebase is organized so that a change can be located and made confidently.
27. The system is documented sufficiently for another developer to maintain it.
28. Changes to configurable values do not require code changes.
29. Automated checks exist that would catch a regression.
30. A change in one part of the system is unlikely to disturb unrelated parts.
```

### Portability → Table 4.16

```
31. The system can be deployed to another environment without modification.
32. The client installs on a mobile device without an application store.
33. The system does not depend on software the target environment is unlikely to have.
```

### Open comments

**Q34.** Paragraph · Not required
```
Which aspect of the system is strongest, from a technical standpoint?
```

**Q35.** Paragraph · Not required
```
Which aspect most needs improvement, and what would you change?
```

---

# After the responses come in

1. **Export to Sheets** — Responses tab → the green Sheets icon.
2. **Compute the weighted mean per item**: `=AVERAGE(range)` over that item's column. This is the
   number that goes in the Mean column of Tables 4.9–4.16.
3. **Compute the composite mean per characteristic**: the average of that characteristic's item
   means. This is the Composite Mean row, and it carries into Table 4.17.
4. **Standard deviation per item**, if you report it: `=STDEV(range)`.
5. **Map each mean to its verbal interpretation** using Table 4.8: 4.21–5.00 Very high quality ·
   3.41–4.20 High quality · 2.61–3.40 Moderate · 1.81–2.60 Low · 1.00–1.80 Very low.
6. **Where groups overlap on a characteristic**, decide and state whether you are averaging across
   all respondents or reporting per group. **Either is defensible; say which you did.** Combining
   silently is not.
7. **Read the open comments before writing the interpretation.** They are where the reason for a
   low score lives, and §4.4 asks you to interpret, not just report.
8. **Record what you changed in response** — Objective 4 says evaluate **and optimize**.

---

# Two things worth deciding before you send it

**Filipino translation.** The residents' section is written in plain English, but a translation
alongside each item would improve the quality of the answers and is defensible to include. If you
want it, the residents' section is the one to translate — the technical section does not need it.

**Do the walkthrough first.** Running `TESTING_REHEARSAL.md` before administering this will surface
problems you would rather fix than have rated. A survey is not a bug hunt.
