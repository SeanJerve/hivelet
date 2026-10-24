# Study guide: every frontend file

For the team, before the defense. This guide walks through **every file in `frontend/src`**, plus
`frontend/vite.config.ts`, `frontend/index.html` and `frontend/public`, and says in plain words what
each one does. Everything here was read from the code on 24 October 2026. Where the code did not
make something clear, this guide says "unclear from the code" instead of guessing.

The companion guide, **`STUDY_GUIDE_CODE.md`**, already explains the whole system, each feature from
screen to database (its Section 3), security (Section 4), money (Section 5) and live updates, offline
use and installing (Section 6). This guide does not repeat those tables. It fills in the files that
guide only names in passing.

---

## 1. How the frontend is organised

A few words first:

- **Frontend**: the part that runs in the browser. Here it is a **Vue 3** app written in
  **TypeScript** (JavaScript with types, so a wrong field is caught before the code runs) and styled
  with **Tailwind** (short class names such as `px-4` that set spacing and colour).
- **View**: one whole screen, for example the Tenants page. One file in `views/` per screen.
- **Component**: a reusable piece of a screen, for example a dialog or a table. They live in
  `components/`, sorted into folders.
- **Route**: an address such as `/admin/income`, and the screen it opens.
- **Endpoint**: an address on the backend (the Express server) that the frontend calls to read or
  save data, for example `GET /tenant/my-bills`.

### The folders

| Where | What is in it |
| :--- | :--- |
| `main.ts` | The starting point. Creates the app, installs the router, and sets up start-up behaviour |
| `App.vue` | The frame every page sits in: header, sidebar, footer, the "No connection" bar, and the dialogs that belong to the whole app |
| `router/index.ts` | Which address opens which screen, and who may open it |
| `views/` | The 19 screens |
| `components/layout/` | The frame pieces: header, sidebar, footer, notification panel, loading placeholders |
| `components/modals/` | Pop-up forms and dialogs (record a payment, edit a unit, pay with GCash, change password) |
| `components/overview/` | The tiles and charts on the two Overview screens |
| `components/public/` | Pieces only the public site uses (the inquiry rules, the "cannot show units" notice) |
| `components/tenants/` | The tenant history table on the Tenants page |
| `components/ui/` | Small building blocks every screen shares: the one dialog, the one table, the toolbar, toasts |
| `lib/` | Logic with no screen of its own: talking to the server, who is signed in, dates, money, offline copies |
| `index.css` | The colours, fonts, dark mode and animations, as named tokens |

### How a page gets its data

1. **`lib/api.ts`** is the only file that sends requests to the backend. Every screen calls
   `api.get`, `api.post`, `api.patch`, `api.put` or `api.delete`. It adds the sign-in token,
   gives up after 25 seconds on a read and 45 seconds on a save, and turns server errors into
   sentences a person can act on. The browser never talks to the database directly.
2. **`lib/authStore.ts`** remembers who is signed in, their role (tenant or admin) and what they may
   do. The router reads it to decide whether a page can open.
3. **`lib/systemState.ts`** holds the shared lists the owner's screens read: rooms, tenants, income
   rows, expense rows, repairs and inquiries. A screen calls, say, `fetchIncomeRecords()`, and every
   screen showing that list updates.

The tenant screens mostly call their own `/tenant/my-...` endpoints directly instead of going
through `systemState.ts`.

**A note on "stores".** Pinia (a Vue library for shared state) is installed and switched on in
`main.ts`, but no file in `frontend/src` defines a Pinia store. The shared state is kept in plain
modules (`systemState.ts`, `authStore.ts`, `notificationsStore.ts`, `recentActions.ts`) using Vue's
own `ref` and `reactive`. A **composable** is a function whose name starts with `use` that a
screen calls when it is set up, for example `useToast()` or `useLiveRefresh()`. There is no separate
`composables/` folder; they live in `lib/`.

### How to read the rest

Each file has its path, then a few sentences: what it does, who sees it, which screen it belongs
to, which endpoints it calls, and anything a panelist might ask. "Visitor" means someone with no
account, "tenant" a signed-in resident, "owner" the signed-in administrator (the landlady's
account). Endpoints are written without the `/api` prefix, as `STUDY_GUIDE_CODE.md` writes them.

---

## 2. The top-level files

**`main.ts`**
The file the browser runs first. It creates the Vue app, installs the router, registers `v-phone`
(the phone-number spacing used on every phone field), and switches on dark mode and the
"new version" recovery. It wires up what happens when a session dies: the person is signed out and,
if they were on a page that needs a sign-in, sent to `/login` with a note to bring them back. It
also sets each page's browser-tab title, search description and "noindex" for signed-in pages, and
takes down the start-up loader once the first page has really drawn (never later than 8 seconds).

**`App.vue`**
The frame around every screen, seen by everyone. It shows the header, the sidebar (signed-in
screens only), the footer (public pages only), and the thin bar that says "No connection" or "Saved
figures from ..." when the data on screen is an offline copy. It starts live updates while someone
is signed in and loads the owner's contact number (`GET /public/contact`). It also holds the
**forced first sign-in step**: while an account is on a starting password, or a tenant has no phone
number on file, `ChangePasswordModal` is shown and cannot be closed.

**`router/index.ts`**
The list of addresses and the screen each one opens. Public pages (`/public`, `/category/...`,
`/inquire`, `/inquiry`, `/privacy`, `/terms`, `/login`) need no account; `/tenant/...` pages need the
tenant role and `/admin/...` pages the admin role (`meta.roles`). Before every page change, the
**guard** restores the session once, sends a signed-out person to `/login` with "Please sign in to
access ...", and sends a person with the wrong role to their own home page. Most screens are
**lazy-loaded** (their code downloads only when first opened), except the landing page and sign-in,
which come with the app so they draw at once. There is deliberately no `/admin/audit-logs` page: the
adviser ruled the activity log a developer's record, so that address shows "not found".

