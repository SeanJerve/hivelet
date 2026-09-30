# 5 SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

> **TEAM NOTE (delete before pasting).** Written 2026-09-26 to replace the manuscript's current
> Chapter 5, which describes an auto shop booking application from another project, including
> ISO/IEC 25010 ratings (4.98, 4.43, 4.15) that are not Hivelet's. **Remove all of that text.**
> Items marked **[DATA PENDING]** wait on the walkthrough and the survey. Every conclusion must
> follow from a result in Chapter 4; if Chapter 4 changes, check this chapter again.
> **Checked again 2026-09-28** against the updated Chapter 4 (six screen-audit defects, all fixed;
> the decision to keep historical receipts as written; the owner's open questions).

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

3. **The system was pilot tested.** Twenty automated check suites, run against the live system on
   28 September 2026, all passed, including 490 report reconciliation checks, 78 access control
   and endpoint checks and 73 payment gateway checks. In live use the system raised a correct bill,
   recorded and voided a receipt without changing the ledger total, and was corrected the same day
   after the client reviewed it on a phone. A screen-by-screen comparison with the live records
   found six defects the automated checks had missed, and all six were corrected the same day.
   When testing ended, every record it had created was removed by one reviewed change, leaving the
   owner's 937 income rows untouched. Measured on the live system on 29 September 2026, the
   application opened without a connection and said plainly what it could not do, could be
   installed on a phone, and answered 1,085 requests from twelve simultaneous visitors and 285 from
   six simultaneous readers of the owner's records without a single error.
   [DATA PENDING: one sentence on the 26-step walkthrough, one on the tenants' task results, and
   one on the measured load times.]

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
   the records it claims to show found six further defects, including a tenant payment history
   that showed nothing although every check had passed. [DATA PENDING: add the walkthrough result
   here, and state whether it confirmed the automated results.]

4. [DATA PENDING: conclusion on the ISO/IEC 25010 evaluation. State which characteristics scored
   highest and lowest, what the open comments said about the lowest, and what was changed as a
   result. Do not write a conclusion that the survey does not support.]

## 5.3 Recommendations

Based on the summary and conclusions of the study, the following are recommended:

**For the owner of the Fe Galang Da Silva Boarding House**

1. Keep the five flagged receipt numbers in mind when reading older records. They stay exactly as
   she wrote them, and the system lists them on every verification run so that they are never
   mistaken for its own errors.
2. Answer the questions that remain about how her records are kept, collected in one list for a
   single sitting. The main ones are: whether the large figure at the bottom of her income sheet
   is a year-to-date total; whether she may add her own expense categories; whether tenants may
   report a cash payment for her to confirm; where the Penthouse's past spending belongs; whether
   Linda's fixed water counts as remitted money; whether the ₱2.56 million booked as personal in
   2025 is correct; and the three missing months of receipts for one unit.
3. Supply the move-in date of each current tenancy, which her workbook did not record, and the
   move-out date of the one past tenancy that has none, since settling a deposit on move-out
   depends on these dates.
4. Keep taking a backup before any change to the records, as the team has done throughout.

**For the continued development of the system**

5. Before accepting real GCash payments, move the Adyen account from test to live, which needs
   the account's live endpoint configured. Until then, a GCash payment made through the portal
   moves no real money. The public FAQ already tells tenants this and asks them to pay in person;
   keep that note until the account is live. Also let the system refund a
   GCash payment the owner
   rejects. In this version, rejecting a payment keeps it out of the records but does not return
   the money, which must be refunded from the Adyen Customer Area.
6. Move the remaining database logic out of the route files into separate service modules, which
   the system's architecture document sets as its target, and let one of them produce the cash
   flow and profitability figures (FR-019, FR-020) that the overview now computes in the browser.
7. Add automated browser tests that sign in and perform each of the 26 walkthrough steps, so that
   every function that writes data is tested by a machine on every change and not only once by a
   person.
8. Consider sending notifications by SMS as well, since not every tenant opens the system daily.
9. Keep the browser security policy enforced, and re-run the header scan against it. It was
   switched from reporting to enforcing on 30 September 2026, after a GCash checkout on the live
   site showed nothing it would block (Chapter 4, §4.4.8); any new outside service must be added
   to it first.
10. Keep the in-person password reset. The sign-in page answers "Forgot your password?" by sending
    a tenant to the owner, who issues a new one-time password from the tenant list (Chapter 4,
    §4.2.6); her own is reset by the team. A reset by email or SMS was left out on purpose: many
    tenants have no email, SMS needs a paid provider, and everyone concerned sees the owner in
    person. If tenants find asking her a burden, SMS is the channel to add. The lock on an account
    after five wrong passwords is kept in the database and survives a server restart; the count of
    attempts from one connection is kept in memory and does not, which could be moved to the
    database if the site grows.
11. Make the public page appear faster on phones. On a simulated slow mobile connection the page
    is drawn in the browser only after its code arrives (Chapter 4, §4.3.6). Phones were sent
    smaller photographs on 30 September 2026, which brought its largest element from 5.3 to 3.5
    seconds in PageSpeed Insights. Pre-rendering the page, and serving the two typefaces from the
    site itself instead of from Google's font service, whose stylesheet holds the first paint for
    about three quarters of a second, would shorten it further.

**For future researchers**

12. Use this study's approach of checking a system against its own real data, not only against
    test cases. Several of the most important defects in this study would have passed ordinary
    testing.
13. Study offline recording, so that a payment taken where there is no signal can be saved on the
    device and sent once the connection returns.
14. Extend the evaluation over a longer period of real use, and measure whether the owner's time
    spent on record-keeping actually falls after adoption.
15. Study support for more than one property, for owners who manage several small buildings.
