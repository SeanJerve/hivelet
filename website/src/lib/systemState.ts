/**
 * @file lib/systemState.ts
 * @description Centralized reactive store for Hivelet website.
 * @systemBibleRef Section 3 & Section 5 - Property Model
 */
import { reactive, ref } from 'vue';

export interface RoomUnit {
  id: string;
  unitCode: string;
  cluster: 'BH (Main Rooms)' | 'Back Apartment' | 'Penthouse' | 'Front Apartment' | 'Linda';
  floorLabel: string;
  type: string;
  price: number;
  occupants: number;
  maxOccupants: number;
  status: 'occupied' | 'available' | 'pending' | 'overdue';
  tenant: string | null;
  paid: boolean;
  balance: number;
  waterRateType: 'standard' | 'linda_fixed';
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

export const isLoadingScreenVisible = ref(true);
export const activeRole = ref<'admin' | 'tenant' | 'guest'>('guest');

export const rooms = reactive<RoomUnit[]>([
  { id: 'bh-1a', unitCode: '1a', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Juan Dela Cruz', paid: true, balance: 0, waterRateType: 'standard', photo: 'room1a_studio.jpg', desc: 'Quiet 1st Floor BH Studio Unit near main entrance.' },
  { id: 'bh-1b', unitCode: '1b', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 2, maxOccupants: 2, status: 'pending', tenant: 'Maria Santos', paid: false, balance: 4900, waterRateType: 'standard', photo: 'room1b_studio.jpg', desc: 'Cozy ground floor Studio unit with tiled bath.' },
  { id: 'bh-1c', unitCode: '1c', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '1-Bedroom', price: 6000, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1c_1bed.jpg', desc: 'Renovated 1-Bedroom unit with private kitchen submeter.' },
  { id: 'bh-1d', unitCode: '1d', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 2, maxOccupants: 2, status: 'occupied', tenant: 'Pedro Penduko', paid: true, balance: 0, waterRateType: 'standard', photo: 'room1d_studio.jpg', desc: 'Standard 1st Floor Studio Unit.' },
  { id: 'bh-1e', unitCode: '1e', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1e_studio.jpg', desc: 'Freshly painted Studio unit.' },
  { id: 'bh-1f', unitCode: '1f', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '2-Bedroom', price: 8000, occupants: 3, maxOccupants: 4, status: 'occupied', tenant: 'Ana Reyes', paid: true, balance: 0, waterRateType: 'standard', photo: 'room1f_2bed.jpg', desc: 'Spacious 2-Bedroom unit for family or room sharing.' },
  { id: 'bh-1g', unitCode: '1g', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Carlos Ramos', paid: true, balance: 0, waterRateType: 'standard', photo: 'room1g_studio.jpg', desc: 'Studio unit near courtyard access.' },
  { id: 'bh-1h', unitCode: '1h', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 1, maxOccupants: 2, status: 'overdue', tenant: 'Felix Go', paid: false, balance: 4900, waterRateType: 'standard', photo: 'room1h_studio.jpg', desc: 'End hallway Studio unit.' },

  { id: 'bh-2a', unitCode: '2a', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 2, maxOccupants: 2, status: 'occupied', tenant: 'Grace Poe', paid: true, balance: 0, waterRateType: 'standard', photo: 'room2a_studio.jpg', desc: '2nd Floor Studio with window balcony view.' },
  { id: 'bh-2b', unitCode: '2b', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Lito Lapid', paid: true, balance: 0, waterRateType: 'standard', photo: 'room2b_studio.jpg', desc: 'Quiet 2nd Floor Studio.' },
  { id: 'bh-2c', unitCode: '2c', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 2, maxOccupants: 2, status: 'occupied', tenant: 'Robin Padilla', paid: true, balance: 0, waterRateType: 'standard', photo: 'room2c_studio.jpg', desc: 'Well ventilated Studio unit.' },
  { id: 'bh-2d', unitCode: '2d', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '1-Bedroom', price: 6200, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2d_1bed.jpg', desc: 'Available 1-Bedroom unit on 2nd Floor.' },
  { id: 'bh-2e', unitCode: '2e', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Joel Villanueva', paid: true, balance: 0, waterRateType: 'standard', photo: 'room2e_studio.jpg', desc: 'Standard 2nd floor Studio.' },
  { id: 'bh-2f', unitCode: '2f', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Nancy Binay', paid: true, balance: 0, waterRateType: 'standard', photo: 'room2f_studio.jpg', desc: 'Compact 2nd Floor Studio.' },
  { id: 'bh-2g', unitCode: '2g', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '2-Bedroom', price: 8200, occupants: 3, maxOccupants: 4, status: 'occupied', tenant: 'Sonny Angara', paid: true, balance: 0, waterRateType: 'standard', photo: 'room2g_2bed.jpg', desc: 'Large 2-Bedroom unit on 2nd floor.' },

  { id: 'bh-3a', unitCode: '3a', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Risa Hontiveros', paid: true, balance: 0, waterRateType: 'standard', photo: 'room3a_studio.jpg', desc: 'Top floor high ceiling Studio.' },
  { id: 'bh-3b', unitCode: '3b', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 2, maxOccupants: 2, status: 'occupied', tenant: 'Koko Pimentel', paid: true, balance: 0, waterRateType: 'standard', photo: 'room3b_studio.jpg', desc: '3rd Floor Studio unit.' },
  { id: 'bh-3c', unitCode: '3c', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Francis Tolentino', paid: true, balance: 0, waterRateType: 'standard', photo: 'room3c_studio.jpg', desc: 'Quiet 3rd Floor Studio.' },
  { id: 'bh-3d', unitCode: '3d', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Bong Go', paid: true, balance: 0, waterRateType: 'standard', photo: 'room3d_studio.jpg', desc: 'Standard 3rd Floor Studio.' },
  { id: 'bh-3e', unitCode: '3e', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 2, maxOccupants: 2, status: 'occupied', tenant: 'Bong Revilla', paid: true, balance: 0, waterRateType: 'standard', photo: 'room3e_studio.jpg', desc: '3rd Floor Studio unit.' },
  { id: 'bh-3f', unitCode: '3f', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3f_studio.jpg', desc: 'Available 3rd Floor Studio.' },
  { id: 'bh-3g', unitCode: '3g', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: '3-Bedroom', price: 10000, occupants: 4, maxOccupants: 5, status: 'occupied', tenant: 'Cynthia Villar', paid: true, balance: 0, waterRateType: 'standard', photo: 'room3g_3bed.jpg', desc: 'Premium 3-Bedroom family unit.' },

  { id: 'back-b1f', unitCode: 'B1F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 1st Flr', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Mark Villar', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b1f.jpg', desc: 'Ground floor Back Apartment 1-Bedroom.' },
  { id: 'back-b2f', unitCode: 'B2F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Front', type: '1-Bedroom', price: 6500, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Alan Peter Cayetano', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b2f.jpg', desc: '2nd Floor Front Back Apartment.' },
  { id: 'back-b2b', unitCode: 'B2B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Back', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Pia Cayetano', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b2b.jpg', desc: '2nd Floor Rear Back Apartment.' },
  { id: 'back-b3f', unitCode: 'B3F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Front', type: '1-Bedroom', price: 6800, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b3f.jpg', desc: 'Available 3rd Floor Back Apartment.' },
  { id: 'back-b3b', unitCode: 'B3B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Back', type: '1-Bedroom', price: 6800, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Bam Aquino', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b3b.jpg', desc: '3rd Floor Rear Back Apartment.' },

  { id: 'ph-top', unitCode: 'PH', cluster: 'Penthouse', floorLabel: 'Penthouse Level', type: 'Penthouse Suite', price: 12000, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Chiz Escudero', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_ph.jpg', desc: 'Penthouse Master Suite.' },

  { id: 'front-f1', unitCode: 'F1', cluster: 'Front Apartment', floorLabel: 'Front Apt - 1st Flr', type: '2-Bedroom', price: 8500, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Ping Lacson', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_f1.jpg', desc: 'Front Apartment 1st Floor 2-Bedroom.' },
  { id: 'front-f2f', unitCode: 'F2F', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Front', type: '2-Bedroom', price: 8500, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Jinggoy Estrada', paid: true, balance: 0, waterRateType: 'standard', photo: 'room_f2f.jpg', desc: 'Front Apartment 2nd Floor Front.' },
  { id: 'front-f2b', unitCode: 'F2B', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Back', type: '2-Bedroom', price: 8500, occupants: 0, maxOccupants: 4, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_f2b.jpg', desc: 'Available Front Apartment 2nd Floor Back.' },

  { id: 'linda-lf', unitCode: 'LF', cluster: 'Linda', floorLabel: 'Linda Front', type: 'Special Unit', price: 5000, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Gayon', paid: true, balance: 0, waterRateType: 'linda_fixed', photo: 'room_lf.jpg', desc: 'Linda Front Special Unit (BR-040 Fixed Rates).' },
  { id: 'linda-lb', unitCode: 'LB', cluster: 'Linda', floorLabel: 'Linda Back', type: 'Special Unit', price: 4800, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Jaye Casia', paid: true, balance: 0, waterRateType: 'linda_fixed', photo: 'room_lb.jpg', desc: 'Linda Back Special Unit (BR-040 Fixed Rates).' }
]);

export const incomeLedger = reactive<IncomeRecord[]>([
  { unit: '1a', date: '2026-08-01', invoiceNum: 'INV-80012', contact: 'Juan Dela Cruz', period: 'Aug.1-Aug.31/26', rent: 4500, share: 2250, occupants: 2, water: 400, remitted: 4900, paymentMethod: 'Cash', referenceNum: 'N/A' },
  { unit: '1b', date: '2026-08-01', invoiceNum: 'INV-80013', contact: 'Maria Santos', period: 'Aug.1-Aug.31/26', rent: 4500, share: 2250, occupants: 1, water: 200, remitted: 4700, paymentMethod: 'Cash', referenceNum: 'N/A' },
  { unit: 'B1F', date: '2026-08-01', invoiceNum: 'INV-88392', contact: 'Mark Villar', period: 'Aug.5-Sep.4/26', rent: 6500, share: 3250, occupants: 2, water: 400, remitted: 6900, paymentMethod: 'Online', referenceNum: 'GCASH-9948271' },
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
    id: 'ticket-1h',
    room: '1h',
    tenant: 'Felix Go',
    phone: '0918-555-0192',
    issue: 'Faucet Leaking in bathroom',
    priority: 'Emergency',
    date: '2026-07-27',
    desc: 'Heavy water leak coming from bathroom faucet sub-assembly. Flooding bathroom floor.',
    technician: 'Mario Tech (Plumbing Specialist)',
    photo: 'faucet_leak_room1h.jpg',
    status: 'OPEN'
  },
  {
    id: 'ticket-3b',
    room: '3b',
    tenant: 'Koko Pimentel',
    phone: '0917-888-3321',
    issue: 'Window Latch Repair',
    priority: 'Medium',
    date: '2026-07-26',
    desc: 'Window latch loose due to worn screws. Needs hardware replacement.',
    technician: 'Carpenter Joseph',
    photo: 'window_latch_3b.jpg',
    status: 'OPEN'
  }
]);

export const activeInquirers = reactive<Inquirer[]>([
  {
    id: 'inq-1',
    name: 'Maria Santos',
    room: '1c',
    type: '1-Bedroom',
    price: 6000,
    unread: true,
    messages: [
      { sender: 'Inquirer', time: '10:14 AM', text: 'Hello Mrs. Fe! Is Room 1c still available for move-in next week?' },
      { sender: 'Landlady', time: '10:16 AM', text: 'Yes Maria! Room 1c is 1-Bedroom (₱6,000/mo) with water at ₱200/head. Would you like to view it?' }
    ]
  },
  {
    id: 'inq-2',
    name: 'Alex Gonzaga',
    room: 'B3F',
    type: '1-Bedroom',
    price: 6800,
    unread: true,
    messages: [
      { sender: 'Inquirer', time: '09:45 AM', text: 'Good morning! Inquiring about Back Apartment B3F.' }
    ]
  }
]);

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

export interface TenantProfile {
  id: string;
  name: string;
  room: string;
  phone: string;
  emergency: string;
  moveInDate: string;
  status: 'Active' | 'Overdue' | 'Vacated';
}

export const tenants = reactive<TenantProfile[]>([
  { id: 't-1', name: 'Juan Dela Cruz', room: '1a', phone: '0917-123-4567', emergency: 'Maria Cruz (Mother - 0918-987-6543)', moveInDate: '2025-06-15', status: 'Active' },
  { id: 't-2', name: 'Maria Santos', room: '1b', phone: '0918-234-5678', emergency: 'Jose Santos (Father - 0919-876-5432)', moveInDate: '2025-08-01', status: 'Active' },
  { id: 't-3', name: 'Pedro Penduko', room: '1d', phone: '0919-345-6789', emergency: 'Clara Penduko (Sister - 0920-765-4321)', moveInDate: '2026-01-10', status: 'Active' },
  { id: 't-4', name: 'Ana Reyes', room: '1f', phone: '0920-456-7890', emergency: 'Roberto Reyes (Spouse - 0921-654-3210)', moveInDate: '2024-11-20', status: 'Active' },
  { id: 't-5', name: 'Felix Go', room: '1h', phone: '0921-567-8901', emergency: 'Sofia Toribio (Aunt - 0922-543-2109)', moveInDate: '2026-03-01', status: 'Overdue' },
  { id: 't-6', name: 'Mark Villar', room: 'B1F', phone: '0918-555-0192', emergency: 'Cynthia Villar (Mother - 0918-111-2222)', moveInDate: '2025-05-01', status: 'Active' },
  { id: 't-7', name: 'Gayon', room: 'LF', phone: '0919-444-5555', emergency: 'Linda Gayon (Self - 0919-000-1111)', moveInDate: '2024-01-01', status: 'Active' },
]);

export function addTenant(t: Omit<TenantProfile, 'id'>) {
  const newTenant: TenantProfile = {
    ...t,
    id: `t-${Date.now()}`
  };
  tenants.unshift(newTenant);
  // Update assigned room status if applicable
  const targetRoom = rooms.find(r => r.unitCode === t.room);
  if (targetRoom) {
    targetRoom.tenant = t.name;
    targetRoom.status = 'occupied';
  }
}

export function updateTenant(id: string, updated: Partial<TenantProfile>) {
  const t = tenants.find(x => x.id === id);
  if (t) {
    Object.assign(t, updated);
    if (updated.room && updated.name) {
      const room = rooms.find(r => r.unitCode === updated.room);
      if (room) room.tenant = updated.name;
    }
  }
}

export function deleteTenant(id: string) {
  const idx = tenants.findIndex(x => x.id === id);
  if (idx !== -1) {
    const t = tenants[idx];
    const room = rooms.find(r => r.unitCode === t.room);
    if (room) {
      room.tenant = null;
      room.status = 'available';
    }
    tenants.splice(idx, 1);
  }
}

export function addRoomUnit(newUnit: Omit<RoomUnit, 'id'>) {
  const unit: RoomUnit = {
    ...newUnit,
    id: `unit-${Date.now()}`
  };
  rooms.push(unit);
}

export function updateRoomUnit(unitCode: string, changes: Partial<RoomUnit>) {
  const room = rooms.find(r => r.unitCode === unitCode);
  if (room) {
    Object.assign(room, changes);
  }
}

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
  const room = rooms.find(r => r.unitCode === record.unit);
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

export function openTenantChat(tenantName: string, unitCode: string) {
  let existing = activeInquirers.find(i => i.name.toLowerCase() === tenantName.toLowerCase() || i.room === unitCode);
  if (!existing) {
    const newId = `tenant-chat-${Date.now()}`;
    existing = {
      id: newId,
      name: tenantName,
      room: unitCode,
      type: 'Active Tenant',
      price: 4500,
      unread: false,
      messages: [
        { sender: 'Landlady', time: '10:00 AM', text: `Hello ${tenantName}, this is Mrs. Fe from Landlady Management. How can I help you today?` }
      ]
    };
    activeInquirers.unshift(existing);
  }
  selectedInquirerId.value = existing.id;
  isLiveChatheadOpen.value = true;
}


