# 1 INTRODUCTION

## 1.1 Background of the Study

Running an apartment involves three kinds of administrative work: keeping tenant records, tracking
money and arranging repairs. Residential tenants often ask for small repairs, and the software
apartment managers use for this often cannot exchange data with their other financial and
operational tools, so information ends up in separate silos and a combined report is hard to produce
(Burke, 2026). Property management and rental platforms aim to address these inefficiencies through
centralized data storage and real-time processing (Kotkar et al., 2026), yet a review of 213 studies
found that real estate as a whole still needs to improve its adoption of digital technologies and
online platforms to move from traditional to smart practice (Ullah et al., 2018). These studies,
however, describe properties far larger than a boarding house: the apartment complexes Burke (2026)
examined have 50 to 500 units. A small, resource-constrained boarding house does not share the
conditions of properties of that size.

In the Philippines, a study of nine micro, small, and medium-sized enterprises during the COVID-19
pandemic found that what held back their adoption of digital tools was less a lack of money,
infrastructure, or skills than the owners' hesitation and readiness, including doubt that a tool
fits how the business already works (Mia et al., 2024). A small boarding house is such an
enterprise. Magno et al. (2024) developed an apartment rental management system to address
disorganized data management, difficulty in tracking pending and paid bills, missed payment
deadlines, and reliance on paper-based records. They report that the system improved data management
and reduced the errors of manual processes, but the system focuses on financial transactions and
task management, without integrating communication, booking, and tenant interaction into a unified
system. Boarding house studies elsewhere in the country show the same pattern. In Ormoc City,
Pernate et al. (2025) built a mobile application for finding and booking boarding house rooms, and
in Surigao City, Mangca (2023b) built a web-based booking system with SMS notifications. Both are
about how a prospective tenant finds and books a room. Neither covers the administration that comes
after.

Closer to home, in the Bicol Region, Pavia et al. (2022) built a property management system for the
mock hotel where Hospitality Management students at Bicol College take their practical examinations.
It replaced third-party software, and its users rated its design, functionality and ease of use
positively. A school's practice hotel, though, runs on set workflows with the institution behind it.
A small boarding house has none of that: its administration is informal and decentralized, and it
works within tight resources.

The Fe Galang Da Silva Boarding House, a 33-unit property in Legazpi City near Bicol University, is
a case of exactly these conditions. Its records lived in separate spreadsheet files on one USB flash
drive, where they could be deleted by accident, corrupted or duplicated, with nothing to show which
version was current. Rent is collected in cash, and tenants report repair requests and other
concerns through messaging applications or verbally, so requests go untracked, responses are
delayed, and follow-up is inconsistent. The records, the messages and the money are all kept in
different places. For the landlady, who runs the boarding house for its owner, this makes it hard to
keep the records accurate, to follow the money coming in and going out, and to deal with tenants'
concerns on time.

However, each system described above was built either for a single function or for a controlled
setting such as a school. Each improves one part of property management, and none takes on the
scattered administration of a real boarding house with little to spend. That is the gap this study
addresses: there is no integrated platform that puts tenant management, booking and reservation
management, financial tracking and communication into one system sized for a small boarding house.

## 1.2 Objectives of the Study

The primary objective of this study is to address the mismatch between existing property management
systems and the operational realities of small-scale, resource-constrained boarding houses by
designing, developing, and evaluating Hivelet, a web-based apartment management system that improves
administrative workflow integration, communication, and operational control. Specifically, from July
to November 2026, the study aims:

1. To analyze the existing apartment management practices of the Fe Galang Da Silva Boarding House to
   determine the challenges in tenant management, financial tracking, communication, and booking
   processes, and establish system requirements based on the identified operational gaps and user
   needs.
2. To develop the Hivelet system to feature tenant and room management, booking and reservation
   management, financial tracking with optional online payment recording, a maintenance ticketing and
   notification system, role-based access control for administrators and tenants, and Progressive Web
   Application (PWA) support for responsive cross-device accessibility.
3. To pilot test the developed Hivelet system for functionality, responsiveness, and operational
   performance.
4. To evaluate and optimize the system based on the ISO/IEC 25010 software quality model in terms of:
   Functional suitability, Performance efficiency, Compatibility, Usability, Reliability, Security,
   Maintainability, Portability.

## 1.3 Significance of the Study

Hivelet is a web-based apartment management system, delivered as a PWA, for a small boarding house
whose administration is done by hand and split across separate tools, with few resources to change
that. The study matters to three groups.

For the landlady, the study replaces the spreadsheets on a USB flash drive, which easily fall out of
step, get lost or get copied twice, with a single system. With tenant records, payments and repair
requests in one place, the records are easier to trust and the work is easier to coordinate, even
though rent is still paid in cash.

For tenants, the system is one place to send a repair request and see what has happened to it, and
to look up their own bills and receipts. Before, requests went through messaging applications or
were said in person, so they were not tracked and were answered late.

For future researchers, the study offers a PWA-based property management system built for a small
residential property. Its architecture and its evaluation against the ISO/IEC 25010 model may serve
as a reference for systems meant for small, resource-constrained residential operations rather than
for enterprise-level property management.

## 1.4 Scope and Delimitations

This study covers the design, development, and evaluation of Hivelet, a PWA that moves the 33-unit
Fe Galang Da Silva Boarding House, at 32 Sampaguita Street, Barangay 4 Sagpon, Old Albay District,
Legazpi City, from spreadsheet- and paper-based administration to one
centralized system. Its tenant and room management moves tenants in, stores their records, and shows
the current availability of every unit. Its booking and reservation management takes the form the
landlady's practice needs. Prospective tenants see the units on a public page and send an inquiry about
one without an account. The landlady answers the inquiry, can mark the unit Reserved, and moves the
person in from it. Nothing is booked or paid for online. Financial tracking records tenant payments
and expenses and monitors cash flow. It mainly records cash payments entered by hand, and it offers
an optional online payment through GCash, described below. Maintenance ticketing lets tenants send repair
requests, which the landlady assigns, tracks, and updates until they are resolved. Hivelet was
evaluated against the eight characteristics of the ISO/IEC 25010 software quality model: functional
suitability, performance efficiency, compatibility, usability, reliability, security,
maintainability, and portability.

The study has three delimitations. First, the PWA caches resources for limited offline access and
adapts to different devices, but entering data, keeping it synchronized in real time, and sending or
answering inquiries require an internet connection, so that every device works from the same
records. Second, the online payment feature lets a tenant pay a bill through GCash using the Adyen
payment gateway. A payment made this way is saved as pending, and it counts only once the landlady
has verified it. The whole path was built and works end to end, from the tenant's checkout, through
the signed notification the gateway sends back, to the landlady's verification. It runs only in
Adyen's test environment, however, so it is not live and takes no real money. Going live needs the
owner's merchant onboarding documents, which this study did not cover. Rent is therefore still paid
in person and recorded by the landlady. The feature also excludes refunds (made from the gateway's
own dashboard), automated reconciliation against bank records, and direct banking integration.
Third, electricity is outside the system, because each unit has its own meter and its tenant pays
the electric company directly.