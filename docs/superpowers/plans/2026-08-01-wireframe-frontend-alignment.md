# Wireframe & Frontend Feature Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all prototype functionality from `wireframe/` into the production `frontend/` codebase while strictly maintaining the Jira-inspired corporate UI, Vue 3 + TypeScript architecture, and single-slug unified role navigation.

**Architecture:** Create a centralized reactive state (`src/lib/systemState.ts`) for canonical property units, Spec 09 income ledger, Spec 10 multi-supplier expense ledger, maintenance tickets, and live inquirers chat. Revise Vue components and modals to consume this state and present corporate Jira-style UI surfaces.

**Tech Stack:** Vue 3 (Composition API / `<script setup>`), TypeScript, TailwindCSS v4, Lucide-Vue Icons, Vue Router.

---

### File Structure Map
- `frontend/src/lib/systemState.ts` — Centralized reactive state & mock data store (32 rooms, Spec 09 income ledger, Spec 10 expense ledger, maintenance tickets, live chat)
- `frontend/src/components/modals/RoomDetailModal.vue` — Full room specs modal
- `frontend/src/components/modals/AdminEditUnitModal.vue` — Admin room specs & photo edit modal
- `frontend/src/components/modals/TicketHoverModal.vue` — Hover maintenance ticket expand pop-over modal
- `frontend/src/components/modals/LiveChatheadModal.vue` — Floating chathead widget
- `frontend/src/components/modals/OnsitePaymentModal.vue` — Record cash payment modal
- `frontend/src/components/modals/TenantLoginModal.vue` — Tenant portal entry modal
- `frontend/src/components/modals/GuestEntryModal.vue` — Guest visitor entry modal
- `frontend/src/components/layout/AppHeader.vue` — Top navbar with role switcher and floating chat trigger
- `frontend/src/components/layout/AppSidebar.vue` — Navigation sidebar with quick user card
- `frontend/src/views/AdminOverviewView.vue` — 32-room matrix and KPI dashboard
- `frontend/src/views/BillingPaymentsView.vue` — Spec 09 Monthly Payment recorder and collection ledger
- `frontend/src/views/ExpensesLedgerView.vue` — Spec 10 Multi-supplier expense logger with date cell rowspan
- `frontend/src/views/MaintenanceDispatchView.vue` — Ticket dispatch table with diagonal expand modal
- `frontend/src/views/PublicGuestView.vue` — Public guest showcase with floor & availability filters
- `frontend/src/views/TenantPortalView.vue` — Active tenant dashboard & ticket submission form
- `frontend/src/views/InquiriesView.vue` — Landlady inquiry inbox management
- `frontend/src/views/SystemSettingsView.vue` — Business rules configuration
- `frontend/src/router/index.ts` — Updated router with settings view

---

### Task 1: Centralized Reactive System State Store

**Files:**
- Create: `frontend/src/lib/systemState.ts`

- [ ] **Step 1: Create systemState.ts with full reactive data structures**

Create `frontend/src/lib/systemState.ts`:

