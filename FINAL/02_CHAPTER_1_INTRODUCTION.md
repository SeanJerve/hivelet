# 1 INTRODUCTION

## 1.1 Background of the Study

Around the world, administrative processes in apartment management involve tenant record keeping,
financial tracking, and maintenance coordination, which become increasingly complex as the number of
units increases (Burke, 2026). Property management and rental platforms aim to address these
inefficiencies through centralized data storage and real-time processing (Kotkar et al., 2026), yet a
review of 213 studies found that real estate as a whole still needs to improve its adoption of
digital technologies and online platforms to move from traditional to smart practice (Ullah et al.,
2018). Many of these systems are designed with assumptions aligned to large-scale or commercial
property environments, such as stable infrastructure, structured workflows, and dedicated
administrative personnel, which do not reflect the operational conditions of small-scale,
resource-constrained boarding houses.

In the Philippines, small enterprises adopt such tools slowly. Adoption by micro, small, and
medium-sized enterprises is held back by limited infrastructure, technical capacity, and resources,
and manual record-keeping continues (Mia et al., 2024). A small boarding house is such an enterprise.
Magno et al. (2024) developed an apartment rental management system to address disorganized data
management, difficulty in tracking tenant payments, missed billing deadlines, and reliance on
paper-based records. Their findings demonstrate that digitizing transaction tracking and task
organization improves administrative efficiency and data accuracy, but the system focuses on
financial transactions and task management, without integrating communication, booking, and tenant
interaction into a unified system. Boarding house studies elsewhere in the country show the same
pattern. In Ormoc City, Pernate et al. (2025) built a mobile application for finding and booking
boarding house rooms, and in Surigao City, Mangca (2023b) built a web-based booking system with SMS
notifications. Both center on how a tenant finds and books a room rather than on the administration
that follows.

In the Bicol Region, Pavia et al. (2022) developed a property management system for Hospitality
Management students at Bicol College, demonstrating how digital platforms can enhance coordination,
record-keeping, and service management within a controlled academic environment with predefined
workflows and institutional support. While the study confirms the effectiveness of system-based
management, these conditions differ significantly from small-scale boarding house operations, where
administrative processes are informal, decentralized, and constrained by limited resources.

Locally, the Fe Galang Da Silva Boarding House, a 33-unit property in Legazpi City near Bicol
University, shows these conditions directly. Its records were kept in standalone spreadsheet files
on a USB flash drive, exposing them to accidental deletion, file corruption, duplication, and lack of
version control. Rent is collected in cash, and tenant concerns and maintenance requests are
communicated through messaging applications or verbal reporting, resulting in untracked requests,
delayed responses, and inconsistent follow-up. Records, communication, and transactions are managed
across separate, non-integrated tools, so the owner has difficulty keeping accurate records,
monitoring financial transactions, and ensuring timely resolution of tenant concerns.

Taken together, these studies demonstrate that digital solutions can improve specific aspects of
property management, but they are implemented either as function-specific systems or within
controlled environments, and they do not address the fragmented administrative workflows of a
real-world, resource-constrained boarding house. This reveals the gap this study addresses: the
absence of an integrated platform that consolidates tenant management, financial tracking,
communication, and booking within a single system suited to a small boarding house.

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

The development of Hivelet, a web-based apartment management system implemented as a Progressive Web
Application (PWA), is significant in addressing the operational challenges of fragmented and manual
administrative workflows in small-scale, resource-constrained boarding house environments.

For property administrators and owners, the study provides a centralized system that reduces
dependence on manual record-keeping practices such as spreadsheets kept on a USB flash drive,
which are prone to data inconsistency, loss, and duplication. By integrating tenant records,
financial transactions, and maintenance concerns into a unified platform, the system supports more
reliable information management and improves administrative coordination in environments affected
by cash-based transactions and limited digital infrastructure.

For tenants, the study improves communication efficiency by providing a structured mechanism for
submitting and tracking maintenance concerns and viewing relevant account information. This reduces
reliance on informal communication channels such as messaging applications and verbal reporting,
which often result in delayed responses and untracked requests.

For future researchers, the study contributes a localized implementation of a Progressive Web
Application-based property management system designed specifically for small-scale residential
contexts. The system architecture, integration approach, and evaluation using the ISO/IEC 25010
model may serve as a reference for further research, particularly in developing systems that address
the gap between enterprise-level property management solutions and resource-constrained residential
operations.

## 1.4 Scope and Delimitations

This study focuses on the design, development, and evaluation of Hivelet, a Progressive Web
Application (PWA) created to transition the 33-unit Fe Galang Da Silva Boarding House, at 32
Sampaguita Street, Barangay 4 Sagpon, Old Albay District, Legazpi City, near Bicol University, from
spreadsheet- and paper-based administration to a centralized digital management system. To
achieve this, Hivelet integrates comprehensive room and tenant management capabilities, facilitating
seamless onboarding, the secure digital storage of records, real-time monitoring of room
availability, and a public-facing booking module that allows prospective renters to submit
reservation inquiries without requiring full system access. Furthermore, the application features a
financial tracking component dedicated to monitoring cash flow, expenses, and tenant payments; while
this primarily supports manual, cash-based transaction recording, it offers an optional online
payment through GCash, which runs in Adyen's test environment and takes no real money. Operational communication is also streamlined through a
structured issue ticketing system, enabling tenants to log maintenance requests that administrators
can systematically assign, track, and update until resolution.

Despite these comprehensive features, the scope is bound by specific delimitations regarding system
accessibility and financial processing: although the PWA utilizes cached resources for limited
offline access and responsive design for diverse devices, core functionalities, such as data
encoding, real-time synchronization, and booking updates, strictly require an active internet
connection to maintain data consistency. Additionally, the supplementary online payment feature lets
a tenant pay a bill through GCash using the Adyen payment gateway; each such payment is recorded as
pending and counts only after the administrator verifies it. The feature was built and works end
to end, from the tenant's checkout to the gateway's signed notification and the owner's
verification, but only in Adyen's test environment, so it is not live and takes no real money.
Going live requires the owner to complete Adyen's merchant onboarding for GCash with her own
business documents, which this study did not do; rent therefore continues to be paid in person and
recorded by the owner. The feature also explicitly excludes
refunds, which are made from the gateway's own dashboard, automated reconciliation against bank
records, and direct banking integration. Ultimately, to ensure the system effectively resolves the
boarding house's operational inefficiencies, Hivelet was evaluated against the ISO/IEC 25010
software quality standard, with a specific emphasis on measuring its functional suitability,
performance efficiency, compatibility, usability, reliability, security, maintainability, and
portability.
