# Study guide: every reference in the paper

For studying before the defense. Each of the 35 references below has what it is, what it found,
how our paper uses it, where it is cited, and what to say if a panelist asks. Written 13 October
2026 from each source's abstract, first page or Crossref record.

**How sure each summary is.** *Checked* means it was read from the abstract, the first page or the
publisher's record. *Title only* means the source could not be opened here: **someone must read it
before the defense**. Even for checked sources, skim the real paper once: a panel can ask about
anything in it, not only what we quote.

---

## Start here: the five to know cold

If you only have time for five, learn these. They carry the paper.

1. **Burke (2026)**: the property management problem. Cited in six sections, across Chapters 1, 2 and 4.
2. **Magno et al. (2024)**: the closest Philippine apartment system. Cited in eight sections.
3. **Pernate et al. (2025)**: the closest Philippine boarding house app, also rated with ISO/IEC 25010.
4. **Canlas et al. (2026)**: the closest study overall (Philippine dormitory, Agile, ISO/IEC 25010,
   tenants plus administrators plus IT professionals). Chapter 4 compares our 4.53 with it.
5. **ISO/IEC 25010:2011**: the quality model the whole evaluation stands on.

---

## A. Property, apartment and boarding house studies

### Burke (2026) *(checked)*
- **What it is:** a journal article (*American Journal of Industrial and Business Management*, USA)
  on the management of apartment complexes of 50 to 500 units. Mixed methods: a literature review
  and a case study.
- **What it found:** apartment complexes face operational, tenant, regulatory, labor and technology
  challenges that differ from those of commercial properties; it names five research gaps.
- **How we use it:** administrative work grows with the size of a property, and the paper's problem
  is fragmentation across those areas.
- **Cited in:** 1.1, 2.1.1, 2.1.2, 2.1.6, 2.2, 4.1.1.
- **If asked:** "Burke shows apartment management is its own problem, not a smaller version of
  commercial property management; our owner's case, 33 units run by one person, is the small end of
  that."

### Magno, Pelayo and Soberano (2024) *(checked)*
- **What it is:** a Philippine study (State University of Northern Negros) that built a rental
  management system for an apartment owner whose records were inaccurate and disorganized. Rapid
  Application Development.
- **What it found:** the system was implemented and the lessors accepted it as a way to reduce
  conflicts and manage the property more efficiently.
- **How we use it:** the closest local example of digitizing an apartment's records; Chapter 4
  (4.3.3) notes that our records were already digital in one database, yet six screens disagreed
  with it, so digitizing alone did not make the records agree.
- **Cited in:** 1.1, 2.1.1, 2.1.2, 2.1.3, 2.1.6, 2.2, 4.1.1, 4.3.3.
- **If asked how ours differs:** "Theirs digitizes transactions and tasks; ours also covers booking
  inquiries, repair requests, online payment and the tenants' own accounts."

### Pernate, Rosales, Aya-ay and Artigas (2025), BH Niyo App *(checked)*
- **What it is:** a Philippine study (Eastern Visayas State University, Ormoc City): a mobile app
  for finding and renting boarding house rooms.
- **What it found:** before it, rooms were found through newspapers, posters, friends and social
  media. The app gives real-time listings, booking and digital transactions; built with Agile,
  evaluated with ISO/IEC 25010. Owners rated it Excellent, tenants Very Good; 98% accuracy in
  real-time availability.
- **How we use it:** how tenants find rooms (2.1.4), the same channels our owner used (4.1.1), and
  a housing system rated with ISO/IEC 25010 (2.1.6).
- **Cited in:** 1.1, 2.1.4, 2.1.6, 2.2, 4.1.1.
- **If asked how ours differs:** "BH Niyo covers finding and booking a room; ours also runs what
  happens after the tenant moves in: bills, receipts, repairs."

### Canlas, Andres, Kato, Vinuya and Rivera (2026), FixHub *(checked)*
- **What it is:** a Philippine study (*International Journal for Multidisciplinary Research*): a
  maintenance reporting system for dormitories.
- **What it found:** built with Agile; evaluated with ISO/IEC 25010 and the Technology Acceptance
  Model through surveys of tenants, administrators and IT professionals, who rated it very highly
  on every criterion. Scope: maintenance concerns, emergency alerts, complaints.
