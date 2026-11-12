# 5 SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

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
   rules. Graded against the code, 25 of the requirements were implemented as worded, 15 in part, 1
   in the interface only and 3 not as worded.

2. **The system was developed** in three Agile iterations with Vue, Express and PostgreSQL, with
   the six features the objective names: tenant and room management, booking and reservation
   management, financial tracking with optional online payment through Adyen with GCash, maintenance
   ticketing and notification, role-based access control, and Progressive Web Application support.
   It holds the boarding house's real records. The GCash payment works end to end in Adyen's test environment
   and takes no real money. It is not live, because going live needs the owner's merchant onboarding
   documents.

3. **The system was pilot tested.** Twenty automated check suites, run against the live system on 29
   September 2026, all passed, including 490 report reconciliation checks. A screen-by-screen
   comparison with the live records found six defects the checks had missed, all corrected on 26
   September. The landlady performed the walkthrough herself: 24 of its 30 rows passed the first
   time, one failed and five were not performed as written. Three tenants completed every task they
   attempted, 31 of 34 attempts without help. Of the 83 tests executed across the three levels, 82
   passed (98.8 percent), and no critical defect was found. Every screen measured was usable within
   about three seconds on a phone, and no request failed under twelve simulated simultaneous visitors
   or six simulated readers of the boarding house's records. In the third iteration, a rerun of the 114 test cases on 4 November 2026 passed the 77 that need no person and found none failing, and every screen timed again on a laptop on
   10 November was ready sooner than before except sign-in. On the redesigned system, ten tenants and
   four prospective tenants completed every task, 151 of 160 and 31 of 32 attempts without help.

4. **The system was evaluated** by the five steps of ISO/IEC 25040: twenty-seven of the model's
   thirty-one sub-characteristics had a measured result and twenty-five were rated. The ten
   respondents of the first round, the landlady, three tenants, a prospective tenant and five technical
   evaluators, rated the system 4.59 overall: Functional Suitability 4.79, Performance Efficiency
   4.48, Compatibility 4.55, Usability 4.42, Reliability 4.61, Security 4.68, Maintainability 4.32
   and Portability 4.86. In response to feedback and testing, 51 changes were made, among them each
   of the technical evaluators' fourteen comments of 3 October 2026, and the third iteration then
   redesigned the screens. The sixteen respondents of the second round, the
   landlady, eleven tenants and four prospective tenants, rated the redesigned system 4.82, with
   Usability at 4.78, and all 26 answers together rated it 4.61.

## 5.2 Conclusions

Based on the results of the study, the following conclusions were drawn:

1. **The first objective was achieved.** The existing practices were analyzed in all four areas the
   objective names, and every gap found was traced to a requirement and to the module that meets it
   (Chapter 4, Table 4-2). The main problem at the property was not the lack of a digital tool but the
   lack of connection between its records.

2. **The second objective was achieved.** All six features the objective names were developed and are
   in use on the boarding house's real records, and they keep the landlady's own report layout,
   invoice numbers and cash as the main way to pay, so using the system requires no change to how she
   keeps the accounts (Chapter 4, Sections 4.2.2 to 4.2.7). The optional GCash payment is the one
   feature not in use with real money: it works end to end in Adyen's test environment, and going
   live needs the owner's merchant onboarding documents.

3. **The third objective was achieved.** The system was pilot tested for functionality,
   responsiveness and operational performance, and 82 of the 83 tests executed passed (98.8
   percent), above the course standard of 90 percent, with no critical defect (Chapter 4, Tables 4-12 and 4-20). The one failure, a ₱0 shown with the connection cut, passed when re-tested on the
   landlady's laptop, and the redesigned system kept the result: none of the 77 test cases rerun on 4 November 2026 failed, and every task of the second round was completed.

