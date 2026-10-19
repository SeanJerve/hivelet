# 5 SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

This chapter summarizes the study, states the conclusions drawn from its results, and gives
recommendations for the owner, for the continued development of the system, and for future
researchers.

## 5.1 Summary

Small boarding houses that run on spreadsheets, paper receipts and messages are not served by the
property management systems on the market, which assume larger operations. This study designed,
developed and evaluated Hivelet, a web-based apartment management system delivered as a Progressive
Web Application, for the Fe Galang Da Silva Boarding House, a 33-unit property in Legazpi City. The
system was built in three Agile iterations with Vue, Express and PostgreSQL, pilot tested at the unit
and integration, system and acceptance levels, and evaluated on the eight characteristics of ISO/IEC
25010:2011 by the owner, three tenants, a prospective tenant and five technical evaluators. The results
are summarized below in the order of the specific objectives.

1. **The existing practices were analyzed.** The owner kept a two-sheet workbook on a USB flash
   drive and a paper invoice book, collected rent in cash, and received requests by message or in
   person. Transferring her records, 937 income rows and 1,327 expense allocations, showed that 43%
   of the income rows lacked an anniversary date and deposit and that five invoice numbers had each
   been used for two payments. The analysis produced 44 functional requirements and 49 business
   rules; graded against the code, 25 were implemented as worded, 15 in part, 1 in the interface only
   and 3 not as worded.

2. **The system was developed** with the six features the objective names: tenant and room
   management, booking and reservation management, financial tracking with optional online payment
   through Adyen with GCash, maintenance ticketing and notification, role-based access control, and
   Progressive Web Application support. It holds the owner's real records.

3. **The system was pilot tested.** Twenty automated check suites, run against the live system on 29
   September 2026, all passed, including 490 report reconciliation checks, and a screen-by-screen
   comparison with the live records found six defects the checks had missed, all corrected the same
   day. The owner performed the walkthrough herself: 24 of its 30 rows passed the first time, one
   failed and five were not performed as written. Three tenants completed every task they attempted,
   31 of 34 attempts without help. Of the 83 tests executed across the three levels, 82 passed (98.8
   percent), and no critical defect was found. Every screen measured was usable within about three
   seconds on a phone, and no request failed under twelve simulated simultaneous visitors or six
   simulated readers of the owner's records.

4. **The system was evaluated** by the five steps of ISO/IEC 25040: twenty-seven of the model's
   thirty-one sub-characteristics had a measured result and twenty-five were rated. The ten
   respondents rated the system 4.59 overall: Functional Suitability 4.79, Performance Efficiency
   4.48, Compatibility 4.55, Usability 4.42, Reliability 4.61, Security 4.68, Maintainability 4.32 and
   Portability 4.86. In response to feedback and testing, 51 changes were made, among them each of
   the technical evaluators' fourteen comments of 3 October 2026.

## 5.2 Conclusions

Based on the results of the study, the following conclusions were drawn:

1. **The first objective was achieved.** The existing practices were analyzed in all four areas the
   objective names, and every gap found was traced to a requirement and to the module that meets it
   (Chapter 4, Table 4-2). The main problem at the property was not the lack of a digital tool but the
   lack of connection between its records.

2. **The second objective was achieved.** All six features the objective names were developed and are
   in use on the owner's real records (Chapter 4, Sections 4.2.2 to 4.2.7). They keep her own report
   layout, invoice numbers and cash as the main way to pay, so using the system requires no change to
   how she keeps her accounts.

3. **The third objective was achieved.** The system was pilot tested for functionality,
   responsiveness and operational performance, and 82 of the 83 tests executed passed (98.8
   percent), above the course standard of 90 percent, with no critical defect (Chapter 4, Tables 4-12 and 4-20). The one failure, a ₱0 shown without a connection, appeared only on a real device in its
   user's hands, and it passed when re-tested on the owner's laptop.