- **How we use it:** the closest study to ours in method and respondents; Chapter 4 says our 4.53 is
  in the same range.
- **Cited in:** 2.1.4, 2.1.6, 4.4.3.
- **If asked:** "It is the nearest comparison: same kinds of respondents, same quality model. Its
  scope is maintenance; ours integrates maintenance with billing, tenants and booking, and we also
  measured each characteristic, not only rated it."

### Puspasari et al. (2025) *(checked)*
- **What it is:** an Indonesian study (National Institute of Technology Malang, with a Taiwanese
  co-author): a web-based boarding house information system in Laravel.
- **What it found:** it monitors room status and sends billing notifications through WhatsApp; the
  only user is the boarding house manager.
- **How we use it:** an example of the gap (2.2): tenants have no access to it.
- **Cited in:** 2.2.

### Mangca (2023a and 2023b) *(checked)*
- **What they are:** two papers by one author (Surigao del Norte State University, Philippines) on
  one boarding house booking system. 2023b is its design (Laravel, SMS notifications); 2023a its
  assessment by boarders and owners.
- **What they found:** users found it convenient; the notifications reduced miscommunication; minor
  problems with the interface and the accuracy of information. Usability 4.5, functionality 4.3,
  maintainability 4.4 out of 5.
- **How we use them:** how tenants find and book rooms (2.1.4); a single-purpose system (2.2).
- **Cited in:** 1.1 (2023b), 2.1.4 (both), 2.2 (2023b).
- **If asked why "a" and "b":** APA marks two works by the same author in the same year with letters,
  in the order of their titles.

### Saputra, Susanto and Pradana (2025) *(checked)*
- **What it is:** an Indonesian study (*Bit-Tech*): a web-based room management system for one
  boarding house, in Laravel and MySQL.
- **What it found:** it handles room data, tenant registration, payment invoices and complaints. In
  testing with the administrator and ten tenants, 90% were satisfied, and the system reduced
  workload and data entry errors.
- **How we use it:** recorded complaints become traceable requests (2.1.4); a comparison for our
  repair requests (4.2.5).
- **Cited in:** 2.1.4, 2.1.6, 2.2, 4.2.5.

### Caparos, Gabriel, Prudente and Romero (2025) *(checked)*
- **What it is:** a Philippine study (South East Asian Institute of Technology, South Cotabato): a
  cloud-based property management system for a real estate business in Region XII.
- **What it found:** staff rated it positively on usability, security, operational efficiency and
  tenant experience, security highest (mean 3.50). Features: automated billing, access controls,
  real-time tenant communication.
- **How we use it:** a local property system with billing and tenant communication (2.1.3).
- **Cited in:** 2.1.3.

### Encarnacion, Laulita, Cruiz and Quinte (2025) *(title only)*
- **What it is:** a conference paper (IEICES proceedings) on the design and evaluation of an online
  payment monitoring system for student boarding houses near a university campus in the Philippines.
- **How we use it:** a structured payment monitoring system improves oversight (2.1.3); our ledger
  results agree (4.2.4).
- **Cited in:** 2.1.3, 2.1.6, 4.2.4. **Read it:** confirm it reports organized ledgers, payment
  summaries and transaction visibility, as 2.1.3 says.

### Setty (2022) *(title only)*
- **What it is:** a master's capstone project (Governors State University, USA): a management system
  for an apartment.
- **How we use it:** centralized financial records improve transparency and reduce errors (2.1.3).
- **Cited in:** 2.1.1, 2.1.3, 2.1.6, 2.2, 4.2.4. **Read it:** confirm what 2.1.3 says it explains.

### Pavia et al. (2022) *(checked)*
- **What it is:** a Philippine study (Bicol College, *JPAIR*): a property management system for a
  mock hotel run by hospitality students, with RFID. Rapid Application Development.
- **What it found:** positive feedback on design, functionality and user-friendliness.
- **How we use it:** system-based management works in a controlled school setting, unlike a real
  boarding house.
- **Cited in:** 1.1, 2.1.1. **If asked why a hotel study:** "It is the local property management
  system closest to us in Bicol; we cite it for the contrast in setting."

