/**
 * @file lib/systemState.ts
 * @description Dynamic reactive state store for Hivelet, fully synchronized with Supabase PostgreSQL via the backend API.
 * @systemBibleRef docs/01_SYSTEM_BIBLE.md (All Sections)
 * @architectureRef docs/04_ARCHITECTURE.md
 * @requirements FR-005, FR-007, FR-009, FR-014, FR-016, FR-017, FR-025, FR-029, FR-043
 */

import { ref, reactive } from 'vue';
import { 
  CANONICAL_32_UNITS, 
  type RentableUnit, 
  type Cluster, 
  type UnitStatus, 
  peso, 
  WATER_PER_OCCUPANT, 
  GARBAGE_FEE, 
  LINDA_FIXED,
  CLUSTERS
} from './canonicalUnits';
import { api } from './api';
import { useToast } from './useToast';

const { showToast: triggerToast } = useToast();

export interface RoomItem {
  id: string;
  unitCode: string;
  cluster: Cluster;
  floor: 1 | 2 | 3;
  floorLabel: string;
  type: string;
  price: number;
  occupants: number;
  maxOccupants: number;
  status: UnitStatus;
  tenant: string | null;
  tenantId?: string | null;
  paid: boolean;
  balance: number;
  waterRateType: 'standard' | 'linda_fixed';
  billingRule: string;
  amenities: string[];
  photo: string;
  desc: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  unitCode: string;
  roomId?: string;
  phone: string;
  email: string;
  moveInDate: string;
  anniversary: string;
  depositAmount: number;
  status: 'active' | 'notice' | 'vacated';
  emergencyContact: {
    name: string;
    phone: string;
  };
  occupation: string;
  facebook: string;
  occupants: number;
  hasRoommates?: boolean;
  roommateQty?: number;
}

export interface IncomeRecord {
  id?: string;
  unit: string;
  roomId?: string;
  cluster: Cluster;
  datePaid: string;
  contact: string;
  invoice: string;
  rentFor: string;
  rent: number;
  occupants: number;
  water: number;
  garbage: number;
  anniversary: string;
  deposit: number;
  linda?: { electricity: number; water: number };
  paymentMethod?: string;
  verificationStatus?: string;
  fiftyPercentShare?: number;
  totalRemitted?: number;
}

export interface ExpenseSplit {
  id?: string;
  area: 'Boarding House' | 'Main House' | 'Front Apt' | 'Back Apt' | 'Other';
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  description: string;
  category: string;
  categoryCode?: string;
  totalAmount?: number;
  splits: ExpenseSplit[];
}

export interface MaintenanceTicket {
  id: string;
  unit: string;
  roomId?: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  reported: string;
  description: string;
  technician: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  photo: string;
  tenantName?: string;
  tenantProfileId?: string;
}

export interface Inquiry {
  id: string;
  name: string;
  unit: string;
  roomId?: string;
  phone: string;
  email: string;
  date: string;
  message: string;
  status?: string;
}

export const activeRole = ref<'admin' | 'tenant' | 'guest'>('admin');
export const isMobileSidebarOpen = ref(false);
export const isStateLoading = ref(false);
export const lastSyncTime = ref<Date | null>(null);

// Initialize initial reactive state from canonical defaults to prevent empty flash
export const rooms = reactive<RoomItem[]>(
  CANONICAL_32_UNITS.map((u) => ({
    id: u.id,
    unitCode: u.unitCode,
    cluster: u.cluster,
    floor: u.floor,
    floorLabel: u.floorLabel,
    type: u.type,
    price: u.basePrice,
    occupants: u.occupants,
    maxOccupants: u.capacity,
    status: u.status,
    tenant: u.tenantName,
    paid: u.status === 'settled',
    balance: u.status === 'overdue' ? u.basePrice : u.status === 'pending' ? u.basePrice : 0,
    waterRateType: u.waterRateType,
    billingRule: u.billingRule,
    amenities: u.amenities,
    photo: u.photo,
    desc: `${u.type} in ${u.cluster}. Includes private bathroom, submetered electricity, and Wi-Fi.`
  }))
);

export const tenants = reactive<TenantRecord[]>([]);
export const incomeRecords = reactive<IncomeRecord[]>([]);
export const expenseRecords = reactive<ExpenseRecord[]>([]);
export const maintenanceTickets = reactive<MaintenanceTicket[]>([]);
export const inquiries = reactive<Inquiry[]>([]);

