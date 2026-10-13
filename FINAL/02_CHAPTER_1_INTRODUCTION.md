# 1 INTRODUCTION

## 1.1 Background of the Study

Administrative processes in apartment management typically involve tenant record keeping, financial
tracking, and maintenance coordination, which become increasingly complex as the number of units
increases (Burke, 2026). While web-based property management systems have been developed to support
these functions, their adoption in small-scale residential settings remains limited due to
operational constraints such as limited infrastructure, technical capacity, and resource
availability (Mia et al., 2024).

In small-scale boarding house operations, administrative tasks are still managed using standalone
spreadsheet files and manual documentation. In the boarding house studied, these records were kept
on a USB flash drive, exposing them to risks in data integrity such
as accidental deletion, file corruption, duplication, and lack of version control. In addition,
tenant concerns and maintenance requests are often communicated through informal channels such as
messaging applications or verbal reporting, resulting in untracked requests, delayed responses, and
inconsistent follow-up.

These conditions reflect fragmented administrative workflows, where records, communication, and
transactions are managed across separate, non-integrated tools. Consequently, property owners may
experience difficulties in maintaining accurate records, monitoring financial transactions, and
ensuring timely resolution of tenant concerns. Although existing web-based property management
systems aim to address such inefficiencies through centralized data storage and real-time
processing (Kotkar et al., 2026), many are commonly designed with assumptions aligned to large-scale
or commercial property environments. These systems typically assume stable infrastructure,
structured workflows, and dedicated administrative personnel (Ullah et al., 2018), which do not
reflect the operational conditions of small-scale, resource-constrained boarding houses.

In the Philippine context, these challenges are further reinforced by reliance on cash-based
transactions, limited access to integrated digital tools, and continued dependence on manual
record-keeping practices (Mia et al., 2024). As a result, many small-scale apartment operations
continue to function under fragmented and informal administrative processes despite the
availability of existing digital solutions.

These limitations are also reflected in local implementations. Magno et al. (2024) developed an
apartment rental management system to address issues such as disorganized data management,
difficulty in tracking tenant payments, missed billing deadlines, and reliance on paper-based
records. Their findings demonstrate that digitizing transaction tracking and task organization
improves administrative efficiency and data accuracy. However, the system primarily focuses on
financial transactions and task management, without integrating communication, booking, and tenant
interaction workflows into a unified system.

Similarly, Pavia et al. (2022) developed a property management system for Hospitality Management
students at Bicol College, demonstrating how digital platforms can enhance coordination,
record-keeping, and service management within a controlled academic environment with predefined
workflows and institutional support. While the study confirms the effectiveness of system-based
management, these conditions differ significantly from small-scale boarding house operations, where
administrative processes are informal, decentralized, and constrained by limited resources.

Taken together, these local studies demonstrate that while digital solutions can improve specific
aspects of property management, they are often implemented either as function-specific systems or
within controlled environments. As such, they do not fully address the fragmented and
non-integrated nature of administrative workflows in real-world, resource-constrained boarding house
settings.

Many existing systems therefore remain misaligned with the operational realities of small-scale
apartment management environments. This reveals a critical gap: the absence of an integrated
platform that consolidates tenant management, financial tracking, communication, and booking within
a single, context-appropriate system.

This study proposes Hivelet, a web-based apartment management system designed to address these
limitations by centralizing administrative processes and providing a structured mechanism for
managing tenant records, financial transactions, and maintenance concerns within a unified
platform, specifically tailored for resource-constrained residential settings.

## 1.2 Objectives of the Study

The primary objective of this study is to address the mismatch between existing property management
systems and the operational realities of small-scale, resource-constrained boarding houses by
designing, developing, and evaluating Hivelet, a web-based apartment management system that improves
administrative workflow integration, communication, and operational control. Specifically, the study
aims:

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
dependence on manual record-keeping practices such as spreadsheets and removable storage devices,
which are prone to data inconsistency, loss, and duplication. By integrating tenant records,
financial transactions, and maintenance concerns into a unified platform, the system supports more
reliable information management and improves administrative coordination in environments affected
by cash-based transactions and limited digital infrastructure.

For tenants, the study improves communication efficiency by providing a structured mechanism for
submitting and tracking maintenance concerns and viewing relevant account information. This reduces
reliance on informal communication channels such as messaging applications and verbal reporting,
which often result in delayed responses and untracked requests.

For future researchers, the study contributes to a localized implementation of a Progressive Web
Application-based property management system designed specifically for small-scale residential
contexts. The system architecture, integration approach, and evaluation using the ISO/IEC 25010
model may serve as a reference for further research, particularly in developing systems that address
the gap between enterprise-level property management solutions and resource-constrained residential
operations.

## 1.4 Scope and Delimitations

This study focuses on the design, development, and evaluation of Hivelet, a Progressive Web
Application (PWA) created to transition the 33-unit Fe Galang Da Silva Boarding House, at 32
Sampaguita Street, Barangay 4 Sagpon, Old Albay District, Legazpi City, near Bicol University, from
manual, paper-based administration to a centralized digital management system. To
achieve this, Hivelet integrates comprehensive room and tenant management capabilities, facilitating
seamless onboarding, the secure digital storage of records, real-time monitoring of room
availability, and a public-facing booking module that allows prospective renters to submit
reservation inquiries without requiring full system access. Furthermore, the application features a
financial tracking component dedicated to monitoring cash flow, expenses, and tenant payments; while
this primarily supports manual, cash-based transaction recording, it offers an optional online
payment through GCash for added convenience. Operational communication is also streamlined through a
structured issue ticketing system, enabling tenants to log maintenance requests that administrators
can systematically assign, track, and update until resolution.

Despite these comprehensive features, the scope is bound by specific delimitations regarding system
accessibility and financial processing: although the PWA utilizes cached resources for limited
offline access and responsive design for diverse devices, core functionalities, such as data
encoding, real-time synchronization, and booking updates, strictly require an active internet
connection to maintain data consistency. Additionally, the supplementary online payment feature lets
a tenant pay a bill through GCash using the Adyen payment gateway; each such payment is recorded as
pending and counts only after the administrator verifies it. The feature explicitly excludes
refunds, which are made from the gateway's own dashboard, automated reconciliation against bank
records, and direct banking integration. Ultimately, to ensure the system effectively resolves the
boarding house's operational inefficiencies, Hivelet was evaluated against the ISO/IEC 25010
software quality standard, with a specific emphasis on measuring its functional suitability,
performance efficiency, compatibility, usability, reliability, security, maintainability, and
portability.