```typescript
/**
 * @file lib/systemState.ts
 * @description Centralized reactive data store for Hivelet system state.
 * @systemBibleRef Section 3 (System Features) & Section 4 (User Roles)
 * @rationale Manages real-time mock state for 32 property units, Spec 09 income ledger, Spec 10 expense ledger, maintenance tickets, and live chat.
 */
import { reactive, ref } from 'vue';

export interface RoomUnit {
  id: string;
  floor: number;
  num: string;
  type: 'Studio' | '1-Bedroom' | '2-Bedroom' | '3-Bedroom';
  price: number;
  occupants: number;
  maxOccupants: number;
  status: 'available' | 'occupied' | 'pending' | 'overdue';
  tenant: string | null;
  paid: boolean;
  balance: number;
  photo: string;
  desc: string;
}

export interface IncomeRecord {
  unit: string;
  date: string;
  invoiceNum: string;
  contact: string;
  period: string;
  rent: number;
  share: number;
  occupants: number;
  water: number;
  remitted: number;
  paymentMethod: 'Cash' | 'Online';
  referenceNum: string;
}

export interface ExpenseItem {
  supplier: string;
  area: 'BH' | 'MainHouse' | 'FrontApt' | 'BackApt' | 'Other';
  amount: number;
  catId: string;
  catName: string;
}

export interface ExpenseGroup {
  date: string;
  items: ExpenseItem[];
}

export interface MaintenanceTicket {
  id: string;
  room: string;
  tenant: string;
  phone: string;
  issue: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  date: string;
  desc: string;
  technician: string;
  photo: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface ChatMessage {
  sender: 'Inquirer' | 'Landlady';
  time: string;
  text: string;
}

export interface Inquirer {
  id: string;
  name: string;
  room: string;
  type: string;
  price: number;
  unread: boolean;
  messages: ChatMessage[];
}

export const activeRole = ref<'admin' | 'tenant' | 'guest'>('admin');

export const rooms = reactive<RoomUnit[]>([
  // 1st Floor
  { id: '101', floor: 1, num: '101', type: 'Studio', price: 5000, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Alex Santos', paid: true, balance: 0, photo: 'room101_studio.jpg', desc: 'Quiet 1st Floor Studio Unit with private bathroom and single bed frame.' },
  { id: '102', floor: 1, num: '102', type: 'Studio', price: 5000, occupants: 2, maxOccupants: 2, status: 'pending', tenant: 'Maria Clara', paid: false, balance: 5400, photo: 'room102_studio.jpg', desc: 'Cozy 1st Floor Studio near main entrance, ideal for working professionals.' },
  { id: '103', floor: 1, num: '103', type: '1-Bedroom', price: 6500, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Ben Reyes', paid: true, balance: 0, photo: 'room103_1bed.jpg', desc: 'Spacious 1-Bedroom Unit with separated kitchen space and private sub-meter.' },
  { id: '104', floor: 1, num: '104', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room104_renovated.jpg', desc: 'Newly renovated 1-Bedroom Unit on Floor 1. Excellent ventilation and window light.' },
  { id: '105', floor: 1, num: '105', type: '2-Bedroom', price: 8500, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Chloe Tan', paid: true, balance: 0, photo: 'room105_2bed.jpg', desc: 'Large 2-Bedroom Unit designed for small family or shared roommates.' },
  { id: '106', floor: 1, num: '106', type: 'Studio', price: 5000, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'David Lim', paid: true, balance: 0, photo: 'room106_studio.jpg', desc: 'Ground floor studio unit with easy access to main lobby.' },
  { id: '107', floor: 1, num: '107', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Elena Cruz', paid: true, balance: 0, photo: 'room107_tile.jpg', desc: '1-Bedroom unit with ceramic tile flooring and built-in closet.' },
  { id: '108', floor: 1, num: '108', type: '2-Bedroom', price: 8500, occupants: 2, maxOccupants: 4, status: 'overdue', tenant: 'Felix Go', paid: false, balance: 8900, photo: 'room108_corner.jpg', desc: 'Corner 2-Bedroom unit with extra storage space.' },
  { id: '109', floor: 1, num: '109', type: 'Studio', price: 5000, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Grace Lee', paid: true, balance: 0, photo: 'room109_laundry.jpg', desc: 'Compact studio unit near laundry area.' },
  { id: '110', floor: 1, num: '110', type: '3-Bedroom', price: 11000, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Harvey Sy', paid: true, balance: 0, photo: 'room110_family.jpg', desc: 'Premium 3-Bedroom family unit on the 1st floor.' },

  // 2nd Floor
  { id: '201', floor: 2, num: '201', type: 'Studio', price: 5200, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Ian Dizon', paid: true, balance: 0, photo: 'room201_studio.jpg', desc: '2nd Floor Studio Unit with quiet corridor view.' },
  { id: '202', floor: 2, num: '202', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room202_balcony.jpg', desc: 'Bright 2nd Floor 1-Bedroom Unit with private balcony window.' },
  { id: '203', floor: 2, num: '203', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Jane Uy', paid: true, balance: 0, photo: 'room203_desk.jpg', desc: 'Standard 1-Bedroom unit with study desk.' },
  { id: '204', floor: 2, num: '204', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'pending', tenant: 'Juan Dela Cruz', paid: false, balance: 6900, photo: 'room204_main.jpg', desc: 'Well-maintained 1-Bedroom unit on 2nd Floor.' },
  { id: '205', floor: 2, num: '205', type: '2-Bedroom', price: 8800, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Kevin Pineda', paid: true, balance: 0, photo: 'room205_aircon.jpg', desc: '2-Bedroom unit featuring split aircon provision.' },
  { id: '206', floor: 2, num: '206', type: 'Studio', price: 5200, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Leo Ramos', paid: true, balance: 0, photo: 'room206_shelf.jpg', desc: 'Studio unit with wall-mounted shelves.' },
  { id: '207', floor: 2, num: '207', type: '1-Bedroom', price: 6500, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Mona Lisa', paid: true, balance: 0, photo: 'room207_quiet.jpg', desc: 'Quiet mid-hallway 1-Bedroom unit.' },
  { id: '208', floor: 2, num: '208', type: 'Studio', price: 5200, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Nico Val', paid: true, balance: 0, photo: 'room208_tiled.jpg', desc: 'Studio unit with tiled bathroom.' },
  { id: '209', floor: 2, num: '209', type: '2-Bedroom', price: 8800, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Oscar Wilde', paid: true, balance: 0, photo: 'room209_double.jpg', desc: 'Spacious 2-Bedroom unit for double occupancy.' },
  { id: '210', floor: 2, num: '210', type: '3-Bedroom', price: 11500, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Paolo Ballesteros', paid: true, balance: 0, photo: 'room210_master.jpg', desc: '2nd Floor 3-Bedroom Master Suite.' },
  { id: '211', floor: 2, num: '211', type: 'Studio', price: 5200, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room211_corner.jpg', desc: 'Corner 2nd Floor Studio Unit, available for immediate move-in.' },

  // 3rd Floor
  { id: '301', floor: 3, num: '301', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Quinnie Torres', paid: true, balance: 0, photo: 'room301_high.jpg', desc: '3rd Floor Studio Unit with high ceiling airflow.' },
  { id: '302', floor: 3, num: '302', type: '1-Bedroom', price: 6800, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Rita Daniela', paid: true, balance: 0, photo: 'room302_skyline.jpg', desc: '3rd Floor 1-Bedroom unit with city skyline view.' },
  { id: '303', floor: 3, num: '303', type: '1-Bedroom', price: 6800, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room303_fresh.jpg', desc: 'Top Floor 1-Bedroom Unit. Fresh paint and new bathroom fixtures.' },
  { id: '304', floor: 3, num: '304', type: '2-Bedroom', price: 9000, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Sam Conception', paid: true, balance: 0, photo: 'room304_top.jpg', desc: '3rd Floor 2-Bedroom unit.' },
  { id: '305', floor: 3, num: '305', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Tina Paner', paid: true, balance: 0, photo: 'room305_deck.jpg', desc: 'Studio unit near roof deck access.' },
  { id: '306', floor: 3, num: '306', type: '1-Bedroom', price: 6800, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Ulysses S.', paid: true, balance: 0, photo: 'room306_cabinet.jpg', desc: '1-Bedroom unit with overhead cabinet storage.' },
  { id: '307', floor: 3, num: '307', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Vicky Belo', paid: true, balance: 0, photo: 'room307_studio.jpg', desc: 'Top floor studio unit.' },
  { id: '308', floor: 3, num: '308', type: '2-Bedroom', price: 9000, occupants: 2, maxOccupants: 4, status: 'overdue', tenant: 'Wally Bayola', paid: false, balance: 9400, photo: 'room308_corner.jpg', desc: 'Corner 3rd floor 2-Bedroom unit.' },
  { id: '309', floor: 3, num: '309', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Xavier School', paid: true, balance: 0, photo: 'room309_quiet.jpg', desc: 'Quiet studio unit.' },
  { id: '310', floor: 3, num: '310', type: '3-Bedroom', price: 12000, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Yeng Constantino', paid: true, balance: 0, photo: 'room310_penthouse.jpg', desc: 'Penthouse-level 3-Bedroom Unit.' },
  { id: '311', floor: 3, num: '311', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Zack Tabudlo', paid: true, balance: 0, photo: 'room311_submeter.jpg', desc: 'Studio unit with private submeter.' }
]);

export const incomeLedger = reactive<IncomeRecord[]>([
  { unit: '101', date: '2026-08-01', invoiceNum: 'INV-80012', contact: 'Alex Santos', period: 'Aug.1-Aug.31/26', rent: 5000, share: 2500, occupants: 1, water: 200, remitted: 5200, paymentMethod: 'Cash', referenceNum: 'N/A' },
  { unit: '102', date: '2026-08-01', invoiceNum: 'INV-80013', contact: 'Maria Clara', period: 'Aug.1-Aug.31/26', rent: 5000, share: 2500, occupants: 2, water: 400, remitted: 5400, paymentMethod: 'Cash', referenceNum: 'N/A' },
  { unit: '204', date: '2026-08-01', invoiceNum: 'INV-88392', contact: 'Juan Dela Cruz', period: 'Aug.5-Sep.4/26', rent: 6500, share: 3250, occupants: 2, water: 400, remitted: 6900, paymentMethod: 'Online', referenceNum: 'GCASH-9948271' },
  { unit: 'LF', date: '2026-08-01', invoiceNum: 'INV-70091', contact: 'Gayon (Linda Unit)', period: 'Fixed Monthly', rent: 3500, share: 1750, occupants: 1, water: 400, remitted: 3900, paymentMethod: 'Cash', referenceNum: 'N/A' }
]);

export const expenseLedger = reactive<ExpenseGroup[]>([
  {
    date: '2026-08-01',
    items: [
      { supplier: 'Wilcon Depot (bh)', area: 'BH', amount: 2500, catId: '8', catName: 'Repairs & Maintenance' },
      { supplier: 'Electricbill (May26)', area: 'BH', amount: 14964, catId: '7', catName: 'Comm, Light, Water' },
      { supplier: 'Electricbill (May26)', area: 'MainHouse', amount: 5688, catId: '7', catName: 'Comm, Light, Water' }
    ]
  }
]);

export const tickets = reactive<MaintenanceTicket[]>([
  {
    id: 'ticket-108',
    room: '108',
    tenant: 'Felix Go',
    phone: '0918-555-0192',
    issue: 'Faucet Leaking in bathroom',
    priority: 'Emergency',
    date: '2026-07-27',
    desc: 'Heavy water leak coming from bathroom faucet sub-assembly. Flooding bathroom floor.',
    technician: 'Mario Tech (Plumbing Specialist)',
    photo: 'faucet_leak_room108.jpg',
    status: 'OPEN'
  },
  {
    id: 'ticket-305',
    room: '305',
    tenant: 'Tina Paner',
    phone: '0917-888-3321',
    issue: 'Window Latch Repair',
    priority: 'Medium',
    date: '2026-07-26',
    desc: 'Window latch loose due to worn screws. Needs hardware replacement.',
    technician: 'Carpenter Joseph',
    photo: 'window_latch_305.jpg',
    status: 'OPEN'
  }
]);

export const activeInquirers = reactive<Inquirer[]>([
  {
    id: 'inq-1',
    name: 'Maria Santos',
    room: '204',
    type: '1-Bedroom',
    price: 6500,
    unread: true,
    messages: [
      { sender: 'Inquirer', time: '10:14 AM', text: 'Hello Mrs. Fe! Is Room 204 still available for move-in next week?' },
      { sender: 'Landlady', time: '10:16 AM', text: 'Yes Maria! Room 204 is 1-Bedroom (₱6,500/mo) with water at ₱200/head. Would you like to view it?' }
    ]
  },
  {
    id: 'inq-2',
    name: 'Alex Gonzaga',
    room: '104',
    type: '1-Bedroom',
    price: 6500,
    unread: true,
    messages: [
      { sender: 'Inquirer', time: '09:45 AM', text: 'Good morning! Inquiring about 1st Floor Room 104 parking slot.' }
    ]
  }
]);

// Modal State Controllers
export const isRoomDetailModalOpen = ref(false);
export const activeRoomDetail = ref<RoomUnit | null>(null);

export const isAdminEditUnitModalOpen = ref(false);
export const activeAdminEditUnit = ref<RoomUnit | null>(null);

export const isTicketHoverModalOpen = ref(false);
export const activeHoverTicket = ref<MaintenanceTicket | null>(null);

export const isLiveChatheadOpen = ref(false);
export const selectedInquirerId = ref('inq-1');

export const isOnsitePaymentModalOpen = ref(false);
export const isTenantLoginModalOpen = ref(false);
export const isGuestEntryModalOpen = ref(false);

export function openRoomDetail(room: RoomUnit) {
  activeRoomDetail.value = room;
  isRoomDetailModalOpen.value = true;
}

export function openAdminEditUnit(room: RoomUnit) {
  activeAdminEditUnit.value = JSON.parse(JSON.stringify(room));
  isAdminEditUnitModalOpen.value = true;
}

export function openTicketHover(ticket: MaintenanceTicket) {
  activeHoverTicket.value = ticket;
  isTicketHoverModalOpen.value = true;
}

export function resolveTicket(ticketId: string) {
  const t = tickets.find(x => x.id === ticketId);
  if (t) t.status = 'RESOLVED';
}

export function addIncomeRecord(record: IncomeRecord) {
  incomeLedger.unshift(record);
  const room = rooms.find(r => r.num === record.unit);
  if (room) {
    room.status = 'occupied';
    room.paid = true;
    room.balance = 0;
  }
}

export function addExpenseGroup(group: ExpenseGroup) {
  const existing = expenseLedger.find(g => g.date === group.date);
  if (existing) {
    existing.items.push(...group.items);
  } else {
    expenseLedger.unshift(group);
  }
}

export function sendChatMessage(inquirerId: string, text: string, sender: 'Inquirer' | 'Landlady' = 'Landlady') {
  const inq = activeInquirers.find(i => i.id === inquirerId);
  if (inq) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    inq.messages.push({ sender, time: timeStr, text });
  }
}
```

