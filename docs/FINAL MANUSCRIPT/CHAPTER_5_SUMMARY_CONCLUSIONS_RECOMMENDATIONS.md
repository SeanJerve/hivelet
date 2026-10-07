# 5 SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

> **TEAM NOTE (delete before pasting).** Written 2026-09-26 to replace the manuscript's current
> Chapter 5, which describes an auto shop booking application from another project, including
> ISO/IEC 25010 ratings (4.98, 4.43, 4.15) that are not Hivelet's. **Remove all of that text.**
> Items marked **[DATA PENDING]** wait on the walkthrough and the survey. Every conclusion must
> follow from a result in Chapter 4; if Chapter 4 changes, check this chapter again.
> **Checked again 2026-09-28** against the updated Chapter 4 (six screen-audit defects, all fixed;
> the decision to keep historical receipts as written; the owner's open questions).
> **Updated 2026-10-01** from the testing day: summary item 3 and conclusion 3 filled from Chapter
> 4's Tables 10, 11 and 11C; recommendation 15 widened. Items 4 and conclusion 4 wait on the survey.
> **Updated 2026-10-05 (later):** conclusions 1 to 3 rewritten to open with whether each
> objective was achieved, its evidence and the criterion (GUIDE_ALIGNMENT C1), the team's own
> lessons kept after it; recommendation 2 lists only the owner's open questions.
> **Updated 2026-10-05:** summary item 4 gained the technical evaluators' 3 October review, from
> Chapter 4's Table 23 (fourteen comments, all addressed by 5 October). Its means still wait on
> the survey export.
> **Updated 2026-10-06 (evening):** realigned with Chapter 4's ISO framework (the adviser: the
> evaluation must be aligned with ISO). Summary items 3 and 4 and conclusions 3 and 4 now speak in
> ISO/IEC 25010 characteristics and the ISO/IEC 25040 process; conclusion 4 states what the
> measured evidence shows and waits on the survey only for the ratings; recommendation 8 names
> what the evaluation did not cover and the 2023 edition. Item 3's suite run is dated 29 September,
> as in Chapter 4's Table 8.
> **Updated 2026-10-07: the survey is in.** Summary item 4, conclusion 4 and recommendation 6 filled
> from Chapter 4's Tables 22 and 22A and the measured modularity row of Table 20A; recommendation 8
> names the tenant's request. Nothing marked pending is left in this chapter.

This chapter summarizes the study, states the conclusions drawn from its results, and gives
recommendations for the owner, for the continued development of the system, and for future
researchers.

## 5.1 Summary

This study designed, developed and evaluated Hivelet, a web-based apartment management system
built as a Progressive Web Application for the Fe Galang Da Silva Boarding House, a 33-unit
property near Bicol University. Based on the objectives of the study, the following were
accomplished:

1. **The existing practices were analyzed and the requirements established.** The owner managed
   the property with a two-sheet spreadsheet workbook on removable storage, a paper invoice book,
   cash collection on site, and requests sent by messaging application or in person. Transferring
   her records into the system showed the weaknesses of this approach: 43% of the 937 income rows
   lacked an anniversary date and deposit, and five invoice numbers had each been used for two
   payments. The analysis produced 44 functional requirements and 49 business rules. Each
   requirement is graded against the code in a traceability matrix: 25 are implemented as worded,
   15 in part, 1 in the interface only, and 3 not as worded, although what those three describe is
   visible to the owner in another form.

2. **The system was developed with all six features named in the objective:** tenant and room
   management, booking and reservation management, financial tracking with optional online payment
   through Adyen with GCash, maintenance ticketing and notification, role-based access control, and
   Progressive Web Application support. It was built with Vue 3 and Express in TypeScript over a
   PostgreSQL database on Supabase, in three Agile iterations, and it holds the owner's real
   records: 937 income rows and 1,327 expense allocations across 33 units.

3. **The system was pilot tested** for functionality, responsiveness and operational performance,
   each test planned as a measure of the ISO/IEC 25010:2011 characteristics those qualities belong
   to (Chapter 4, Table 7D). Twenty automated check suites, run against the live system on
   29 September 2026, all passed, including 490 report reconciliation checks, 78 access control
   and endpoint checks and 73 payment gateway checks. In live use the system raised a correct bill,
   recorded and voided a receipt without changing the ledger total, and was corrected the same day
   after the client reviewed it on a phone. A screen-by-screen comparison with the live records
   found six defects the automated checks had missed, and all six were corrected the same day.
   When testing ended, every record it had created was removed by one reviewed change, leaving the
   owner's 937 income rows untouched. Measured on the live system on 29 September 2026, the
   application opened without a connection and said plainly what it could not do, could be
   installed on a phone, and answered 1,085 requests from twelve simultaneous visitors and 285 from
   six simultaneous readers of the owner's records without a single error.
   On 30 September 2026 the owner performed the walkthrough herself: 24 of its 30 rows passed the
   first time, one failed (with the connection cut, the Overview showed ₱0 instead of "—"), and
   five were not performed as written. Three tenants completed every task they attempted, 31 of 34
   attempts without help (91 per cent), help being needed mainly at their first sign-in. Every
   screen measured was usable within about three seconds on a phone and a little over two on a
   laptop.

