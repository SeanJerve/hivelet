# What the team does itself, and what Claude does

**Written 2026-09-26.** Chapters 4 and 5 are drafted with every number that could be read from the
system. The gaps left in them are things only people can produce. This is that list, in the order
worth doing it.

## Part 1. The team's own tasks

### 1. Usability testing with real tenants and the landlady (feeds Chapter 4, §4.4)

This is the ISO/IEC 25010 survey. The questions are ready in
`docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md`, with step-by-step Google Forms
instructions.

- [ ] **Run the walkthrough first** (task 3). A survey should rate a system that already works,
      not find its bugs.
- [ ] **Build the Google Form.** Change the group label "Resident" to "Tenant", since the system and
      Chapter 4 say Tenant. **Do not change any item wording** unless you change Chapter 4's tables
      to match.
- [ ] **Owner session.** Sit with Mrs. Da Silva while she does her normal tasks in the system for
      at least a few days (recording a payment, checking the ledger, exporting a report), then have
      her answer the owner section. Write down anything she says out loud; it goes in the
      interpretation.
- [ ] **Tenant sessions.** Ask tenants to sign in, look at their bill and payments, and submit one
      maintenance request, then answer the tenant section (it is bilingual). Aim for as many of the
      32 occupied units as will agree.
- [ ] **Technical evaluators.** Three to five IT faculty, developers or IT professionals. Give them
      access to the repository and documentation before they answer; Maintainability cannot be
      judged from the screens alone.
- [ ] **Export responses to Sheets** and send the file to Claude (Part 2).
- [ ] **Decide the composite mean method** (Chapter 4, §4.4.2). Claude recommends the mean of the
      group means.

Keep the signed consent or request letters for Appendix A and B.

### 2. Security testing with websites (supporting evidence for §4.4.8)

Use only **passive** scanners that read the site the way a browser does. Record the grade, the
date and a screenshot of each.

| Tool | What it checks | Address |
| :--- | :--- | :--- |
| Mozilla HTTP Observatory | Security headers and settings | developer.mozilla.org/en-US/observatory |
| Security Headers | Security headers, graded A to F | securityheaders.com |
| Qualys SSL Labs | The HTTPS certificate and encryption setup | ssllabs.com/ssltest |
| PageSpeed Insights (Lighthouse) | Performance, accessibility and best practices; also useful for §4.3.4 | pagespeed.web.dev |

> [!WARNING]
> **Do not run active or attack-style scans against the live site** (for example an OWASP ZAP
> "active scan", a spider that fills in forms, or a password-guessing tool). The live site holds the
> owner's real records:
> - a scanner that submits the public enquiry form writes junk enquiries into her real database;
> - repeated wrong passwords **lock real accounts**, including hers;
> - requests to the payment webhook go to the production payment path.
>
> If the team wants an active scan, ask Sean to arrange it against a local copy of the system first.

### 3. The 26-step functional walkthrough (feeds §4.3.3, Table 9)

Follow `TESTING_REHEARSAL.md`. It must be done by a person because it needs signing in, which
Claude is not allowed to do. It uses only the one unoccupied unit, so no real record is touched.
Write down, per step: what you did, what you expected, what happened, pass or fail. Send the notes to
Claude to turn into Table 9.

### 4. Performance measurement on real devices (feeds §4.3.4, Table 10)

On the workstation in Table 2 and a phone like the one in Table 3, time each screen in Table 10.
Use the browser's developer tools (Network tab, "Load" time) or PageSpeed Insights, and write down
the device, browser, network and date. **Measured numbers only.**

### 5. Screenshots for Figures 4 to 8

Room directory, public catalogue and enquiry form, income ledger, maintenance board, tenant portal
on a phone. Use the unoccupied unit or blur tenant names; the manuscript is public.

### 6. Questions for the owner

- [ ] How did enquiries about rooms arrive before the system (walk-in, referral, phone)? (§4.1.1,
      Table 5, marked CONFIRM)
- [ ] The five flagged receipt numbers: check them against her receipt book.
- [ ] The five open business questions listed in Chapter 5, recommendation 2. All are in
      `CLIENT_MEETING_QUESTIONS.md`, ready to ask in one sitting.

### 7. Manuscript housekeeping

- [ ] Apply every fix in `FIXES_TO_CHAPTERS_1_TO_3.md`.
- [ ] Paste Chapters 4 and 5 into the `.docx`. Remove every TEAM NOTE and [DATA PENDING] marker
      once filled.
- [ ] Write the Acknowledgement. Fill in the Curriculum Vitae pages.
- [ ] Ask the adviser whether the two certifications need reissuing with the current title.
- [ ] Fill in the defense date and place once scheduled.

### 8. For Sean (system side)

- [ ] Merge the design branch into main, so the payments-page speed-up in Table 22 is on the live
      site before the manuscript claims it.
- [ ] Apply migration 054 (B-71 in `BLOCKED_FOR_SEAN.md`).
- [ ] Follow up the Adyen support case (B-74) so GCash can be demonstrated end to end.

## Part 2. What Claude does

| When | Claude does |
| :--- | :--- |
| Now, anytime | Re-run the 20 check suites and update Table 8 with the new date and counts |
| Now, anytime | Draft the Abstract once the survey means exist (it needs the results) |
| After the survey | Compute every mean, group mean and composite from the exported sheet; fill Tables 11 to 21; write each interpretation paragraph from the numbers and the open comments |
| After the survey | Turn the low-scoring items into fixes where they are in the design lane, and add them to Table 22 as the "optimize" half of Objective 4 |
| After the walkthrough | Turn the notes into Table 9 and its paragraph; fix any design problems it finds |
| After the performance runs | Turn the measurements into Table 10 and its paragraph |
| After the security scans | Explain each finding, fix what is in the design lane, and queue the rest for Sean |
| At the end | Update Chapter 5's summary and conclusions so every claim matches Chapter 4 |