- [ ] **Step 2: Commit Task 1**

```bash
git add frontend/src/lib/systemState.ts
git commit -m "feat: add centralized reactive state store for rooms, ledgers, tickets, and chat"
```

---

### Task 2: Modals & Top Header Role Switcher Integration

**Files:**
- Create: `frontend/src/components/modals/RoomDetailModal.vue`
- Create: `frontend/src/components/modals/AdminEditUnitModal.vue`
- Create: `frontend/src/components/modals/TicketHoverModal.vue`
- Create: `frontend/src/components/modals/LiveChatheadModal.vue`
- Create: `frontend/src/components/modals/OnsitePaymentModal.vue`
- Create: `frontend/src/components/modals/TenantLoginModal.vue`
- Create: `frontend/src/components/modals/GuestEntryModal.vue`
- Modify: `frontend/src/components/layout/AppHeader.vue`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Build Modal Components**

Create `frontend/src/components/modals/RoomDetailModal.vue`:

```vue
<!--
  @file components/modals/RoomDetailModal.vue
  @description Room unit details modal displaying base rent, occupant limits, amenities, and inquiry trigger.
  @systemBibleRef Section 3.1 - Room Directory & Unit Showcase
-->
<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { X, MessageSquare, ShieldCheck, Users, Banknote } from 'lucide-vue-next';

function closeModal() {
  isRoomDetailModalOpen.value = false;
}

function handleInquire() {
  closeModal();
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div v-if="isRoomDetailModalOpen && activeRoomDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <span>Room {{ activeRoomDetail.num }} Details</span>
          <span class="jira-badge text-xs bg-blue-100 text-blue-800">{{ activeRoomDetail.type }}</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84] transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#172b4d]">
        <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs flex justify-between items-center">
          <div>
            <p class="text-[#5e6c84]">Monthly Base Rent</p>
            <p class="text-lg font-bold text-[#0c66e4]">₱{{ activeRoomDetail.price.toLocaleString() }} <span class="text-xs font-normal text-[#5e6c84]">/ mo</span></p>
          </div>
          <div class="text-right">
            <p class="text-[#5e6c84]">Floor Level</p>
            <p class="font-bold text-[#172b4d]">Floor {{ activeRoomDetail.floor }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 border border-[#dfe1e6] rounded-xs">
            <p class="text-[#5e6c84] flex items-center gap-1"><Users class="w-3.5 h-3.5" /> Max Occupants</p>
            <p class="font-bold mt-1">{{ activeRoomDetail.maxOccupants }} Persons Limit</p>
          </div>
          <div class="p-3 border border-[#dfe1e6] rounded-xs">
            <p class="text-[#5e6c84] flex items-center gap-1"><ShieldCheck class="w-3.5 h-3.5" /> Status</p>
            <p class="font-bold mt-1 uppercase text-[#0c66e4]">{{ activeRoomDetail.status }}</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-[#5e6c84]">Description & Amenities:</p>
          <p class="p-3 bg-[#ffffff] border border-[#dfe1e6] rounded-xs leading-relaxed text-[#172b4d]">
            {{ activeRoomDetail.desc }}
          </p>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs">
          <p class="font-semibold flex items-center gap-1"><Banknote class="w-3.5 h-3.5" /> Water Billing Rule (BR-014):</p>
          <p class="mt-0.5">₱200 per registered occupant per month added to monthly remittance.</p>
        </div>
      </div>

      <div class="p-4 border-t border-[#dfe1e6] bg-[#f4f5f7] flex justify-end gap-2">
        <button @click="closeModal" class="jira-btn-secondary">Close</button>
        <button @click="handleInquire" class="jira-btn-primary flex items-center gap-1.5">
          <MessageSquare class="w-3.5 h-3.5" /> Inquire Room & Chat Landlady
        </button>
      </div>
    </div>
  </div>
</template>
```

Create `frontend/src/components/modals/AdminEditUnitModal.vue`:

```vue
<!--
  @file components/modals/AdminEditUnitModal.vue
  @description Admin modal for editing unit specs, monthly rates, occupant limits, and unit photo attachments.
  @systemBibleRef Section 3.1 - Room Directory Admin Controls
-->
<script setup lang="ts">
import { isAdminEditUnitModalOpen, activeAdminEditUnit, rooms } from '@/lib/systemState';
import { X, Save, Image } from 'lucide-vue-next';

function closeModal() {
  isAdminEditUnitModalOpen.value = false;
}

function handleSave() {
  if (!activeAdminEditUnit.value) return;
  const target = rooms.find(r => r.id === activeAdminEditUnit.value?.id);
  if (target) {
    Object.assign(target, activeAdminEditUnit.value);
  }
  closeModal();
}
</script>

<template>
  <div v-if="isAdminEditUnitModalOpen && activeAdminEditUnit" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <span>Admin Edit: Room {{ activeAdminEditUnit.num }}</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84]">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="handleSave" class="p-6 space-y-3 text-xs text-[#172b4d]">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Unit Category</label>
            <select v-model="activeAdminEditUnit.type" class="jira-input">
              <option value="Studio">Studio</option>
              <option value="1-Bedroom">1-Bedroom</option>
              <option value="2-Bedroom">2-Bedroom</option>
              <option value="3-Bedroom">3-Bedroom</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Base Rent (₱)</label>
            <input v-model.number="activeAdminEditUnit.price" type="number" class="jira-input" required />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Max Occupants</label>
            <input v-model.number="activeAdminEditUnit.maxOccupants" type="number" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Occupancy Status</label>
            <select v-model="activeAdminEditUnit.status" class="jira-input">
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="pending">Pending Verification</option>
              <option value="overdue">Overdue Payment</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Unit Photo Filename / URL</label>
          <div class="flex gap-2 items-center">
            <Image class="w-4 h-4 text-[#5e6c84]" />
            <input v-model="activeAdminEditUnit.photo" type="text" class="jira-input" placeholder="room101_photo.jpg" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Description & Notes</label>
          <textarea v-model="activeAdminEditUnit.desc" rows="3" class="jira-input"></textarea>
        </div>

        <div class="pt-3 border-t border-[#dfe1e6] flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1.5">
            <Save class="w-3.5 h-3.5" /> Save Unit Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
```

Create `frontend/src/components/modals/TicketHoverModal.vue`:

```vue
<!--
  @file components/modals/TicketHoverModal.vue
  @description Hover pop-over details modal triggered by outward diagonal arrow expand button on dispatch table.
  @systemBibleRef Section 3.4 - Maintenance Dispatch & Ticket Management
-->
<script setup lang="ts">
import { isTicketHoverModalOpen, activeHoverTicket, resolveTicket } from '@/lib/systemState';
import { X, CheckCircle, Wrench, User, Phone, FileText } from 'lucide-vue-next';

function closeModal() {
  isTicketHoverModalOpen.value = false;
}

function handleResolve() {
  if (activeHoverTicket.value) {
    resolveTicket(activeHoverTicket.value.id);
  }
  closeModal();
}
</script>

<template>
  <div v-if="isTicketHoverModalOpen && activeHoverTicket" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <Wrench class="w-4 h-4 text-[#0c66e4]" />
          <span>Maintenance Ticket Details — Room {{ activeHoverTicket.room }}</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84]">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#172b4d]">
        <div class="flex justify-between items-center p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
          <div>
            <p class="font-bold text-sm text-[#172b4d]">{{ activeHoverTicket.issue }}</p>
            <p class="text-[#5e6c84]">Reported Date: {{ activeHoverTicket.date }}</p>
          </div>
          <span :class="[
            'jira-badge text-xs font-bold uppercase',
            activeHoverTicket.priority === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800'
          ]">
            {{ activeHoverTicket.priority }} Priority
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 border border-[#dfe1e6] rounded-xs space-y-1">
            <p class="font-bold text-[#5e6c84] flex items-center gap-1"><User class="w-3.5 h-3.5" /> Tenant Contact</p>
            <p class="font-semibold">{{ activeHoverTicket.tenant }}</p>
            <p class="text-[#5e6c84] flex items-center gap-1"><Phone class="w-3 h-3" /> {{ activeHoverTicket.phone }}</p>
          </div>
          <div class="p-3 border border-[#dfe1e6] rounded-xs space-y-1">
            <p class="font-bold text-[#5e6c84] flex items-center gap-1"><Wrench class="w-3.5 h-3.5" /> Assigned Tech</p>
            <p class="font-semibold">{{ activeHoverTicket.technician }}</p>
            <p class="text-[#5e6c84] flex items-center gap-1"><FileText class="w-3 h-3" /> Attachment: {{ activeHoverTicket.photo }}</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-[#5e6c84]">Issue Description:</p>
          <p class="p-3 bg-[#ffffff] border border-[#dfe1e6] rounded-xs leading-relaxed">
            "{{ activeHoverTicket.desc }}"
          </p>
        </div>
      </div>

      <div class="p-4 border-t border-[#dfe1e6] bg-[#f4f5f7] flex justify-between items-center">
        <span v-if="activeHoverTicket.status === 'RESOLVED'" class="jira-badge bg-emerald-100 text-emerald-800 font-bold">
          ✓ Ticket Resolved
        </span>
        <button v-else @click="handleResolve" class="jira-btn-primary bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5">
          <CheckCircle class="w-3.5 h-3.5" /> Close & Resolve Ticket
        </button>

        <button @click="closeModal" class="jira-btn-secondary">Close Window</button>
      </div>
    </div>
  </div>
</template>
```

Create `frontend/src/components/modals/LiveChatheadModal.vue`:

```vue
<!--
  @file components/modals/LiveChatheadModal.vue
  @description Floating chathead messenger popover for real-time landlady/inquirer communications.
  @systemBibleRef Section 3.5 - Tenant & Guest Inquiries Communication Channel
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { isLiveChatheadOpen, activeInquirers, selectedInquirerId, sendChatMessage } from '@/lib/systemState';
import { X, Send, MessageSquare } from 'lucide-vue-next';

const newMessageText = ref('');

const activeInquirer = computed(() => activeInquirers.find(i => i.id === selectedInquirerId.value));

function closeModal() {
  isLiveChatheadOpen.value = false;
}

function handleSend() {
  if (!newMessageText.value.trim() || !selectedInquirerId.value) return;
  sendChatMessage(selectedInquirerId.value, newMessageText.value.trim(), 'Landlady');
  newMessageText.value = '';
}
</script>

<template>
  <div v-if="isLiveChatheadOpen" class="fixed bottom-4 right-4 z-50 w-full max-w-lg shadow-2xl rounded-xs border border-[#dfe1e6] bg-[#ffffff] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
    <div class="flex items-center justify-between p-3 border-b border-[#dfe1e6] bg-[#172b4d] text-white">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-sky-400" />
        <span class="text-xs font-bold">Landlady Inquiry Chat Messenger</span>
      </div>
      <button @click="closeModal" class="p-1 hover:bg-slate-700 rounded-xs text-slate-300">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="grid grid-cols-3 h-80">
      <!-- Sidebar list of inquirers -->
      <div class="border-r border-[#dfe1e6] bg-[#f4f5f7] p-2 space-y-1 overflow-y-auto">
        <p class="text-[10px] font-bold text-[#5e6c84] uppercase tracking-wider mb-2">Inquirers</p>
        <button
          v-for="inq in activeInquirers"
          :key="inq.id"
          @click="selectedInquirerId = inq.id"
          :class="[
            'w-full text-left p-2 rounded-xs text-xs transition-colors',
            selectedInquirerId === inq.id ? 'bg-[#ffffff] font-bold border border-[#dfe1e6] shadow-2xs' : 'hover:bg-[#ebecf0] text-[#172b4d]'
          ]"
        >
          <p class="truncate">{{ inq.name }}</p>
          <p class="text-[10px] text-[#5e6c84]">Room {{ inq.room }}</p>
        </button>
      </div>

      <!-- Active Chat Feed -->
      <div v-if="activeInquirer" class="col-span-2 flex flex-direction flex-col h-full bg-[#ffffff] p-3 justify-between">
        <div class="border-b border-[#dfe1e6] pb-2 mb-2">
          <p class="text-xs font-bold text-[#172b4d]">{{ activeInquirer.name }}</p>
          <p class="text-[10px] text-[#5e6c84]">Inquiring about Room {{ activeInquirer.room }} (₱{{ activeInquirer.price.toLocaleString() }}/mo)</p>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 p-1 text-xs">
          <div
            v-for="(msg, idx) in activeInquirer.messages"
            :key="idx"
            :class="['max-w-[85%] p-2 rounded-xs', msg.sender === 'Landlady' ? 'ml-auto bg-[#0c66e4] text-white' : 'bg-[#f4f5f7] text-[#172b4d] border border-[#dfe1e6]']"
          >
            <p>{{ msg.text }}</p>
            <p :class="['text-[9px] mt-1 text-right', msg.sender === 'Landlady' ? 'text-sky-100' : 'text-[#5e6c84]']">{{ msg.time }}</p>
          </div>
        </div>

        <form @submit.prevent="handleSend" class="pt-2 border-t border-[#dfe1e6] flex gap-1.5">
          <input v-model="newMessageText" type="text" placeholder="Type response..." class="jira-input text-xs flex-1" required />
          <button type="submit" class="jira-btn-primary p-2">
            <Send class="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
```