4. **The system was evaluated using ISO/IEC 25010:2011**, following the five steps of the ISO/IEC
   25040 evaluation process. Each of the eight characteristics was judged on measured evidence from
   the tests and on the ratings of the owner, the tenants, a prospective tenant and a technical
   evaluator. Twenty-seven of
   the model's thirty-one sub-characteristics had a measured result and twenty-five were rated by at
   least one survey item; user interface aesthetics and reusability were not evaluated. On the
   measured evidence, every feature named in the objectives was present, no request failed under
   several times the property's load, every protection tried held and all three outside security
   scanners graded the site A+, and nine tasks in ten were done without help. Two Reliability
   results fell short of the design, both on a real device without a connection, and three of
   every four database calls were written inside the server's request handlers. Six respondents
   rated the system 4.53 overall, which Table 13 reads as Very High Quality: Functional Suitability
   4.86, Performance Efficiency 4.42, Compatibility 4.67, Usability 4.12, Reliability 4.62, Security
   4.70, Maintainability 4.00 and Portability 4.89. Usability and Maintainability were read as High
   Quality and the other six as Very High Quality. Changes were made in response
   to feedback and testing, recorded in Table 23. The technical evaluators who reviewed the live
   system on 3 October 2026 made fourteen comments, mostly on usability and on checking what users
   type: phone numbers and email addresses, photo formats, filters, and the placement of controls on
   a phone. They also asked for two functions, cancelling a repair request and recording why a
   tenant moved out. All fourteen were addressed on the live system by 5 October 2026.

## 5.2 Conclusions

Based on the results of the study, the following conclusions were drawn:

1. **The first objective was achieved.** The existing practices were analysed in all four areas
   the objective names, tenant management, financial tracking, communication and booking, and every
   gap found was traced to a requirement and to the module that meets it (Chapter 4, Table 6). The
   analysis shows that the main problem at the property was not the lack of a digital tool but the
   lack of connection between records. Each area of the business kept its own informal record, and
   nothing checked one against another. The problems found in the owner's own records support the
   view in Chapter 2 that fragmentation, not the absence of technology, is the core problem in
   small-scale apartment management.

2. **The second objective was achieved.** All six features the objective names were developed and
   are in use on the owner's real records: tenant and room management, booking and reservation
   management, financial tracking with optional online payment, maintenance ticketing and
   notification, role-based access control, and Progressive Web Application support (Chapter 4,
   Sections 4.2.2 to 4.2.7). The system shows that an integrated system can be built to fit a
   small, cash-based property without forcing it to change how it works. Hivelet keeps the owner's
   own report layout, her own invoice numbers and cash as the main way to pay, and treats online
   payment as optional and subject to her approval. Adopting the system therefore required no
   change to the owner's accounting practice.

3. **The third objective was achieved.** The system was pilot tested for functionality,
   responsiveness and operational performance, measured as the Functional Suitability, Performance
   Efficiency and Reliability of ISO/IEC 25010:2011. Of the 83 tests executed across the automated,
   system and acceptance levels, 82 passed (98.8 per cent), against the course standard of at
   least 90 per cent with no critical defect open; no critical defect was found (Chapter 4, Tables
   11E and 23A). Every screen measured was usable within about three seconds on a phone (Table 11).
   The testing also shows that **automated verification is necessary when a system holds real
   financial records, but not sufficient.** The most serious defects found during development gave
   no error on screen and were found only because the system was checked against its own data and
   rules; the checks now prevent them from returning. Comparing each screen with the records it
   claims to show found six further defects, including a tenant payment history that showed
   nothing although every check had passed. The walkthrough's one failure, a ₱0 shown on a laptop
   without a connection, could not be reproduced afterwards on the same version, and an Android
   phone showed a message later than the design intends; both appeared only on a real device in the
   hands of its user, which is the same lesson from the other side.

4. **The fourth objective was achieved.** The system was evaluated on all eight characteristics of
   ISO/IEC 25010:2011 by the process of ISO/IEC 25040, and optimized in response (Chapter 4, Table
   23). Its users rated it Very High Quality overall (4.53), and every characteristic at least High
   Quality on the scale of Table 13 (Table 22). The measured evidence supports
   the ratings for every characteristic but Usability, and on Reliability it names the same weakness the lowest
   rating names: a request that fails must never be shown as a figure (Table 22A). The two
   characteristics rated lowest show what each kind of evidence can see. Usability (4.12) met every
   measure, yet the owner and the technical evaluator rated it lowest, because the measures show that
   a task can be done and the ratings record how hard it was to learn; the evaluator's rating was
   also given before the fourteen changes made for that evaluator's group. Maintainability (4.00)
   rests on one evaluator, but the measurement agrees: the system is easy to test and trace, while
   its database logic is not yet separated from its request handlers. These results come from six
   people over one week, three of the four groups with one respondent each; they describe how those
   people rated the system, not how every user would.

## 5.3 Recommendations

