# 1 INTRODUCTION

## 1.1 Background of the Study

Around the world, apartment management involves tenant record keeping, financial tracking, and
maintenance coordination. Residential tenants often ask for minor repairs, and the software apartment
managers use often does not connect with their other financial and operational tools, which leaves
information in separate silos and makes consolidated reporting difficult (Burke, 2026). Property
management and rental platforms aim to address these inefficiencies through centralized data storage
and real-time processing (Kotkar et al., 2026), yet a review of 213 studies found that real estate as
a whole still needs to improve its adoption of digital technologies and online platforms to move from
traditional to smart practice (Ullah et al., 2018). These studies, however, describe properties far
larger than a boarding house: the apartment complexes Burke (2026) examined have 50 to 500 units. A
small, resource-constrained boarding house does not share the conditions of properties of that size.

In the Philippines, a study of nine micro, small, and medium-sized enterprises during the COVID-19
pandemic found that what held back their adoption of digital tools was less a lack of money,
infrastructure, or skills than the owners' hesitation and readiness, including doubt that a tool
fits how the business already works (Mia et al., 2024). A small boarding house is such an enterprise.
Magno et al. (2024) developed an apartment rental management system to address disorganized data
management, difficulty in tracking pending and paid bills, missed payment deadlines, and reliance on
paper-based records. They report that the system improved data management and reduced the errors of
manual processes, but the system focuses on financial transactions and task management, without
integrating communication, booking, and tenant interaction into a unified system. Boarding house
studies elsewhere in the country show the same pattern. In Ormoc City, Pernate et al. (2025) built a
mobile application for finding and booking boarding house rooms, and in Surigao City, Mangca (2023b)
built a web-based booking system with SMS notifications. Both center on how a prospective tenant
finds and books a room rather than on the administration that follows.

In the Bicol Region, Pavia et al. (2022) developed a property management system for the mock hotel
in which Hospitality Management students at Bicol College take their practical examinations,
replacing third-party software, and its users rated its design, functionality, and user-friendliness
positively. That setting is a controlled academic environment with predefined workflows and
institutional support, unlike a small boarding house, where administration is informal,
decentralized, and constrained by limited resources.

Locally, the Fe Galang Da Silva Boarding House, a 33-unit property in Legazpi City near Bicol
University, shows these conditions directly. Its records were kept in standalone spreadsheet files
on a USB flash drive, exposing them to accidental deletion, file corruption, duplication, and lack of
version control. Rent is collected in cash, and tenants report repair requests and other concerns
through messaging applications or verbally, so requests go untracked, responses are delayed, and
follow-up is inconsistent. Because records, communication, and transactions sit in separate tools,
the landlady, who runs the boarding house for its owner, has difficulty keeping accurate records,
monitoring financial transactions, and resolving tenant concerns on time.

Taken together, these studies show that digital systems can improve specific parts of property
management, but they were built either for one function or for a controlled environment, and they
do not address the fragmented administration of a real, resource-constrained boarding house. This
is the gap this study addresses: the absence of an integrated platform that brings tenant
management, booking and reservation management, financial tracking, and communication into one
system suited to a small boarding house.

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

Hivelet, a web-based apartment management system delivered as a PWA, addresses the fragmented,
manual administration of a small, resource-constrained boarding house. The study is significant to
the following groups.

For the landlady, the study provides one system in place of spreadsheets kept on a USB flash drive,
which are prone to inconsistency, loss, and duplication. Keeping tenant records, financial
transactions, and repair requests in one system makes the records more reliable and the
administration easier to coordinate, even where rent is paid in cash.

For tenants, the system gives one place to submit and follow their repair requests and to view their
own bills and receipts, in place of messaging applications and verbal reports, which leave requests
untracked and responses delayed.

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
payment gateway. Each such payment is recorded as pending and counts only after the landlady verifies
it. The feature was built and works end to end, from the tenant's checkout to the gateway's signed
notification and the landlady's verification, but only in Adyen's test environment, so it is not live
and takes no real money. Going live needs the owner's merchant onboarding documents, which were
outside this study. Rent therefore continues to be paid in person and recorded by the landlady. The
feature also excludes refunds (made from the gateway's own dashboard), automated reconciliation against bank records, and direct banking integration.
Third, electricity is outside the system, because each unit has its own meter and its tenant pays
the electric company directly.