Create `frontend/src/components/modals/OnsitePaymentModal.vue`, `TenantLoginModal.vue`, and `GuestEntryModal.vue`:

Create `frontend/src/components/modals/OnsitePaymentModal.vue`:
```vue
<script setup lang="ts">
import { isOnsitePaymentModalOpen, addIncomeRecord } from '@/lib/systemState';
import { X, Check } from 'lucide-vue-next';
import { ref } from 'vue';

const selectedUnit = ref('204');
const amount = ref(6900);
const orNum = ref('OR-100294');

function closeModal() {
  isOnsitePaymentModalOpen.value = false;
}

function handleRecord() {
  addIncomeRecord({
    unit: selectedUnit.value,
    date: new Date().toISOString().split('T')[0],
    invoiceNum: orNum.value,
    contact: 'Recorded On-Site Tenant',
    period: 'Current Month',
    rent: amount.value - 400,
    share: (amount.value - 400) / 2,
    occupants: 2,
    water: 400,
    remitted: amount.value,
    paymentMethod: 'Cash',
    referenceNum: 'N/A'
  });
  closeModal();
}
</script>

<template>
  <div v-if="isOnsitePaymentModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-sm shadow-xl p-6 space-y-4">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-2">
        <h3 class="text-sm font-bold text-[#172b4d]">Record On-Site Cash Payment</h3>
        <button @click="closeModal"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <form @submit.prevent="handleRecord" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Select Unit / Room</label>
          <select v-model="selectedUnit" class="jira-input">
            <option value="204">Room 204 — Juan Dela Cruz</option>
            <option value="108">Room 108 — Felix Go</option>
            <option value="308">Room 308 — Wally Bayola</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Cash Received Amount (₱)</label>
          <input v-model.number="amount" type="number" class="jira-input" required />
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Official Receipt Number</label>
          <input v-model="orNum" type="text" class="jira-input" required />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1"><Check class="w-3.5 h-3.5" /> Record Payment</button>
        </div>
      </form>
    </div>
  </div>
</template>
```

Create `frontend/src/components/modals/TenantLoginModal.vue`:
```vue
<script setup lang="ts">
import { isTenantLoginModalOpen, activeRole } from '@/lib/systemState';
import { useRouter } from 'vue-router';
import { X, LogIn } from 'lucide-vue-next';

const router = useRouter();

function closeModal() {
  isTenantLoginModalOpen.value = false;
}

function handleLogin() {
  activeRole.value = 'tenant';
  closeModal();
  router.push('/tenant');
}
</script>

<template>
  <div v-if="isTenantLoginModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-sm shadow-xl p-6 space-y-4">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-2">
        <h3 class="text-sm font-bold text-[#172b4d]">Active Tenant Portal Entry</h3>
        <button @click="closeModal"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <div class="p-2 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xs">
        Demo Account: Room <code>204</code> | Password <code>tenant123</code>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Room Number / ID</label>
          <input type="text" value="204" class="jira-input" required />
        </div>
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Password</label>
          <input type="password" value="tenant123" class="jira-input" required />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1"><LogIn class="w-3.5 h-3.5" /> Login to Tenant Portal</button>
        </div>
      </form>
    </div>
  </div>
</template>
```

Create `frontend/src/components/modals/GuestEntryModal.vue`:
```vue
<script setup lang="ts">
import { isGuestEntryModalOpen, activeRole } from '@/lib/systemState';
import { useRouter } from 'vue-router';
import { X, UserCheck } from 'lucide-vue-next';

const router = useRouter();

function closeModal() {
  isGuestEntryModalOpen.value = false;
}

function handleGuestEntry() {
  activeRole.value = 'guest';
  closeModal();
  router.push('/public');
}
</script>

<template>
  <div v-if="isGuestEntryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-sm shadow-xl p-6 space-y-4">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-2">
        <h3 class="text-sm font-bold text-[#172b4d]">Public Guest Entry</h3>
        <button @click="closeModal"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <form @submit.prevent="handleGuestEntry" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Guest Full Name</label>
          <input type="text" value="Maria Santos" class="jira-input" required />
        </div>
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Mobile Contact (Optional)</label>
          <input type="tel" value="0917-123-4567" class="jira-input" />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1"><UserCheck class="w-3.5 h-3.5" /> Enter Guest Showcase</button>
        </div>
      </form>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Update AppHeader.vue with Role Switcher & Live Chat Trigger**

Update `frontend/src/components/layout/AppHeader.vue` to include role selection tabs and live chat trigger:

```vue
<!--
  @file components/layout/AppHeader.vue
  @description Corporate top navigation header featuring role portal mode switcher and live chat inbox trigger.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { activeRole, isLiveChatheadOpen, activeInquirers } from '@/lib/systemState';
import { MessageSquare, Shield, User, Home } from 'lucide-vue-next';

const router = useRouter();

function switchRole(role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  if (role === 'admin') router.push('/admin/overview');
  else if (role === 'tenant') router.push('/tenant');
  else router.push('/public');
}
</script>

<template>
  <header class="h-14 bg-[#ffffff] border-b border-[#dfe1e6] px-4 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 font-bold text-[#172b4d] text-sm tracking-tight">
        <span class="w-6 h-6 rounded-xs bg-[#0c66e4] text-white flex items-center justify-center text-xs">H</span>
        <span>HIVELET</span>
        <span class="text-[10px] text-[#5e6c84] font-normal uppercase border-l border-[#dfe1e6] pl-2">Fe Galang Da Silva System</span>
      </div>
    </div>

    <!-- ROLE PORTAL MODE SWITCHER (APPROACH A) -->
    <div class="flex items-center gap-1 bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-xs text-xs">
      <button
        @click="switchRole('admin')"
        :class="['px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1.5 transition-colors', activeRole === 'admin' ? 'bg-[#ffffff] text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84] hover:text-[#172b4d]']"
      >
        <Shield class="w-3.5 h-3.5" /> Landlady Admin
      </button>

      <button
        @click="switchRole('tenant')"
        :class="['px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1.5 transition-colors', activeRole === 'tenant' ? 'bg-[#ffffff] text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84] hover:text-[#172b4d]']"
      >
        <User class="w-3.5 h-3.5" /> Tenant Portal
      </button>

      <button
        @click="switchRole('guest')"
        :class="['px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1.5 transition-colors', activeRole === 'guest' ? 'bg-[#ffffff] text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84] hover:text-[#172b4d]']"
      >
        <Home class="w-3.5 h-3.5" /> Public Guest
      </button>
    </div>

    <!-- Live Chat Inbox Button -->
    <div class="flex items-center gap-2">
      <button @click="isLiveChatheadOpen = !isLiveChatheadOpen" class="jira-btn-secondary text-xs flex items-center gap-1.5">
        <MessageSquare class="w-3.5 h-3.5 text-[#0c66e4]" />
        <span>Live Chat Inbox</span>
        <span class="jira-badge bg-[#0c66e4] text-white font-bold ml-1">{{ activeInquirers.length }}</span>
      </button>
    </div>
  </header>