4. **The fourth objective was achieved.** The system was evaluated on all eight characteristics of
   ISO/IEC 25010:2011 by the process of ISO/IEC 25040 and optimized in response, and its ten
   respondents rated it Very High Quality overall (4.59), with every characteristic Very High Quality
   on the scale of Chapter 3's Table 3-5 and in agreement with the measured evidence (Chapter 4, Tables
   4-17 and 4-19). The sixteen answers of the second round, on the redesigned system, rated it 4.82, and
   all 26 answers together 4.61, so the rating held after the redesign, as the view of these
   respondents rather than of a wider population.

## 5.3 Recommendations

Based on the summary and conclusions of the study, the following are recommended:

**For the landlady of the Fe Galang Da Silva Boarding House**

1. Enter each receipt from her receipt book on Monthly Income, which also settles any bill it covers
   (Appendix M, Table M-27), so that the system's receipts agree with the book and the system can
   become her main record (Chapter 4, Table 4-22).
2. Have a backup taken before any change to the records, as the team did throughout, and treat the
   five flagged invoice numbers as history, kept as she wrote them (Section 4.1.1).

**For the continued development of the system**

3. Take the GCash payment live, if the owner wants it, by completing Adyen's merchant onboarding for
   GCash with the owner's merchant onboarding documents, which this study did not do, and moving the
   account from Adyen's test environment to live. At the same time, let the system refund a GCash
   payment the landlady rejects, since refunds were left out of this study and are made from the
   gateway's own dashboard (Sections 1.4 and 4.2.4). Move the sign-in token into a cookie that no
   script can read, and add a second sign-in factor for the administrator, the two weaknesses
   Chapter 4 names (Section 4.4.4).
4. Add automated browser tests that sign in and perform each of the 26 walkthrough steps, so that
   every function that writes data is tested on every change rather than once by a person. Extend
   the rule that refuses a second copy of a receipt to receipts with no invoice number and to
   acknowledgement receipts (Sections 4.3.3, 4.3.4 and 4.3.6). As a technical evaluator advised
   (Section 4.4.6), keep a deleted repair request or inquiry as an archived record, as a voided
   receipt or expense already is, and list finished repair requests by the dates they were resolved
   and closed. Call the Monthly Income action Void rather than Delete, since its button and warning
   still read as an erasure, and let the landlady see the voided receipts.
5. Make the public page appear faster on phones, where its largest element was drawn at 3.4 to 3.6
   seconds on 30 September and 4.2 to 4.4 seconds on 10 November, by pre-rendering it and serving
   the typefaces from the site itself (Section 4.3.5). The section's other speed findings were acted
   on in Iteration 3: each screen now keeps the figures it has loaded for the visit, and the landlady's
   Overview moves by 0.08 as its figures arrive, where it moved by 0.22 before (Appendix M, Table
   M-31).
6. Strengthen the two characteristics rated lowest (Section 4.4.3). Raise **Maintainability** (4.32)
   by moving the database work now written inside the request handlers, three calls in four, into
   service modules, one per kind of record, with the result reviewed by more than one developer, and
   give whoever evaluates it the architecture, the entity-relationship diagram and the data dictionary
   (Figures 4-2 and 4-6, Appendix N) together with the system. Raise **Usability** (4.42 in the
   first round, 4.78 in the second) by taking the landlady through each screen with the user manual
   (Appendix K) before she uses the system alone, and by showing each new tenant first how to sign in
   and find their unit and rent, where the tenants needed help, the first sign-in most of all in both
   rounds (Section 4.3.7).

**For future researchers**

7. Check a system against its own real data, not only against test cases: the most important defects
   in this study passed every automated check and were found only by comparing each screen with the
   records it claimed to show (Section 4.3.3).
8. Evaluate over a longer period of real use with every tenant, including two people changing the
   same record in different ways at once, which this study did not test. Measure availability over
   months, the landlady's time on record-keeping, and the two sub-characteristics no instrument here
   covered, user interface aesthetics and reusability. Build the instrument on ISO/IEC 25010:2023
   (Section 4.4 and Appendix M, Table M-21), and ask tenants what they find missing, as the survey
   did when one asked to see the deposit, which the system now shows (Sections 4.2.2, 4.3.6 and
   4.4.5).
