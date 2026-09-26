# 5 SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

> **TEAM NOTE (delete before pasting).** Written 2026-09-26 to replace the manuscript's current
> Chapter 5, which describes an auto shop booking application from another project, including
> ISO/IEC 25010 ratings (4.98, 4.43, 4.15) that are not Hivelet's. **Remove all of that text.**
> Items marked **[DATA PENDING]** wait on the walkthrough and the survey. Every conclusion must
> follow from a result in Chapter 4; if Chapter 4 changes, check this chapter again.

This chapter summarizes the study, states the conclusions drawn from its results, and gives
recommendations for the owner, for the continued development of the system, and for future
researchers.

## 5.1 Summary

This study designed, developed and evaluated Hivelet, a web-based apartment management system
built as a Progressive Web Application for the Fe Galang Da Silva Boarding House, a 33-unit
property near Bicol University. Based on the objectives of the study, the following were
accomplished:

1. **The existing practices were analyzed and the requirements established.** The owner managed
   the property with a two-sheet spreadsheet workbook on removable storage, a paper receipt book,
   cash collection on site, and requests sent by messaging application or in person. Transferring
   her records into the system showed the weaknesses of this approach: 43% of the 937 income rows
   lacked an anniversary date and deposit, and five receipt numbers had each been used for two
   payments. The analysis produced 44 functional requirements and 49 business rules, each traced
   to the part of the system that implements it.

2. **The system was developed with all six features named in the objective:** tenant and room
   management, booking and reservation management, financial tracking with optional online payment
   through Adyen with GCash, maintenance ticketing and notification, role-based access control, and
   Progressive Web Application support. It was built with Vue 3 and Express in TypeScript over a
   PostgreSQL database on Supabase, in three Agile iterations, and it holds the owner's real
   records: 937 income rows and 1,327 expense allocations across 33 units.

3. **The system was pilot tested.** Twenty automated check suites, run against the live system on
   26 September 2026, all passed, including 490 report reconciliation checks, 78 access control
   and endpoint checks and 73 payment gateway checks. In live use the system raised a correct bill,
   recorded and voided a receipt without changing the ledger total, and was corrected the same day
   after the client reviewed it on a phone. A screen-by-screen comparison with the live records
   found five defects the automated checks had missed, four of which were corrected the same day.
   [DATA PENDING: one sentence on the 26-step walkthrough
   and one on the measured load times.]

4. **The system was evaluated using ISO/IEC 25010** by the owner, the tenants and technical
   evaluators. [DATA PENDING: the overall mean and its interpretation, then one line per
   characteristic with its composite mean, in the order of Table 22.] Changes were made in response
   to feedback and testing, recorded in Table 23.

## 5.2 Conclusions

Based on the results of the study, the following conclusions were drawn:

1. **The main problem at the property was not the lack of a digital tool but the lack of
   connection between records.** Each area of the business kept its own informal record, and
   nothing checked one against another. The problems found in the owner's own records support the
   view in Chapter 2 that fragmentation, not the absence of technology, is the core problem in
   small-scale apartment management.

2. **An integrated system can be built to fit a small, cash-based property without forcing it to
   change how it works.** Hivelet keeps the owner's own report layout, her paper receipt numbers
   and cash as the main way to pay, and treats online payment as optional and subject to her
   approval. Adopting the system therefore required no change to the owner's accounting practice.

3. **Automated verification is necessary when a system holds real financial records.** The most
   serious defects found during development gave no error on screen. They were found only because
   the system was checked against its own data and rules, and the checks now prevent them from
   returning. **Automated checks are necessary but not sufficient**: comparing each screen with
   the records it claims to show found five further defects, including a tenant payment history
   that showed nothing although every check had passed. [DATA PENDING: add the walkthrough result
   here, and state whether it confirmed the automated results.]

4. [DATA PENDING: conclusion on the ISO/IEC 25010 evaluation. State which characteristics scored
   highest and lowest, what the open comments said about the lowest, and what was changed as a
   result. Do not write a conclusion that the survey does not support.]

## 5.3 Recommendations

Based on the summary and conclusions of the study, the following are recommended:

**For the owner of the Fe Galang Da Silva Boarding House**

1. Check the five flagged receipt numbers against the paper receipt book so the records can be
   corrected. The system reports them on every verification run until they are resolved.
2. Answer the five remaining questions about how the business should work: whether report totals
   show monthly figures, year-to-date or both; when the garbage fee is charged; whether expense
   category totals restart every year; whether expense categories may be edited; and whether
   tenants may submit their own payment records.
3. Record the move-out dates of the four past tenancies that have none, since settling deposits
   on move-out depends on those dates.
4. Keep taking a backup before any change to the records, as the team has done throughout.

**For the continued development of the system**

5. Before accepting real GCash payments, move the Adyen account from test to live, which needs
   the account's live endpoint configured. Also let the system refund a GCash payment the owner
   rejects. In this version, rejecting a payment keeps it out of the records but does not return
   the money, which must be refunded from the Adyen Customer Area.
6. Move the remaining database logic out of the route files into separate service modules, which
   the system's architecture document sets as its target.
7. Add automated browser tests that sign in and perform each of the 26 walkthrough steps, so that
   every function that writes data is tested by a machine on every change and not only once by a
   person.
8. Consider sending notifications by SMS as well, since not every tenant opens the system daily.

**For future researchers**

9. Use this study's approach of checking a system against its own real data, not only against
   test cases. Several of the most important defects in this study would have passed ordinary
   testing.
10. Study offline recording, so that a payment taken where there is no signal can be saved on the
    device and sent once the connection returns.
11. Extend the evaluation over a longer period of real use, and measure whether the owner's time
    spent on record-keeping actually falls after adoption.
12. Study support for more than one property, for owners who manage several small buildings.