</template>
```

- [ ] **Step 3: Mount Modals in App.vue**

Update `frontend/src/App.vue` to include all modal containers:

```vue
<!--
  @file App.vue
  @description Main Application Container registering AppHeader, AppSidebar, Viewport, and Modals.
-->
<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';
import LiveChatheadModal from '@/components/modals/LiveChatheadModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import TenantLoginModal from '@/components/modals/TenantLoginModal.vue';
import GuestEntryModal from '@/components/modals/GuestEntryModal.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] flex flex-col font-sans antialiased text-[#172b4d]">
    <AppHeader />
    <div class="flex flex-1">
      <AppSidebar />
      <main class="flex-1 p-6 overflow-y-auto">
        <router-view />
      </main>
    </div>

    <!-- MODAL MOUNT POINTS -->
    <RoomDetailModal />
    <AdminEditUnitModal />
    <TicketHoverModal />
    <LiveChatheadModal />
    <OnsitePaymentModal />
    <TenantLoginModal />
    <GuestEntryModal />
    <ToastContainer />
  </div>
</template>
```

- [ ] **Step 4: Commit Task 2**

```bash
git add frontend/src/components/modals/ frontend/src/components/layout/AppHeader.vue frontend/src/App.vue
git commit -m "feat: integrate modals and role switcher into header and app root"
```

---

### Task 3: 32-Room Occupancy Matrix & Admin Overview

**Files:**
- Modify: `frontend/src/views/AdminOverviewView.vue`

- [ ] **Step 1: Revise AdminOverviewView.vue to render the canonical 32-room grid**

Update `frontend/src/views/AdminOverviewView.vue`:

```vue
<!--
  @file views/AdminOverviewView.vue
  @description Admin overview matrix featuring 32 canonical property units across 3 floors.
  @systemBibleRef Section 3.1 & Section 3.2 - Room Matrix & Occupancy Tracking
-->
<script setup lang="ts">
import { computed } from 'vue';
import { rooms, openRoomDetail, openAdminEditUnit, isOnsitePaymentModalOpen } from '@/lib/systemState';
import { Banknote, Users, Wrench, Plus, Eye, Edit } from 'lucide-vue-next';

const floor1Rooms = computed(() => rooms.filter(r => r.floor === 1));
const floor2Rooms = computed(() => rooms.filter(r => r.floor === 2));
const floor3Rooms = computed(() => rooms.filter(r => r.floor === 3));

const occupiedCount = computed(() => rooms.filter(r => r.status === 'occupied').length);
const vacantCount = computed(() => rooms.filter(r => r.status === 'available').length);
</script>

<template>
  <div class="space-y-6">
    <!-- Header Controls -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">System Overview Dashboard</h1>
        <p class="text-xs text-[#5e6c84]">Real-Time Operational 32-Room Occupancy Matrix</p>
      </div>
      <button @click="isOnsitePaymentModalOpen = true" class="jira-btn-primary flex items-center gap-1.5">
        <Plus class="w-4 h-4" /> Record On-Site Cash Payment
      </button>
    </div>

    <!-- Top KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Monthly Revenue</p>
        <p class="text-xl font-bold text-[#0c66e4] mt-1">₱178,500</p>
        <p class="text-[10px] text-emerald-700 mt-1">+₱12,000 vs last month</p>
      </div>
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Occupancy Rate</p>
        <p class="text-xl font-bold text-[#172b4d] mt-1">{{ occupiedCount }} / 32 <span class="text-xs font-normal">({{ ((occupiedCount / 32) * 100).toFixed(1) }}%)</span></p>
        <p class="text-[10px] text-[#5e6c84] mt-1">{{ vacantCount }} Vacant Units</p>
      </div>
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Pending Verifications</p>
        <p class="text-xl font-bold text-amber-700 mt-1">₱12,400</p>
        <p class="text-[10px] text-[#5e6c84] mt-1">2 GCash Verifications</p>
      </div>
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Maintenance Tickets</p>
        <p class="text-xl font-bold text-red-700 mt-1">2 Open</p>
        <p class="text-[10px] text-[#5e6c84] mt-1">1 Emergency Ticket</p>
      </div>
    </div>

    <!-- 32-ROOM VISUAL MATRIX -->
    <div class="jira-card p-6 space-y-6">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-3">
        <h2 class="text-sm font-bold text-[#172b4d]">32-Room Visual Occupancy & Billing Matrix</h2>
        <div class="flex items-center gap-3 text-xs text-[#5e6c84]">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500 rounded-2xs"></span> Settled</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-500 rounded-2xs"></span> Pending</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-500 rounded-2xs"></span> Overdue</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-slate-300 rounded-2xs"></span> Vacant</span>
        </div>
      </div>

      <!-- Floor 1 -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">1ST FLOOR (ROOMS 101 – 110)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
          <div
            v-for="room in floor1Rooms"
            :key="room.id"
            :class="[
              'p-2.5 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
              room.status === 'occupied' && room.paid ? 'bg-emerald-50 border-emerald-300' :
              room.status === 'pending' ? 'bg-amber-50 border-amber-300' :
              room.status === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-[#f4f5f7] border-[#dfe1e6]'
            ]"
          >
            <div class="flex justify-between items-center font-bold">
              <span>Rm {{ room.num }}</span>
              <span class="text-[10px] text-[#5e6c84]">{{ room.type }}</span>
            </div>
            <p class="text-[10px] text-[#5e6c84] truncate">{{ room.tenant || 'Vacant' }}</p>
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Floor 2 -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">2ND FLOOR (ROOMS 201 – 211)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-11 gap-2">
          <div
            v-for="room in floor2Rooms"
            :key="room.id"
            :class="[
              'p-2.5 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
              room.status === 'occupied' && room.paid ? 'bg-emerald-50 border-emerald-300' :
              room.status === 'pending' ? 'bg-amber-50 border-amber-300' :
              room.status === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-[#f4f5f7] border-[#dfe1e6]'
            ]"
          >
            <div class="flex justify-between items-center font-bold">
              <span>Rm {{ room.num }}</span>
              <span class="text-[10px] text-[#5e6c84]">{{ room.type }}</span>
            </div>
            <p class="text-[10px] text-[#5e6c84] truncate">{{ room.tenant || 'Vacant' }}</p>
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Floor 3 -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">3RD FLOOR (ROOMS 301 – 311)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-11 gap-2">
          <div
            v-for="room in floor3Rooms"
            :key="room.id"
            :class="[
              'p-2.5 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
              room.status === 'occupied' && room.paid ? 'bg-emerald-50 border-emerald-300' :
              room.status === 'pending' ? 'bg-amber-50 border-amber-300' :
              room.status === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-[#f4f5f7] border-[#dfe1e6]'
            ]"
          >
            <div class="flex justify-between items-center font-bold">
              <span>Rm {{ room.num }}</span>
              <span class="text-[10px] text-[#5e6c84]">{{ room.type }}</span>
            </div>
            <p class="text-[10px] text-[#5e6c84] truncate">{{ room.tenant || 'Vacant' }}</p>
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit Task 3**

```bash
git add frontend/src/views/AdminOverviewView.vue
git commit -m "feat: implement canonical 32-room occupancy grid in AdminOverviewView"
```

---

### Task 4: Spec 09 Income & Spec 10 Expense Ledgers

**Files:**
- Modify: `frontend/src/views/BillingPaymentsView.vue`
- Modify: `frontend/src/views/ExpensesLedgerView.vue`

- [ ] **Step 1: Update BillingPaymentsView.vue with Spec 09 Payment Recorder & Ledger**

Update `frontend/src/views/BillingPaymentsView.vue`:

