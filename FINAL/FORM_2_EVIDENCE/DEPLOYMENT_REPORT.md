# Deployment report

**For Form 2, item 10** ("The system is deployed or pilot-tested in its intended environment") and the
**Proponent's Checklist, item 31** (installation and deployment notes for the turnover).
Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House.
Written 10 November 2026. The plan behind it is Chapter 4, Section 4.5 (Tables 4-21 and 4-22).

## 1. What is deployed, and where

| | |
| :--- | :--- |
| Address | **https://hivelet.vercel.app**, open to anyone for the public pages. The landlady and each tenant sign in with their own account |
| Application | Hosted on **Vercel** since 24 September 2026 (Appendix M, Table M-19) |
| Database | **PostgreSQL 17.6 on Supabase**. There is one database, the live one, holding the boarding house's real records |
| Online payment | **Adyen with GCash**, built and working end to end in **Adyen's test environment**. It takes no real money. It is optional and not live, because going live needs the owner's merchant onboarding documents, which the study did not do (Sections 1.4 and 4.5). Tenants pay rent in person |
| Installation on a phone | From the browser, with no app store: **Add to Home Screen** in Safari, **Install app** or **Add to Home screen** in Chrome (Section 4.2.7) |
| How a change is deployed | Every approved change is deployed automatically from the repository's main branch (Section 4.5) |

## 2. The intended environment, and what was used in testing

The boarding house needs no equipment beyond the landlady's own laptop and phone (Section 4.2.1).
Table 4-21 lists the requirements: a current browser and an internet connection for the landlady, the
tenants and visitors, and a computer that can run Node.js for backups and verification runs. It was
tested on the landlady's laptop, an Acer Nitro V 15 with Chrome, an Infinix GT20 with Android and
Chrome, an iPhone 15 and an iPhone 13 with Safari, the three tenants' own phones, and the team's
Windows 11 laptop with Chrome, Edge and Firefox.

## 3. What it holds today

Read from the live database on 10 November 2026, read-only:

| | |
| :--- | :--- |
| Units | **33**. All 33 show as occupied, one of them PH, where the team's test tenant stays until after the defense demonstration (B-106), so **32 are let to real tenants** |
| Income records | **979** rows (970 not voided). 937 were transferred from the landlady's workbook. The rest she and the team recorded in the system |
| Expense records | **1,379** entries split into **1,452** area allocations (1,327 allocations transferred) |
| Latest receipt recorded | 4 November 2026 |
| Accounts | 33 tenant accounts, each issued with its own starting password on 29 September 2026, and the landlady's |

## 4. Stages of the deployment (Table 4-22)

| Stage | Status on 10 November 2026 |
| :--- | :--- |
| 1. Environment preparation: hosting, database and gateway set up, security settings applied | Done |
| 2. Record transfer: the landlady's workbook, 937 income rows and 1,327 expense allocations | Done |
| 3. Pilot use beside the landlady's own records, differences investigated | In progress. The landlady keeps her own book while the system is new |
| 4. Training and hand-over: the landlady and tenants shown the system, the user manual (Appendix K) handed over, accounts issued | Done on 29 and 30 September 2026 |
| 5. Full transition: the system becomes the landlady's main record | Not yet. It runs beside her own records |

## 5. How the live records are protected

- **A backup before every change to the data**, and every change to the data or the structure is a
  numbered migration that can be read before it runs and is read back after. Migrations 088 to 091
  (2 to 6 November) were applied this way (Table M-19).
- **No credential is in the code or any document.** Gateway and database keys are kept in the hosting
  settings and passed between team members separately. A check for committed credentials runs before
  every commit.
- **21 automated check suites** test the rules, the records, the reports and the gateway, and are run
  after every change (Section 4.3.1).
- **The five historical receipt anomalies** in the landlady's workbook are kept exactly as she wrote them
  and reported on every verification run.

## 6. Installation notes, for the turnover

To run a copy on a computer (for development or a demonstration copy), with Node.js 22:

1. Get the repository from the team (Appendix Q gives its layout, and the Programming Adviser is given access to it for Form 2 item 11) and run `npm run install:all`.
2. Create the file `.env` from `.env.example`. It names the settings needed and holds none of their
   values: the Supabase address and keys, the sign-in token secret, the Adyen test keys and webhook
   credentials, and the addresses the site may be opened from. The team gives the values in person.
3. `npm run dev:backend` starts the server and `npm run dev:frontend` the screens.
4. `npm run check:all` runs the 21 check suites. Read the summary table it prints.

A copy for testing must use **its own database**, never the live one, and **its own Adyen webhook**,
never the one that serves the live site. The database structure must be taken from the live database
itself, not from `database/FULL_DATABASE_SCHEMA.sql`, which does not describe it.