**`index.css`**
All the styling rules shared across the app, about 2,600 lines. It defines the colour, font and
radius **tokens** (named values such as `--brand`, the green `#17603f`) and redefines them for dark
mode under `[data-theme="dark"]`. It also holds the shared classes: page widths (`ws-page`), the
page-change crossfade (`page-move`), dialogs, list reveals, the skip link, and reduced-motion
versions of every animation. The fonts are Sora and Plus Jakarta Sans, loaded from Google Fonts in
`index.html`.

---

## 3. Views: the 19 screens

The feature table in `STUDY_GUIDE_CODE.md`, Section 3, lists the main endpoint for each screen.
Below is what each screen file is and the decisions inside it.

### Public screens (visitors)

**`views/PublicGuestView.vue`** (`/public`, the landing page)
The first page a visitor sees: the building photo, the four kinds of unit, the full availability
list, answers to common questions, and the location. It reads `GET /public/rooms` (through
`fetchRooms()`) and `GET /public/rates` for the water rate, which is quoted only when that read
works. Its header explains why the old text about electricity billing was removed: the owner said
each unit's electricity is metered and paid separately and is not part of this system. The
location section is a link to the visitor's own maps app plus the gate photo; the embedded map was
removed on purpose so the section works offline. It shows `BookViewingPrompt` once per browser.

**`views/CategoryRoomsView.vue`** (`/category/:slug` and `/category/:slug/units`)
One kind of unit (Studio, One-bedroom, Two-bedroom, Three-bedroom) and the units of that kind, for
visitors. It reads `GET /public/rooms` and `GET /public/rates`, and sends an inquiry about one unit
with `POST /public/inquiries`. Its header records a fixed bug: the page once sorted units by the
first character of the unit code, which is the floor, so "2A" was called a two-bedroom. The
categories now come from the unit's own type in the database (`lib/unitCategories.ts`). Each unit
shows its photo, or its floor plan from `/floorplans/` when there is no photo
(`lib/floorPlans.ts`). If the room list cannot be read, it shows nothing rather than the built-in
seed list, whose prices and statuses are out of date.

**`views/InquireView.vue`** (`/inquire`)
The general inquiry form for visitors: name, phone number and message, sent with
`POST /public/inquiries`. The database needs a unit on every inquiry and this form has none, so it
reads `GET /public/rooms` and files the inquiry against a vacant unit, never a Reserved one (the
server refuses those); the message says what the visitor actually asked. It checks each field when
the visitor leaves it, with the note under the field (`components/public/inquiryRules.ts`). After sending, it shows the link and reference code to come
back to the conversation (`InquiryConversationLink.vue`) and remembers the inquiry in this browser
(`lib/myInquiries.ts`).

**`views/InquiryThreadView.vue`** (`/inquiry`)
Where a visitor who sent an inquiry reads the owner's reply and answers it, without an account.
There are three ways in: the private link (the secret sits after `#` in the address, which browsers
never send to a server), the list of inquiries this browser sent, or the reference code plus the
phone number used. It calls `POST /public/inquiries/thread` to read and
`POST /public/inquiries/thread/messages` to reply. The server answers "no match" the same way
whichever part was wrong and limits the tries, so the code form cannot be used to find other
people's conversations.

**`views/LoginView.vue`** (`/login`)
The sign-in page for tenants and the owner. A person signs in with a **login ID or phone number**
and a password; the server refuses an email. It calls `login()` in `authStore.ts`, which posts to
`POST /auth/login`. There is deliberately no sign-up: the owner admits each tenant from the Tenants
page. Two decisions worth knowing: the notice above the form is built from the page being returned
to, never copied from the address bar (so nobody can send a link that prints their own message on
the sign-in page); and after signing in it returns to the last page that person had open
(`lib/lastPage.ts`). A "Forgot your password?" note explains there is no email or text reset, so
the answer is who to ask. **Dev-only:** a list of demo sign-in buttons appears only on a developer's
machine (`lib/demoAccounts.dev.ts`); it is removed from the built site.

**`views/PrivacyPolicyView.vue`** (`/privacy`)
The privacy notice for visitors, inquirers and tenants, written against the Data Privacy Act of 2012
(RA 10173). Its header lists, for each sentence, the code it was checked against (what the inquiry
form collects, what the browser stores, what is sent to Adyen, the lockout rule). It calls no
endpoint. It uses the shared frame `LegalPage.vue`.

**`views/TermsView.vue`** (`/terms`)
The terms of use for the public site and the tenant portal, in the same frame as the privacy page.
Its header explains that wherever the portal already tells a tenant something (for example that an
online payment counts once the landlady verifies it), the terms repeat the portal's own words, so
the two cannot disagree. It also covers refunds and deposits. It calls no endpoint.

**`views/NotFoundView.vue`** (any unknown address)
Says the address is not a page and shows the address back, so a typing mistake can be seen. A
signed-in person also gets a link back to their own screens. It used to redirect silently to the
landing page, which search engines indexed as a "soft 404"; it is now marked noindex in `main.ts`.

### Tenant screens (signed-in tenant)

**`views/TenantOverviewView.vue`** (`/tenant`)
The tenant's home: what they owe and how to pay, the bill, a way to ask for a repair, their
payments, their unit and their deposit. It reads `GET /tenant/my-rooms`, `/tenant/my-bills`,
`/tenant/my-payments`, `/tenant/my-income-records`, `/tenant/my-standing` and `GET /public/rates`.
Everything starts empty: an older version was seeded with a made-up tenancy, and a missing fact now
shows as "not on file". The Pay button does not open a payment session here; it takes the tenant to
the Payments screen, which runs the real Adyen checkout.

