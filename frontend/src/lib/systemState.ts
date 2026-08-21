import { ref, reactive } from 'vue';
import { CANONICAL_32_UNITS, type RentableUnit, type Cluster, type UnitStatus, peso, WATER_PER_OCCUPANT, GARBAGE_FEE, LINDA_FIXED } from './canonicalUnits';
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
}

export interface IncomeRecord {
  id?: string;
  unit: string;
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
}

export interface ExpenseSplit {
  area: 'Boarding House' | 'Main House' | 'Front Apt' | 'Back Apt' | 'Other';
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  description: string;
  category: string;
  splits: ExpenseSplit[];
}

export interface MaintenanceTicket {
  id: string;
  unit: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  reported: string;
  description: string;
  technician: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  photo: string;
}

export interface Inquiry {
  id: string;
  name: string;
  unit: string;
  phone: string;
  email: string;
  date: string;
  message: string;
}

export const activeRole = ref<'admin' | 'tenant' | 'guest'>('admin');
export const isMobileSidebarOpen = ref(false);

// Initialize rooms from CANONICAL_32_UNITS
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

// Tenants List (Screenshot 4 exact matching data)
export const tenants = reactive<TenantRecord[]>([
  { id: 'TEN-001', name: 'Samantha Cruz', unitCode: '1A', phone: '0928-311-2839', email: 'samantha.1a@gmail.com', moveInDate: 'Jan 5, 2023', anniversary: '5 Jan', depositAmount: 9000, status: 'active', emergencyContact: { name: 'Joyce Mangubat', phone: '0928-829-2422' }, occupation: 'BPO Team Lead', facebook: 'facebook.com/samanthacruz', occupants: 2 },
  { id: 'TEN-002', name: 'Maria Santos', unitCode: '1B', phone: '0917-348-3452', email: 'maria.1b@gmail.com', moveInDate: 'Feb 6, 2024', anniversary: '6 Feb', depositAmount: 10000, status: 'active', emergencyContact: { name: 'Dennis Panganiban', phone: '0917-866-3035' }, occupation: 'Nurse — Tanauan Medical', facebook: 'facebook.com/mariasantos', occupants: 2 },
  { id: 'TEN-003', name: 'Gabriel Fernandez', unitCode: '1C', phone: '0928-385-4065', email: 'gabriel.1c@gmail.com', moveInDate: 'Mar 7, 2025', anniversary: '7 Mar', depositAmount: 11000, status: 'active', emergencyContact: { name: 'Liza Marasigan', phone: '0928-903-3648' }, occupation: 'Engineering Student', facebook: 'facebook.com/gabrielfernandez', occupants: 3 },
  { id: 'TEN-004', name: 'Jerome Mercado', unitCode: '1D', phone: '0917-422-4678', email: 'jerome.1d@gmail.com', moveInDate: 'Apr 8, 2023', anniversary: '8 Apr', depositAmount: 12000, status: 'active', emergencyContact: { name: 'Ronnie Castillo', phone: '0917-940-4261' }, occupation: 'Public School Teacher', facebook: 'facebook.com/jeromemercado', occupants: 1 },
  { id: 'TEN-005', name: 'Michelle Bautista', unitCode: '1E', phone: '0928-459-5291', email: 'michelle.1e@gmail.com', moveInDate: 'May 9, 2024', anniversary: '9 May', depositAmount: 13000, status: 'active', emergencyContact: { name: 'Cherry Ann Dimaculangan', phone: '0928-977-4874' }, occupation: 'Bank Teller', facebook: 'facebook.com/michellebautista', occupants: 2 },
  { id: 'TEN-006', name: 'Andrea Villanueva', unitCode: '1F', phone: '0917-496-5904', email: 'andrea.1f@gmail.com', moveInDate: 'Jun 10, 2025', anniversary: '10 Jun', depositAmount: 9000, status: 'notice', emergencyContact: { name: 'Nico Bayani', phone: '0917-234-5487' }, occupation: 'Barista', facebook: 'facebook.com/andreavillanueva', occupants: 3 },
  { id: 'TEN-007', name: 'Paolo Reyes', unitCode: '1G', phone: '0928-533-6517', email: 'paolo.1g@gmail.com', moveInDate: 'Jul 11, 2023', anniversary: '11 Jul', depositAmount: 10000, status: 'active', emergencyContact: { name: 'Trisha Gonzales', phone: '0928-271-6100' }, occupation: 'Freelance Designer', facebook: 'facebook.com/paoloreyes', occupants: 1 },
  { id: 'TEN-008', name: 'Katrina Delos Reyes', unitCode: '1H', phone: '0917-570-7130', email: 'katrina.1h@gmail.com', moveInDate: 'Aug 12, 2024', anniversary: '12 Aug', depositAmount: 11000, status: 'active', emergencyContact: { name: 'Arvin Malabanan', phone: '0917-308-6713' }, occupation: 'Government Employee', facebook: 'facebook.com/katrinadelosreyes', occupants: 2 },
  { id: 'TEN-009', name: 'Rafael Aguilar', unitCode: '2B', phone: '0928-607-7743', email: 'rafael.2b@gmail.com', moveInDate: 'Sep 13, 2025', anniversary: '13 Sep', depositAmount: 13000, status: 'active', emergencyContact: { name: 'Grace Hernandez', phone: '0928-345-7326' }, occupation: 'BPO Team Lead', facebook: 'facebook.com/rafaelaguilar', occupants: 2 }
]);

