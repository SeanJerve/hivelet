# 5 SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

> **TEAM NOTE (delete every TEAM NOTE block before pasting).** **Cut to the course guide on 12
> October 2026** (*Writing and Defending Chapter 5*, v01): three to five pages in all; the Summary
> descriptive, past tense, one paragraph per objective; one conclusion per objective, one to three
> sentences, each echoing the objective, claiming achievement, citing the evidence and judging it
> against a criterion; five to eight recommendations, each with its basis; no citations; no number
> that is not in Chapter 4. The full version is commit `084dab8`. Replace the manuscript's current
> Chapter 5, which describes an auto shop booking application from another project, entirely.

This chapter summarizes the study, states the conclusions drawn from its results, and gives
recommendations for the landlady, for the continued development of the system, and for future
researchers.

## 5.1 Summary

Small boarding houses that run on spreadsheets, paper receipts and messages are not served by the
property management systems on the market, which assume larger operations. This study designed,
developed and evaluated Hivelet, a web-based apartment management system delivered as a Progressive
Web Application, for the Fe Galang Da Silva Boarding House, a 33-unit property in Legazpi City. The
results are summarized below in the order of the specific objectives.

1. **The existing practices were analyzed.** The landlady kept a two-sheet workbook on a USB flash
   drive and a paper invoice book, collected rent in cash, and received requests by message or in
   person. Transferring her records, 937 income rows and 1,327 expense allocations, showed that 43%
   of the income rows lacked an anniversary date and deposit and that five invoice numbers had each
   been used for two payments. The analysis produced 44 functional requirements and 49 business
   rules. Graded against the final system, 33 of the requirements were implemented as worded, 9 in part
   and 2 not as worded, against 25 as worded early in the first iteration.

2. **The system was developed** in two Agile iterations with Vue, Express and PostgreSQL, with
   the six features the objective names: tenant and room management, booking and reservation
   management, financial tracking with optional online payment through Adyen with GCash, maintenance
   ticketing and notification, role-based access control, and Progressive Web Application support.
   It holds the boarding house's real records. The GCash payment works end to end in Adyen's test environment
   and takes no real money. It is not live, because going live needs the owner's merchant onboarding
   documents.

3. **The system was pilot tested.** Twenty automated check suites, run against the live system, all
   passed, including 490 report reconciliation checks. A screen-by-screen comparison with the live
   records found six defects the checks had missed, all corrected. The landlady performed the walkthrough herself: 24 of its 30 rows passed the first
   time, one failed and five were not performed as written. Three tenants completed every task they
   attempted, 31 of 34 attempts without help. Of the 83 tests executed across the three levels, 82
   passed (98.8 percent), and no critical defect was found. Every screen measured was usable within
   about three seconds on a phone, and no request failed under twelve simulated simultaneous visitors
   or six simulated readers of the boarding house's records. After the redesign, 109 of the 114 test cases were run again and none failed, and every screen timed again was ready
   sooner than before except sign-in. On the redesigned system, ten tenants and
   four prospective tenants completed every task, 151 of 160 and 31 of 32 attempts without help.

4. **The system was evaluated** by the five steps of ISO/IEC 25040: twenty-seven of the model's
   thirty-one sub-characteristics had a measured result and twenty-five were rated. In response to
   feedback and testing, 51 changes were made, among them each of the first technical evaluators'
   fourteen comments, and the second iteration then redesigned the screens. The fourteen users, the
   landlady, ten tenants and three prospective tenants, rated the redesigned system 4.84 overall, Very
   High Quality. Of the characteristics all three user groups rated, Performance Efficiency was
   highest (4.86) and Reliability lowest (4.78). Three technical evaluators rated it 4.90 overall, Very
   High Quality, with Compatibility and Portability highest (5.00) and Maintainability lowest (4.73).
   Both groups rated every characteristic Very High Quality. Before the redesign, five users had rated
   the system 4.75 and five technical evaluators 4.34.

## 5.2 Conclusions

Based on the results of the study, the following conclusions were drawn:

1. **The first objective was achieved.** The existing practices were analyzed in all four areas the
   objective names, and every gap found was traced to a requirement and to the module that meets it
   (Chapter 4, Table 6). The main problem at the property was not the lack of a digital tool but the
   lack of connection between its records.

2. **The second objective was achieved.** All six features the objective names were developed and are
   in use on the boarding house's real records, and they keep the landlady's own report layout,
   invoice numbers and cash as the main way to pay, so the system follows the way she already keeps
   the accounts (Chapter 4, Sections 4.2.2 to 4.2.7). The optional GCash payment is the one
   feature not in use with real money: it works end to end in Adyen's test environment, and going
   live needs the owner's merchant onboarding documents.

3. **The third objective was achieved.** The system was pilot tested for functionality,
   responsiveness and operational performance, and 82 of the 83 tests executed passed (98.8
   percent), above the course standard of 90 percent, with no critical defect (Chapter 4, Tables 11E
   and 23A). The one failure, a ₱0 shown with the connection cut, passed when re-tested on the
   landlady's laptop. The redesigned system kept the result: none of the 109 test cases rerun after the redesign failed, every task of the second round was completed, and the landlady accepted
   the system and signed the acceptance form (Section 4.3.7).