**`views/TenantPaymentsView.vue`** (`/tenant/payments`)
The tenant's bills and payment record, with the GCash pay button. It reads `/tenant/my-bills`,
`/tenant/my-standing`, `/tenant/my-payments`, `/tenant/my-income-records` and `/public/rates`, and
after a payment calls `POST /tenant/payments/adyen/verify-session`. It opens `AdyenPaymentModal.vue`
only when needed and loads that file's code on demand, because the Adyen library alone made this
screen's download about 209 KB. A tenant can pay the current period even before a bill exists
(`?pay=current`); the server raises the bill itself. The month-by-month chart is
`PaymentMonths.vue`. See `STUDY_GUIDE_CODE.md`, Section 5, for the payment steps.

**`views/TenantTicketsView.vue`** (`/tenant/tickets`)
The tenant's repair requests: a form to file one (with a photo), a list with progress, and a
conversation per request. It calls `POST /tenant/tickets`, `GET /tenant/my-tickets`,
`GET`/`POST /tenant/tickets/:id/messages`, `POST /tenant/tickets/:id/cancel` and
`GET /tenant/my-rooms`. A photo must be JPG or PNG (`lib/photoFile.ts`) and is shrunk in the
browser first (`lib/shrinkPhoto.ts`) so a normal phone photo fits the server's 1 MB limit. A tenant
may cancel only while the request is still Submitted, not once it is In Progress, and the server
limits this to once an hour.

**`views/TenantProfileView.vue`** (`/tenant/profile`, "My details")
What a tenant can change about themselves: phone number and emergency contact, with password in
`ChangePasswordModal`. The name and account status are shown, not edited, because the owner owns
them. It reads `GET /tenant/my-profile` and saves with `PUT /tenant/my-profile`; only the phone
number (when changed) and the emergency contact are sent. Saving is refused if the profile could
not be read, so an empty form never overwrites what is on file. There is no email field: it was removed on 20 October 2026.

### Owner screens (signed-in owner)

**`views/AdminOverviewView.vue`** (`/admin/overview`)
The owner's home. It leads with what needs her (GCash payments to verify, urgent repairs), then
this month's collections, occupancy, the year by month, and cash flow; past years open as an
archive (`?archiveYear=`). It reads `GET /admin/payments` and, through `systemState.ts`, rooms,
tenants, income rows, expense rows and repairs. All dates come from the property's clock (Manila),
not the viewer's, so the year never flips early. Money figures keep their centavos so a total always
equals the parts under it. On a phone, the quick actions (Record payment, Record expense, Move
someone in/out) move into `QuickActionsFab.vue`.

**`views/RoomDirectoryView.vue`** (`/admin/directory`, "Rooms and rates")
All 33 units by cluster, with status, rate and occupants. It reads rooms and tenants through
`systemState.ts` (`GET /admin/rooms`, `GET /admin/tenants`). Clusters are folded so the page is not
ten screens tall on a phone; the first cluster opens by default. Editing a unit opens
`AdminEditUnitModal.vue`.