// Income Rows for all 32 units
export const incomeRecords = reactive<IncomeRecord[]>(
  CANONICAL_32_UNITS.map((u, i) => {
    const isLinda = u.cluster === 'Linda Units';
    const water = isLinda ? (LINDA_FIXED[u.unitCode]?.water || 200) : u.occupants * WATER_PER_OCCUPANT;
    const inv = `OR-2026-${String(1040 + i)}`;
    return {
      id: `INC-MOCK-${inv}`,
      unit: u.unitCode.toUpperCase(),
      cluster: u.cluster,
      datePaid: u.status === 'vacant' ? '—' : `Jul ${((i * 3) % 25) + 1}, 2026`,
      contact: u.tenantName ? `0917-${String(200 + i * 17).padStart(3, '0')}-${String(1000 + i * 37).padStart(4, '0')}` : '—',
      invoice: inv,
      rentFor: 'Jun.26 – Jul.25',
      rent: u.status === 'vacant' ? 0 : u.basePrice,
      occupants: u.occupants,
      water: u.status === 'vacant' ? 0 : water,
      garbage: 0,
      anniversary: `${((i * 3) % 25) + 1} ${['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'][i % 6]}`,
      deposit: u.status === 'vacant' ? 0 : u.basePrice * 2,
      linda: isLinda ? LINDA_FIXED[u.unitCode] : undefined,
    };
  })
);

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

export const expenseRecords = reactive<ExpenseRecord[]>([
  {
    id: "EXP-001",
    date: "Jul 02, 2026",
    description: "OR #88213 — Sambat Hardware (pipes, sealant)",
    category: "8 — Repairs & Maintenance",
    splits: [
      { area: "Boarding House", amount: 2450 },
      { area: "Back Apt", amount: 1200 },
    ],
  },
  {
    id: "EXP-002",
    date: "Jul 02, 2026",
    description: "OR #88220 — Tanauan Water District",
    category: "7 — Utilities",
    splits: [
      { area: "Boarding House", amount: 4800 },
      { area: "Front Apt", amount: 1600 },
      { area: "Main House", amount: 900 },
    ],
  },
  {
    id: "EXP-003",
    date: "Jul 08, 2026",
    description: "Payroll — Michelle (salary + SSS + PhilHealth)",
    category: "6 — Salaries: Michelle (PhilHealth, SSS, Allowances)",
    splits: [
      { area: "Boarding House", amount: 9500 },
      { area: "Main House", amount: 2500 },
    ],
  },
  {
    id: "EXP-004",
    date: "Jul 08, 2026",
    description: "OR #4471 — Janitorial supplies, Batangas Mercantile",
    category: "3 — Janitorial",
    splits: [
      { area: "Boarding House", amount: 1850 },
      { area: "Front Apt", amount: 450 },
      { area: "Back Apt", amount: 450 },
    ],
  },
  {
    id: "EXP-005",
    date: "Jul 15, 2026",
    description: "Business permit renewal — Tanauan City Hall",
    category: "2 — Taxes & Licenses",
    splits: [{ area: "Other", amount: 6200 }],
  },
  {
    id: "EXP-006",
    date: "Jul 19, 2026",
    description: "Diesel — generator standby",
    category: "9 — Fuel & Oil",
    splits: [
      { area: "Boarding House", amount: 1400 },
      { area: "Main House", amount: 600 },
    ],
  },
  {
    id: "EXP-007",
    date: "Jul 24, 2026",
    description: "Bookkeeping retainer — J. Mercado CPA",
    category: "5 — Professional Fees",
    splits: [{ area: "Other", amount: 3500 }],
  },
  {
    id: "EXP-008",
    date: "Jul 28, 2026",
    description: "OR #9912 — Cleaning & office supplies",
    category: "1 — Supplies",
    splits: [
      { area: "Boarding House", amount: 1250 },
      { area: "Main House", amount: 700 },
    ],
  },
]);

