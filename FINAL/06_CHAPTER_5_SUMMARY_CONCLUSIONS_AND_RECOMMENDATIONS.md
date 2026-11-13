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
   rules. Graded against the final system, 33 of the requirements were implemented as worded, 9 in part
   and 2 not as worded, against 25 as worded early in the second iteration.

2. **The system was developed** in three Agile iterations with Vue, Express and PostgreSQL, with
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
   or six simulated readers of the boarding house's records. After the redesign, 107 of the 114 test cases were run again and none failed, and every screen timed again was ready
   sooner than before except sign-in. On the redesigned system, ten tenants and
   four prospective tenants completed every task, 151 of 160 and 31 of 32 attempts without help.

4. **The system was evaluated** by the five steps of ISO/IEC 25040: twenty-seven of the model's
   thirty-one sub-characteristics had a measured result and twenty-five were rated. In response to
   feedback and testing, 51 changes were made, among them each of the first technical evaluators'
   fourteen comments, and the third iteration then redesigned the screens. The fourteen users, the
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
   (Chapter 4, Table 4-2). The main problem at the property was not the lack of a digital tool but the
   lack of connection between its records.

2. **The second objective was achieved.** All six features the objective names were developed and are
   in use on the boarding house's real records, and they keep the landlady's own report layout,
   invoice numbers and cash as the main way to pay, so the system follows the way she already keeps
   the accounts (Chapter 4, Sections 4.2.2 to 4.2.7). The optional GCash payment is the one
   feature not in use with real money: it works end to end in Adyen's test environment, and going
   live needs the owner's merchant onboarding documents.

3. **The third objective was achieved.** The system was pilot tested for functionality,
   responsiveness and operational performance, and 82 of the 83 tests executed passed (98.8
   percent), above the course standard of 90 percent, with no critical defect (Chapter 4, Tables 4-12 and 4-20). The one failure, a ₱0 shown with the connection cut, passed when re-tested on the
   landlady's laptop. The redesigned system kept the result: none of the 107 test cases rerun after the redesign failed, every task of the second round was completed, and the landlady accepted
   the system and signed the acceptance form (Section 4.3.7).

4. **The fourth objective was achieved.** The system was evaluated on all eight characteristics of
   ISO/IEC 25010:2011 by the process of ISO/IEC 25040 and optimized in response (Chapter 4, Table 4-19).
   Its users rated it Very High Quality overall (4.84) and its technical evaluators Very High Quality
   overall (4.90), with every characteristic of both Very High Quality on the scale of Chapter 3's
   Table 3-5, and the measured evidence agreed on six characteristics and was less favorable on
   Security and Maintainability (Chapter 4, Tables 4-17 and 4-18). Both ratings are higher than the first
   round's, 4.75 and 4.34, which a smaller group and other technical evaluators gave on the system
   before the redesign, and they are the view of these seventeen respondents rather than of a wider
   population.

## 5.3 Recommendations

Based on the summary and conclusions of the study, the following are recommended:

**For the landlady of the Fe Galang Da Silva Boarding House**

1. Enter each receipt from her receipt book on Monthly Income, which also settles any bill it covers
   (Appendix M, Table M-27), so that the system's receipts agree with the book and the system can
   become her main record (Chapter 4, Table 4-22).
2. Have a backup taken before any change to the records, as the researchers did throughout, and treat the
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
   still read as an erasure (Appendix L, case A-25), and let the landlady see the voided receipts.
5. Make the public page appear faster on phones, where its largest element was drawn at 3.4 to 3.6
   seconds before the redesign and 4.2 to 4.4 seconds after it, by pre-rendering it and serving the
   typefaces from the site itself (Section 4.3.5).
6. Strengthen the characteristics rated lowest and the first sign-in (Section 4.4.3). Raise **Maintainability** (4.73, the technical evaluators' lowest)
   by moving the database work now written inside the request handlers, three calls in four, into
   service modules, one per kind of record, with the result reviewed by more than one developer, and
   give whoever evaluates it the architecture, the entity-relationship diagram and the data dictionary
   (Figures 4-2 and 4-6, Appendix N) together with the system. Make **Usability** (4.80 from the users, 4.20 from the technical evaluators before the redesign)
   easier still to learn by taking the landlady through each screen with the
   user manual (Appendix K) before she uses the system alone, and by showing each new tenant first how
   to sign in and find their unit and rent, where the tenants needed help, the first sign-in most of
   all in both rounds (Section 4.3.7). Raise **Reliability** (4.78, the users' lowest, whose lowest item was whether the information shown is correct and up to date)
   through recommendation 1, which keeps the figures tenants see in step with the receipt book.

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