**`views/TenantManagementView.vue`** (`/admin/tenants`)
The tenant list, and the place the owner moves a tenant in, edits them, resets their password and
moves them out. It calls `POST /admin/tenants`, `PATCH /admin/tenants/:id`,
`POST /admin/tenants/:id/reset-password`, `POST /admin/tenants/:id/vacate`, and
`PATCH /admin/inquiries/:id` when a move-in came from an inquiry. A new tenant or a reset gets a
one-time starting password and login ID, shown once to hand over. Moving someone out asks the owner
to type the unit code first (`ConfirmDialog`'s typed phrase), because it removes their access. For a
past year or month the page shows `TenantHistory.vue` instead, read from the receipts.

**`views/IncomeCollectionsView.vue`** (`/admin/income`, "Monthly Income")
The income ledger, the largest screen (about 2,200 lines). It has two tabs: the ledger, grouped by
cluster like her spreadsheet, and "To verify", the GCash payments waiting for her. It calls
`GET /admin/payments`, `PATCH /admin/payments/:id/verify` (Verified or Rejected),
`POST /admin/income-records`, `PATCH`/`DELETE /admin/income-records/:id`, and `GET /public/rates`.
Rows are filed by the month the rent is **for**, not the date paid (`lib/incomeFiling.ts`), so this
page, the Overview and the Excel file agree. Boarding House rows show the 50% Share column: a
system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the
owner's historical spreadsheet. A notification can open one payment directly
(`?tab=verify&payment=...`, `lib/openFromQuery.ts`).

**`views/ExpensesLedgerView.vue`** (`/admin/expenses`, "Monthly Expenses")
The expense ledger. It calls `GET /admin/expense-categories`, `POST /admin/expense-entries`,
`PATCH`/`DELETE /admin/expense-entries/:id`. Each expense is split across the **six property areas**,
and the splits add up to the expense's total, which is why it can be drawn as one bar
(`SegmentBar.vue`). The kind-of-expense list is built from the database's own category names; its
header records that a hard-coded list once made 927 entries impossible to filter or edit. The owner
can add her own kind of expense (`NewExpenseKindDialog.vue`).

**`views/MaintenanceDispatchView.vue`** (`/admin/tickets`, "Repairs")
The owner's repair board: list, assign, reply, resolve, delete, and log a repair herself. It calls
`POST /admin/tickets`, `PATCH /admin/tickets/:id`, `DELETE /admin/tickets/:id` and
`GET`/`POST /admin/tickets/:id/messages`. "Log a repair" was added because a repair the owner
noticed herself had nowhere to go; a repair to an empty unit is filed with no tenant. A delete is
removed from the screen only after the server confirms it.

**`views/InquiriesView.vue`** (`/admin/inquiries`)
The owner's inbox of inquiries from visitors. It calls `GET`/`POST /admin/inquiries/:id/messages`
(read and reply), `PATCH /admin/inquiries/:id` (for example to Closed) and
`DELETE /admin/inquiries/:id`. Each inquiry shows its real status: Pending, Contacted, Converted or
Closed; it used to show the same badge for every lead. Delete removes the inquiry and its
conversation for good, and only after the server confirms.

---

## 4. Components

### `components/layout/` (the frame)

**`AppHeader.vue`**
The bar at the top of every page except the inquiry, sign-in and category pages, which draw their
own. For a signed-in person it holds the notification bell (with its unread count) and the account
menu: Change password for a tenant, Change number / password for the owner, the Appearance (dark
mode) choice, and Sign out. Its comment records that the bell was once removed by accident for
twenty days while notifications kept being written, and asks future editors to keep it.

**`AppSidebar.vue`**
The left-hand menu on signed-in screens, for tenants and the owner; on a phone it is a drawer. The
owner's menu is in order of use: Overview, Monthly Income, Monthly Expenses, Tenants, Rooms and
rates, Repairs, Inquiries. Repairs and Inquiries show a count of new urgent repairs and new inquiries
she has not seen, refreshed every 45 seconds (it calls `fetchInquiries()` and
`fetchMaintenanceTickets()`, which read `GET /admin/inquiries` and `GET /admin/tickets`). On a wide
screen it also shows "Recently" (`RecentActions.vue`). There is no Activity entry, by the adviser's
ruling.

**`AppFooter.vue`**
The footer on the landing and category pages, the privacy page, the terms and the not-found page. It shows the mark, the property's
address and number (from `LANDLADY` in `systemState.ts`), and links to the policies. The copyright
year follows the calendar. It calls no endpoint.

**`LegalPage.vue`**
The shared frame for the privacy policy and the terms: title, dates, a contents list and a reading
column of about 70 characters a line at 16 px. Contents links scroll in code and move focus to the
heading, so a keyboard or screen-reader user continues from the chosen section.

**`NotificationPopover.vue`**
The notification panel that opens from the bell, for tenants and the owner. It lists notifications
with a filter (All, Unread, Payments, Repairs, Inquiries), marks one or all as read, and opens the
record a notification is about (`notificationTarget` in `lib/openFromQuery.ts`). Data comes from
`lib/notificationsStore.ts`. Every row is a real button, so it works from the keyboard.

**`PullToRefresh.vue`**
The green hexagon that follows your finger when you pull down from the top of the **installed** app.
It draws nothing in a normal browser tab, which has its own pull-to-refresh. The gesture itself is in
`lib/pullToRefresh.ts`.

**`RefreshSkeleton.vue`**
Grey placeholder shapes shown over the page area while a pull-to-refresh fetches the data again. The
page stays loaded behind it and takes the fresh answers.

**`RouteSkeleton.vue`**
The placeholder `App.vue` shows while the very first page's code is still downloading. It reads the
address and draws the shape of what is coming (the landing hero, a signed-in screen, or a text page),
so the header never sits over a blank page and nothing jumps when the page arrives.

### `components/modals/` (pop-up forms)

**`AdminEditUnitModal.vue`** (owner, from Rooms and rates)
Edits one unit: monthly rate, type, status (Available, Reserved, Occupied, Under Maintenance),
whether it is Published or Hidden on the public site, description and photo. It reads
`GET /admin/rooms` to find the unit's id, then saves with `PATCH /admin/rooms/:id`. If the unit
cannot be found it says nothing was saved, instead of the old false "Updated" message. A rate change
is recorded by a database trigger (see `STUDY_GUIDE_CODE.md`, Section 3). The type list must match
the database's own values exactly; its comment records that a wrong spelling once made every
non-Studio unit fail to save.

**`AdyenPaymentModal.vue`** (tenant, from Payments)
The GCash payment window. It calls `POST /tenant/payments/checkout` to get a session from the
server, then shows Adyen's own **Drop-in** (Adyen's ready-made payment form, from the
`@adyen/adyen-web` library) on the tenant's page; Hivelet never sees the GCash account. On return it
calls `POST /tenant/payments/adyen/verify-session`. It shows the outstanding balance, which is what
the server charges, so a part-paid bill is never charged in full twice. Raw gateway messages are
replaced with sentences a tenant can act on. Adyen runs on its test account (Chapter 5,
recommendation 3).

**`BookViewingPrompt.vue`** (visitor, landing page)
A short sheet offering a link to the inquiry form, shown once per browser. It says how many units
are vacant, but only when that number is known to be current: while loading, after a failed read, or
offline it falls back to "Viewings are by appointment". It promises nothing the property does not
offer.

**`ChangePasswordModal.vue`** (tenant, and the owner on a starting password)
Change your own password with `POST /auth/change-password`. The rules shown (ten characters, a
letter, a number) mirror the server, which checks them anyway. In **mandatory mode** (opened by
`App.vue`) it cannot be closed: an account on a starting password must replace it, and a tenant also
confirms their phone number. A missing phone alone is saved with `PUT /tenant/my-profile`. It reads
`GET /auth/me` to prefill the phone.

**`ChangeSignInModal.vue`** (owner)
"Change number / password" for the owner, who signs in with her phone number. She gives her current
number and current password first, then a new number, a new password, or both
(`POST /auth/change-sign-in`). A wrong current number or password gets one refusal that does not say
which was wrong. Her number is also the public contact number, so every page updates at once
(`setLandladyPhone`).

**`NewExpenseKindDialog.vue`** (owner, from Monthly Expenses)
Adds a kind of expense of her own beside the thirteen built in, with
`POST /admin/expense-categories`. Name only, 2 to 60 characters; the server picks its number. There
is no rename or remove, so the hint says to check the spelling.