### Thevaraju, Zakaria, Sukri and Kasim (2019) *(checked)*
- **What it is:** a Malaysian study (*IJASCE*): the Vista Angkasa Apartment, eight blocks and more
  than 1,000 units, whose maintenance transactions were recorded by hand.
- **What it found:** a PHP web system, built with Agile, for apartment and tenant data, maintenance
  requests, notices and complaints, tested with real data at the apartment.
- **Cited in:** 2.1.1.

### Altinay, Arslan and Sharma (2024) *(checked)*
- **What it is:** a qualitative study (*Sustainability*): interviews with 150 dormitory residents at
  two universities.
- **What it found:** dormitory management needed better information management, communication and
  service quality; it proposes digital communication platforms, regular maintenance schedules and
  more transparent finances.
- **Cited in:** 2.1.4.

### Jing and Lim (2021) *(checked)*
- **What it is:** a survey study (*Turkish Journal of Computer and Mathematics Education*) of
  residents of high-rise apartments in Chinese cities.
- **What it found:** management service quality affects residents' satisfaction and willingness to
  recommend; the quality of the management **process** matters most, more than the environment.
- **How we use it:** responsiveness to residents matters; our repair requests carry a status from
  sending to closing (4.2.5).
- **Cited in:** 2.1.4, 2.1.6, 4.2.5.

### Kotkar et al. (2026) *(checked)*
- **What it is:** an Indian study (*IJERT*): a student rental platform. Its title says MERN, but the
  paper builds it on Android with Firebase.
- **What it found:** room search by location and budget, verified logins, contact with owners; no
  quantitative evaluation.
- **Cited in:** 1.1. **If asked:** we cite it only for rental platforms centralizing data in real
  time.

### Ullah, Sepasgozar and Wang (2018) *(checked)*
- **What it is:** a systematic review (*Sustainability*) of 213 studies on smart real estate
  technology: nine technologies (drones, IoT, cloud, SaaS, big data, 3D scanning, wearables,
  VR/AR, AI and robotics) and their stakeholders.
- **What it found:** real estate still needs to improve its adoption of digital technologies to
  move from traditional to smart practice.
- **Cited in:** 1.1, 2.1.1. **Careful:** it is about technology adoption in real estate as a whole,
  not about apartment management workflows. Do not say more than that.

### Mia et al. (2024) *(checked)*
- **What it is:** a multiple case study (*Journal of Business, Ethics and Society*) of nine
  Philippine micro, small and medium enterprises during COVID-19.
- **What it found:** barriers, enablers and challenges to digital adoption; the firms became more
  open to digital tools.
- **How we use it:** small Philippine enterprises meet barriers of infrastructure, technical
  capacity and resources; a small boarding house is such an enterprise.
- **Cited in:** 1.1, 2.1.5, 2.1.6, 2.2, 4.3.7. **Careful:** it is about small businesses in general,
  not about boarding houses or rental systems.

---

## B. Information systems and software engineering

### Laudon, Laudon and Traver (2026), 18th edition *(checked: the edition and authors)*
- **What it is:** the standard MIS textbook.
- **How we use it:** the definition of an MIS (collects, processes, stores and distributes
  information for decision-making and control) and Figure 2-1.
- **Cited in:** 2.1.2. **To do:** compare Figure 2-1 with the book's figure on the functions of an
  information system.

### Ghasemaghaei, Ebrahimi and Hassanein (2018) *(title only)*
- **What it is:** a journal article (*Journal of Strategic Information Systems*) on data analytics
  competency and firm decision-making.
- **How we use it:** a firm's data analytics competency improves its decision-making.
- **Cited in:** 2.1.2, 2.1.3, 2.1.6. **Read the abstract** to know its sample and method.

### Pressman and Maxim (2020), 9th edition *(textbook)*
- **What it is:** the standard software engineering textbook.
- **How we use it:** the definition of Agile (3.2) and why integrated systems reduce redundancy (2.1.2).
- **Cited in:** 2.1.2, 2.1.6, 3.2.

---

## C. Progressive Web Applications

