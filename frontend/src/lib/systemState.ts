/**
 * @file lib/systemState.ts
 * @description Dynamic reactive state store for Hivelet, fully synchronized with Supabase PostgreSQL via the backend API.
 * @systemBibleRef docs/01_SYSTEM_BIBLE.md (All Sections)
 * @architectureRef docs/04_ARCHITECTURE.md
 * @requirements FR-005, FR-007, FR-009, FR-014, FR-016, FR-017, FR-025, FR-029, FR-043
 */

import { ref, reactive } from 'vue';
import { 
  CANONICAL_UNITS, 
  type RentableUnit, 
  type Cluster, 
  type UnitStatus, 
  peso, 
  CLUSTERS
} from './canonicalUnits';
import { api } from './api';
import { isAdmin, isAuthenticated } from './authStore';
import { useToast } from './useToast';

const { showToast: triggerToast } = useToast();

export interface RoomItem {
  id: string;
  unitCode: string;
  cluster: Cluster;
  /** 1-3 are residential floors; 4 is the rooftop penthouse level occupied only by PH. */
  floor: 1 | 2 | 3 | 4;
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
  year?: number;
  month?: number;
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

/**
 * The six Property Areas of the expense ledger. These are the exact strings stored in
 * `expense_property_allocations.property_area` and seeded into the `property_areas` lookup
 * (database/migrations/008_property_areas_lookup.sql).
 *
 * `Penthouse` was added by 012_penthouse_area_and_cluster_routing.sql (OD-15). Keep this list in
 * step with backend/src/config/propertyAreas.ts.
 */
export type PropertyArea =
  | 'Boarding House'
  | 'Main House'
  | 'Front Apartment'
  | 'Back Apartment'
  | 'Penthouse'
  | 'Other Expenses / Personal';

/**
 * Areas that are NOT a cost of running the boarding house and must never be subtracted from
 * rental income. "Main House" is Mrs. Fe's own residence (OD-05, confirmed 2026-09-13); it shares
 * utility bills with the business, which is why single entries split across two areas.
 *
 * `Penthouse` is deliberately NOT here: the penthouse is let to tenants, so its upkeep is an
 * operating cost.
 *
 * Mirrors `property_areas.is_rental_expense = FALSE` in the database. Keep the two in step.
 */
export const NON_RENTAL_AREAS: readonly PropertyArea[] = [
  'Main House',
  'Other Expenses / Personal'
] as const;

export function isRentalArea(area: string): boolean {
  return !NON_RENTAL_AREAS.includes(area as PropertyArea);
}

export interface ExpenseSplit {
  id?: string;
  area: PropertyArea;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  rawDate?: string;
  year?: number;
  month?: number;
  description: string;
  category: string;
  categoryCode?: string;
  /** Sum of every allocation on this entry, personal included. The face value of the receipt. */
  totalAmount?: number;
  /** Operating cost of the rental business only. This is the figure to subtract from income. */
  rentalAmount?: number;
  /** Non-rental portion (Main House, Other/Personal). Reported, never subtracted from income. */
  personalAmount?: number;
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

/**
 * Initial reactive state, so the UI has the 33-unit grid to draw before the API
 * responds rather than flashing empty.
 *
 * IMPORTANT: this seeds STRUCTURE ONLY - unit code, cluster, floor, type,
 * capacity. Those are real and verified against the live database.
 *
 * It deliberately does NOT seed people or money. `CANONICAL_UNITS` carries 33
 * invented tenant names (Samantha Cruz, Maria Santos, Gabriel Fernandez...) and
 * invented payment statuses, and those used to be shown on screen until the API
 * replied - and would persist indefinitely if it failed. The real tenants are
 * people like Jaye Casia and the Gayon group; displaying fabricated residents of
 * a real person's property, with fabricated arrears, is not a loading state worth
 * having. Units render as vacant with no tenant until live data arrives.
 */
export const rooms = reactive<RoomItem[]>(
  CANONICAL_UNITS.map((u) => ({
    id: u.id,
    unitCode: u.unitCode,
    cluster: u.cluster,
    floor: u.floor,
    floorLabel: u.floorLabel,
    type: u.type,
    price: u.basePrice,
    occupants: 0,
    maxOccupants: u.capacity,
    status: 'vacant' as const,
    tenant: '',
    paid: false,
    balance: 0,
    waterRateType: u.waterRateType,
    billingRule: u.billingRule,
    amenities: u.amenities,
    photo: u.photo,
    // The unit's real description arrives from the API (`rooms.description`).
    // Until it does, say only what is structurally true. This used to assert a
    // private bathroom, submetered electricity and Wi-Fi for all 33 units - three
    // facts the system does not hold for any of them, shown to prospects.
    desc: `${u.type} in ${u.cluster}.`
  }))
);

export const tenants = reactive<TenantRecord[]>([]);
/**
 * The configured water rates, fetched once and reused. BR-014 / BR-040.
 *
 * `GET /api/public/rates` needs no authentication, which is what makes it usable
 * from the public room pages.
 */
const waterRates = reactive<{ perOccupant: number | null; linda: Record<string, number> }>({
  perOccupant: null,
  linda: {},
});

let waterRatesLoaded = false;

export async function fetchWaterRates(): Promise<void> {
  if (waterRatesLoaded) return;
  try {
    const r = await api.get<{
      waterRatePerOccupant: number;
      lindaFixedWaterCharges: Record<string, number>;
    }>('/public/rates', false);
    waterRates.perOccupant = r?.waterRatePerOccupant ?? null;
    waterRates.linda = r?.lindaFixedWaterCharges ?? {};
    waterRatesLoaded = true;
  } catch {
    // Left unset; buildBillingRule falls back to the seeded figures.
  }
}

/**
 * The monthly water charge for one unit, at the configured rates. BR-014 / BR-040.
 *
 * Exported because the dashboard's run-rate needs the same figures and was
 * computing them with a hardcoded 200 - including for Linda, where it used 200
 * for both units although LF is 400, so the run-rate understated LF every month.
 */
export function waterChargeFor(unitCode: string, occupants: number, isLinda: boolean): number {
  const code = unitCode.toUpperCase();
  if (isLinda) return waterRates.linda[code] ?? (code === 'LF' ? 400 : 200);
  return Math.max(1, occupants || 1) * (waterRates.perOccupant ?? 200);
}

/** The one-line charge summary shown against a unit on the public pages. */
function buildBillingRule(unitCode: string, isLinda: boolean): string {
  const code = unitCode.toUpperCase();
  if (isLinda) {
    // LF and LB are different figures - 400 and 200 - and saying "200" for both
    // was wrong for LF. The electricity line is gone entirely: migration 017
    // retired the flat charge, and nothing records one for any unit now.
    const fixed = waterRates.linda[code] ?? (code === 'LF' ? 400 : 200);
    return `Fixed ₱${fixed.toLocaleString()}/mo water, submetered electric`;
  }
  const perHead = waterRates.perOccupant ?? 200;
  return `₱${perHead.toLocaleString()}/head water, submetered electric`;
}

export const incomeRecords = reactive<IncomeRecord[]>([]);
export const expenseRecords = reactive<ExpenseRecord[]>([]);
export const maintenanceTickets = reactive<MaintenanceTicket[]>([]);
export const inquiries = reactive<Inquiry[]>([]);

/**
 * Set when the matching fetch below could not refresh its array - a rejected
 * request, or a response that carried no rows. The array itself is left at
 * whatever it last held (see `rooms`'s own seeded-vacant fallback above), so a
 * dashboard figure derived from it must check this flag before presenting the
 * count as fact rather than as the last thing that loaded successfully.
 */
export const roomsFetchFailed = ref(false);
export const incomeRecordsFetchFailed = ref(false);
export const maintenanceTicketsFetchFailed = ref(false);

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

/**
 * PLACEHOLDER NAMES. The owner has not supplied her tradespeople.
 *
 * These are written to `maintenance_tickets.assigned_technician` on a real
 * record when a ticket is dispatched, so they are not cosmetic - a ticket
 * history will say "Mang Ruel (Plumbing)" attended, and no such person is known
 * to this project. "Aircon Pro Tanauan" is not even in the right province.
 *
 * Replace with the real list before the system is used in earnest. Until then
 * the dispatch flow requires the administrator to pick one deliberately rather
 * than defaulting to any of them, so nothing is attributed by accident.
 */
export const TECHNICIANS = [
  "Unassigned",
  "Mang Ruel (Plumbing)",
  "Kuya Dante (Electrical)",
  "Jerome Mercado (Carpentry)",
  "Aircon Pro Tanauan",
];

/**
 * DEMO_TENANT and PAYMENT_HISTORY were removed on 2026-09-14.
 *
 * Both were fabricated data with no remaining reader. DEMO_TENANT described an
 * invented resident - "Samantha Cruz", an emergency contact named "Joyce
 * Mangubat" with a plausible mobile number, a 9,000 deposit and a stock photo.
 * PAYMENT_HISTORY held four invented receipts numbered OR-2026-1032 and up,
 * marked Verified.
 *
 * PAYMENT_HISTORY had already been unwired from the tenant portal earlier in
 * this audit; DEMO_TENANT was read by nothing at all. They are deleted rather
 * than left dormant because this project has now been bitten three times by
 * invented data reaching a real screen - the OR numbers, the emergency contacts,
 * and the ticket replies signed in the owner's name. A realistic-looking
 * fixture sitting one import away from a view is how that keeps happening.
 *
 * Demo credentials live in credentials/creds.txt against real seeded accounts.
 */



export const LANDLADY = {
  name: "Fe Galang Da Silva",
  gcash: "09494150382",
  phone: "09494150382",
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
  // The rates decide the per-unit billing line built below, so they are read
  // first. Cached after the first call, and a failure falls back to the seeded
  // figures rather than blocking the room list.
  await fetchWaterRates();
  roomsFetchFailed.value = false;

  try {
    // The endpoint follows the SIGNED-IN role, not the `activeRole` ref, which
    // defaults to 'admin' and therefore sent tenants and guests to /admin/rooms.
    // Anyone who is not an administrator reads the published room list, which is
    // what the public listing uses and what they are entitled to see.
    const useAdmin = isAuthenticated.value && isAdmin.value;
    const endpoint = useAdmin ? '/admin/rooms' : '/public/rooms';
    const data = await api.get<any[]>(endpoint, useAdmin);

    if (Array.isArray(data) && data.length > 0) {
      const mapped: RoomItem[] = data.map((r) => {
        const clusterCode = r.cluster_code || r.clusters?.code || 'BH';
        const cluster = mapClusterName(clusterCode);
        const unitCode = (r.room_number || '').toUpperCase();
        const isLinda = r.is_linda_unit || cluster === 'Linda Units';
        const floor = (r.floor || 1) as 1 | 2 | 3 | 4;
        const floorLabel = floor === 1 ? 'Ground Floor'
          : floor === 2 ? 'Second Floor'
          : floor === 3 ? 'Third Floor'
          : 'Rooftop (Level 4)';
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
          // Shown on the public room pages (RoomDirectoryView, CategoryRoomsView).
          //
          // It read "Fixed ₱200/mo water" for BOTH Linda units, and LF is ₱400 -
          // so a prospect browsing LF was told the wrong charge. The per-occupant
          // figure was written in as 200 as well, which goes stale the moment the
          // owner changes the rate in settings (BR-014).
          //
          // Derived from the configured rates now, with the seeded values as the
          // fallback so a failed fetch degrades to today's wording rather than to
          // a blank.
          billingRule: buildBillingRule(unitCode, isLinda),
          amenities: [
            'Private Bathroom',
            'Submetered Electricity',
            'Provision for Aircon',
            'Wi-Fi Ready'
          ],
          // Sean, 2026-09-15: get rid of any photo nobody actually uploaded.
          // This used to fall back to CANONICAL_UNITS' (always-empty) seed
          // photo, then to a hardcoded stock image - so a unit with no real
          // photo on file still showed one, indistinguishable from a real
          // interior shot. Empty when there is no real upload; every consumer
          // (CategoryRoomsView, RoomDirectoryView) already renders "No photo
          // yet" for a falsy `photo`.
          photo: r.room_photos?.find((p: any) => p.is_primary)?.file_url || r.room_photos?.[0]?.file_url || '',
          desc: r.description || `${r.room_type || 'Studio'} unit in ${cluster}.`
        };
      });

      rooms.splice(0, rooms.length, ...mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('fetchRooms fallback warning:', err);
  }
  roomsFetchFailed.value = true;
  return rooms;
}

/**
 * Loads all tenants from the backend Supabase API and syncs reactive `tenants`
 */
export async function fetchTenants(): Promise<TenantRecord[]> {
  // Administrator-only endpoint: a refused call here is audited as
  // AUTH_ACCESS_DENIED, so it is not attempted at all.
  if (!isAuthenticated.value || !isAdmin.value) return [];

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
  // Administrator-only endpoint: a refused call here is audited as
  // AUTH_ACCESS_DENIED, so it is not attempted at all.
  if (!isAuthenticated.value || !isAdmin.value) return [];
  incomeRecordsFetchFailed.value = false;

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
          year: inc.year ? Number(inc.year) : (inc.date_paid ? new Date(inc.date_paid).getFullYear() : 2026),
          month: inc.month ? Number(inc.month) : (inc.date_paid ? new Date(inc.date_paid).getMonth() + 1 : 1),
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
  incomeRecordsFetchFailed.value = true;
  return incomeRecords;
}

/**
 * Loads all expense entries and categories from Supabase and syncs reactive `expenseRecords`
 */
export async function fetchExpenseRecords(): Promise<ExpenseRecord[]> {
  // Administrator-only endpoint: a refused call here is audited as
  // AUTH_ACCESS_DENIED, so it is not attempted at all.
  if (!isAuthenticated.value || !isAdmin.value) return [];

  try {
    const res = await api.get<any[]>('/admin/expense-entries');
    if (Array.isArray(res)) {
      const mapped: ExpenseRecord[] = res.map((exp: any) => {
        const categoryName = exp.fixed_expense_categories?.name 
          ? `${exp.category_code} — ${exp.fixed_expense_categories.name}`
          : EXPENSE_CATEGORIES.find(c => c.startsWith(`${exp.category_code} —`)) || `${exp.category_code} — Expense`;
        
        const dObj = exp.expense_date ? new Date(exp.expense_date) : null;
        const dateFormatted = dObj && !isNaN(dObj.getTime())
          ? dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';

        const splits: ExpenseSplit[] = (exp.expense_property_allocations || []).map((a: any) => ({
          id: a.id,
          area: a.property_area as any,
          amount: Number(a.amount || 0)
        }));

        const effectiveSplits: ExpenseSplit[] = splits.length > 0
          ? splits
          : [{ area: 'Boarding House', amount: Number(exp.total_expenses || 0) }];

        // Split the receipt into the part that is a cost of the rental business and the part that
        // is not. Only the former may be subtracted from rental income (OD-05).
        const rentalAmount = effectiveSplits
          .filter(sp => isRentalArea(sp.area))
          .reduce((sum, sp) => sum + Number(sp.amount || 0), 0);
        const personalAmount = effectiveSplits
          .filter(sp => !isRentalArea(sp.area))
          .reduce((sum, sp) => sum + Number(sp.amount || 0), 0);

        return {
          id: exp.id,
          date: dateFormatted,
          rawDate: exp.expense_date || '',
          year: dObj && !isNaN(dObj.getTime()) ? dObj.getFullYear() : undefined,
          month: dObj && !isNaN(dObj.getTime()) ? dObj.getMonth() + 1 : undefined,
          description: exp.or_supplier || 'Expense',
          category: categoryName,
          categoryCode: exp.category_code,
          totalAmount: Number(exp.total_expenses || 0),
          rentalAmount,
          personalAmount,
          splits: effectiveSplits
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
  // Administrator-only endpoint: a refused call here is audited as
  // AUTH_ACCESS_DENIED, so it is not attempted at all.
  if (!isAuthenticated.value || !isAdmin.value) return [];
  maintenanceTicketsFetchFailed.value = false;

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
  maintenanceTicketsFetchFailed.value = true;
  return maintenanceTickets;
}

/**
 * Loads all inquiries from Supabase and syncs reactive `inquiries`
 */
export async function fetchInquiries(): Promise<Inquiry[]> {
  // Administrator-only endpoint: a refused call here is audited as
  // AUTH_ACCESS_DENIED, so it is not attempted at all.
  if (!isAuthenticated.value || !isAdmin.value) return [];

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
  // These are all administrator endpoints. Calling them as anyone else is not a
  // degraded experience, it is a refused request that gets audited.
  if (!isAuthenticated.value || !isAdmin.value) return;
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

/**
 * NOTHING IS FETCHED AT MODULE LOAD.
 *
 * This file used to call `initSystemState()` the moment it was imported, before
 * anyone had signed in and regardless of who they were. That fired six
 * admin-only requests on every page load in the application:
 *
 *   /admin/rooms  /admin/tenants  /admin/income-records
 *   /admin/expense-entries  /admin/tickets  /admin/inquiries
 *
 * For a signed-in tenant each came back 403, so the resident portal produced 48
 * console errors on a four-page walk. Two consequences, and the second is the
 * serious one.
 *
 * First, it looked broken to anyone who opened the developer tools.
 *
 * Second, the API audits a refused request as `AUTH_ACCESS_DENIED`. Every
 * tenant, on every page view, was writing six rows into the immutable audit
 * trail that read as if they had tried to reach the landlady's ledger. The
 * audit log is append-only by design - migration 002 revokes DELETE from every
 * role, including the API's own - so that noise is permanent and cannot be
 * cleaned up afterwards. A trail full of false intrusion attempts is worse than
 * no trail, because it trains its reader to ignore it.
 *
 * Views now ask for what they need, and `initSystemState()` refuses to run for
 * anyone who is not an administrator.
 */