**`OnsitePaymentModal.vue`** (owner, from Monthly Income)
"Record payment" for cash, GCash handed over in person, or bank transfer. It saves with
`POST /admin/income-records`, and reads `GET /admin/rooms`, `GET /public/rates` and
`GET /admin/payments`. Worth knowing: the amount starts at zero, not a guessed figure; water is
worked out from the number of occupants she enters; the period start defaults to the day after the
tenant's latest paid period; "Adyen Online" is not offered, because only the gateway may record that.
It warns her if a GCash payment for the same month is still waiting to be verified, which closes a
double-collection gap.

### `components/overview/` (tiles and charts)

**`MonthCapsules.vue`**
Twelve months as rounded bars, used on the owner's Overview and the tenant's Payments. A month not
yet entered is drawn hatched, not as a zero, because "nothing entered" is not "nothing collected".
Each bar is a button that reads out its own value.

**`OccupancyArc.vue`**
Occupancy as a half ring, one segment per rentable unit, filled from the left. Which units are vacant
is listed in words under the ring.

**`OverviewTile.vue`**
The standard tile used on both Overviews and the ledgers. Its tone shows importance: the green and
dark tones are kept for the one or two things that need action.

**`PaymentMonths.vue`** (tenant)
The tenant's rent month by month, drawn from their own receipts and standing
(`lib/tenantPaymentMonths.ts`). It keeps "still loading", "could not load" and "nothing recorded"
apart, so a tenant is never told the house has no record of their money by accident.

**`PhoneMore.vue`**
On a phone, folds the second half of an Overview tile under "More", so the first screen shows what
matters. From 768 px wide nothing folds.

**`QuickActionsFab.vue`** (owner, phone)
The floating green button on the phone Overview that opens Record payment, Record expense and Move
someone in/out. It uses the same action list as the desktop header buttons, so the two cannot
disagree.

**`RecentActions.vue`**
"Recently": the last three things the signed-in person did, as plain sentences the server writes
(`GET /auth/me/recent-actions`, through `lib/recentActions.ts`). It is not the audit trail: no
codes, no other people. It appears in the desktop sidebar and as one line on the phone Overview.

**`SegmentBar.vue`**
One whole split into its parts, used only when the parts add up to the total, for example expenses
by property area.

**`StatusPill.vue`**
A status in words ("Overdue", "Resolved"). The word carries the meaning; colour only repeats it.

**`UnavailableNote.vue`**
What a section shows when its data could not be loaded. It must never look like zero or an empty
list.

**`types.ts`**
Shared type definitions for the charts. It names the states a month can be in (recorded, not yet
entered, expected, future, and "none" before a tenancy starts) and the shape of an Overview action.

### `components/public/`

**`AvailabilityUnavailable.vue`** (visitor)
Shown when the site cannot find out which units are free. It shows no unit list, rates or counts,
and gives the number to call instead. It exists because the landing page once showed all 33 units as
Available during an outage, from out-of-date seed data.

**`InquiryConversationLink.vue`** (visitor)
Shown after an inquiry is sent: the private link back to the conversation, and the reference code
large enough to write down. Both inquiry forms use it.

**`inquiryRules.ts`**
The inquiry rules, checked on the page before sending: name 2 to 120 characters, a Philippine
mobile number, message 5 to 2,000 characters. They mirror the server's rules in
`backend/src/routes/public.ts`, which still enforces them. One copy is read by both forms, so they
cannot drift apart. It also words what a visitor is told when sending fails.

### `components/tenants/`

**`TenantHistory.vue`** (owner, Tenants page)
For a past year or month, who paid for each unit, read from the receipts (`lib/tenantHistory.ts`).
Read-only. Different spellings of one person's name are shown under the name they were folded into,
never hidden. It offers the download of the tenant history workbook through `DownloadDialog.vue`.

### `components/ui/` (shared building blocks)

**`ConfirmDialog.vue`**
"Are you sure?" The confirm button says what will happen, and a destructive one looks destructive.
It can require typing a phrase first, used for moving a tenant out.

**`DownloadDialog.vue`**
"What do you want to download?" One month, one year, or everything. Used by Monthly Income, Monthly
Expenses and the tenant history. It calls `downloadReport()` in `lib/downloadReport.ts`; a failure is
shown inside the dialog, and closing it stops the download.

**`InvoiceField.vue`**
The invoice field on Record payment and Edit payment: type a number, or tap "ACK" for an
acknowledgement receipt, which has no number. What is saved is decided by `lib/invoiceNumber.ts`.

**`ListToolbar.vue`**
The one search-and-filter bar every list uses. Each filter is a dropdown that applies at once; on a
phone they sit behind a Filters button. A line under the toolbar says what is narrowing the list.

**`listToolbar.ts`**
The type definitions `ListToolbar.vue` uses to describe a filter. The screen keeps its own filter
values; the toolbar never owns them. (The filter dialog was once a separate `FilterSheet` component; it now lives inside
`ListToolbar.vue`.)

**`PillSelect.vue`**
The app's own dropdown, used inside the toolbar, forms and dialogs. It supports the keyboard (arrow
keys, Home, End) and screen readers.

**`RecordTable.vue`**
The one table. It shows a first page of rows and asks before showing more (`ShowMore.vue`), and
below the `lg` width each row becomes a card, because a sideways-scrolling table on a phone is not
readable.

**`ShowMore.vue`**
The "Show more / Show fewer" control under a long list, with a counter ("8 of 626 entries").

**`Skeleton.vue`**, **`SkeletonCard.vue`**, **`SkeletonDetail.vue`**, **`SkeletonTable.vue`**
Grey placeholder shapes shown while data loads, each in the shape of what will replace it: one
block, a tile, a unit's detail page (the category page), and a table (both its desktop and phone
forms). They stay still for anyone who has asked for reduced motion.

**`ThemeChoice.vue`**
The Appearance control in the account menu: System, Light or Dark (`lib/theme.ts`).

**`ThemeToggle.vue`**
The small light/dark switch on the public pages, which have no account menu.