```vue
<!--
  @file views/BillingPaymentsView.vue
  @description Spec 09 Monthly Payment recorder and auto-updating collection ledger.
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { incomeLedger, rooms, addIncomeRecord } from '@/lib/systemState';
import { Plus, Download, CreditCard } from 'lucide-vue-next';

const selectedUnitNum = ref('204');
const datePaid = ref(new Date().toISOString().split('T')[0]);
const tenantName = ref('Juan Dela Cruz');
const invoiceNum = ref('INV-88392');
const rentAmount = ref(6500);
const occupantsCount = ref(2);
const paymentMethod = ref<'Cash' | 'Online'>('Cash');
const referenceNum = ref('');

const calcShare = computed(() => (rentAmount.value || 0) / 2);
const calcWater = computed(() => (occupantsCount.value || 0) * 200);
const calcRemitted = computed(() => (rentAmount.value || 0) + calcWater.value);

function handleSubmit() {
  addIncomeRecord({
    unit: selectedUnitNum.value,
    date: datePaid.value,
    invoiceNum: invoiceNum.value,
    contact: tenantName.value,
    period: 'Current Period',
    rent: rentAmount.value,
    share: calcShare.value,
    occupants: occupantsCount.value,
    water: calcWater.value,
    remitted: calcRemitted.value,
    paymentMethod: paymentMethod.value,
    referenceNum: paymentMethod.value === 'Online' ? referenceNum.value || 'GCASH-9912' : 'N/A'
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">Payment & Income Ledger</h1>
        <p class="text-xs text-[#5e6c84]">Spec 09 — Monthly Income Collection & 50% Revenue Share</p>
      </div>
      <button class="jira-btn-secondary flex items-center gap-1.5"><Download class="w-3.5 h-3.5" /> Export Excel</button>
    </div>

    <!-- Record Monthly Payment Form -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
        <CreditCard class="w-4 h-4 text-[#0c66e4]" /> Record Monthly Unit Payment
      </h2>

      <form @submit.prevent="handleSubmit" class="space-y-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Select Unit / Room</label>
            <select v-model="selectedUnitNum" class="jira-input">
              <option v-for="r in rooms" :key="r.id" :value="r.num">Room {{ r.num }} ({{ r.type }})</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Date Paid</label>
            <input v-model="datePaid" type="date" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Tenant Name</label>
            <input v-model="tenantName" type="text" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Invoice OR / Ref #</label>
            <input v-model="invoiceNum" type="text" class="jira-input" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Rent Amount (₱)</label>
            <input v-model.number="rentAmount" type="number" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Occupants Count</label>
            <input v-model.number="occupantsCount" type="number" class="jira-input" min="0" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Payment Method</label>
            <select v-model="paymentMethod" class="jira-input">
              <option value="Cash">Cash Payment</option>
              <option value="Online">Online Payment (GCash)</option>
            </select>
          </div>
          <div v-if="paymentMethod === 'Online'">
            <label class="block font-bold text-[#5e6c84] mb-1">GCash Ref #</label>
            <input v-model="referenceNum" type="text" class="jira-input" placeholder="GCASH-998811" />
          </div>
        </div>

        <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs flex flex-wrap justify-between items-center font-mono">
          <div class="flex gap-4">
            <span>50% Share: <strong>₱{{ calcShare.toLocaleString() }}</strong></span>
            <span>Water Bill (₱200/head): <strong>₱{{ calcWater.toLocaleString() }}</strong></span>
            <span>Total Remitted: <strong class="text-[#0c66e4] underline">₱{{ calcRemitted.toLocaleString() }}</strong></span>
          </div>
          <button type="submit" class="jira-btn-primary flex items-center gap-1">
            <Plus class="w-3.5 h-3.5" /> Save Record & Add to Ledger
          </button>
        </div>
      </form>
    </div>

    <!-- Income Ledger Table -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d]">Monthly Income Collection Ledger</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2">Rm #</th>
              <th class="p-2">Date Paid</th>
              <th class="p-2">Tenant Name</th>
              <th class="p-2">Invoice #</th>
              <th class="p-2">Rent</th>
              <th class="p-2">50% Share</th>
              <th class="p-2">Water</th>
              <th class="p-2">Remitted</th>
              <th class="p-2">Method</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr v-for="(rec, idx) in incomeLedger" :key="idx" class="hover:bg-[#f4f5f7]">
              <td class="p-2 font-bold">{{ rec.unit }}</td>
              <td class="p-2">{{ rec.date }}</td>
              <td class="p-2">{{ rec.contact }}</td>
              <td class="p-2 font-mono text-[11px]">{{ rec.invoiceNum }}</td>
              <td class="p-2">₱{{ rec.rent.toLocaleString() }}</td>
              <td class="p-2">₱{{ rec.share.toLocaleString() }}</td>
              <td class="p-2">₱{{ rec.water.toLocaleString() }}</td>
              <td class="p-2 font-bold text-[#0c66e4]">₱{{ rec.remitted.toLocaleString() }}</td>
              <td class="p-2"><span class="jira-badge bg-blue-50 text-blue-800">{{ rec.paymentMethod }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Update ExpensesLedgerView.vue with Spec 10 Multi-supplier Log & Merged Rowspan**

Update `frontend/src/views/ExpensesLedgerView.vue`:

```vue
<!--
  @file views/ExpensesLedgerView.vue
  @description Spec 10 Guided Monthly Expense Ledger with multi-supplier logging and date cell rowspan merging.
  @systemBibleRef Section 3.3 - Expenses & Financial Ledger
-->
<script setup lang="ts">
import { ref } from 'vue';
import { expenseLedger, addExpenseGroup, ExpenseItem } from '@/lib/systemState';
import { Plus, Download, Receipt } from 'lucide-vue-next';

const expenseDate = ref(new Date().toISOString().split('T')[0]);
const supplierItems = ref<ExpenseItem[]>([
  { supplier: 'Wilcon Depot (bh)', area: 'BH', amount: 2500, catId: '8', catName: 'Repairs & Maintenance' }
]);

function addSupplierRow() {
  supplierItems.value.push({ supplier: '', area: 'BH', amount: 0, catId: '7', catName: 'Comm, Light, Water' });
}