export const TECHNICIANS = [
  "Unassigned",
  "Mang Ruel (Plumbing)",
  "Kuya Dante (Electrical)",
  "Jerome Mercado (Carpentry)",
  "Aircon Pro Tanauan",
];

export const maintenanceTickets = reactive<MaintenanceTicket[]>([
  {
    id: "TCK-1042",
    unit: "2F",
    title: "Burst water line under lavatory",
    category: "Plumbing",
    priority: "Emergency",
    reported: "Aug 18, 2026",
    description: "Water is spraying from the joint under the lavatory and flooding the hallway of the 2nd floor. Main valve temporarily closed by Michelle.",
    technician: "Mang Ruel (Plumbing)",
    status: "In Progress",
    photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "TCK-1041",
    unit: "F2B",
    title: "Bedroom outlet sparks when plugged",
    category: "Electrical",
    priority: "High",
    reported: "Aug 17, 2026",
    description: "Outlet beside the bed sparks and smells burnt. Tenant stopped using it.",
    technician: "Kuya Dante (Electrical)",
    status: "Open",
    photo: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "TCK-1038",
    unit: "3C",
    title: "Door hinge loose, does not lock",
    category: "Carpentry",
    priority: "Medium",
    reported: "Aug 12, 2026",
    description: "Upper hinge screws stripped; door sags and the deadbolt no longer aligns.",
    technician: "Jerome Mercado (Carpentry)",
    status: "Resolved",
    photo: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "TCK-1035",
    unit: "B2F",
    title: "Aircon not cooling, drips water",
    category: "Appliances",
    priority: "Low",
    reported: "Aug 09, 2026",
    description: "Split-type unit drips into the living area and barely cools after 30 minutes.",
    technician: "Aircon Pro Tanauan",
    status: "Resolved",
    photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
  },
]);

export const inquiries = reactive<Inquiry[]>([
  {
    id: "INQ-301",
    name: "Gabriel Fernandez",
    unit: "3E",
    phone: "0917-482-1190",
    email: "gab.fernandez@gmail.com",
    date: "Aug 20, 2026",
    message: "Good day po! Available pa po ba ang Room 3e this September? Two kami mag-share, both working sa Tanauan. Pwede po bang mag-viewing this Saturday?",
  },
  {
    id: "INQ-300",
    name: "Maria Santos",
    unit: "PH",
    phone: "0928-771-3345",
    email: "maria.santos@yahoo.com",
    date: "Aug 19, 2026",
    message: "Hello, interested po ako sa Penthouse for our family of 4. May parking po ba at magkano ang deposit requirement?",
  },
  {
    id: "INQ-298",
    name: "Jerome Mercado",
    unit: "B1F",
    phone: "0917-220-6612",
    email: "jerome.mercado@outlook.com",
    date: "Aug 17, 2026",
    message: "Magandang umaga. Ask ko lang po kung kasama na ang tubig sa Back Apartment rate, at kung allowed po ang motorcycle parking.",
  },
]);

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
  gcash: "0917-123-4567",
  property: "Fe Galang Da Silva Boarding House",
  address: "Brgy. Sambat, Tanauan City, Batangas",
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