**`ToastContainer.vue`**
Where toasts (short messages such as "Payment recorded") appear. It is one screen-reader live region
that exists from the start, so messages are announced.

**`WsModal.vue`**
The one dialog every pop-up uses. It handles the dialog role and name, Escape, keeping focus inside,
returning focus afterwards, and stopping the page behind from scrolling. When `dismissible` is
false, all three ways out (backdrop, Escape, the X) are blocked, which the forced password step
relies on.

**`YearMenu.vue`**
The year picker on the Overview and both ledgers: a green word with a small list. The picked year is
shared by all three (`lib/yearScope.ts`).

---

## 5. `lib/` (logic with no screen)

### Talking to the server and knowing who is signed in

**`api.ts`**
Every request to the backend goes through here (see Section 1). It adds the `Authorization: Bearer`
token, sets the 25-second read and 45-second save deadlines, and treats a save that timed out as
"not confirmed" rather than "failed", so the owner checks before saving twice. It reads the API's
address from `VITE_API_BASE_URL`, set at build time. It also passes every read through
`offlineCache.ts`. See `STUDY_GUIDE_CODE.md`, Sections 4 and 6.

**`authStore.ts`**
Who is signed in, their role and permissions. `login()` posts to `POST /auth/login` (by login ID or
phone number), `logout()` to `POST /auth/logout`, and `restoreSession()` reads `GET /auth/me` when
the app opens. If the app opens offline, it keeps the last known session instead of signing the
person out; only a real "session over" from the server signs them out. Signing out wipes the offline
copies and saved filters, so the next person on a shared phone sees nothing of the last.
`registerUser()` still exists but no screen calls it.

**`systemState.ts`**
The shared lists the owner's screens read (see Section 1), each with a `fetch...()` loader and a
"fetch failed" flag so a failure is never shown as zero. It also holds the property's contact
details (`LANDLADY`), refreshed from `GET /public/contact`, with 0927 465 3938 as the stand-in when
that read fails, and the water charge rule (`waterChargeFor`): the configured rate per occupant for
every unit. Its last comment explains why nothing loads when the file is imported: it once fired six
owner-only requests on every page, which wrote false "access denied" rows into the audit trail for
every tenant.

**`notificationsStore.ts`**
The notifications for whoever is signed in: `GET /admin/notifications` or
`GET /tenant/my-notifications`, the unread count, and marking read (`.../:id/read`,
`.../mark-all-read`). The list is emptied when a different person signs in, so nobody sees the
last person's notifications.

**`recentActions.ts`**
The one shared copy of "Recently" (`GET /auth/me/recent-actions`), so the sidebar and the phone
Overview make one request and show the same three actions.

**`live.ts`**
Keeps open pages current. Every 2 seconds while a page is on screen it asks `GET /live/version` for a
fingerprint of what that person can see, and reloads only what changed. A hidden tab asks nothing.
Screens register their own reloads with `useLiveRefresh()`. See `STUDY_GUIDE_CODE.md`, Section 6.

**`offlineCache.ts`**
Read-only copies of the signed-in person's important reads, kept in the browser's IndexedDB (a
database inside the browser) so the installed app can show them with no connection. Only listed
reads are kept, keyed to the person, never sign-in, checkout, conversations or photos, and wiped at
sign-out. It also provides `isOffline` and `writesUnavailable`, which hide or disable pay, record and
save buttons while offline.

### Dates, money, names and numbers

**`propertyDate.ts`**
Dates by the property's clock (Asia/Manila), never UTC or the viewer's own zone. Before 8 a.m. the
old code offered yesterday's date on payment forms. It also formats bare dates without shifting them
a day, and works out a rent period's end the same way the server does.

