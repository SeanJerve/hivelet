# HIVELET FUNCTIONAL WIREFRAME SPECIFICATION

## 1. Wireframe Overview & Objective

**System Name:** Hivelet  
**Target Property:** Fe Galang Da Silva Boarding House (3 Floors, 32 Total Units)  
**Prototype Style:** Low-Fidelity Black & White Blueprint Wireframe (Dashboard Sidebar Layout)  
**Primary Purpose:** Demonstrate pure system workflows, functional logic, role permissions, hover pop-over ticket details modal, uniform in-place resolved button replacement, payment collection recording with Invoice #, and floating top-right chathead inbox based on `01_SYSTEM_BIBLE.md` through `10_MONTHLY_EXPENSES_REPORT.md`.

---

## 2. Maintenance Dispatch Table Layout

```
   [ 🛠️ MAINTENANCE DISPATCH & CLOSURE AUTHORIZATION ]
   +---------------------------------------------------------------------------------------------------+
   | Room #             | Issue Description          | Priority  | Date Reported | Details | Closure Action|
   +---------------------+----------------------------+-----------+---------------+---------+---------------+
   | Room 108           | Faucet Leaking in bathroom | EMERGENCY | 2026-07-27    | [ ⤢ ]   | [ Close Ticket|
   +------------------------------------------------------------------------------------+---------------+
                                                                                |               |
                                                                                v               v
                                                                        (Click ⤢ Icon)   (Click Close Ticket)
                                                                        Opens Hover      Instantly Replaces
                                                                        Modal Card       in Same Box with:
                                                                        Floated on Top!  [ ✅ RESOLVED ]
```

---

## 3. Sidebar Menu Items & Component Specs

| Menu Item | Icon | Component Description |
| :--- | :--- | :--- |
| **Overview** | 📊 | Key KPI metrics (Revenue, Occupancy 28/32, Pending Verifications) & 32-Room Visual Matrix |
| **Tenant Management** | 👥 | Active Tenant Directory, onboarding move-in dates, profile editor |
| **Booking & Units** | 📅 | **Admin**: Unit Specs, Rates & **Unit Photo Uploader/Editor Modal** (`📷 [ EDIT UNIT PHOTO ]`).<br>**Top Right Chathead**: Floating Messenger Pop-over Widget (`💬 [ 💬 LIVE CHAT INBOX ]`) allowing Landlady to view who is messaging her and reply right on top of the screen! |
| **Payment & Income** | 💳 | **RECORD MONTHLY PAYMENT UNIT FORM**, 50% Share derivation, and live reflection into the **Monthly Income Report Collection Ledger Table** (with separate **Tenant Name** and **Invoice Number** columns) |
| **Expenses Ledger** | 🧾 | **MULTI-SUPPLIER EXPENSE FORM** with `➕ [ + Add Another OR / Supplier on Same Date ]` button below the OR/Supplier box. Renders a **Single Merged Date Cell (using Rowspan)** while keeping each supplier on a **separate row and column**! |
| **Ticketing & Issues** | 🔧 | **Landlady Dispatch Table**:<br>• **Room #**: Plain room number text (`Room 108`).<br>• **`Details` Column**: Click **Icon-Only `⤢` Button** to open a **Hover Pop-over Card right on top**.<br>• **`Closure Action` Column**: Uniform **`[ Close Ticket ]`** buttons (`btn-secondary btn-sm`). Click to **instantly replace in the SAME box** with a **`[ ✅ RESOLVED ]`** tag! |
| **Settings & Rules** | ⚙️ | System Configuration, Water Billing Rate (₱200/head), Landlady Payment Policy |
| **Logout System** | 🚪 | Exits current user session and returns to Auth Landing Gate (`#auth-view`) |

---

## 4. How to Preview

Open [`index.html`](file:///c:/Users/Kiel%20Hedrix/Desktop/HIVELET/index.html) in any web browser:
1. Log in as **Admin** using `⚡ Quick Test`.
2. Go to **`🔧 Ticketing & Issues`** in the left sidebar.
3. In the Maintenance Dispatch table:
   - Click the icon-only **`⤢`** button in the **`Details`** column $\rightarrow$ Opens a **Hover Pop-over Modal right on top** showing full tenant specs, notes, and attached photo!
   - Click **`[ Close Ticket ]`** (uniform button style on Room 108 and Room 305) $\rightarrow$ Instantly **replaces the button in the same table cell** with a **`[ ✅ RESOLVED ]`** badge!