function handleLogExpenses() {
  addExpenseGroup({
    date: expenseDate.value,
    items: [...supplierItems.value]
  });
  supplierItems.value = [{ supplier: '', area: 'BH', amount: 0, catId: '8', catName: 'Repairs & Maintenance' }];
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">Guided Expenses Ledger</h1>
        <p class="text-xs text-[#5e6c84]">Spec 10 — Multi-Supplier Expense Entry with Merged Date Rowspan</p>
      </div>
      <button class="jira-btn-secondary flex items-center gap-1.5"><Download class="w-3.5 h-3.5" /> Export Expenses Excel</button>
    </div>

    <!-- Multi-Supplier Form -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
        <Receipt class="w-4 h-4 text-[#0c66e4]" /> Log Date Expenses
      </h2>

      <form @submit.prevent="handleLogExpenses" class="space-y-3 text-xs">
        <div class="w-48">
          <label class="block font-bold text-[#5e6c84] mb-1">Expense Date</label>
          <input v-model="expenseDate" type="date" class="jira-input" required />
        </div>

        <div class="space-y-2">
          <div v-for="(item, idx) in supplierItems" :key="idx" class="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
            <input v-model="item.supplier" type="text" placeholder="OR / Supplier Description" class="jira-input" required />
            <select v-model="item.area" class="jira-input">
              <option value="BH">BH Expenses</option>
              <option value="MainHouse">Main House</option>
              <option value="FrontApt">Front Apt</option>
              <option value="BackApt">Back Apt</option>
              <option value="Other">Other / Personal</option>
            </select>
            <input v-model.number="item.amount" type="number" placeholder="Amount (₱)" class="jira-input" required />
            <input v-model="item.catName" type="text" placeholder="Category Name" class="jira-input" required />
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <button type="button" @click="addSupplierRow" class="jira-btn-secondary flex items-center gap-1">
            <Plus class="w-3.5 h-3.5" /> Add Another OR / Supplier
          </button>
          <button type="submit" class="jira-btn-primary">Save Expense Group</button>
        </div>
      </form>
    </div>

    <!-- Expenses Ledger Table -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d]">Guided Expenses Ledger Table</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border border-[#dfe1e6]">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2 border-r border-[#dfe1e6]">Date (Merged)</th>
              <th class="p-2">OR / Supplier Description</th>
              <th class="p-2">Area</th>
              <th class="p-2">Category</th>
              <th class="p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in expenseLedger" :key="group.date">
              <tr v-for="(item, itemIdx) in group.items" :key="itemIdx" class="border-b border-[#dfe1e6]">
                <td v-if="itemIdx === 0" :rowspan="group.items.length" class="p-2 font-bold border-r border-[#dfe1e6] bg-[#f4f5f7] align-top">
                  {{ group.date }}
                </td>
                <td class="p-2">{{ item.supplier }}</td>
                <td class="p-2"><span class="jira-badge bg-slate-100 text-slate-800">{{ item.area }}</span></td>
                <td class="p-2">{{ item.catName }}</td>
                <td class="p-2 font-bold text-[#172b4d]">₱{{ item.amount.toLocaleString() }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Commit Task 4**

```bash
git add frontend/src/views/BillingPaymentsView.vue frontend/src/views/ExpensesLedgerView.vue
git commit -m "feat: integrate Spec 09 income and Spec 10 expense ledgers"
```

---

### Task 5: Maintenance Dispatch & Public/Tenant Experience

**Files:**
- Modify: `frontend/src/views/MaintenanceDispatchView.vue`
- Modify: `frontend/src/views/PublicGuestView.vue`
- Modify: `frontend/src/views/TenantPortalView.vue`
- Create: `frontend/src/views/SystemSettingsView.vue`
- Modify: `frontend/src/router/index.ts`

- [ ] **Step 1: Update MaintenanceDispatchView.vue**

Update `frontend/src/views/MaintenanceDispatchView.vue` to include hover modal triggers and resolve state:

```vue
<!--
  @file views/MaintenanceDispatchView.vue
  @description Admin maintenance dispatch control table with diagonal expand modal trigger and ticket status updates.
  @systemBibleRef Section 3.4 - Maintenance Dispatch & Tickets
-->
<script setup lang="ts">
import { tickets, openTicketHover, resolveTicket } from '@/lib/systemState';
import { Wrench, Maximize2, CheckCircle } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#172b4d]">Maintenance Dispatch & Closure</h1>
      <p class="text-xs text-[#5e6c84]">Landlady Authorization Portal for Maintenance Issues</p>
    </div>

    <div class="jira-card p-6 space-y-4">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2">Rm #</th>
              <th class="p-2">Issue Description</th>
              <th class="p-2">Priority</th>
              <th class="p-2">Date Reported</th>
              <th class="p-2 text-center">Details</th>
              <th class="p-2">Status Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr v-for="t in tickets" :key="t.id" class="hover:bg-[#f4f5f7]">
              <td class="p-2 font-bold">Room {{ t.room }}</td>
              <td class="p-2">{{ t.issue }}</td>
              <td class="p-2">
                <span :class="['jira-badge text-[10px] font-bold uppercase', t.priority === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800']">
                  {{ t.priority }}
                </span>
              </td>
              <td class="p-2 font-mono text-[11px]">{{ t.date }}</td>
              <td class="p-2 text-center">
                <button @click="openTicketHover(t)" class="jira-btn-secondary p-1" title="Expand Ticket Details">
                  <Maximize2 class="w-3.5 h-3.5 text-[#0c66e4]" />
                </button>
              </td>
              <td class="p-2">
                <span v-if="t.status === 'RESOLVED'" class="jira-badge bg-emerald-100 text-emerald-800 font-bold">
                  ✓ RESOLVED
                </span>
                <button v-else @click="resolveTicket(t.id)" class="jira-btn-secondary hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle class="w-3.5 h-3.5" /> Close Ticket
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create SystemSettingsView.vue and update Router**

Create `frontend/src/views/SystemSettingsView.vue`:
```vue
<script setup lang="ts">
import { Settings, ShieldCheck, Banknote, FileSpreadsheet } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#172b4d]">System Configuration & Business Rules</h1>
      <p class="text-xs text-[#5e6c84]">Operational Rules for Fe Galang Da Silva Boarding House</p>
    </div>

    <div class="jira-card p-6 space-y-4 text-xs leading-relaxed text-[#172b4d]">
      <div class="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5"><Banknote class="w-4 h-4" /> Water Billing Rate (BR-014):</p>
        <p>₱200.00 per registered occupant per month automatically added to monthly remittance.</p>
      </div>

      <div class="p-3 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5"><ShieldCheck class="w-4 h-4" /> Payment Preference:</p>
        <p>Primary payment method is On-Site Cash Payment directly to Landlady. Optional online checkout via GCash supported.</p>
      </div>

      <div class="p-3 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5"><FileSpreadsheet class="w-4 h-4" /> Report Exports (BR-049):</p>
        <p>Excel-compatible CSV/XLSX spreadsheet exports available for Monthly Income & Guided Expenses ledgers.</p>
      </div>
    </div>
  </div>
</template>
```

Update `frontend/src/router/index.ts` to include `/admin/settings` route:

```typescript
import { createRouter, createWebHistory } from 'vue-router';

import AdminOverviewView from '../views/AdminOverviewView.vue';
import RoomDirectoryView from '../views/RoomDirectoryView.vue';
import TenantManagementView from '../views/TenantManagementView.vue';
import InquiriesView from '../views/InquiriesView.vue';
import BillingPaymentsView from '../views/BillingPaymentsView.vue';
import ExpensesLedgerView from '../views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '../views/MaintenanceDispatchView.vue';
import TenantPortalView from '../views/TenantPortalView.vue';
import PublicGuestView from '../views/PublicGuestView.vue';
import SystemSettingsView from '../views/SystemSettingsView.vue';

const routes = [
  { path: '/', redirect: '/public' },
  { path: '/public', name: 'PublicGuest', component: PublicGuestView },
  { path: '/tenant', name: 'TenantPortal', component: TenantPortalView },
  { path: '/admin', redirect: '/admin/overview' },
  { path: '/admin/overview', name: 'AdminOverview', component: AdminOverviewView },
  { path: '/admin/directory', name: 'RoomDirectory', component: RoomDirectoryView },
  { path: '/admin/tenants', name: 'TenantManagement', component: TenantManagementView },
  { path: '/admin/inquiries', name: 'Inquiries', component: InquiriesView },
  { path: '/admin/billing', name: 'BillingPayments', component: BillingPaymentsView },
  { path: '/admin/expenses', name: 'ExpensesLedger', component: ExpensesLedgerView },
  { path: '/admin/tickets', name: 'MaintenanceDispatch', component: MaintenanceDispatchView },
  { path: '/admin/settings', name: 'SystemSettings', component: SystemSettingsView },
  { path: '/:pathMatch(.*)*', redirect: '/public' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

- [ ] **Step 3: Commit Task 5**

```bash
git add frontend/src/views/ frontend/src/router/index.ts
git commit -m "feat: complete maintenance dispatch, system settings, and route integration"
```

---

### Task 6: Final Verification & Build Check

- [ ] **Step 1: Test TypeScript Compilation & Production Build**

Run:
```bash
npm --prefix frontend run build
```
Expected output: Vite build completed with zero TypeScript errors.

- [ ] **Step 2: Final Git Commit & Push (if required)**

```bash
git add .
git commit -m "feat: complete wireframe feature alignment in frontend application"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-08-01-wireframe-frontend-alignment.md`.

**Two execution options:**
1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach would you like to use?**