**`canonicalUnits.ts`**
The structure of the 33 units: codes, clusters, floors, types and capacities, with no people and no
money in it. It also has the peso formatters (`peso`, `pesoExact`), `wholePercents` (shares that add
to exactly 100), and `publicStatusLabel` (what a visitor reads for a unit's status). Its comments
record that it once held invented tenant names, which were removed.

**`unitCategories.ts`**
The four kinds of unit (20 Studio, 8 One-bedroom, 4 Two-bedroom, 1 Three-bedroom), their address
slug and icon. One copy, read by the landing and category pages, because two copies once
disagreed.

**`floorPlans.ts`**
Which floor-plan picture each unit is on and where its label goes. Ten pictures cover all 33 units,
instead of 33 large files (11.3 MB reduced to 1.27 MB).

**`contactDetails.ts`**
The phone rules: `phoneDigits` (reads `+63` as `0`), `isPhMobile` (a Philippine mobile, 09 followed
by nine digits) and the messages for a wrong number. It also turns old placeholder email addresses
into a blank, so no screen shows one. The server has a matching copy.

**`phoneFormat.ts`**
The `v-phone` directive (a reusable behaviour attached to an input): it spaces a number 4-3-4 as it
is typed and keeps the cursor in place. Spaces are safe to store, because every comparison reads the
digits only.

**`invoiceNumber.ts`**
Shows how an invoice number will be saved: "OR#4726", "4726" or "invoice 4726" become `INV#4726`;
anything starting "ack" becomes "Acknowledgement receipt"; blank means no invoice. The server has
the matching rule.

**`incomeFiling.ts`**
Which year and month an income row counts under: the month the rent is for. Monthly Income, the
Overview and the Excel file now agree on this.

**`focusMonth.ts`**
Which single month the headline card on Monthly Income and Monthly Expenses shows, so both screens
always show the same month.

**`tenantHistory.ts`**
Builds "who lived in which unit, month by month" from the receipts, because most tenancies carry a
placeholder move-in date and past tenants have no account. It matches different spellings of one
name carefully and only within the same unit. An identical copy is in
`backend/src/utils/tenantHistory.ts` for the Excel download, and `check:reports` fails if the two
differ.

**`tenantPaymentMonths.ts`**
Works out a tenant's months: paid (only Verified receipts count), due, overdue, or nothing recorded.
A gap before their latest receipt is shown as "nothing recorded", never as owed.

**`greeting.ts`**
"Good morning", "Good noon", "Good afternoon" or "Good evening" on the Overviews, by Manila's clock,
kept current while the page is open.

### Screen helpers

**`downloadReport.ts`**
Downloads the Excel workbooks from `GET /admin/reports/income.xlsx`, `expenses.xlsx` and
`tenants.xlsx`, for a month, a year or everything. It fetches the file (a plain link cannot carry
the sign-in token) and names it by period, for example "Monthly Income 2026". The paths are written
out in full so the `check:endpoints` check can find each one.

**`openFromQuery.ts`**
`useOpenFromQuery()` opens the record named in the address (for example a payment from a
notification) and then removes it from the address, so a refresh does not reopen it.
`notificationTarget()` decides where each notification leads.

**`afterArrival.ts`**
Waits until a page has appeared and its data has loaded before opening a dialog on top of it, so a
dialog never opens over a half-drawn page.

**`usePaged.ts`**
Shows the first page of a long list and adds more on request. A new filter starts the count again.

**`rowOrder.ts`**
The "Order" choice every list offers: by unit (1A, 1B ... then named units), by name A to Z, newest
or oldest first.

**`savedFilters.ts`**
Remembers each list's filters while the tab is open, and clears them at sign-out. Filter choices
only, never a search or a record.

**`yearScope.ts`**
The year picked on the Overview and both ledgers, shared and kept for the tab.

**`lastPage.ts`**
Remembers the last signed-in page per person, so signing in again returns there. Only for the same
person and the same part of the app, so a shared phone never hands one tenant another's page.

**`myInquiries.ts`**
The inquiries this browser has sent (link secret, reference code, unit and time only, never the
name, phone or message), so `/inquiry` can list them.

**`photoFile.ts`**
The one photo rule: JPG or PNG only, checked again after picking because a phone's file picker can
let anything through. The server refuses anything else too.

**`shrinkPhoto.ts`**
Shrinks a phone photo in the browser (to 1600 px on the long side, as JPEG) until it fits the
server's 1 MB request limit.

**`copyText.ts`**
Copies text to the clipboard, with an older fallback where the modern way is refused. Used, for
example, when the owner copies a starting password to hand over.

**`scrollLock.ts`**
One shared lock that stops the page scrolling behind any open dialog or drawer; the page scrolls
again only when the last one closes.

**`domId.ts`**
Turns a label like "Boarding House" into a safe element id ("Boarding-House") for accessibility
attributes.

**`useToast.ts`**
Shows toasts. A success plays the ping, an error plays a low tone (`sounds.ts`). A message raised
while a dialog is open is shown inside that dialog, so it never covers the dialog's title or X.

**`sounds.ts`**
The two sounds, made in the browser with no audio files: "notify" (something arrived or was saved)
and "problem" (it did not go through). Sound starts only after the first tap, as browsers require.

**`theme.ts`**
Dark mode: System, Light or Dark, stored in the browser, applied by setting `data-theme` on the page,
and following the phone's setting live when on System.

**`pullToRefresh.ts`**
The pull-down gesture for the installed app only. On release it fetches everything on screen again
in place (`refreshNow()` in `live.ts`); a signed-out public page simply reloads. A pull starts only
at the very top of the page with no dialog open.

**`staleVersion.ts`**
Fixes a page left open across a new deploy. When a page's code file no longer exists, or a new
version has taken over, the next click loads the page fresh instead of doing nothing. It also asks
for a new version when the app comes back into view and every 15 minutes.

**`warmRoutes.ts`**
After the first page has drawn and the browser is idle, downloads the code of the pages this person
is likely to open next, so those clicks are instant. Skipped on a data-saving or 2G connection.

**`demoAccounts.dev.ts`** (**dev-only**)
The list behind the demo sign-in buttons on a developer's machine. It contains no names and no
passwords: both are read from the gitignored `credentials/` folder by `vite.config.ts`, and only by
the development server. A built site gets an empty list, and the sign-in page imports this file
only in development.

---

## 6. Build, install and the public folder

**`frontend/vite.config.ts`**
The build settings. **Vite** is the tool that runs the development server and builds the site.
Worth knowing:

- A deployed build **refuses to start without `VITE_API_BASE_URL`**, because without it every
  visitor's browser would call its own computer and the site would look broken.
- The `demoPanel` plugin passes the demo sign-in list to the development server only.
- `server.host: true` lets a phone on the same wifi open the development site; its comment warns
  not to leave it running on an untrusted network.
- The **PWA** settings (`VitePWA`), explained next.

**What the PWA parts do.** A PWA (Progressive Web App) is a website that can be added to the phone's
home screen and opened like an app, with no app store. Three pieces make it work:

1. **The manifest** (in `vite.config.ts`): the app's name "Hivelet", its green colour `#17603f`, its
   icons, and `display: standalone` (opens in its own window, with no address bar).
2. **The service worker**: a small script the browser keeps running for the site. There is no
   service worker file in `public/`; the plugin (using Google's Workbox library) **generates
   `sw.js` at build time**. It stores the app's own files on the device (`globPatterns`), so the
   app opens offline, and answers any page address with the app shell (`navigateFallback`), so a
   bookmark to `/tenant/payments` opens offline too. It installs a new version at once
   (`skipWaiting`, `clientsClaim`).
3. **Runtime caching rules**: the site's own pictures are kept for 30 days, the Google fonts for a
   year, and **only** `/api/public` and `/api/health` answers for an hour. The comment says plainly
   why tenant and admin answers are never cached here: on a shared phone one tenant's bills would be
   served to the next person. Those are kept instead by `lib/offlineCache.ts`, which knows whose they
   are and wipes them at sign-out.

The floor plans are kept out of the first download (`globIgnores`) because a visitor sees at most
one. See `STUDY_GUIDE_CODE.md`, Section 6.

**`frontend/index.html`**
The one HTML page every route is drawn into. It sets the search and link-preview text, loads the
fonts, runs `boot.js`, and holds the start-up loader (the turning green hexagon), written in plain
HTML and CSS so it shows before any script arrives. The loader hides itself after 8 seconds even if
the app's code never loads.

### `frontend/public/` (files served as they are)

- **`boot.js`**: runs before the first paint. It applies the saved colour theme so a dark-mode reader
  never sees a white flash, and decides whether the loader is shown: on a first visit, after 30
  minutes away, or on a reload of a page with no placeholders of its own. It is a separate file
  because the site's security policy (`script-src 'self'`) blocks inline scripts.
- **`favicon.svg`**: the app mark, a green hexagon with a house and an H. The PNG icons are drawn
  from it.
- **`icon-192.png`, `icon-512.png`**: the home-screen icons, drawn as they are.
- **`maskable-icon-192.png`, `maskable-icon-512.png`**: icons with a full green background, for
  phones that cut the icon into their own shape.
- **`apple-touch-icon.png`**: the iPhone home-screen icon, which iOS reads from `index.html` and must
  be a PNG.
- **`og-image.jpg`**: the picture shown when the site's link is pasted into Messenger or Facebook.
- **`fe-galang-building.webp`**: the building photo on the landing page; stored for offline use.
- **`fe-galang-gate.webp`, `fe-galang-gate-800.webp`**: the gate photo in the Location section, full
  size and an 800-pixel copy; not part of the first download.
- **`floorplans/`** (10 PNGs: `ground`, `2ndfloor`, `3rdfloor`, `back1stfloor`, `back2ndfloor`,
  `back3rdfloor`, `front1stfloor`, `front2ndfloor`, `linda`, `penthouse`): one picture per floor area,
  shown on a unit with no photo (`lib/floorPlans.ts`).
- **`robots.txt`**: lets search engines read the public pages and keeps them out of `/admin`,
  `/tenant`, `/login` and `/api/`.
- **`sitemap.xml`**: the eight public addresses for search engines.

The `frontend/_harness-*.html` files on a developer's machine are gitignored local test pages with
made-up data; they are not part of the repository or the site.

---

## 7. Questions the panel could ask about the frontend

1. **"Does the browser talk to the database?"** No. Every request goes through `lib/api.ts` to the
   Express backend, which checks the person and the permission first. The browser holds no
   database key.

2. **"How does a page know who is signed in, and what stops a tenant opening an admin page?"**
   `lib/authStore.ts` holds the session; the guard in `router/index.ts` checks `meta.roles` before
   every page change and sends anyone else to `/login` or their own home. The backend checks again
   on every request, so the router is a convenience, not the only lock.

3. **"Where is the token kept, and what happens when it expires?"** In the browser's storage
   (`getStoredToken` in `lib/api.ts`). On a "session over" answer, `main.ts` signs the person out and
   sends them to `/login`, and `lib/lastPage.ts` brings them back afterwards. `STUDY_GUIDE_CODE.md`,
   Section 4, names keeping the token readable by scripts as a known weakness.

4. **"What happens if the connection is slow and she presses Save?"** `lib/api.ts` stops waiting
   after 45 seconds and says it cannot tell whether it was saved, rather than "failed", so she checks
   before sending again (`isUnconfirmed`, `failureTitle`).

5. **"Is it really offline?"** It reads offline and does not write offline. The service worker
   (`vite.config.ts`) keeps the app's files; `lib/offlineCache.ts` keeps the person's own figures in
   IndexedDB; `writesUnavailable` hides pay and save buttons, and `App.vue` shows "No connection".

6. **"Why is the PWA cache not used for tenant data?"** The comment in `vite.config.ts` gives the
   reason: on a shared phone the service worker cannot tell whose answer it holds or forget one
   person at sign-out. `lib/offlineCache.ts` keys copies to the person and `authStore.ts` wipes them.

7. **"How do screens update without a refresh?"** `lib/live.ts` asks `GET /live/version` every 2
   seconds while the page is visible and reloads only what changed.

8. **"How does the GCash payment appear on screen?"** `TenantPaymentsView.vue` opens
   `AdyenPaymentModal.vue`, which gets a session from `POST /tenant/payments/checkout` and shows
   Adyen's Drop-in. Hivelet never sees the GCash account, and the payment counts only after the
   owner verifies it on Monthly Income (`IncomeCollectionsView.vue`).

9. **"Why do the dates not shift for someone in another timezone?"** `lib/propertyDate.ts` reads
   every date by Asia/Manila and formats bare dates without converting them.

10. **"How do you make sure two screens show the same figure?"** One shared copy of each rule: the
    filing month in `lib/incomeFiling.ts`, the unit kinds in `lib/unitCategories.ts`, the inquiry
    rules in `components/public/inquiryRules.ts`, and the year in `lib/yearScope.ts`. Rules the
    server also applies are mirrored and named as twins (`invoiceNumber.ts`, `contactDetails.ts`,
    `tenantHistory.ts`).

11. **"Is the screen accessible?"** `WsModal.vue` traps and returns focus and closes on Escape;
    `ToastContainer.vue` is a live region; `StatusPill.vue` puts meaning in words, not colour alone;
    `App.vue` has a "Skip to content" link; animations have reduced-motion versions in `index.css`.

12. **"What is the 50% Share on Monthly Income?"** A system-computed figure equal to half that row's
    Rent Amount, kept for ledger parity with the owner's historical spreadsheet. It appears on Boarding
    House rows in `IncomeCollectionsView.vue`.
