# Screen contract — what each screen must still do

**Generated** by `npm run contract` in `frontend/`. Do not edit by hand: it is read
from the source every time, so it cannot drift from what the code actually calls.

## Why

The interface is being redesigned — a different look, the same functions. The risk in
that is not visual. It is a screen that comes back looking better and quietly no longer
calls something.

`check:reachable` catches a component nothing renders. `check:endpoints` catches a route
nothing calls. Between them, a whole screen or a whole endpoint going missing is caught.
**Neither catches the middle case**: the screen is there, the endpoint is there, and the
button that joined them is gone.

So: rebuild a screen, then check it against its row here. Every call listed was being made
before the redesign started.

**Read the verbs literally.** `writes` means it changes the owner's data.

## Screens

### `views/AdminOverviewView.vue`

1 call(s), **0 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /admin/payments` | payments awaiting verification |

### `views/AuditLogsView.vue`

1 call(s), **0 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /admin/audit-logs` | the audit trail |

### `views/CategoryRoomsView.vue`

3 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /public/rates` | the water rate and the two Linda fixed charges |
| reads | `GET /public/rooms` | the public unit catalogue |
| **writes** | `POST /public/inquiries` | a prospect sends an enquiry |

### `views/ExpensesLedgerView.vue`

4 call(s), **3 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| **writes** | `DELETE /admin/expense-entries/:id` | delete an expense |
| reads | `GET /admin/expense-categories` | the thirteen expense categories |
| **writes** | `PATCH /admin/expense-entries/:id` | edit an expense and re-allocate — atomic |
| **writes** | `POST /admin/expense-entries` | add an expense and its area allocations — atomic |

### `views/IncomeCollectionsView.vue`

5 call(s), **4 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| **writes** | `DELETE /admin/income-records/:id` | void a receipt |
| reads | `GET /admin/payments` | payments awaiting verification |
| **writes** | `PATCH /admin/income-records/:id` | correct a receipt |
| **writes** | `PATCH /admin/payments/:id/verify` | verify a payment — atomic, settles the bill and the ledger together |
| **writes** | `POST /admin/income-records` | record an on-site collection — the money path |

### `views/InquireView.vue`

2 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /public/rooms` | the public unit catalogue |
| **writes** | `POST /public/inquiries` | a prospect sends an enquiry |

### `views/InquiriesView.vue`

3 call(s), **2 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /admin/inquiries/:id/messages` | what has already been said to a prospect |
| **writes** | `PATCH /admin/inquiries/:id` | advance or close an enquiry |
| **writes** | `POST /admin/inquiries/:id/messages` | reply to a prospect |

### `views/MaintenanceDispatchView.vue`

4 call(s), **3 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| **writes** | `DELETE /admin/tickets/:id` | delete a ticket |
| reads | `GET /admin/tickets/:id/messages` | read a ticket thread |
| **writes** | `PATCH /admin/tickets/:id` | move a ticket, and the unit status with it |
| **writes** | `POST /admin/tickets/:id/messages` | reply on a ticket |

### `views/TenantManagementView.vue`

4 call(s), **4 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| **writes** | `PATCH /admin/inquiries/:id` | advance or close an enquiry |
| **writes** | `PATCH /admin/tenants/:id` | edit a resident |
| **writes** | `POST /admin/tenants` | onboard a resident — writes profile, tenancy and unit status |
| **writes** | `POST /admin/tenants/:id/vacate` | end a tenancy and free the unit |

### `views/TenantOverviewView.vue`

6 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /public/rates` | the water rate and the two Linda fixed charges |
| reads | `GET /tenant/my-bills` | my bills |
| reads | `GET /tenant/my-income-records` | my receipts |
| reads | `GET /tenant/my-payments` | my payments |
| reads | `GET /tenant/my-rooms` | my unit |
| **writes** | `POST /tenant/payments/checkout` | pay by GCash through Adyen |

### `views/TenantPaymentsView.vue`

2 call(s), **0 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /tenant/my-bills` | my bills |
| reads | `GET /tenant/my-payments` | my payments |

### `views/TenantProfileView.vue`

2 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /tenant/my-profile` | my details |
| **writes** | `PUT /tenant/my-profile` | edit my details |

### `views/TenantTicketsView.vue`

5 call(s), **2 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /tenant/my-rooms` | my unit |
| reads | `GET /tenant/my-tickets` | my maintenance requests |
| reads | `GET /tenant/tickets/:id/messages` | read my ticket thread - 404 for anyone else's |
| **writes** | `POST /tenant/tickets` | file a maintenance request, with photos |
| **writes** | `POST /tenant/tickets/:id/messages` | reply on my ticket |

## Shared code — stores, modals, components

### `components/modals/AdminEditUnitModal.vue`

2 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /admin/rooms` | the unit directory |
| **writes** | `PATCH /admin/rooms/:id` | edit a unit — the rate change writes room_price_history by trigger |

### `components/modals/AdyenPaymentModal.vue`

2 call(s), **2 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| **writes** | `POST /tenant/payments/adyen/verify-session` | confirm the gateway session on return |
| **writes** | `POST /tenant/payments/checkout` | pay by GCash through Adyen |

### `components/modals/ChangePasswordModal.vue`

1 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| **writes** | `POST /auth/change-password` | change my own password |

### `components/modals/OnsitePaymentModal.vue`

2 call(s), **1 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /admin/rooms` | the unit directory |
| **writes** | `POST /admin/income-records` | record an on-site collection — the money path |

### `lib/authStore.ts`

4 call(s), **3 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /auth/me` | who am I |
| **writes** | `POST /auth/login` | sign in |
| **writes** | `POST /auth/logout` | sign out, recorded in the audit trail |
| **writes** | `POST /auth/register` | create an account |

### `lib/downloadReport.ts`

1 call(s), **0 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET :id` | — |

### `lib/systemState.ts`

5 call(s), **0 of them write**.

| | Endpoint | What it is for |
| :--- | :--- | :--- |
| reads | `GET /admin/expense-entries` | the expense ledger |
| reads | `GET /admin/income-records` | the owner's income ledger |
| reads | `GET /admin/inquiries` | enquiries from the public site |
| reads | `GET /admin/tenants` | the resident directory |
| reads | `GET /admin/tickets` | the maintenance board |

---

**20 files make 59 distinct calls, 30 of which write.** Generated 2026-09-19.
