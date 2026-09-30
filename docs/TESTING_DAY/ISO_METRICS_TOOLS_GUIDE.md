# ISO/IEC 25010 measurements: what evidence each characteristic needs, and how to get it

**For the team, the testing day and the days after.** Written 2026-09-30. Chapter 4 §4.4 evaluates
Hivelet on the **eight product-quality characteristics of ISO/IEC 25010** with a survey (Tables 14 to
21). A survey score is an opinion; the panel will ask what backs it. This guide gives each
characteristic its **objective evidence**: what people did (observation), what the system measured
(the team's checks), and what independent websites report.

> **Which edition.** The eight characteristics used here (Functional Suitability, Performance
> Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, Portability) are those
> of **ISO/IEC 25010:2011**. The 2023 revision renamed some (Usability became *Interaction
> capability*, Portability became *Flexibility*) and added *Safety*. Check that Chapter 3 names the
> 2011 edition, so a panel member who knows the revision gets a straight answer.

**Passive tools only, on the live site.** Every website below reads the public site the way a browser
does. Never run an "active" scan, a crawler that fills in forms, or a password tester against
`hivelet.vercel.app`: it holds real records and would lock real accounts.

**For every measurement, record:** the tool, the exact URL tested, the date and time, the result
(grade or score), the device and network if it measures speed, and a **full-page screenshot** named
`ISO-<characteristic>-<tool>-<HHMM>.png` in the evidence folder `10_security_scans` or `09_performance`.

---

## Summary: the eight characteristics at a glance

| Characteristic | People (testing day) | The team's own measurement | Independent website | Already measured (29-30 Sep) |
| :--- | :--- | :--- | :--- | :--- |
| Functional suitability | Task success, Parts A, T, PR | Walkthrough (Table 10); 20 check suites | none needed | 18/18 suites pass; screens match the database |
| Performance efficiency | "Slow" comments (code S) | Timings on real devices (Table 11) | PageSpeed Insights; Lighthouse | Desktop 95; phone 86 on PageSpeed (LCP 3.5 s); 0 errors with 12 users |
| Compatibility | Which phones and browsers they used | Browser matrix CO-01 to CO-06 | BrowserStack (optional) | Chrome only, so far |
| Usability | Task success, time, wrong turns, help needed | Table 11C | WAVE; Lighthouse Accessibility | 0 WCAG A/AA violations on 15 screens |
| Reliability | Errors seen (code E) | Offline cases O-01 to O-12 | UptimeRobot | Offline 20/20; site up all morning |
| Security | Tenants reach only their own data (C-02, T-15) | Cases S-04 to S-12 | Mozilla Observatory; securityheaders.com; SSL Labs | Observatory A+ (115); SSL Labs A+ |
| Maintainability | none (technical evaluators) | The 20 suites; documentation | SonarCloud (optional) | Every measurement is a committed script |
| Portability | Installing on their phone (O-01 to O-03) | Installed-app checks | PWABuilder | Installable; 67 files cached offline |

---

## 1. Functional suitability: does it do what it should, correctly?

**Evidence:** the landlady's 26-step walkthrough (**Table 10**), task results of tenants and
prospects (**Table 11C**), and the automated suites (**Table 8**).

- On the day, fill Parts A, T and PR on the observation sheets (`OBSERVATION_PROTOCOL.md`).
- Correctness of money is proven by the suites, not by a website: `check:ledger` re-derives all 952
  income rows; `check:reports` compares the Excel exports with the database month by month (548/0 on
  30 Sep). **Do not run `check:all` on the testing day** (it signs in as the landlady).

**Reported as:** "N of 26 walkthrough steps passed the first time; tenants completed X% of tasks
without help."

---

## 2. Performance efficiency: is it fast enough, and does it hold up with several users?

### 2a. PageSpeed Insights (Google)

1. Open **https://pagespeed.web.dev**.
2. Paste `https://hivelet.vercel.app/public` and press **Analyze**. Wait about 30 seconds.
3. Two tabs at the top: **Mobile** (a simulated mid-range phone on a slow connection) and **Desktop**.
   For each tab, write down:
   - the four circles: **Performance, Accessibility, Best Practices, SEO** (0 to 100);
   - under *Diagnose performance issues*: **Largest Contentful Paint (LCP)**, **Total Blocking Time**,
     **Cumulative Layout Shift (CLS)**, **Speed Index**.
4. The top box *Discover what your real users are experiencing* will likely say **No Data**: Google
   only shows real-user data for busy sites. That is normal; report the lab figures.
5. Screenshot each tab.

What to expect (30 Sep, Chapter 4 §4.3.6 and case PF-09): **Mobile about 86 / 100 / 100 / 100, LCP
about 3.5 s** (PageSpeed at 10:15, after the phone photos were made smaller); desktop performance
about 95. Lighthouse run on the laptop with its slow-phone setting scored the phone page about 70
earlier that morning, before the photo change; the two are different runs, so report which tool
and time each number came from. A few points either way is the network. If the page says "quota exceeded", use 2b.

### 2b. Lighthouse in Chrome (also works on signed-in screens)

1. Open the page in **Chrome** on the laptop (for a signed-in screen, sign in first as usual).
2. Press **F12** (DevTools) > the **Lighthouse** tab (under `»` if hidden).
3. Mode **Navigation**, Device **Mobile** or **Desktop**, tick all four categories, press **Analyze
   page load**.
4. Screenshot the scores. Use an **Incognito window** with no extensions for the public pages, so
   browser add-ons do not lower the score.

### 2c. Real-device timings (Table 11)

The **timing sheet** (Form 4) and cases PF-01 to PF-08: three runs per screen on the laptop in
Chapter 3's Table 2 and the phone in Table 3; the middle run counts. In Chrome: F12 > **Network** tab >
tick **Disable cache** for a first load > reload > read **DOMContentLoaded** and **Load** at the
bottom bar; for "until usable", a stopwatch from the tap to the figures appearing. Then
`node scripts/survey/fill-timings.mjs timings.csv`.

### 2d. Several users at once

Already measured (Table 11B): 1,085 requests from 12 simultaneous users, 0 errors. On the day, the
simultaneous session (Part C) adds real people: note how long each screen took with everyone on.

---

## 3. Compatibility: does it work on the browsers and devices people actually use?

**Evidence:** the browser matrix, cases **CO-01 to CO-06**, filled from what testers really used
(Android Chrome, Samsung Internet, iPhone Safari, Windows Chrome and Edge, Firefox). Also: the Excel
exports open in Excel (A-29) (coexistence with other software).

**Optional, for browsers nobody brings: BrowserStack Live** (a free trial gives a few minutes per
browser).
1. **https://www.browserstack.com/live** > sign up for the free trial.
2. Choose a device (for example Samsung Galaxy, Samsung Internet) or a desktop browser (Firefox, Safari
   on macOS).
3. Type `hivelet.vercel.app`, do P-01 to P-05 (the public pages only; do not sign in to real accounts
   on a shared cloud device).
4. Screenshot each, and tick the matrix row as "BrowserStack".

---

## 4. Usability: can people use it without help, and is it accessible?

**Evidence:** the observation sheets are the main evidence here, far stronger than any website:
**completion without help, median time, wrong turns, help level** (Table 11C, from
`compute-uat.mjs`) and the quotes coded **C** (confusing) and **N** (lost). Accessibility is part of
usability in ISO/IEC 25010:2011.

### WAVE (WebAIM), accessibility of the public pages

1. Open **https://wave.webaim.org**.
2. Type `https://hivelet.vercel.app/public` and press the arrow.
3. The left panel shows counts: **Errors**, **Contrast Errors**, **Alerts**, Features, Structure, ARIA.
   Write down Errors and Contrast Errors (Alerts are suggestions, not failures).
4. Repeat for `/inquire`, `/category/studio`, `/login`, `/privacy`.
5. Screenshot the summary panel for each.

What to expect: the team's own scan (axe-core, the engine many tools use) found **0 WCAG A/AA
violations** on 7 public pages and the landlady's 8 screens on 29-30 Sep. WAVE uses different rules;
report what it says, including any error, and send it to Claude to check.

Signed-in screens: use Lighthouse's **Accessibility** score (section 2b), or the free WAVE browser
extension for Chrome.

---

## 5. Reliability: is it available, and does it fail safely?

**Evidence:** the offline and weak-signal cases **O-01 to O-12** on real phones; errors seen during
the sessions (code **E**); the fail-safe case A-30 (money tiles show "—", never ₱0.00); and availability
over time.

### UptimeRobot, availability through the testing week

1. **https://uptimerobot.com** > **Register for free** (one team member's email).
2. **+ New monitor** > Monitor type **HTTP(s)**.
3. Friendly name `Hivelet API`, URL `https://hivelet.vercel.app/api/health`, interval **5 minutes**.
   Create a second one for `https://hivelet.vercel.app/public`.
4. Leave it running from now until the manuscript is submitted.
5. Report: **uptime %** for the period, the number of incidents, and the average response time (the
   monitor's page shows all three). Screenshot the dashboard at the end.

Already measured: offline behaviour 20/20 (Chapter 4, Table 11A); the site answered every minute of
the testing morning (the read-only watch).

---

## 6. Security: are data and access protected?

**Evidence:** what people could and could not reach (C-02, T-15, T-16, A-22), the security cases S-04
to S-12, and three passive scans. Tenants do **not** rate Security in the survey; the landlady and the
technical evaluators do.

### 6a. Mozilla HTTP Observatory (security headers)

1. Open **https://developer.mozilla.org/en-US/observatory**.
2. Type `hivelet.vercel.app` (no `https://`) and press **Scan**.
3. Write down the **grade** (A+ to F), the **score** (can exceed 100 with bonus points) and **tests
   passed** (out of 12).
4. Open the **Scoring** tab: each row is a test (Content Security Policy, Cookies, HSTS, Redirection,
   Referrer Policy, X-Content-Type-Options, X-Frame-Options, and so on) with pass or fail.
5. Screenshot the grade and the Scoring table.

Expected (re-scanned 30 Sep 02:51 UTC, after the policy was enforced): **A+, 115, 12 of 12.**

### 6b. securityheaders.com

1. Open **https://securityheaders.com**.
2. Type `https://hivelet.vercel.app`, tick **Hide results** (keeps the scan off their public list) and
   **Follow redirects**, press **Scan**.
3. Write down the **grade** (A+ to F). The page lists the headers present (green) and any missing or
   warned (orange, red), with a line explaining each.
4. Screenshot the grade and the header lists.

### 6c. Qualys SSL Labs (HTTPS)

1. Open **https://www.ssllabs.com/ssltest/**.
2. Type `hivelet.vercel.app` in *Hostname*, tick **Do not show the results on the boards**, press
   **Submit**.
3. It tests each server address in turn (Vercel has more than one); wait until every one shows a grade
   (one to three minutes each).
4. Write down the **overall rating** for each address, and from the detail: the **protocols** (TLS 1.2
   and 1.3 only is good) and **HSTS** yes or no.
5. Screenshot the summary.

Expected (29-30 Sep): **A+** (one address A where HSTS was not seen during the scan).

### 6d. What the people part proves

Record, from the sessions: no tester ever saw another person's data (C-02); a tenant typing `/admin`
was sent back (T-15); after sign-out, Back showed nothing (T-16); a changed starting password no
longer worked (T-17). These are the security results that matter most to a boarding house.

---

## 7. Maintainability: can another developer keep it working?

**Evidence:** rated only by the **technical evaluators** (IT faculty, developers), who must be given
the repository and documentation before they answer (survey Section 4).

Give them: the GitHub repository link; `README.md`; `docs/04_ARCHITECTURE.md`; `docs/CODE_DOCUMENTATION.md`;
the list of the 20 check suites (Chapter 4, Table 8); `scripts/field-tests/README.md`.

**Optional, an objective code-quality grade: SonarCloud** (free for public repositories). Needs the
repository owner (Sean) to sign in with GitHub.
1. **https://sonarcloud.io** > **Log in with GitHub**.
2. **+** > **Analyze new project** > choose the organization > tick `hivelet` > **Set up**.
3. Choose **Automatic analysis** (no code change needed).
4. After a few minutes the project page shows ratings **A to E** for **Maintainability**, Reliability
   and Security, plus **Duplications %** and **Code smells**.
5. Screenshot the overview. Report the ratings as supporting evidence; explain any rating below B.

---

## 8. Portability: can it be installed and run where people are?

**Evidence:** installing on real phones (O-01 to O-03, Android and iPhone), opening from the icon,
and working offline (O-04 to O-10).

### 8a. PWABuilder (Microsoft), a report card for the installable app

1. Open **https://www.pwabuilder.com**.
2. Type `https://hivelet.vercel.app` and press **Start**.
3. It shows a report card: **Manifest**, **Service Worker** and **Security**, each with a score and a
   list of what is present. Write down the three scores and any red item.
4. Screenshot the report card. (Ignore its offer to package an app-store version; that is not needed.)

### 8b. Chrome's own check

F12 > **Application** tab > **Manifest**: the *Installability* section lists any problem (expected:
none) and shows the icons; **Service workers**: status *activated and is running*. Screenshot both.

---

## 9. The survey: turning answers into Tables 12 to 22

1. **Build the Google Form** with `docs/chapter 4 tenative/build_survey_form.gs` (two minutes; steps at
   the top of the file). It includes the groups: landlady (owner/administrator), tenants,
   **prospective tenants** (Section 5, added 30 Sep: 12 bilingual items on six characteristics, no
   Security or Maintainability because a visitor cannot see either), technical evaluators.
   **If the form was built before 30 Sep 2026, it has no prospects section.** Running the script
   again makes a *new* form (new links and QR code, empty responses); do that before anyone answers.
   If people have already answered the old form, keep it and add Section 5 by hand from
   `ISO_25010_SURVEY_INSTRUMENT.md` (the Q1 choice must be typed exactly as written there, or the
   scoring script will not recognise the group).
2. **Each item** is rated 1 (Strongly Disagree) to 5 (Strongly Agree).
3. **Weighted mean** per item: WM = Σ(f × w) / N; interpreted with Table 13: 4.21 to 5.00 Very High
   Quality; 3.41 to 4.20 High; 2.61 to 3.40 Moderate; 1.81 to 2.60 Low; 1.00 to 1.80 Very Low.
4. **Composite** per characteristic: method A, the mean of the group means (recommended, so one
   landlady is not outweighed by many tenants), or method B, the mean of every answer. The team
   chooses once (QUESTIONS_FOR_THE_TEAM Q11) and states it in §4.4.2.
5. **One command** does all of it from the exported CSV:
   `node scripts/survey/compute-survey.mjs responses.csv --method=A --out=tables.md`

---

## 10. Where each result goes in the manuscript

| Result | Chapter 4 |
| :--- | :--- |
| Walkthrough | §4.3.4, Table 10 |
| Timings | §4.3.5, Table 11 |
| Offline, installation, simultaneous users (already measured) | §4.3.6, Tables 11A, 11B |
| Tenant and prospect tasks; the simultaneous session | §4.3.7, Tables 11C, 11D |
| Survey | §4.4, Tables 12 to 22 |
| Security scans | §4.4.8 (supporting evidence) |
| PageSpeed, WAVE, UptimeRobot, PWABuilder, SonarCloud | The matching §4.4 section, as supporting evidence under its table |
| What was changed because of the results | Table 23 |