> **TEAM NOTE (5 Oct 2026).** Cut from sixteen to eight to meet the course guide (five to eight,
> each with its basis in Chapter 4, grouped by audience, the lowest-rated characteristic among them).
> The eight cut, and why, so the adviser can restore any:
> - *Keep the five flagged invoice numbers in mind* and *keep taking backups*: merged into 2.
> - *Supply the move-in dates*: merged into 1.
> - *Move database logic into service modules and compute cash flow on the server (FR-019, FR-020)*:
>   internal structure with no result in Chapter 4 behind it, and it reads as finishing a
>   requirement.
> - *SMS notifications*: no finding supports it; no tenant asked for it.
> - *Keep the browser security policy enforced*: already done and graded A+ (4.4.8); a practice,
>   not a recommendation.
> - *Keep the in-person password reset*: recommends no change.
> - *Sign in with Google for repeat enquirers*: a new feature with no finding behind it.
> - *Offline recording of payments*: excluded by the delimitation in Section 1.4, which Chapter 4
>   keeps.
> - *Support for more than one property*: outside the scope in Section 1.4; may return as a fourth
>   item for future researchers if the adviser wants one.

Based on the summary and conclusions of the study, the following are recommended:

**For the owner of the Fe Galang Da Silva Boarding House**

1. Answer the questions that remain about how her records are kept, collected in one list for a
   single sitting (Chapter 4, Section 4.1.2): whether the large figure at the bottom of her income
   sheet is a year-to-date total; whether she may add her own expense categories; whether tenants
   may report a cash payment for her to confirm; where the Penthouse's past spending belongs;
   whether the spending she booked as personal rather than as a rental cost in 2025 is correct; the
   three missing months of receipts for one unit; and the move-in date of each current tenancy,
   which her workbook did not record and on which settling a deposit at move-out depends.
2. Keep taking a backup before any change to the records, as the team did throughout (Table 25),
   and read the five flagged invoice numbers as history. They stay exactly as she wrote them, and
   the system lists them on every verification run so that they are never mistaken for its own
   errors (Section 4.1.1).

**For the continued development of the system**

3. Before accepting real GCash payments, move the Adyen account from test to live, which needs the
   account's live endpoint configured (Section 4.3.2). Until then, a GCash payment made through the
   portal moves no real money; the public FAQ already tells tenants this and asks them to pay in
   person, and that note should stay until the account is live. Also let the system refund a GCash
   payment the owner rejects. Rejecting a payment keeps it out of the records but does not return the
   money, which must then be refunded from the Adyen Customer Area; refunds were excluded from this
   study by its delimitation (Section 1.4). Before real money moves through the system, also keep the
   sign-in token in a cookie that no script on the page can read, and add a second sign-in factor for
   the administrator's account, the two weaknesses Chapter 4 names (Section 4.4.8).
4. Add automated browser tests that sign in and perform each of the 26 walkthrough steps, so that
   every function that writes data is tested by a machine on every change and not only once by a
   person. The automated suites of Section 4.3.1 read and check, but they do not write, and the
   screen-versus-database audit (Section 4.3.3) found defects that every suite had passed.
5. Make the pages appear faster on phones. On a simulated slow mobile connection the public page
   is drawn only after its code arrives, with its largest element at 3.5 seconds in PageSpeed
   Insights, and the owner's overview moves as its figures arrive (a layout shift of 0.22; Sections
   4.3.5 and 4.3.6). Pre-rendering the public page, serving the two typefaces from the site itself, and
   reserving the space each figure will take would shorten and steady both.
6. Strengthen the two characteristics rated lowest. **Maintainability** (4.00, the lowest; Chapter
   4, Section 4.4.9): move the database work now written inside the request handlers, three calls in
   four, into service modules, one per kind of record, so that a rule about a payment or a tenancy
   is changed in one place, and have the result reviewed by more than one developer, since the
   rating rests on one. **Usability** (4.12; Section 4.4.6): the owner rated learning the system
   without help 3, so the hand-over in stage 4 of the deployment plan (Table 25) should take her
   through each screen with the user manual (Appendix K) before she uses the system alone, and the
   first-time steps where tenants needed help, signing in and finding their unit and rent, should be
   the first things a new tenant is shown.

**For future researchers**

7. Use this study's approach of checking a system against its own real data, not only against test
   cases. Several of the most important defects in this study, a tenant payment history that showed
   nothing and a voided receipt shown as paid among them, passed every automated check and were
   found only by comparing each screen with the records it claimed to show (Section 4.3.3).
8. Extend the evaluation over a longer period of real use, with every tenant and with several
   tenants saving at the same moment, which this study could test only for reading (Section 4.3.7);
   ask tenants what they find missing, since one said the system still felt lacking and another
   asked to see the deposit they paid, which the system records but shows only to the owner; and
   measure
   whether the owner's time spent on record-keeping actually falls after adoption. Such a study
   should also measure what this one could not: availability as a share of time over months of use,
   and the two sub-characteristics no instrument here covered, user interface aesthetics and
   reusability (Chapter 4, Table 22A). A new instrument should be built on ISO/IEC 25010:2023, which
   adds Safety, since this study's 2011 instrument can only show where its results fall in the newer
   model (Table 12C).