4. **The fourth objective was achieved.** The system was evaluated on all eight characteristics of
   ISO/IEC 25010:2011 by the process of ISO/IEC 25040 and optimized in response (Chapter 4, Table 23).
   Its users rated it Very High Quality overall (4.84) and its technical evaluators Very High Quality
   overall (4.90), with every characteristic of both Very High Quality on the scale of Chapter 3's
   Table 4A, and the measured evidence agreed on six characteristics and was less favorable on
   Security and Maintainability (Chapter 4, Tables 22 and 22A). Both ratings are higher than the first
   round's, 4.75 and 4.34, which a smaller group and other technical evaluators gave on the system
   before the redesign, and they are the view of these seventeen respondents rather than of a wider
   population.

## 5.3 Recommendations

> **TEAM NOTE (5 Oct 2026).** Cut from sixteen to eight to meet the course guide. The eight cut, so
> the adviser can restore any: keeping backups and the five flagged invoice numbers (merged into 2);
> supplying the move-in dates (merged into 1); service modules and server-side cash flow (merged into
> 6 for Maintainability); SMS notifications (no finding supports it); keeping the security policy
> enforced (already done); keeping the in-person password reset (recommends no change); sign-in with
> Google (no finding behind it); offline recording of payments and more than one property (outside
> the scope in Section 1.4).
>
> **TEAM NOTE (16 Oct 2026).** Added to 4 and 5, still eight items: an outside technical reviewer
> (reached through Panelista) used the demo copy on 15 to 16 October and advised archiving
> instead of deleting, a dated history of finished repairs, and caching on the dashboards. His
> review came after the evaluation, so it is not in Chapter 4's data and the text does not cite it
> as a finding. Already true, for the defense: voiding a receipt or expense keeps it with who, when
> and why; every delete asks for confirmation; a unit with any history cannot be deleted. The lag
> he saw was partly the demo's own: its server ran in Washington, its database in Singapore.
>
> **TEAM NOTE (18 Oct 2026).** Added to 4 and 6, still eight items: a second outside reviewer, also
> after the evaluation, advised voiding instead of deleting payments, a tenancy's contract term and
> occupancy validation, and an ERD and architecture for judging maintainability. Checked in the
> code: the Monthly Income delete is already a void (`void_income_record`; kept with who, when and
> why), but its button says "Delete payment" and its warning says the receipt "cannot be brought
> back", which is why it read as a delete. A headcount over capacity is accepted and audited by
> design. The ERD and architecture are Figures 4-6 and 4-2; he was not sent them.
>
> **TEAM NOTE (12 Nov 2026).** Recommendation 4 keeps what the 15 October evaluator wrote on the
> questionnaire (archive, dated repair history, Void), now reported in Section 4.4.6. Left out, since
> no recorded finding supports them: record each tenancy's agreed term, and warn when a headcount
> exceeds the unit's capacity. Restore them if the adviser wants them. Also cut:
> the Summary's opening repeated the method and respondents that items 2 and 4 now give once.

> **TEAM NOTE (13 Nov 2026).** Each recommendation shortened to what a finding supports, as the
> panel asked not to overstate. Cut: the five flagged invoice numbers (2), receipts with no invoice
> number under the duplicate rule (4), the landlady's walk through the user manual and the
> Reliability line that only pointed back to 1 (6), handing the diagrams to a future evaluator (6),
> and the list of what a longer study should measure beyond availability and the landlady's time (8).
> The numbers are unchanged, so Chapter 4's references to recommendations 3 to 6 still hold.

Based on the summary and conclusions of the study, the following are recommended:

**For the landlady of the Fe Galang Da Silva Boarding House**

1. Enter each receipt from her receipt book on Monthly Income, so that the system's receipts agree
   with the book and the system can become her main record (Appendix M, Table M-27; Chapter 4,
   Table 25).
2. Have a backup taken before any change to the records, as the researchers did throughout (Section
   4.3.3).

**For the continued development of the system**

3. Take the GCash payment live, if the owner wants it, by completing Adyen's merchant onboarding with
   the owner's merchant onboarding documents, which this study did not do, and let the system refund
   a GCash payment the landlady rejects (Sections 1.4 and 4.2.4). Close the two weaknesses Chapter 4
   names: keep the sign-in token in a cookie that no script can read, and add a second sign-in factor
   for the administrator (Section 4.4.4).
4. Add automated browser tests that sign in and perform each step of the landlady's walkthrough
   (Section 4.3.3). As a technical evaluator advised (Section 4.4.6), keep a deleted repair request
   or inquiry as an archived record and list finished repairs by their dates, and call the Monthly
   Income action Void rather than Delete (Appendix L, case A-25).
5. Make the public page appear faster on phones, where its largest element took 4.2 to 4.4 seconds
   on slow 4G after the redesign, by pre-rendering it and serving its typefaces from the site itself (Section 4.3.5). Lighten the
   work the landlady's Overview does as it loads, which kept a simulated slow phone busy for 1.8
   seconds (Appendix L, case PF-10).
6. Raise **Maintainability**, the technical evaluators' lowest at 4.73, by moving the database work
   now written inside the request handlers into service modules, one per kind of record. Help each
   new tenant through the first sign-in, where tenants needed help most in both rounds (Sections
   4.3.7 and 4.4.3).

**For future researchers**

7. Check a system against its own real data, not only against test cases: the most important defects
   in this study passed every automated check and were found only by comparing each screen with the
   records it claimed to show (Section 4.3.3).
8. Evaluate over a longer period of real use with every tenant, measuring availability over months
   and the landlady's time on record-keeping, with an instrument built on ISO/IEC 25010:2023
   (Section 4.4; Appendix M, Table M-21).
