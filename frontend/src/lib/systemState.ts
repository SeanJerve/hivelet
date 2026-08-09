/**
 * @file lib/systemState.ts
 * @description Centralized reactive store for Hivelet frontend.
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
  id?: string;
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
  id?: string;
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

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface SummaryField {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface ConfirmModalData {
  title: string;
  message: string;
  warningLevel?: 'info' | 'warning' | 'danger';
  requiresPin?: boolean;
  confirmText?: string;
  summaryFields?: SummaryField[];
  onConfirm: () => void;
}

export const toasts = reactive<Toast[]>([]);

export function showToast(type: Toast['type'], title: string, message: string) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  toasts.push({ id, type, title, message });
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

export function removeToast(id: string) {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) {
    toasts.splice(idx, 1);
  }
}

export const isConfirmModalOpen = ref(false);
export const confirmModalData = ref<ConfirmModalData | null>(null);

export function requestSecondaryConfirm(data: ConfirmModalData) {
  confirmModalData.value = data;
  isConfirmModalOpen.value = true;
}

export const isEditPaymentModalOpen = ref(false);
export const activeEditPayment = ref<IncomeRecord | null>(null);

export function openEditPayment(record: IncomeRecord) {
  activeEditPayment.value = JSON.parse(JSON.stringify(record));
  isEditPaymentModalOpen.value = true;
}

export const isEditExpenseModalOpen = ref(false);
export const activeEditExpenseDate = ref<string>('');
export const activeEditExpenseItem = ref<ExpenseItem | null>(null);

export function openEditExpense(date: string, item: ExpenseItem) {
  activeEditExpenseDate.value = date;
  activeEditExpenseItem.value = JSON.parse(JSON.stringify(item));
  isEditExpenseModalOpen.value = true;
}

export const isLoadingScreenVisible = ref(true);
export const activeRole = ref<'admin' | 'tenant' | 'guest'>('guest');

export const rooms = reactive<RoomUnit[]>([
  { id: 'bh-1a', unitCode: '1a', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1a_studio.jpg', desc: 'Quiet 1st Floor BH Studio Unit near main entrance.' },
  { id: 'bh-1b', unitCode: '1b', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1b_studio.jpg', desc: 'Cozy ground floor Studio unit with tiled bath.' },
  { id: 'bh-1c', unitCode: '1c', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '1-Bedroom', price: 6000, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1c_1bed.jpg', desc: 'Renovated 1-Bedroom unit with private kitchen submeter.' },
  { id: 'bh-1d', unitCode: '1d', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1d_studio.jpg', desc: 'Standard 1st Floor Studio Unit.' },
  { id: 'bh-1e', unitCode: '1e', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1e_studio.jpg', desc: 'Freshly painted Studio unit.' },
  { id: 'bh-1f', unitCode: '1f', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '2-Bedroom', price: 8000, occupants: 0, maxOccupants: 4, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1f_2bed.jpg', desc: 'Spacious 2-Bedroom unit for family or room sharing.' },
  { id: 'bh-1g', unitCode: '1g', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1g_studio.jpg', desc: 'Studio unit near courtyard access.' },
  { id: 'bh-1h', unitCode: '1h', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', price: 4500, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room1h_studio.jpg', desc: 'End hallway Studio unit.' },

  { id: 'bh-2a', unitCode: '2a', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2a_studio.jpg', desc: '2nd Floor Studio with window balcony view.' },
  { id: 'bh-2b', unitCode: '2b', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2b_studio.jpg', desc: 'Quiet 2nd Floor Studio.' },
  { id: 'bh-2c', unitCode: '2c', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2c_studio.jpg', desc: 'Well ventilated Studio unit.' },
  { id: 'bh-2d', unitCode: '2d', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '1-Bedroom', price: 6200, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2d_1bed.jpg', desc: 'Available 1-Bedroom unit on 2nd Floor.' },
  { id: 'bh-2e', unitCode: '2e', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2e_studio.jpg', desc: 'Standard 2nd floor Studio.' },
  { id: 'bh-2f', unitCode: '2f', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', price: 4600, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2f_studio.jpg', desc: 'Compact 2nd Floor Studio.' },
  { id: 'bh-2g', unitCode: '2g', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '2-Bedroom', price: 8200, occupants: 0, maxOccupants: 4, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room2g_2bed.jpg', desc: 'Large 2-Bedroom unit on 2nd floor.' },

  { id: 'bh-3a', unitCode: '3a', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3a_studio.jpg', desc: 'Top floor high ceiling Studio.' },
  { id: 'bh-3b', unitCode: '3b', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3b_studio.jpg', desc: '3rd Floor Studio unit.' },
  { id: 'bh-3c', unitCode: '3c', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3c_studio.jpg', desc: 'Quiet 3rd Floor Studio.' },
  { id: 'bh-3d', unitCode: '3d', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3d_studio.jpg', desc: 'Standard 3rd Floor Studio.' },
  { id: 'bh-3e', unitCode: '3e', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3e_studio.jpg', desc: '3rd Floor Studio unit.' },
  { id: 'bh-3f', unitCode: '3f', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', price: 4700, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3f_studio.jpg', desc: 'Available 3rd Floor Studio.' },
  { id: 'bh-3g', unitCode: '3g', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: '3-Bedroom', price: 10000, occupants: 0, maxOccupants: 5, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room3g_3bed.jpg', desc: 'Premium 3-Bedroom family unit.' },

  { id: 'back-b1f', unitCode: 'B1F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 1st Flr', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b1f.jpg', desc: 'Ground floor Back Apartment 1-Bedroom.' },
  { id: 'back-b2f', unitCode: 'B2F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Front', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b2f.jpg', desc: '2nd Floor Front Back Apartment.' },
  { id: 'back-b2b', unitCode: 'B2B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Back', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b2b.jpg', desc: '2nd Floor Rear Back Apartment.' },
  { id: 'back-b3f', unitCode: 'B3F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Front', type: '1-Bedroom', price: 6800, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b3f.jpg', desc: 'Available 3rd Floor Back Apartment.' },
  { id: 'back-b3b', unitCode: 'B3B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Back', type: '1-Bedroom', price: 6800, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_b3b.jpg', desc: '3rd Floor Rear Back Apartment.' },

  { id: 'ph-top', unitCode: 'PH', cluster: 'Penthouse', floorLabel: 'Penthouse Level', type: 'Penthouse Suite', price: 12000, occupants: 0, maxOccupants: 5, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_ph.jpg', desc: 'Penthouse Master Suite.' },

  { id: 'front-f1', unitCode: 'F1', cluster: 'Front Apartment', floorLabel: 'Front Apt - 1st Flr', type: '2-Bedroom', price: 8500, occupants: 0, maxOccupants: 4, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_f1.jpg', desc: 'Front Apartment 1st Floor 2-Bedroom.' },
  { id: 'front-f2f', unitCode: 'F2F', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Front', type: '2-Bedroom', price: 8500, occupants: 0, maxOccupants: 4, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_f2f.jpg', desc: 'Front Apartment 2nd Floor Front.' },
  { id: 'front-f2b', unitCode: 'F2B', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Back', type: '2-Bedroom', price: 8500, occupants: 0, maxOccupants: 4, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'standard', photo: 'room_f2b.jpg', desc: 'Available Front Apartment 2nd Floor Back.' },

  { id: 'linda-lf', unitCode: 'LF', cluster: 'Linda', floorLabel: 'Linda Front', type: 'Special Unit', price: 5000, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'linda_fixed', photo: 'room_lf.jpg', desc: 'Linda Front Special Unit (BR-040 Fixed Rates).' },
  { id: 'linda-lb', unitCode: 'LB', cluster: 'Linda', floorLabel: 'Linda Back', type: 'Special Unit', price: 4800, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, waterRateType: 'linda_fixed', photo: 'room_lb.jpg', desc: 'Linda Back Special Unit (BR-040 Fixed Rates).' }
]);

export const incomeLedger = reactive<IncomeRecord[]>([]);

export const expenseLedger = reactive<ExpenseGroup[]>([]);

export const tickets = reactive<MaintenanceTicket[]>([]);

export const activeInquirers = reactive<Inquirer[]>([]);

export const isRoomDetailModalOpen = ref(false);
export const activeRoomDetail = ref<RoomUnit | null>(null);

export const isAdminEditUnitModalOpen = ref(false);
export const activeAdminEditUnit = ref<RoomUnit | null>(null);

export const isTicketHoverModalOpen = ref(false);
export const activeHoverTicket = ref<MaintenanceTicket | null>(null);

export const isLiveChatheadOpen = ref(false);
export const selectedInquirerId = ref('inq-1');
export const selectedPublicInquiryUnit = ref<string>('1c');

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

export const tenants = reactive<TenantProfile[]>([]);

export function addTenant(t: Omit<TenantProfile, 'id'>) {
  const newTenant: TenantProfile = {
    ...t,
    id: `t-${Date.now()}`
  };
  tenants.unshift(newTenant);
  const targetRoom = rooms.find(r => r.unitCode === t.room);
  if (targetRoom) {
    targetRoom.tenant = t.name;
    targetRoom.status = 'occupied';
  }
  showToast('success', 'Tenant Added', `Tenant ${t.name} assigned to Unit ${t.room}.`);
}

export function updateTenant(id: string, updated: Partial<TenantProfile>) {
  const t = tenants.find(x => x.id === id);
  if (t) {
    Object.assign(t, updated);
    if (updated.room && updated.name) {
      const room = rooms.find(r => r.unitCode === updated.room);
      if (room) room.tenant = updated.name;
    }
    showToast('info', 'Tenant Updated', `Updated details for ${t.name}.`);
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
    showToast('warning', 'Tenant Removed', `Tenant ${t.name} evicted/removed. Unit ${t.room} marked Available.`);
  }
}

export function addRoomUnit(newUnit: Omit<RoomUnit, 'id'>) {
  const unit: RoomUnit = {
    ...newUnit,
    id: `unit-${Date.now()}`
  };
  rooms.push(unit);
  showToast('success', 'Unit Added', `Unit ${newUnit.unitCode} added to cluster ${newUnit.cluster}.`);
}

export function updateRoomUnit(unitCode: string, changes: Partial<RoomUnit>) {
  const room = rooms.find(r => r.unitCode === unitCode);
  if (room) {
    Object.assign(room, changes);
    showToast('success', 'Unit Modified', `Unit ${unitCode} specifications updated successfully.`);
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
  if (t) {
    t.status = 'RESOLVED';
    showToast('success', 'Ticket Resolved', `Maintenance Ticket #${t.id} for Unit ${t.room} marked as RESOLVED.`);
  }
}

export function addIncomeRecord(record: IncomeRecord) {
  if (!record.id) {
    record.id = `inc-${Date.now()}`;
  }
  incomeLedger.unshift(record);
  const room = rooms.find(r => r.unitCode === record.unit);
  if (room) {
    room.status = 'occupied';
    room.paid = true;
    room.balance = 0;
  }
  showToast('success', 'Payment Logged', `Payment ${record.invoiceNum} of ₱${record.remitted.toLocaleString()} recorded for Unit ${record.unit}.`);
}

export function updateIncomeRecord(id: string, updatedRecord: Partial<IncomeRecord>) {
  const idx = incomeLedger.findIndex(r => r.id === id || (r.invoiceNum === updatedRecord.invoiceNum));
  if (idx !== -1) {
    const existing = incomeLedger[idx];
    Object.assign(existing, updatedRecord);
    showToast('info', 'Payment Record Updated', `Payment invoice ${existing.invoiceNum} updated successfully.`);
  }
}

export function deleteIncomeRecord(id: string) {
  const idx = incomeLedger.findIndex(r => r.id === id);
  if (idx !== -1) {
    const deleted = incomeLedger[idx];
    incomeLedger.splice(idx, 1);
    showToast('warning', 'Payment Record Deleted', `Invoice ${deleted.invoiceNum} for Unit ${deleted.unit} removed from ledger.`);
  }
}

export function addExpenseGroup(group: ExpenseGroup) {
  group.items.forEach(item => {
    if (!item.id) item.id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  });
  const existing = expenseLedger.find(g => g.date === group.date);
  if (existing) {
    existing.items.push(...group.items);
  } else {
    expenseLedger.unshift(group);
  }
  showToast('success', 'Expense Logged', `${group.items.length} expense items logged for date ${group.date}.`);
}

export function updateExpenseItem(date: string, itemId: string, updatedItem: Partial<ExpenseItem>) {
  const group = expenseLedger.find(g => g.date === date);
  if (group) {
    const item = group.items.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updatedItem);
      showToast('info', 'Expense Updated', `Expense ${item.supplier} updated to ₱${item.amount.toLocaleString()}.`);
    }
  }
}

export function deleteExpenseItem(date: string, itemId: string) {
  const groupIdx = expenseLedger.findIndex(g => g.date === date);
  if (groupIdx !== -1) {
    const group = expenseLedger[groupIdx];
    const itemIdx = group.items.findIndex(i => i.id === itemId);
    if (itemIdx !== -1) {
      const removed = group.items[itemIdx];
      group.items.splice(itemIdx, 1);
      if (group.items.length === 0) {
        expenseLedger.splice(groupIdx, 1);
      }
      showToast('warning', 'Expense Entry Deleted', `Expense ${removed.supplier} (₱${removed.amount.toLocaleString()}) deleted.`);
    }
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