### Biørn-Hansen, Majchrzak and Grønli (2017) *(checked)*
- **What it is:** a conference paper (WEBIST 2017) on PWAs as a single way to build for every
  mobile platform.
- **How we use it:** one code base for every device; ours ran on the owner's laptop, an Android
  phone and an iPhone (4.2.7).
- **Cited in:** 2.1.5, 2.1.6, 4.2.7.

### Muawwal (2024) *(checked)*
- **What it is:** an Indonesian journal article (*Buletin Pos dan Telekomunikasi*) implementing a PWA
  with a manifest, a service worker and Express.js, like ours.
- **What it found:** the site could be installed on mobile and desktop and stayed usable offline or
  on an unstable connection.
- **Cited in:** 2.1.5, 2.1.6.

### Anuar and Othman (2024) *(checked)*
- **What it is:** a Springer journal article (*Universal Access in the Information Society*) that
  developed and validated usability heuristics for PWAs.
- **Cited in:** 2.1.5.

**If asked "is a PWA an app?":** "It is a website that the browser adds to the home screen. It opens
in its own window and keeps its files, about 1.2 MB, so it works offline. Nothing comes from an app
store." (Chapter 4, Section 4.2.7.)

---

## D. Standards and the law

| Source | What it is | Where |
| :--- | :--- | :--- |
| **ISO/IEC 25010:2011** (2011a) | The software quality model: 8 characteristics, 31 sub-characteristics, plus quality in use | 2.4, 3.2, 3.3 |
| **ISO/IEC 25040:2011** (2011b) | The evaluation process: five steps, which Section 4.4 follows | 3.3 |
| **ISO/IEC 25022:2016** (2016a) | Measuring quality in use: effectiveness, efficiency, context coverage | 3.3 |
| **ISO/IEC 25023:2016** (2016b) | Measuring product quality: the X = A / B form our measures take | 3.3 |
| **ISO/IEC 25010:2023** (2023) | The revision: usability renamed interaction capability, portability renamed flexibility, safety added | 2.4 |
| **ISO/IEC/IEEE 29119-1:2022** | The test levels: unit and integration, system, acceptance | 3.2.4 |
| **WCAG 2.2** (World Wide Web Consortium, 2023) | The accessibility standard the scans checked against | 3.2.4 |
| **Republic Act No. 10173** (2012) | The Data Privacy Act, which the testing followed | 3.4 |

**If asked "why the 2011 edition, when 2023 exists?":** "The survey was built on the 2011 model's
eight characteristics, so we followed the evaluation process written for that model, ISO/IEC
25040:2011. Appendix M, Table M-21 shows where each result falls in the 2023 model."

---

## E. Sources for the method

| Source | What it supports | Where |
| :--- | :--- | :--- |
| **Etikan, Musa and Alkassim (2016)** | Purposive and convenience sampling: both non-random, useful when randomization is not feasible or resources are limited | 3.3 |
| **Nielsen and Landauer (1993)** | Why a few testers are defensible: each additional tester finds fewer new usability problems | 3.3 |
| **Likert (1932)** | The origin of the five-point agreement scale | 3.3 |

**If asked "only three tenants?":** "Usability testing finds fewer new problems with each added
tester (Nielsen and Landauer, 1993), and the paper reports the results as how these respondents
rated the system, not as a sample of every tenant." **Careful:** the study does not say that three
testers find most problems. Do not claim it.

---

## Questions panels ask about references, and the answers

- **"What is your most recent source?"** Canlas et al. (2026) and Burke (2026), both 2026.
- **"Do you have local studies?"** Yes: Magno (Negros), Pavia (Bicol), Pernate (Ormoc City),
  Mangca (Surigao), Caparos (South Cotabato), Canlas (dormitories), Encarnacion (a campus in the
  Philippines), and Mia on Philippine small enterprises.
- **"Which study is closest to yours?"** Canlas et al. (2026), FixHub.
- **"What did no study do that you did?"** Integrate booking, billing and receipts, tenant accounts,
  repair requests and online payment for one small boarding house, and measure each ISO/IEC 25010
  characteristic as well as rate it.
- **"Why did you cite this study?"** Each entry above has a "how we use it" line; say that, in your
  own words.
