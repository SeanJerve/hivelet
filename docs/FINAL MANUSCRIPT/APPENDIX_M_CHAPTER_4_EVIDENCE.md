# APPENDIX M: SUPPORTING EVIDENCE FOR CHAPTER 4

> **TEAM NOTE (delete before pasting).** Made on 12 October 2026 when Chapter 4 was cut to the course
> guide, which places indicator-level tables, full test cases and raw data in the Appendices. Every
> table below is copied word for word from the full chapter (commit `a7ce1e9`); only its number and
> caption changed. The old number is given beside each so that documents citing it can be followed.
> Letter M is the next free appendix letter after K (user manual) and L; confirm with the adviser.

This appendix holds the detailed results that Chapter 4 summarizes: the full functional walkthrough,
the rating of every survey item by every group of the second round (the users and the technical evaluators who rated the redesigned system, as in Chapter 4's Table 22; the first round is summarized in Tables M-28 and M-29), the measured evidence for each quality
characteristic, and every change made in response to the evaluation.

**Table M-1.** Results of the functional walkthrough (30 September 2026) (Chapter 4's Table 10 before 12 October 2026; summarized in Chapter 4, Section 4.3.4)

| Step | Function tested | Expected result | Actual result | Pass or fail |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Public unit catalogue browsing | 33 units listed without tenant names or sensitive details | As expected. | Pass |
| 2 | Public unit detail inspection | Correct rate, floor, and cluster; tenant names omitted (LB and LF verified) | As expected. | Pass |
| 3 | Public inquiry submission | Confirmation message displayed; rate limiter guards abuse | As expected. | Pass |
| 4 | Authentication negative test | Wrong current password rejected with inline message; session stays active | As expected. | Pass |
| 5 | Administrator password rotation | Password updated successfully; active session maintained | As expected. | Pass |
| 6 | Re-authentication with new credential | Successful sign-in using updated administrator password | As expected. | Pass |
| 7 | Unit rate update and audit trigger | Rate updated; database trigger writes immutable price history row | Not performed: the system's activity record shows no rate change that day, and the unit kept its ₱30,000 rate. | Not done |
| 8 | Tenant onboarding to vacant unit (PH) | Tenancy created; unit status transitions to Occupied | As expected. | Pass |
| 9 | Duplicate credential guard | Duplicate phone number registration rejected with validation message | As expected. | Pass |
| 10 | Tenancy details modification | Occupant count updated and persisted in database | As expected. | Pass |
| 11 | Tenant portal authentication | Tenant dashboard displays correct unit details, rate, and occupancy | Signed in after one mistyped password; the system required a new password, then showed the unit, rate and occupants. | Pass |
| 12 | Repair request with a photo | Request submitted with photo; size guard informs user if file is too large | As expected. | Pass |
| 13 | Repair request conversation | Follow-up message posted and displayed within the request conversation | As expected. | Pass |
| 14 | Tenant emergency contact update | Updated emergency contact saved and reflected in profile | As expected. | Pass |
| 15 | Online payment checkout initialization | Adyen Web Drop-in mounts inside modal and displays GCash button | The payment window opened with the GCash button; the attempt was not paid and was rejected, so nothing reached the ledger. | Pass |
| 15b | On-demand billing generation | Bill generated on demand matching unit rate plus ₱200/occupant water | A bill of ₱30,200 was raised (₱30,000 rent and ₱200 water for one occupant); removed after the test. | Pass |
| 16 | Notification state management | Notification marked as read; unread badge counter decrements | As expected. | Pass |
| 17 | Cross-tenant authorization perimeter | Accessing another tenant's repair request ID returns HTTP 404 (Not Found), not 403 | As expected. | Pass |
| 18 | On-site cash collection recording | Collection recorded against invoice REHEARSAL-001; bill marked settled | The collection of ₱30,200 was recorded and the bill settled. Water is worked out from the number of occupants and cannot be typed, so a wrong water amount could not be entered. | Pass |
| 19 | Duplicate invoice prevention | Re-submitting an identical invoice number is blocked with an explicit alert | As expected. | Pass |
| 19b | Receipt voiding and double-void guard | First void reverses ledger entry; second void attempt is rejected | The first void worked. The second window refreshed itself and no longer showed the receipt, so a second void could not be attempted; the refusal message was therefore not seen. | Pass |
| 20 | Inquiry processing and resolution | Administrator reply sent; inquiry status marked Closed | As expected. | Pass |
| 21 | Repair resolution and notification | Request advanced to Resolved; tenant receives resolution notification | Moved to In Progress, then Resolved; the tenant was notified that the repair was done. | Pass |
| 22 | Expense recording and allocation | ₱100 expense logged with property allocation; edits/deletion verified | Not performed as written: two separate expenses (₱60 and ₱40) were recorded instead of one ₱100 expense split 60/40, and neither was edited or deleted. | Not done |
| 22b | Expense allocation split derivation | Expense split across areas; total derived automatically via trigger | Not performed as written: two separate expenses (₱60 and ₱40) were recorded instead of one ₱100 expense split 60/40, and neither was edited or deleted. | Not done |
| 23 | Financial workbook export | income.xlsx and expenses.xlsx downloaded matching owner layout | As expected. | Pass |
| 23b | Fail-safe presentation on API interruption | Backend stopped; money tiles display "—" instead of misleading ₱0.00 | With the connection cut, the money tiles showed ₱0 and "Try again" instead of "—". | Fail |
| 24 | Tenant vacating and tenancy termination | Tenancy ended; unit returns to Available; end_date recorded | The test tenant was moved out and the unit showed Available. | Pass |
| 25 | Ledger baseline verification | Rehearsal records removed; ledger restored to exact 937 baseline rows | Done by the team after the session rather than on screen: the test tenant's bill, payments, voided receipt and repair were removed; the two test expenses of step 22 were voided on 1 October. | Not done |
| 26 | Unit rate restoration | PH rate restored to confirmed ₱30,000 rate card baseline | Not needed, because step 7 was not performed; the rate reads ₱30,000. | Not done |

**Table M-2.** Evaluation results for Functional Suitability, by item and group (Chapter 4's Table 14 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| The system lets me manage tenant records, units, and the number of occupants in each unit. | Landlady | 5.00 |  | Very High Quality |
| The system computes rent and water charges correctly, without me doing the arithmetic myself. | Landlady | 5.00 |  | Very High Quality |
| Payments I receive in person are recorded accurately against the correct unit and month. | Landlady | 5.00 |  | Very High Quality |
| Online payments made by tenants appear correctly for me to verify before they are settled. | Landlady | 5.00 |  | Very High Quality |
| Maintenance requests can be submitted, followed, and closed within the system. | Landlady | 5.00 |  | Very High Quality |
| The financial reports the system produces match the records I keep. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| I can see my own unit details, my bill, and what I still owe. | Tenants | 4.82 | 0.40 | Very High Quality |
| I can submit a maintenance request and follow what happens to it. | Tenants | 4.73 | 0.65 | Very High Quality |
| I can see a record of the payments I have made. | Tenants | 4.73 | 0.47 | Very High Quality |
| **Tenant mean** | | **4.76** | | Very High Quality |
| The system provides the functions required for tenant, unit, and occupancy management. | Technical | 5.00 | 0.00 | Very High Quality |
| Rent and water charges are computed correctly and consistently. | Technical | 5.00 | 0.00 | Very High Quality |
| Payment recording and verification behave correctly for both in-person and online payments. | Technical | 4.67 | 0.58 | Very High Quality |
| The maintenance ticketing workflow supports submission, tracking, and closure. | Technical | 5.00 | 0.00 | Very High Quality |
| Generated reports agree with the records held in the database. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **4.93** | | Very High Quality |
| I could find which kinds of units the boarding house has and how much they cost. | Prospects | 4.50 | 0.58 | Very High Quality |
| I could see enough about a unit (its floor, how many people can stay, its floor plan) to decide whether to ask about it. | Prospects | 4.00 | 1.41 | High Quality |
| I could send an inquiry about a unit without difficulty. | Prospects | 4.75 | 0.50 | Very High Quality |
| **Prospective tenant mean** | | **4.42** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **4.72** | | **Very High Quality** |

**Table M-3.** Measured evidence for Functional Suitability (Chapter 4's Table 14A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Functional completeness | Features named in Objective 2 that were implemented, X = A / B | 6 / 6 = 1.00 | Sections 4.2.2 to 4.2.7 |
| Functional completeness | Functional requirements implemented in full or in part, X = A / B | 41 / 44 = 0.93 (25 as worded); the other 3 reach the landlady in another form | Section 4.1.2 |
| Functional correctness | Report reconciliation checks that agreed with the database, X = A / B | 490 / 490 = 1.00 | Table 8 |
| Functional correctness | Executed walkthrough steps that gave the expected result, X = A / B | 24 / 25 = 0.96 | Table 10 |
| Functional correctness | Screens whose figures matched the database, after correction | 9 / 9, after 6 defects were corrected | Table 9 |
| Functional appropriateness | Tenant tasks completed, X = A / B | 34 / 34 = 1.00 | Table 11C |

**Table M-4.** Evaluation results for Performance Efficiency, by item and group (Chapter 4's Table 15 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| The system responds quickly when I move between screens. | Landlady | 5.00 |  | Very High Quality |
| Financial reports are produced without a long wait. | Landlady | 5.00 |  | Very High Quality |
| The system stays responsive even when many records are shown at once. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| The system opens quickly. | Tenants | 4.91 | 0.30 | Very High Quality |
| The system responds without delay when I move between screens. | Tenants | 4.91 | 0.30 | Very High Quality |
| **Tenant mean** | | **4.91** | | Very High Quality |
| Response times are acceptable for the expected number of users and records. | Technical | 5.00 | 0.00 | Very High Quality |
| Report generation completes within a reasonable time. | Technical | 5.00 | 0.00 | Very High Quality |
| The system uses client and server resources efficiently. | Technical | 4.67 | 0.58 | Very High Quality |
| **Technical evaluator mean** | | **4.89** | | Very High Quality |
| The website opens quickly. | Prospects | 4.75 | 0.50 | Very High Quality |
| The pages respond without delay when I move around the website. | Prospects | 4.75 | 0.50 | Very High Quality |
| **Prospective tenant mean** | | **4.75** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **4.89** | | **Very High Quality** |

**Table M-5.** Measured evidence for Performance Efficiency (Chapter 4's Table 15A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Time behavior | Longest time until a screen was usable, real devices | 3.05 s on a phone (tenant portal, first load); 2.30 s on a laptop (a year exported to Excel) | Table 11 |
| Time behavior | Time within which 95 percent of requests were answered under load | 0.52 s (public pages); 0.80 s (the landlady's data) | Table 11B |
| Resource utilization | Code a visitor's browser downloads for the payments page | About 20 kB; the 194 kB payment library only when a payment starts | Table 23 |
| Resource utilization | Script work on an emulated mid-range phone, the landlady's Overview | 0.7 s | Section 4.3.5 |
| Capacity | Failed requests with 12 simulated simultaneous users, X = A / B | 0 / 1,085 = 0.00 | Table 11B |
| Capacity | Failed requests with 6 simulated simultaneous readers of the landlady's records, X = A / B | 0 / 285 = 0.00 | Table 11B |

**Table M-6.** Evaluation results for Compatibility, by item and group (Chapter 4's Table 16 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| The system works correctly in the browser I normally use. | Landlady | 5.00 |  | Very High Quality |
| Reports exported from the system open correctly in my spreadsheet program. | Landlady | 5.00 |  | Very High Quality |
| I can use the system at the same time as the other applications on my device. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| The system works correctly in the browser I normally use. | Tenants | 4.73 | 0.47 | Very High Quality |
| I can use the system at the same time as my other apps. | Tenants | 4.73 | 0.65 | Very High Quality |
| **Tenant mean** | | **4.73** | | Very High Quality |
| The system operates correctly across current mainstream browsers. | Technical | 5.00 | 0.00 | Very High Quality |
| Exported files conform to formats that other applications can read. | Technical | 5.00 | 0.00 | Very High Quality |
| The system coexists with other applications without interference. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **5.00** | | Very High Quality |
| The website works correctly in the browser I normally use. | Prospects | 4.75 | 0.50 | Very High Quality |
| **Prospective tenant mean** | | **4.75** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **4.83** | | **Very High Quality** |

**Table M-7.** Measured evidence for Compatibility (Chapter 4's Table 16A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Co-existence | Not measured by a test; rated in the survey only | | |
| Interoperability | Device and browser combinations on which sign-in, the pages and installation worked, X = A / B | 5 / 5 = 1.00 (Android Chrome 154, iPhone Safari, Windows Chrome 154, Edge and Firefox 157); Samsung Internet not tried | Compatibility matrix, 30 September 2026 |
| Interoperability | Payment gateway message checks passed, X = A / B | 73 / 73 = 1.00 | Table 8 |
| Interoperability | Exported workbooks opened in a spreadsheet program in the landlady's layout | Opened (walkthrough step 23); 490 / 490 month-by-month checks against the database | Tables 8 and 10 |

**Table M-8.** Evaluation results for Usability, by item and group (Chapter 4's Table 17 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| I can tell what each screen is for without being taught. | Landlady | 5.00 |  | Very High Quality |
| The words and labels used match the way I actually talk about my property. | Landlady | 5.00 |  | Very High Quality |
| Before anything is changed or deleted, the system asks me to confirm and tells me what will happen. | Landlady | 5.00 |  | Very High Quality |
| When something goes wrong, the message tells me what to do about it. | Landlady | 5.00 |  | Very High Quality |
| I was able to learn the system without technical help. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| I can tell what each screen is for without being taught. | Tenants | 4.73 | 0.65 | Very High Quality |
| The words used in the system are easy to understand. | Tenants | 4.91 | 0.30 | Very High Quality |
| It is clear how much I owe and what the amount is made up of. | Tenants | 4.73 | 0.47 | Very High Quality |
| When something goes wrong, the message tells me what to do about it. | Tenants | 4.82 | 0.40 | Very High Quality |
| I was able to use the system without anyone explaining it to me. | Tenants | 4.64 | 0.67 | Very High Quality |
| **Tenant mean** | | **4.76** | | Very High Quality |
| The interface is understandable without prior training. | Technical | 4.67 | 0.58 | Very High Quality |
| Terminology is consistent across the system and appropriate to the users. | Technical | 5.00 | 0.00 | Very High Quality |
| Destructive actions require confirmation and state their consequence. | Technical | 4.67 | 0.58 | Very High Quality |
| Error messages are actionable rather than technical. | Technical | 5.00 | 0.00 | Very High Quality |
| The interface is operable for users with limited technical background. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **4.87** | | Very High Quality |
| I could tell what each part of the website is for without being taught. | Prospects | 4.75 | 0.50 | Very High Quality |
| The words used on the website are easy to understand. | Prospects | 4.75 | 0.50 | Very High Quality |
| When I made a mistake in the inquiry form, the message told me what to fix. | Prospects | 4.25 | 0.96 | Very High Quality |
| **Prospective tenant mean** | | **4.58** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **4.78** | | **Very High Quality** |

**Table M-9.** Measured evidence for Usability (Chapter 4's Table 17A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Appropriateness recognizability | Tenant tasks completed without help, X = A / B | 31 / 34 = 0.91 | Table 11C |
| Learnability | Tasks that needed help after the first sign-in and finding the unit | 0; all 3 tasks that needed help were among those first two | Table 11C |
| Operability | Mean wrong turns per task; median time per task | 0.2; 60 s | Table 11C |
| User error protection | Wrong inputs the system refused when tried, X = A / B | 3 / 3 (a duplicate phone number, a duplicate invoice number, a typed water amount); the double-void guard could not be reached from the screen | Table 10, steps 9, 18, 19 and 19b |
| User interface aesthetics | Not measured and not rated | | |
| Accessibility | Automated scans with a WCAG 2.2 level A or AA violation, X = A / B | 0 / 76 after the correction of 5 October 2026; Lighthouse accessibility score 100 | Sections 4.3.5 and 4.4.6 |

**Table M-10.** Evaluation results for Reliability, by item and group (Chapter 4's Table 18 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| The system is available whenever I need it during the day. | Landlady | 5.00 |  | Very High Quality |
| Records I enter are still there when I come back to them. | Landlady | 5.00 |  | Very High Quality |
| When information cannot be loaded, the system says so instead of showing a wrong amount. | Landlady | 5.00 |  | Very High Quality |
| After an interruption, nothing I had already recorded was lost. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| The system is available whenever I try to use it. | Tenants | 4.82 | 0.40 | Very High Quality |
| The information shown to me is correct and up to date. | Tenants | 4.55 | 0.93 | Very High Quality |
| When something cannot be loaded, the system says so instead of showing a wrong amount. | Tenants | 4.73 | 0.47 | Very High Quality |
| **Tenant mean** | | **4.70** | | Very High Quality |
| The system handles failure of a request without presenting incorrect data. | Technical | 5.00 | 0.00 | Very High Quality |
| Recorded data is retained reliably. | Technical | 4.67 | 0.58 | Very High Quality |
| The system distinguishes clearly between "no data" and "data could not be loaded". | Technical | 4.67 | 0.58 | Very High Quality |
| The system recovers from interruption without data loss. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **4.83** | | Very High Quality |
| The information shown (units, rates, availability) looks correct and up to date. | Prospects | 4.25 | 0.96 | Very High Quality |
| **Prospective tenant mean** | | **4.25** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **4.65** | | **Very High Quality** |

**Table M-11.** Measured evidence for Reliability (Chapter 4's Table 18A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Maturity | Critical defects among those found in testing, X = A / B | 0 / 35; 31 resolved, 1 open, 3 accepted | Table 23A |
| Availability | Not measured as a share of time over a period; rated in the survey only | | |
| Fault tolerance | Addresses that opened with no connection, X = A / B | 10 / 10 = 1.00 | Table 11A |
| Fault tolerance | A figure that could not be loaded shown as unavailable, not as ₱0 | Failed once on the testing day (step 23b); passed when re-tested on the landlady's laptop, 13 October 2026 | Tables 10 and 23A |
| Fault tolerance | A stalled save reports within the 45 seconds designed | iPhone within 45 s; Android after 60 to 80 s, corrected and on time when re-tested, 13 October 2026 | Section 4.3.7 |
| Recoverability | Ledger after a receipt was recorded and voided | Returned to its 937 rows and its previous total | Section 4.3.2 |
| Recoverability | Typed text kept when a send failed | Kept on both phones; sent once the connection returned on one | Section 4.3.7 |

**Table M-12.** Evaluation results for Security, by item and group (Chapter 4's Table 19 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| Only I can reach the financial records. | Landlady | 5.00 |  | Very High Quality |
| A tenant can see only their own information. | Landlady | 5.00 |  | Very High Quality |
| I can see a record of the actions taken in the system and who took them. | Landlady | 5.00 |  | Very High Quality |
| I can change my password myself when I need to. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| Access to functions and records is correctly restricted by role. | Technical | 5.00 | 0.00 | Very High Quality |
| A tenant account cannot reach administrative data. | Technical | 5.00 | 0.00 | Very High Quality |
| Administrative actions are recorded in an auditable trail. | Technical | 4.67 | 0.58 | Very High Quality |
| Credentials are handled and stored appropriately. | Technical | 5.00 | 0.00 | Very High Quality |
| Authentication and session handling follow accepted practice. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **4.93** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **5.00** | | **Very High Quality** |

**Table M-13.** Measured evidence for Security (Chapter 4's Table 19A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Confidentiality | Another tenant's record requested by its number | Answered "not found" (walkthrough step 17); each tenant saw only their own unit (C-02) | Tables 10 and 11D |
| Confidentiality | Protections a user meets that held when tried by hand, X = A / B | 12 / 12 = 1.00 | Later in this section |
| Confidentiality | Tables with row-level security and no rule opening them to a browser | Every table; no warning from the database's security advisor | Sections 4.2.6 and 4.4.4 |
| Integrity | Payment gateway messages accepted only with a valid signature: checks passed, X = A / B | 73 / 73 = 1.00 | Table 8 |
| Integrity | Requests that change data checked against a schema before use | Every one, in all 71 request handlers read | Later in this section |
| Non-repudiation, accountability | Administrator actions written to an audit trail the application cannot edit or delete | Every administrator action | Section 4.2.6 |
| Authenticity | Account after five wrong passwords | Locked for 15 minutes | Later in this section |
| Authenticity | Grades from three passive external scans | SSL Labs A+; Mozilla HTTP Observatory A+ (115, 12 of 12 tests); securityheaders.com A+ | Later in this section |
| All | High-severity problems found by the code review | 0 | Later in this section |

**Table M-14.** Evaluation results for Maintainability, by item and group (Chapter 4's Table 20 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| The codebase is organized so that a change can be located and made confidently. | Technical | 5.00 | 0.00 | Very High Quality |
| The system is documented sufficiently for another developer to maintain it. | Technical | 5.00 | 0.00 | Very High Quality |
| Changes to configurable values do not require code changes. | Technical | 4.33 | 1.15 | Very High Quality |
| Automated checks exist that would catch a regression. | Technical | 4.33 | 0.58 | Very High Quality |
| A change in one part of the system is unlikely to disturb unrelated parts. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **4.73** | | Very High Quality |

**Table M-15.** Measured evidence for Maintainability (Chapter 4's Table 20A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Modularity | Routes whose access comes from the one permission matrix, checked on every run, X = A / B | 55 / 55 = 1.00 | Section 4.2.6 |
| Modularity | Database calls made through service modules rather than inside the request handlers, X = A / B | 50 / 204 = 0.25; the administrator's handlers are one file of 5,120 lines | The server's code, counted 7 October 2026 |
| Reusability | Not measured and not rated | | |
| Analysability | Changes to the database kept as numbered, reviewable migrations | Every change; more than 70 by 5 October 2026 | Section 4.2.1 |
| Modifiability | The water rate changed without a change to the code | Changed in the settings | Section 4.2.4 |
| Testability | Automated suites that run against the live system without writing to it, passing, X = A / B | 20 / 20 = 1.00 | Table 8 |

**Table M-16.** Evaluation results for Portability, by item and group (Chapter 4's Table 21 before 12 October 2026; summarized in Chapter 4, Section 4.4.3, Table 22)

| Indicator | Rated by | Mean | SD | Interpretation |
| :--- | :--- | ---: | ---: | :--- |
| The system works on the devices I already own. | Landlady | 5.00 |  | Very High Quality |
| I can install the system on my phone without going to an app store. | Landlady | 5.00 |  | Very High Quality |
| I did not need to install any other software to use the system. | Landlady | 5.00 |  | Very High Quality |
| **Landlady mean** | | **5.00** | | Very High Quality |
| The system works on my own phone or computer. | Tenants | 4.91 | 0.30 | Very High Quality |
| I can open the system on more than one device. | Tenants | 4.73 | 0.65 | Very High Quality |
| I did not need to install anything extra to use it. | Tenants | 4.91 | 0.30 | Very High Quality |
| **Tenant mean** | | **4.85** | | Very High Quality |
| The system can be deployed to another environment without modification. | Technical | 5.00 | 0.00 | Very High Quality |
| The client installs on a mobile device without an application store. | Technical | 5.00 | 0.00 | Very High Quality |
| The system does not depend on software the target environment is unlikely to have. | Technical | 5.00 | 0.00 | Very High Quality |
| **Technical evaluator mean** | | **5.00** | | Very High Quality |
| The website works on my own phone. | Prospects | 4.75 | 0.50 | Very High Quality |
| I did not need to install anything to use it. | Prospects | 4.75 | 0.50 | Very High Quality |
| **Prospective tenant mean** | | **4.75** | | Very High Quality |
| **Users' composite (landlady, tenants, prospective tenants)** | | **4.87** | | **Very High Quality** |

**Table M-17.** Measured evidence for Portability (Chapter 4's Table 21A before 12 October 2026; summarized in Chapter 4, Section 4.4.5, Table 22A)

| Sub-characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Adaptability | Screens wider than the window at 360, 390, 768 and 1,366 pixels | 0 (seven public pages and the landlady's eight screens) | Section 4.3.6 |
| Adaptability | Kinds of device on which the same code ran | 3: a laptop in Chrome, an Android phone in Chrome, an iPhone in Safari | Section 4.2.7 |
| Installability | Installation requirements of a Progressive Web Application | Met; installed from the browser on an Android phone and an iPhone, with no app store | Tables 11A and Section 4.3.7 |
| Replaceability | The landlady's workbook reproduced by the system | Monthly Income and Monthly Expenses, exported in her layout and checked against the database month by month (490 / 490); she has not yet made it her main record | Section 4.2.4, Tables 8 and 25 |

**Table M-18.** Every optimization made in response to evaluation, with its finding (Chapter 4's Table 23 before 12 October 2026; summarized in Chapter 4, Section 4.4.6, Table 23)

| Source | Finding | Change made | Characteristic |
| :--- | :--- | :--- | :--- |
| Client review on a phone, 23 Sep 2026 | Edit buttons appeared only on mouse hover, so they did not exist on a touch screen | Buttons show on touch screens and stay hover-only on computers. Since 5 November 2026 a row or card opens when tapped or clicked, with no separate edit button | Usability |
| Client review on a phone, 23 Sep 2026 | The tenant register was wider than the phone screen | Tables become cards on small screens | Usability, Portability |
| Client review on a phone, 23 Sep 2026 | The payment form's buttons were hidden below the screen | Form height limited on phones so the buttons stay visible | Usability |
| Client review on a phone, 23 Sep 2026 | Forms with typed input had no close button | Every form can be closed; only the required first password change cannot | Usability |
| Performance review, 26 Sep 2026 | The payments page loaded the whole payment gateway library for every visitor | The library (about 194 kB) now loads only when a tenant starts an online payment; the page's own code is about 20 kB, measured on the live site on 28 Sep 2026 | Performance Efficiency |
| Final review, 26 Sep 2026 | A refused refund could be announced as successful; a receipt could be credited to the wrong tenant | Both corrected, with checks added | Reliability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A tenant's payment history showed no payments | Receipts from the ledger now shown with online payments | Functional Suitability |
| Screen audit, 26 Sep 2026 | Rental and personal expenses shared one column | Separate columns, as in the landlady's workbook | Usability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A placeholder date read as every tenant's move-in | Shown as not recorded until the real dates are entered | Reliability |
| Screen audit, 26 Sep 2026 | An opened GCash checkout was listed as a recorded payment | Listed as "GCash payment started" | Security (accountability of the audit trail) |
| Screen audit, 26 Sep 2026 | A voided receipt was listed to the tenant as a real payment | Voided receipts left out of the tenant's list | Reliability |
| Screen audit, 26 Sep 2026 | The Boarding House's remitted amount was halved on the income screen | Corrected to full rent plus water, read from the landlady's workbook formula | Functional Suitability |
| Screen audit, 26 Sep 2026 | The payments list would stop silently at 1,000 records | Read in batches, like the income list | Reliability |
| Requirements review, 26 Sep 2026 | The landlady could not record a repair she was told about in person, or one for an empty unit; a tenant was never told a repair was done | "Log a repair" added for any unit; the tenant is notified when the repair is marked done | Functional Suitability |
| Team review, 28 Sep 2026 | The two ledger pages were named "Money coming in" and "Money going out", which are not the landlady's words | Renamed "Monthly Income" and "Monthly Expenses", the names of the two sheets in her workbook | Usability |
| Team review, 26 Sep 2026 | The highlighted option in every dropdown was cut off at the sides | Outline drawn inside the option | Usability |
| Client review, 26 Sep 2026 | Tenants who had moved out still appeared in the tenant list, and every current tenant carried a "Living here" label | The list opens on current tenants only; moved-out tenants are shown only when chosen, and only unusual states carry a label | Usability |
| Client review, 26 Sep 2026 | The same page had different names in the menu, the browser tab and its own heading | Each page has one name, used in all three places | Usability |
| Client review, 26 Sep 2026 | A year chosen on one page did not carry to the others | One year choice now applies to the overview and both ledgers | Usability |
| Mobile review, 26 Sep 2026 | On phones, every tap flashed a grey box, short pages scrolled slightly, and the notification panel could end under the browser's toolbar | Tap highlight removed; pages and the panel sized to the visible screen height | Usability, Portability |
| Check review, 28 Sep 2026 | Two checks disagreed on how many ended tenancies had no end date (2 and 1): the tenant list never sent end dates, and one real record had none | The list now sends end dates; the record was given its date (migration 059); both checks now fail on any new case | Reliability |
| Team review, 28 Sep 2026 | The public FAQ offered online GCash payment while the gateway works only in Adyen's test environment | The FAQ now says online payments charge no real money yet and asks tenants to pay in person | Functional Suitability |
| Pre-testing audit, 29 Sep 2026 | Every tenant account shared one password that the development team had used, so a tenant given it could have signed in as a neighbor | Each tenant given their own starting password, handed over in person, with a new password required at first sign-in; every earlier session ended | Security |
| Lighthouse audit, 30 Sep 2026 | The public page jumped while it loaded: the footer showed on an empty page and was pushed down when the page arrived (layout shift 0.50; desktop performance score 76) | The page's space is held until it loads; layout shift 0, desktop performance score 95, measured on the live site | Performance Efficiency, Usability |
| Pre-testing audit, 29 Sep 2026 | A tenant who forgot their password had no way back in, and the landlady no way to help | The landlady can reset a tenant's password from the tenant list; the tenant gets a one-time password and chooses their own at next sign-in | Usability, Security |
| Pre-testing audit, 29 Sep 2026 | The window that makes a tenant set their own password did not say which password it wanted, and had no way out | It asks for the starting password by name and offers Sign out | Usability |
| Pre-testing audit, 29 Sep 2026 | On a weak signal a page or a save could wait for minutes with no message | Pages stop after 25 seconds and saves after 45, each with a message; a save that may have arrived asks the reader to check before sending it again | Reliability, Usability |
| Landlady's use, 30 Sep 2026 | A payment the landlady recorded, or a repair a tenant sent, did not appear on the other person's open screen until they refreshed it | Every open page checks for changes while it is on screen, every 5 seconds at first and every 2 seconds since 1 October, and reloads only what changed | Usability, Reliability |
| Walkthrough, 30 Sep 2026 (step 23b) | With the connection cut, the Overview's money tiles showed ₱0 instead of "—" | Not reproduced on 1 Oct 2026: on the current version, reloading the Overview with no connection shows "could not be loaded" on every tile and no ₱0. Re-tested on the landlady's laptop on 13 October 2026: passed | Reliability |
| Testing day on an Android phone, 30 Sep 2026 | On a connection that stops answering, the "cannot tell whether it was saved" message came after 60 to 80 seconds instead of 45 | Chrome slows the timers of a page that is not on screen, which a phone test takes the user out of; the deadline is now also checked against the clock the moment the page is on screen again, so a late message appears at once. Re-tested on the same Android phone on 13 October 2026: on time | Reliability |
| Team check of the evaluation account, 2 Oct 2026 | The tenant account prepared for the evaluators showed ₱30,400 owed, but paying online answered that there was nothing to pay: receipts voided on the testing day had left a payment counted against the bill | Online payment now skips a bill that is already covered and says when a receipt is missing; the account's bills were brought into line with its receipts (migration 077), with no other tenant's records changed | Functional Suitability, Reliability |
| Security review, 2 Oct 2026 | A request sent from another website received a server error (500) instead of a refusal | Refused with 403 before any route runs | Security |
| Security review, 7 Oct 2026 | A new password that met the length and character rules could still be a well-known breached one ("Password123" appears 1,505,362 times in Pwned Passwords) | A new password is checked against Pwned Passwords before it is saved; only five characters of its hash leave the server, and if the service cannot be reached the rules alone apply | Security |
| Technical evaluators, 3 Oct 2026 | On a phone, the light and dark mode switch sat at the foot of the footer, below every policy link | Moved to the top bar of every public page | Usability |
| Technical evaluators, 3 Oct 2026 | An email address was checked only when the form was sent | Checked as soon as the visitor leaves the field | Usability |
| Technical evaluators, 3 Oct 2026 | Links were underlined throughout the site | Underlines kept only in the footer; other links are shown in bold | Usability |
| Technical evaluators, 3 Oct 2026 | "Send one", the way to start an inquiry from the inquiry lookup page, did not stand out | Shown in bold | Usability |
| Technical evaluators, 3 Oct 2026 | Phone numbers were typed as one run of digits, and the inquiry form accepted any seven characters | Numbers are spaced as they are typed (0917 123 4567); an inquiry, and an emergency contact where one is given, must give a Philippine mobile number, checked on the page and again by the server | Usability, Functional Suitability |
| Technical evaluators, 3 Oct 2026 | Filters opened in a pop-up window and needed an Apply button | Each filter is a dropdown on the page that applies the moment it is chosen; on a phone the dropdowns open under the Filters button instead of in a window | Usability |
| Technical evaluators, 3 Oct 2026 | After a session ran out, signing in again did not return to the page that had been open | Signing in returns each person to the page they last had open | Usability |
| Technical evaluators, 3 Oct 2026 | Photos of any image format could be attached | JPG and PNG only, checked when the file is chosen and again by the server | Security, Functional Suitability |
| Technical evaluators, 3 Oct 2026 | A tenant could not withdraw a repair request | A tenant can cancel a request until work on it starts, at most once an hour, with an optional reason; the landlady is notified and the request is kept, marked as cancelled | Functional Suitability |
| Technical evaluators, 3 Oct 2026 | Moving a tenant out recorded no reason | An optional reason, kept in the activity record with the move-out | Functional Suitability |
| Technical evaluators, 3 Oct 2026 | Rows opened with "Show more" or "Show all" on the administrator's lists could not be hidden again | "Show fewer" returns the list to its first page | Usability |
| Technical evaluators, 3 Oct 2026 | Action history, and its error handling | Each person's Overview shows their own last three actions in plain words, each linking to where it happened ("Recorded a payment: 2B, October 2026, ₱8,800."); a refresh that fails for a moment keeps the figures already on screen; when the server refuses an entry, the message names the field and the reason ("Emergency contact phone: Enter a Philippine mobile number") instead of a technical code. Since October 2026 the three actions are listed in the side menu under Recently, as plain text | Usability, Reliability |
| Technical evaluators, 3 Oct 2026 | The footer was tall, with too much empty space | Spacing reduced and its columns placed side by side on a phone | Usability |
| Technical evaluators, 3 Oct 2026 | The privacy policy's list of contents crowded the page on a phone | On a phone the list opens from a side panel; on wider screens it stays beside the text | Usability |
| Survey, 30 September to 4 October 2026 | The technical evaluator rated all five Usability items 3, on 4 October | Answered before the fourteen changes above, eleven of them to usability, went live on 5 October; no further change | Usability |
| Survey, 30 September 2026 | The landlady rated 3 her telling what each screen is for, and learning the system, without help | No change to the screens; the user manual (Appendix K) describes every screen in her words, and training at hand-over is stage 4 of Table 25 (Chapter 5, recommendation 6) | Usability |
| Survey, 4 October 2026 | The technical evaluator rated 3 a failed request being handled without presenting incorrect data | The same defect as walkthrough step 23b (₱0 instead of "—"): not reproduced on 1 October, and passed when re-tested on the landlady's laptop on 13 October 2026 | Reliability |
| Survey, 30 September 2026 | A tenant asked for the deposit paid and the electric bill to be shown | Since 13 October 2026 the tenant can see the deposit held for their tenancy, on their Overview since 5 November; the electric bill stays outside the system, since each tenant pays the electric company directly (Section 4.2.4) | Functional Suitability |

**Table M-19.** The three iterations, phase by phase (Chapter 4's Table 6A before 12 October 2026; summarized in Chapter 4, Section 4.2.1). The first working version, from which the iterations started, was built from 24 July to 28 August 2026 (95 commits): the public site, the tenant and landlady portals, the ledgers, repairs, inquiries, notifications and audit trail, with 937 income rows and 1,327 expense allocations transferred from the landlady's workbook.

| Phase (Section 3.2) | Iteration 1: Verification and correction (12 to 14 Sep 2026, 107 commits) | Iteration 2: Consolidation and testing (15 Sep to 31 Oct 2026, 1,625 commits) | Iteration 3: Interface redesign (1 Nov 2026 onward) |
| :--- | :--- | :--- | :--- |
| Requirements | The landlady settled four questions on 13 September: 33 units, no grace period, no automatic rent increase, and tenants recorded without needing an email address | The landlady's answers of 17 and 19 to 20 September: the advance is the deposit, rent and water stay one bill, and a rate for each of the 33 units; acknowledgement receipts for payments with no invoice number (1 October) | The team's review of the deployed screens on a phone and a computer; no new requirement from the landlady. The team's own rules for past years and repairs are under Development |
| Design | The business rule register rebuilt, 49 rules each with its evidence; the automatic rent increase removed from scope | The landlady's review on a phone (23 September) and the design rules the screens now follow; the tenant and administrator overviews reworked | Translucent glass surfaces over a light green page, in light and dark themes; boxes kept for what needs attention and what is looked for at a glance; sign in, inquiry and conversation joined in one screen |
| Development | Fifteen defects in behavior corrected, among them a partial payment that left no debt and cash recorded with nothing written to the books; the Excel downloads | Adyen with GCash working end to end in Adyen's test environment, with no real money (26 September); updates checked every two seconds; offline reading; the breached-password check (7 October) | The restyle of every screen; an inquiry the landlady deleted now says so to its sender; a signed-in account is sent from the inquiry pages to its own portal. The move-in form no longer asks for an anniversary date, which the server always set to the move-in date. Each screen keeps the figures it has loaded for the visit, so returning to it does not wait for them. A record dated in a closed year can no longer be recorded, changed or deleted, and last year stays open until every December receipt is in. A GCash payment settles the oldest unpaid bill. A tenant can no longer cancel a repair once someone is sent. The landlady's Manage window no longer shows a repair's messages, and a tenant's note reaches her as a notification |
| Testing | Seven automated check suites, over 100 assertions, each defect covered by one | The screen-versus-database audit (26 and 29 September, six defects); 20 suites (29 September); the testing day with the landlady, three tenants and one prospective tenant (30 September); the technical evaluators' review (3 October) | All 114 test cases of Appendix L rerun on 4 November: none failed, 56 passed as written, 21 passed with wording the redesign had changed, and 37 need a person and were left for one. A click-by-click audit of every screen on 6 November. The 21 automated check suites passed after each change, and the screens were checked in light and dark at phone and desktop width. The page timings measured again on 10 November (Table M-31). A second round of users, 31 October to 10 November: ten tenants and four prospective tenants did the tasks, and sixteen answered the ISO/IEC 25010 questionnaire (Tables M-28 to M-30) |
| Deployment | Unchanged | Hosted on Vercel from 24 September; tenant accounts prepared on 29 September; in use beside the landlady's own records (Table 25) | The same site. Four corrections to the data, each a numbered migration applied after a backup and read back. Migration 088 (2 November) moved sixteen units into the kind of unit they really are, with the old kinds kept in the audit record. Migration 089 (4 November) removed old password hashes from 16 audit rows. Migration 090 (5 November) removed a rehearsal test tenant. Migration 091 (6 November) ended two receipts' rent periods a month after they start, as each was one month's rent |
| Review | 22 recorded errors in the submitted documents corrected; four standing rules for how the team works | The technical evaluators' 14 comments, all acted on by 5 October (Table 23); the ISO/IEC 25010 survey (Section 4.4) | The team's review of the screens. The users rated the redesigned system 4.82 overall and three technical evaluators 4.90, both Very High Quality (Table M-29) |

**Table M-20.** Quality in use (30 September 2026) (Chapter 4's Table 22B before 12 October 2026; summarized in Chapter 4, Section 4.4.5)

| Characteristic | Measure | Result | Source |
| :--- | :--- | :--- | :--- |
| Effectiveness | Tasks completed, X = A / B | 34 / 34 = 1.00; without help 31 / 34 = 0.91 | Table 11C |
| Effectiveness | The landlady's walkthrough steps executed that passed, X = A / B | 24 / 25 = 0.96 | Table 10 |
| Efficiency | Median time per task; mean wrong turns per task | 60 s; 0.2 | Table 11C |
| Satisfaction | Not measured with a satisfaction scale. The open answers: two of three tenants found nothing confusing during their tasks, and one said the system still felt lacking; on the survey form the landlady wrote "Beautiful system!" and a tenant named the ease of seeing their rent and asked for the deposit paid and the electric bill to be shown | | Sections 4.3.7 and 4.4 |
| Freedom from risk | Records of the landlady changed or lost by testing | None: the 937 income rows were untouched, and the records each test created were removed or voided afterwards by reviewed changes | Sections 4.3.2 and 4.3.4 |
| Context coverage | Contexts in which the tasks were done | The landlady's laptop in Chrome; an Android phone in Chrome; an iPhone in Safari; with no connection and on a stalled one; the landlady and two tenants at the same time (reading; saving at the same moment was not tested) | Sections 4.3.6 and 4.3.7 |

**Table M-21.** The 2011 characteristics and their place in ISO/IEC 25010:2023 (Chapter 4's Table 12C before 12 October 2026; summarized in Chapter 4, Section 4.4)

| ISO/IEC 25010:2011 (this evaluation) | ISO/IEC 25010:2023 | What changed |
| :--- | :--- | :--- |
| Functional Suitability | Functional Suitability | Unchanged |
| Performance Efficiency | Performance Efficiency | Unchanged |
| Compatibility | Compatibility | Unchanged |
| Usability | Interaction Capability | Renamed; user interface aesthetics became user engagement, accessibility was divided into inclusivity and user assistance, and self-descriptiveness was added |
| Reliability | Reliability | Maturity renamed faultlessness |
| Security | Security | Resistance added |
| Maintainability | Maintainability | Unchanged |
| Portability | Flexibility | Renamed; scalability added |
| (no counterpart) | Safety | New. Its fail-safe and hazard-warning sub-characteristics correspond to results reported here under Reliability: a figure that cannot be loaded is never shown as ₱0, and a save that may not have arrived says so (Sections 4.3.4 and 4.3.6) |

**Table M-22.** Simultaneous use by the landlady and tenants (30 September 2026, two tenants) (Chapter 4's Table 11D before 12 October 2026; summarized in Chapter 4, Section 4.3.7)

| Test (at the same moment) | Result |
| :--- | :--- |
| Every tenant opens their overview (C-01) | Pass: both screens loaded; the slowest in about 1 second |
| Each tenant sees only their own unit and records (C-02) | Pass: each saw only their own unit and account |
| Every tenant sends a message on a request (C-03, C-04) | Not performed: one tenant sent a note, and the landlady saw and answered it within a minute |
| The landlady changes two requests; only those tenants are notified (C-05) | Not applicable: by the landlady's decision a tenant is notified when a repair is done, not when it is started, so no notice was expected |
| A double tap on Send saves one message (C-06) | Not performed |
| The landlady opens a full year of Monthly Income while tenants are active (C-07) | Pass: loaded in about 3 seconds |
| The landlady on the laptop and tenants on phones at once (C-08) | Pass: no session affected another |

**Table M-23.** Test activities and the ISO/IEC 25010:2011 characteristics they measured (Chapter 4's Table 7D before 13 October 2026; summarized in Chapter 4, Section 4.3)

| Test activity (Section) | Test level | Characteristics measured (sub-characteristics) |
| :--- | :--- | :--- |
| Automated verification (4.3.1) | Unit and integration | Functional Suitability (correctness); Security (confidentiality, integrity, authenticity); Compatibility (interoperability); Maintainability (testability) |
| Use in the live environment (4.3.2) | System, in operation | Functional Suitability (correctness); Compatibility (interoperability); Reliability (recoverability) |
| Screen-versus-database audit (4.3.3) | System | Functional Suitability (correctness); Reliability (maturity) |
| Functional walkthrough (4.3.4) | System | Functional Suitability (completeness, correctness); Usability (user error protection); Security (confidentiality); Reliability (fault tolerance) |
| Responsiveness (4.3.5) | System | Performance Efficiency (time behavior, resource utilization) |
| Offline, installation, weak connections and simultaneous users (4.3.6) | System | Reliability (fault tolerance); Performance Efficiency (capacity); Portability (installability, adaptability); Usability (accessibility) |
| User acceptance testing (4.3.7) | Acceptance | Quality in use (effectiveness, efficiency, context coverage); Usability (learnability, operability); Security (confidentiality) |

**Table M-24.** Offline and installation behavior (29 September 2026) (Chapter 4's Table 11A before 13 October 2026; summarized in Chapter 4, Section 4.3.6)

| Test | Result |
| :--- | :--- |
| Installation requirements (manifest, service worker, icons) | Met; the service worker keeps 67 application files on the device after the first visit |
| Opening ten addresses with no connection | The application opened on all ten in about 1.5 seconds instead of the browser's "no internet" page |
| Tenant and administrator pages with no connection, signed out | The application opened and asked for sign-in; no personal or financial data was shown |
| Notice when the connection drops | Shown at once: "No connection. You can read what is already loaded, but nothing can be saved or paid until it is back." |
| Notice when the connection returns | "Back online" |
| Public unit list with no connection | Shown from the device's memory |
| Public unit list when the server stops answering | Shown from the device's memory after 3.1 seconds |
| Public page on a slow connection (400 kbps, 400 ms), first visit | Units on screen after 4.6 seconds |
| The same page, returning visitor | Units on screen after 0.3 seconds, because the installed application already holds its files |

**Table M-25.** Simulated simultaneous users, read operations (29 September 2026) (Chapter 4's Table 11B before 13 October 2026; summarized in Chapter 4, Section 4.3.6)

| Test | Simulated users at once | Duration | Requests | Errors | Slowest 5% took longer than |
| :--- | --: | --: | --: | --: | --: |
| Public pages and public data, live site | 12 | 60 s | 1,085 | 0 | 0.52 s |
| The landlady's ten main data requests, live database | 6 | 45 s | 285 | 0 | 0.80 s |

**Table M-26.** Simultaneous saves (19 and 24 September 2026) (Chapter 4's Table 11F before 13 October 2026; summarized in Chapter 4, Section 4.3.6)

| Test | Before the change | After the change |
| :--- | :--- | :--- |
| The same receipt sent twice at once, live system | Both saved: 2 rows | 1 saved, 1 refused: 1 row |
| The same receipt sent five times at once, live system | All five saved: 5 rows | 1 saved, 4 refused: 1 row |
| One receipt covering three months, live system | | Saved as 3 rows, June to August 2026, as before |
| Two GCash checkouts opened on one bill at once, payment code with a stand-in database | Both opened, so both payments could be recorded | 1 opened, 1 refused |
| A checkout 16 minutes after one was abandoned | | Opened: an abandoned checkout holds the bill for 15 minutes, not for good |

**Table M-27.** Corrections after the testing activities (13 October 2026; referred to in Chapter 4, Section 4.4.6)

| Found | What a person saw | Cause | Correction | Checked by |
| :--- | :--- | :--- | :--- | :--- |
| Audit of the live records against what each tenant's screen shows, 13 October 2026 | Two tenants were shown their August rent as overdue (₱7,450 and ₱10,400), although the landlady's receipts record both as paid on 12 and 25 August. Severity high: a wrong amount shown. The landlady's ledger itself was correct | Each bill was raised on 26 September, when the tenant opened the payment screen. The landlady's August receipts were added on 30 September by a transfer from her workbook, which writes the receipts directly; only a receipt recorded on the Monthly Income screen settles the bills it covers | The same day, after a backup: each bill was settled by a verified payment carrying its receipt's number and date, as the Monthly Income screen would have done, with an entry in the audit trail. The ledger was unchanged (952 receipts). The transfer script now lists any open bill its receipts would pay and will not run until that is acknowledged | A new automated rule compares every bill shown as owed with the receipts; it failed, naming the two units, when the correction was undone in a test, and passes on the live records |

**Table M-28.** Respondents before and after the redesign (summarized in Chapter 4, Section 4.4.1)

| Group | Before the redesign | After the redesign |
| :--- | --: | --: |
| Landlady | 1 | 1 |
| Tenants | 3 | 11 |
| Prospective tenants | 1 | 4 |
| Technical evaluators | 5 | 3 |
| **Total** | **10** | **19** |

The users before the redesign tested on 30 September 2026, and those after it from 31 October to 10 November 2026. The landlady answered both times. A prospective tenant who answered the landlady's section of the questionnaire by mistake is left out, since those items describe the landlady's use. The technical evaluators of the first round answered from 4 to 18 October 2026, and those of the second on 12 November 2026. Names are removed from the response files: `docs/TESTING_DAY/results/ROUND_1_...csv`, `ROUND_2_...csv` and `TECHNICAL_2026-11-12_...csv`.

**Table M-29.** Composite means before and after the redesign (summarized in Chapter 4, Section 4.4.3)

| Characteristic | Users before (5) | Technical evaluators before (5) | Users after (16, Chapter 4) | Technical evaluators after (3, Chapter 4) |
| :--- | --: | --: | --: | --: |
| Functional Suitability | 4.94 | 4.32 | 4.72 | 4.93 |
| Performance Efficiency | 4.56 | 4.27 | 4.89 | 4.89 |
| Compatibility | 4.56 | 4.53 | 4.83 | 5.00 |
| Usability | 4.49 | 4.20 | 4.78 | 4.87 |
| Reliability | 4.74 | 4.20 | 4.65 | 4.83 |
| Security | 5.00 | 4.36 | 5.00 | 4.93 |
| Maintainability | not rated | 4.32 | not rated | 4.73 |
| Portability | 4.96 | 4.53 | 4.87 | 5.00 |
| **Overall** | **4.75** | **4.34** | **4.82** | **4.90** |

Each users' composite is the mean of the group means of the landlady, the tenants and the prospective tenants, as in Chapter 3, and each users' overall is the mean of seven characteristics, since only the technical evaluators rated Maintainability. Security is the landlady's rating among the users. Every composite is Very High Quality on the scale of Chapter 3's Table 4A except the first round's technical evaluators' Usability and Reliability, 4.20, at the top of High Quality. All ten answers of the first round, taken as one group, rated the system 4.59.

**Table M-30.** Task results, second round (summarized in Chapter 4, Section 4.3.7)

| Task | Testers | Completed without help | Completed with help | Not completed | Mean wrong turns | Completion without help |
| :--- | --: | --: | --: | --: | --: | --: |
| **Tenants** | | | | | | |
| First sign-in and choosing a password (T-01, T-02) | 10 | 15 | 5 | 0 | 0.3 | 75% |
| Finding their unit, rent and balance (T-03, T-04) | 10 | 20 | 0 | 0 | 0.0 | 100% |
| Finding their payments (T-05, T-06) | 10 | 20 | 0 | 0 | 0.1 | 100% |
| Sending a repair request with a photo (T-07 to T-09) | 10 | 29 | 1 | 0 | 0.0 | 97% |
| Following up a request (T-10, T-11) | 10 | 20 | 0 | 0 | 0.0 | 100% |
| Checking their details and notifications (T-12, T-13) | 10 | 20 | 0 | 0 | 0.1 | 100% |
| Opening the GCash payment (T-14) | 10 | 9 | 1 | 0 | 0.0 | 90% |
| Staying out of the landlady's pages, signing out (T-15, T-16) | 10 | 18 | 2 | 0 | 0.2 | 90% |
| All tenant tasks | 10 | 151 | 9 | 0 | 0.1 | 94% |
| **Prospective tenants** | | | | | | |
| Understanding what the place is (PR-01) | 4 | 4 | 0 | 0 | 0.0 | 100% |
| Finding unit types, rates and availability (PR-02 to PR-04) | 4 | 12 | 0 | 0 | 0.0 | 100% |
| Reading one unit's details (PR-05) | 4 | 3 | 1 | 0 | 0.3 | 75% |
| Finding the water charge, location and contact (PR-06, PR-07) | 4 | 8 | 0 | 0 | 0.0 | 100% |
| Sending an inquiry and reading the reply (PR-08) | 4 | 4 | 0 | 0 | 0.0 | 100% |
| All prospect tasks | 4 | 31 | 1 | 0 | 0.0 | 97% |

From `docs/TESTING_DAY/results/ROUND_2_T_observations.csv`, computed by `scripts/survey/compute-uat.mjs` as Round 1 was. Time on task was not recorded reliably in this round, so no times are reported. Round 1's timed results stand in Section 4.3.7. A task finished after a neutral prompt counts as completed without help, after a hint as completed with help (Chapter 3). The landlady's tasks were not repeated: her results are Round 1's (Table M-1).

**Table M-31.** Page timings before and after the redesign (summarized in Chapter 4, Section 4.3.5)

| Screen | 30 September 2026, laptop (Chapter 4) | 10 November 2026, laptop | How it was timed on 10 November |
| :--- | --: | --: | :--- |
| Public home page, second load | 0.62 s | 0.35 s | Page fully loaded, from the browser's own timer |
| Sign-in to the landlady's Overview | 2.10 s | 2.63 s | From pressing Sign in until the Overview's figures were drawn |
| Monthly Income, one full year | 1.45 s | 1.42 s | From a fresh load of the page until the year's total and its records were drawn |
| Administrator's Overview, fresh load | not timed | 1.67 s | From a fresh load until every figure was drawn |
| Tenant portal, first load | 2.15 s | 1.19 s | From a fresh load until Amount due and the monthly charge were drawn |
| Tenant payments page | 1.20 s | 0.54 s | From the menu until the payment history was drawn |
| Administrator's Overview, layout shift | 0.22 (Lighthouse) | 0.08 | Measured in the browser while the page loaded. Below 0.1 counts as good |
| PageSpeed Insights, public page, phone (slow 4G) | 85 to 88, largest element 3.4 to 3.6 s | 85, largest element 4.2 to 4.4 s (two runs) | Google PageSpeed Insights, Lighthouse 13.6 |
| PageSpeed Insights, public page, desktop | 95 and 98, largest element 0.9 and 1.1 s (1 October) | 99, largest element 0.9 s | Google PageSpeed Insights |

On 30 September the times were taken with a stopwatch on a Dell XPS 15 over the boarding house's Wi-Fi. On 10 November they were taken from the browser's own performance timer, on a Windows 11 laptop in the Chromium browser of the Claude desktop app, on a different network, with the landlady and the test tenant signed in by a team member. The two days used different laptops, networks and timing methods, so the comparison shows the direction of the change, not an exact difference. The Excel export and sending a repair request were not timed again: the first saves a file and the second writes to the live records. No phone was timed by hand on 10 November.