export const EXPENSE_CATEGORIES = [
  "1 — Supplies",
  "2 — Taxes & Licenses",
  "3 — Janitorial",
  "4 — Depreciation",
  "5 — Professional Fees",
  "6 — Salaries: Michelle (PhilHealth, SSS, Allowances)",
  "7 — Utilities",
  "8 — Repairs & Maintenance",
  "9 — Fuel & Oil",
  "10 — Others",
];

export const TECHNICIANS = [
  "Unassigned",
  "Mang Ruel (Plumbing)",
  "Kuya Dante (Electrical)",
  "Jerome Mercado (Carpentry)",
  "Aircon Pro Tanauan",
];

export const DEMO_TENANT = {
  name: "Samantha Cruz",
  unit: "1A",
  unitLabel: "Room 1A — Floor 1, Studio Type Apartment",
  phone: "0928-311-2839",
  email: "samantha.1a@gmail.com",
  occupation: "BPO Team Lead",
  facebook: "facebook.com/samanthacruz",
  emergencyName: "Joyce Mangubat",
  emergencyPhone: "0928-829-2422",
  moveIn: "Jan 5, 2023",
  deposit: 9000,
  occupants: 2,
  capacity: 3,
  rent: 4500,
  water: 400,
  dueDate: "August 5, 2026",
  amountDue: 4900,
  photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70",
  fixtures: [
    "Private tiled bathroom with heater outlet",
    "Built-in wardrobe and study desk",
    "Ceiling fan + provision for window-type aircon",
    "Submetered electricity (₱12.50 / kWh, read every 25th)",
    "Shared laundry area access, 6:00 AM – 9:00 PM",
    "Fiber Wi-Fi ready (own subscription allowed)",
  ],
};

export const PAYMENT_HISTORY = [
  { or: "OR-2026-1032", date: "Jul 03, 2026", period: "Jun.26 – Jul.25", amount: 4900, method: "GCash", status: "Verified" },
  { or: "OR-2026-0981", date: "Jun 04, 2026", period: "May.26 – Jun.25", amount: 4900, method: "GCash", status: "Verified" },
  { or: "OR-2026-0930", date: "May 02, 2026", period: "Apr.26 – May.25", amount: 4700, method: "Cash", status: "Verified" },
  { or: "OR-2026-0888", date: "Apr 05, 2026", period: "Mar.26 – Apr.25", amount: 4700, method: "GCash", status: "Verified" },
];

export const LANDLADY = {
  name: "Fe Galang Da Silva",
  gcash: "09494150382",
  phone: "09494150382",
  facebook: "https://www.facebook.com/michelle.millete.16",
  property: "Fe Galang Da Silva Boarding House",
  address: "32 Sapaguita Street Brgy. 4 Sagpon Old Albay, Legazpi City, Philippines",
};

// Global Modals State
export const isRoomDetailModalOpen = ref(false);
export const activeRoomDetail = ref<RoomItem | null>(null);
export const isAdminEditUnitModalOpen = ref(false);
export const activeAdminEditUnit = ref<RoomItem | null>(null);
export const isOnsitePaymentModalOpen = ref(false);
export const isLiveChatheadOpen = ref(false);
export const selectedInquirerId = ref('inq-1');
export const selectedPublicInquiryUnit = ref('');
export const isTenantLoginModalOpen = ref(false);
export const isGuestEntryModalOpen = ref(false);
export const isTicketHoverModalOpen = ref(false);
export const activeHoverTicket = ref<MaintenanceTicket | null>(null);

export function showToast(type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) {
  triggerToast(type, title, message);
}

export function updateRoomRate(unitCode: string, newRate: number, maxOccupants: number, desc?: string, occupants?: number, type?: string, billingRule?: string, amenitiesStr?: string) {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === unitCode.toLowerCase());
  if (room) {
    room.price = newRate;
    room.maxOccupants = maxOccupants;
    if (occupants !== undefined) room.occupants = occupants;
    if (type) room.type = type;
    if (billingRule) room.billingRule = billingRule;
    if (amenitiesStr) room.amenities = amenitiesStr.split(',').map((s) => s.trim());
    if (desc) room.desc = desc;
  }
}

export function resolveTicket(ticketId: string) {
  const ticket = maintenanceTickets.find((t) => t.id === ticketId);
  if (ticket) {
    ticket.status = 'Resolved';
  }
}

/* ========================================================================== *
 * DYNAMIC ASYNC SUPABASE DATA SYNC LOADERS
 * ========================================================================== */

