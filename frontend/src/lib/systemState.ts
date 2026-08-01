/**
 * @file lib/systemState.ts
 * @description Centralized reactive data store for Hivelet system state.
 * @systemBibleRef Section 3 (System Features) & Section 4 (User Roles & Authorization)
 * @rationale Manages real-time mock state for 32 property units, Spec 09 income collection ledger, Spec 10 guided expense ledger, maintenance tickets, and live chat messenger.
 * @innovations Reactive Vue state store ensuring synchronicity across Admin, Tenant, and Public Guest interfaces.
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
  // 1st Floor (Rooms 101 - 110)
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

  // 2nd Floor (Rooms 201 - 211)
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

  // 3rd Floor (Rooms 301 - 311)
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

// Controller Flags & Active Models
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
