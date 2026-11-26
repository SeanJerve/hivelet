# APPENDIX S: DEPLOYMENT PLAN DIAGRAM

The deployment plan of Section 4.5 is drawn in Figure S-1. Part A shows the five stages of Table
4-22 with the status each had when the paper was submitted. Part B shows the path a change takes to
the running system, on the same components as the system architecture in Figure 4-2. Part C shows
the turnover described in Section 4.5. The diagram adds nothing to the plan; each box restates
Section 4.5, Table 4-22 or Section 3.2, as listed in Table S-1.

*Figure S-1. Deployment plan: rollout stages, the path of a change to the running system, and turnover.*

![Deployment plan](<../../docs/FINAL MANUSCRIPT/figures/appendix-s-deployment-plan.png>)

The plan is built on two sources already reviewed in Chapter 2. Laudon et al. (2026) place
conversion, the change from the old system to the new, after testing, with the training and
documentation that go with it and then production and maintenance. Of the conversion strategies
they describe (parallel, direct cutover, pilot study and phased), this plan uses the parallel
strategy, which they consider the safest because the old system remains available if the new one
fails. Stage 3, which the plan calls pilot use, runs the system beside the landlady's own records,
and Stage 5 retires those records only once both agree. Pressman and Maxim (2020) set out principles
for deployment, two of which the plan follows directly. Users are given instructional materials,
here the user manual in Appendix K (Stage 4), and support is arranged before the software is
delivered, here the support for an agreed period under the memorandum of agreement (Part C). Part B
follows the same authors' account of version control and change control. Every change is recorded
in the project's version history before it is deployed, and every change to the database is a
numbered migration run after a backup.

**Table S-1.** Where each part of Figure S-1 is stated in the paper

| Part of Figure S-1 | Where the paper states it |
| :--- | :--- |
| A. Stages 1 to 5, their activities and their status | Table 4-22 |
| A. Stage 5 begins only when both records agree | Table 4-22, Stage 5 |
| B. A check for credentials runs before every commit | Section 3.2; Section 4.5, second risk |
| B. Changes kept in the version history (Git) and shared through GitHub | Section 3.2 |
| B. Every approved change deployed automatically from the main code branch to Vercel | Section 4.5 |
| B. Users reach the system in a browser at hivelet.vercel.app | Figure 3-14; Table 4-21 |
| B. A backup before any change to the data; every change a numbered migration reviewed before it runs | Section 3.2; Section 4.5, first risk |
| B. Supabase PostgreSQL database; Adyen with GCash in its test environment, takes no real money | Section 4.5; Table 4-21; Figure 4-2 |
| C. Accounts held by the research team until turnover, then passed to the landlady with the team member who is her son | Section 4.5 |
| C. Support for an agreed period under the memorandum of agreement | Section 4.5 |