4. **The fourth objective was achieved.** The system was evaluated on all eight characteristics of
   ISO/IEC 25010:2011 by the process of ISO/IEC 25040 and optimized in response. Its users rated it
   Very High Quality overall (4.59), with every characteristic Very High Quality on the scale
   of Chapter 3's Table 3-5 (Chapter 4, Tables 4-17 and 4-19). The ratings agree with the measured evidence on every
   characteristic, and they describe how ten people rated the system over three weeks, two of the
   four groups with one respondent each.

## 5.3 Recommendations

Based on the summary and conclusions of the study, the following are recommended:

**For the owner of the Fe Galang Da Silva Boarding House**

1. Keep the system's receipts up to date with her receipt book, entering each on Monthly Income,
   which also settles any bill it covers (Appendix M, Table M-27); the system can become her main
   record only once the two agree (Chapter 4, Table 4-22).
2. Keep taking a backup before any change to the records, as the team did throughout, and read the
   five flagged invoice numbers as history: they stay as she wrote them, and the system lists them on
   every verification run (Section 4.1.1).

**For the continued development of the system**

3. Before real money moves through the system, move the Adyen account from test to live and let the
   system refund a GCash payment the owner rejects; refunds were excluded from this study by its
   delimitation (Sections 1.4 and 4.3.2). Keep the sign-in token in a cookie that no script can read,
   and add a second sign-in factor for the administrator, the two weaknesses Chapter 4 names
   (Section 4.4.4).
4. Add automated browser tests that sign in and perform each of the 26 walkthrough steps, so that
   every function that writes data is tested on every change rather than once by a person. Extend
   the rule that refuses a second copy of a receipt to receipts with no invoice number and to
   acknowledgement receipts (Sections 4.3.3, 4.3.4 and 4.3.6). Keep a deleted repair request or
   inquiry as an archived record, as a voided receipt or expense already is, and let the owner list
   finished repairs by the dates they were resolved and closed. Call that action Void rather than
   Delete on Monthly Income, where the button and its warning still read as an erasure, and let the
   owner see the voided receipts. Record the agreed term of each tenancy, and warn the owner when a
   headcount exceeds the unit's capacity, which is now noted only in the audit log.
5. Make the pages appear faster on phones, where the public page's largest element was drawn at 3.4
   to 3.6 seconds and the owner's Overview moved as its figures arrived (a layout shift of 0.22), by
   pre-rendering the public page, serving the typefaces from the site itself and reserving the space
   each figure takes (Section 4.3.5). Keep the figures already loaded on the Overview, Monthly
   Income and the tenant's dashboard, so that returning to a page does not wait for them again.
6. Strengthen the two characteristics rated lowest (Section 4.4.3). Raise **Maintainability** (4.32)
   by moving the database work now written inside the request handlers, three calls in four, into
   service modules, one per kind of record, with the result reviewed by more than one developer, and
   give whoever evaluates it the architecture, the entity-relationship diagram and the data dictionary
   (Figures 4-2 and 4-6, Appendix N) together with the system. Raise
   **Usability** (4.42) by taking the owner through each screen with the user manual (Appendix K)
   before she uses the system alone, and by showing each new tenant first how to sign in and find
   their unit and rent, where the tenants needed help.

**For future researchers**

7. Check a system against its own real data, not only against test cases: the most important defects
   in this study passed every automated check and were found only by comparing each screen with the
   records it claimed to show (Section 4.3.3).
8. Evaluate over a longer period of real use with every tenant, including two people changing the
   same record at once, which this study did not test. Measure availability over months, the owner's
   time on record-keeping, and the two sub-characteristics no instrument here covered, user interface
   aesthetics and reusability. Build the instrument on ISO/IEC 25010:2023 (Chapter 4, Appendix M,
   Table M-21), and ask tenants what they find missing, as the survey did when one asked to see the
   deposit, which the system now shows (Sections 4.2.2, 4.3.6 and 4.4.5).