function mapClusterName(code: string): Cluster {
  const norm = (code || '').toLowerCase().trim();
  if (norm === 'bh' || norm.includes('main')) return 'BH';
  if (norm.includes('back')) return 'Back Apartment';
  if (norm.includes('front')) return 'Front Apartment';
  if (norm.includes('penthouse') || norm === 'ph') return 'Penthouse';
  if (norm.includes('linda')) return 'Linda Units';
  return 'BH';
}

function mapOperationalStatus(status: string): UnitStatus {
  const s = (status || '').toLowerCase().trim();
  if (s === 'occupied') return 'settled';
  if (s === 'under maintenance' || s === 'maintenance') return 'maintenance';
  if (s === 'reserved') return 'pending';
  if (s === 'available' || s === 'vacant') return 'vacant';
  return 'vacant';
}

/**
 * Loads all rooms from the backend Supabase API and syncs reactive `rooms`
 */
export async function fetchRooms(): Promise<RoomItem[]> {
  try {
    const isGuest = activeRole.value === 'guest';
    const endpoint = isGuest ? '/public/rooms' : '/admin/rooms';
    const data = await api.get<any[]>(endpoint, !isGuest);

    if (Array.isArray(data) && data.length > 0) {
      const mapped: RoomItem[] = data.map((r) => {
        const clusterCode = r.cluster_code || r.clusters?.code || 'BH';
        const cluster = mapClusterName(clusterCode);
        const unitCode = (r.room_number || '').toUpperCase();
        const isLinda = r.is_linda_unit || cluster === 'Linda Units';
        const floor = (r.floor || 1) as 1 | 2 | 3;
        const floorLabel = floor === 1 ? 'Ground Floor' : floor === 2 ? 'Second Floor' : 'Third Floor';
        const isOccupied = (r.operational_status || '').toLowerCase() === 'occupied';

        return {
          id: r.id,
          unitCode,
          cluster,
          floor,
          floorLabel,
          type: r.room_type || 'Studio',
          price: Number(r.current_price || r.base_price || 0),
          occupants: r.capacity ? Math.min(r.capacity, 2) : 1,
          maxOccupants: r.capacity || 2,
          status: mapOperationalStatus(r.operational_status),
          tenant: r.tenant_name || (isOccupied ? 'Active Resident' : null),
          tenantId: r.tenant_profile_id || null,
          paid: isOccupied,
          balance: 0,
          waterRateType: isLinda ? 'linda_fixed' : 'standard',
          billingRule: isLinda ? 'Fixed ₱200/mo water, submetered electric' : '₱200/head water, submetered electric',
          amenities: [
            'Private Bathroom',
            'Submetered Electricity',
            'Provision for Aircon',
            'Wi-Fi Ready'
          ],
          photo: (r.room_photos?.find((p: any) => p.is_primary)?.file_url || r.room_photos?.[0]?.file_url) ||
            CANONICAL_32_UNITS.find(u => u.unitCode.toLowerCase() === unitCode.toLowerCase())?.photo ||
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70',
          desc: r.description || `${r.room_type || 'Studio'} unit in ${cluster}.`
        };
      });

      rooms.splice(0, rooms.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchRooms fallback warning:', err);
  }
  return rooms;
}

/**
 * Loads all tenants from the backend Supabase API and syncs reactive `tenants`
 */
export async function fetchTenants(): Promise<TenantRecord[]> {
  try {
    const data = await api.get<any[]>('/admin/tenants');
    if (Array.isArray(data)) {
      const mapped: TenantRecord[] = data.map((t) => {
        const activeAssignment = t.room_assignments?.find((a: any) => a.is_active) || t.room_assignments?.[0];
        const assignedRoom = activeAssignment?.rooms;
        const unitCode = assignedRoom ? assignedRoom.room_number.toUpperCase() : '—';
        const moveInDate = activeAssignment?.start_date 
          ? new Date(activeAssignment.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';
        const anniversary = activeAssignment?.anniversary_date
          ? new Date(activeAssignment.anniversary_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—';

        return {
          id: t.id,
          name: t.full_name || 'Tenant',
          unitCode,
          roomId: assignedRoom?.id,
          phone: t.phone_number || '—',
          email: t.email || '—',
          moveInDate,
          anniversary,
          depositAmount: Number(activeAssignment?.deposit_amount || 0),
          status: (t.account_status === 'active' ? 'active' : 'vacated') as 'active' | 'notice' | 'vacated',
          emergencyContact: {
            name: t.emergency_contact_name || '—',
            phone: t.emergency_contact_phone || '—'
          },
          occupation: t.occupation || 'Resident',
          facebook: t.facebook_url || '',
          occupants: Number(activeAssignment?.occupant_count || 1),
          hasRoommates: Number(activeAssignment?.occupant_count || 1) > 1,
          roommateQty: Math.max(0, Number(activeAssignment?.occupant_count || 1) - 1),
        };
      });

      tenants.splice(0, tenants.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchTenants error:', err);
  }
  return tenants;
}

/**
 * Returns dynamic summary of residing occupants for a unit code,
 * e.g. "Mark Cruz + 2 roommates" or "Mark Cruz (Solo)"
 */
export function formatUnitOccupantsSummary(unitCode: string): { text: string; count: number; residents: string[] } {
  if (!unitCode) return { text: 'None (Vacant)', count: 0, residents: [] };
  const uCode = unitCode.toUpperCase();
  const activeTenants = tenants.filter(t => t.unitCode && t.unitCode.toUpperCase() === uCode && t.status === 'active');
  
  if (activeTenants.length === 0) {
    // Check fallback in rooms reactive array
    const r = rooms.find(rm => rm.unitCode.toUpperCase() === uCode);
    if (r?.tenant && (r.status === 'settled' || r.status === 'pending')) {
      const occ = r.occupants || 1;
      const rQty = Math.max(0, occ - 1);
      const txt = rQty > 0 ? `${r.tenant} + ${rQty} ${rQty === 1 ? 'roommate' : 'roommates'}` : r.tenant;
      return { text: txt, count: occ, residents: [r.tenant] };
    }
    return { text: 'No active residents', count: 0, residents: [] };
  }

  let totalCount = 0;
  const parts: string[] = [];
  const names: string[] = [];

  for (const t of activeTenants) {
    names.push(t.name);
    const rQty = t.roommateQty ?? Math.max(0, (t.occupants || 1) - 1);
    totalCount += 1 + rQty;
    if (rQty > 0) {
      parts.push(`${t.name} + ${rQty} ${rQty === 1 ? 'roommate' : 'roommates'}`);
    } else {
      parts.push(`${t.name} (Solo)`);
    }
  }

  return {
    text: parts.join(', '),
    count: totalCount,
    residents: names
  };
}

/**
 * Loads all monthly income records from Supabase and syncs reactive `incomeRecords`
 */
export async function fetchIncomeRecords(): Promise<IncomeRecord[]> {
  try {
    const res = await api.get<any>('/admin/income-records');
    const records = Array.isArray(res) ? res : res?.data || [];
    if (Array.isArray(records)) {
      const mapped: IncomeRecord[] = records.map((inc: any) => {
        const unit = (inc.rooms?.room_number || '1A').toUpperCase();
        const cluster = mapClusterName(inc.rooms?.cluster_code || 'BH');
        const datePaidFormatted = inc.date_paid 
          ? new Date(inc.date_paid).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';
        const rentStart = inc.rent_period_start ? new Date(inc.rent_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const rentEnd = inc.rent_period_end ? new Date(inc.rent_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const rentFor = rentStart && rentEnd ? `${rentStart} – ${rentEnd}` : 'Current Month';

        return {
          id: inc.id,
          unit,
          roomId: inc.room_id,
          cluster,
          datePaid: datePaidFormatted,
          contact: inc.contact_name || 'Resident',
          invoice: inc.invoice_number || `INV-${inc.year || 2026}-${String(inc.month || 1).padStart(2, '0')}`,
          rentFor,
          rent: Number(inc.rent_amount || 0),
          occupants: Number(inc.occupants || 1),
          water: Number(inc.water_payment || 0),
          garbage: Number(inc.gbg_fee || 0),
          anniversary: rentStart || '1st',
          deposit: 0,
          paymentMethod: inc.payment_method || 'Cash',
          verificationStatus: inc.verification_status || 'Verified',
          fiftyPercentShare: Number(inc.fifty_percent_share || (inc.rent_amount ? inc.rent_amount / 2 : 0)),
          totalRemitted: Number(inc.remitted_amount || 0),
          linda: inc.is_linda_billing ? {
            electricity: Number(inc.linda_electricity_charge || 0),
            water: Number(inc.linda_water_charge || 0)
          } : undefined
        };
      });

      incomeRecords.splice(0, incomeRecords.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchIncomeRecords error:', err);
  }
  return incomeRecords;
}

/**
 * Loads all expense entries and categories from Supabase and syncs reactive `expenseRecords`
 */
export async function fetchExpenseRecords(): Promise<ExpenseRecord[]> {
  try {
    const res = await api.get<any[]>('/admin/expense-entries');
    if (Array.isArray(res)) {
      const mapped: ExpenseRecord[] = res.map((exp: any) => {
        const categoryName = exp.fixed_expense_categories?.name 
          ? `${exp.category_code} — ${exp.fixed_expense_categories.name}`
          : EXPENSE_CATEGORIES.find(c => c.startsWith(`${exp.category_code} —`)) || `${exp.category_code} — Expense`;
        
        const dateFormatted = exp.expense_date 
          ? new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';

        const splits: ExpenseSplit[] = (exp.expense_property_allocations || []).map((a: any) => ({
          id: a.id,
          area: a.property_area as any,
          amount: Number(a.amount || 0)
        }));

        return {
          id: exp.id,
          date: dateFormatted,
          description: exp.or_supplier || 'Expense',
          category: categoryName,
          categoryCode: exp.category_code,
          totalAmount: Number(exp.total_expenses || 0),
          splits: splits.length > 0 ? splits : [{ area: 'Boarding House', amount: Number(exp.total_expenses || 0) }]
        };
      });

      expenseRecords.splice(0, expenseRecords.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchExpenseRecords error:', err);
  }
  return expenseRecords;
}

/**
 * Loads all maintenance tickets from Supabase and syncs reactive `maintenanceTickets`
 */
export async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  try {
    const res = await api.get<any[]>('/admin/tickets');
    if (Array.isArray(res)) {
      const mapped: MaintenanceTicket[] = res.map((t: any) => {
        const unit = (t.rooms?.room_number || '—').toUpperCase();
        const reportedFormatted = t.created_at 
          ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';

        let statusMapped: 'Open' | 'In Progress' | 'Resolved' = 'Open';
        if (t.status === 'In Progress' || t.status === 'Dispatched') statusMapped = 'In Progress';
        else if (t.status === 'Resolved' || t.status === 'Closed') statusMapped = 'Resolved';

        return {
          id: t.id,
          unit,
          roomId: t.room_id,
          title: t.title || 'Maintenance Request',
          category: t.category || 'General',
          priority: t.priority || 'Medium',
          reported: reportedFormatted,
          description: t.description || '',
          technician: t.assigned_technician || 'Unassigned',
          status: statusMapped,
          photo: t.ticket_attachments?.[0]?.file_url || null,
          tenantName: t.profiles?.full_name || 'Resident',
          tenantProfileId: t.tenant_profile_id
        };
      });

      maintenanceTickets.splice(0, maintenanceTickets.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchMaintenanceTickets error:', err);
  }
  return maintenanceTickets;
}

/**
 * Loads all inquiries from Supabase and syncs reactive `inquiries`
 */
export async function fetchInquiries(): Promise<Inquiry[]> {
  try {
    const res = await api.get<any[]>('/admin/inquiries');
    if (Array.isArray(res)) {
      const mapped: Inquiry[] = res.map((i: any) => {
        const unit = (i.rooms?.room_number || '—').toUpperCase();
        const dateFormatted = i.created_at 
          ? new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';

        return {
          id: i.id,
          name: i.prospect_name || 'Prospective Tenant',
          unit,
          roomId: i.room_id,
          phone: i.prospect_phone || '—',
          email: i.prospect_email || '—',
          date: dateFormatted,
          message: i.message || '',
          status: i.status || 'Submitted'
        };
      });

      inquiries.splice(0, inquiries.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchInquiries error:', err);
  }
  return inquiries;
}

/**
 * Master initialization function to synchronize all reactive data with Supabase
 */
export async function initSystemState(): Promise<void> {
  if (isStateLoading.value) return;
  isStateLoading.value = true;

  try {
    await Promise.allSettled([
      fetchRooms(),
      fetchTenants(),
      fetchIncomeRecords(),
      fetchExpenseRecords(),
      fetchMaintenanceTickets(),
      fetchInquiries()
    ]);
    lastSyncTime.value = new Date();
  } catch (err) {
    console.error('Failed to fully initialize system state from database:', err);
  } finally {
    isStateLoading.value = false;
  }
}

// Auto-trigger initialization in browser environments
if (typeof window !== 'undefined') {
  initSystemState();
}
