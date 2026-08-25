export type Cluster = "BH" | "Back Apartment" | "Penthouse" | "Front Apartment" | "Linda Units";
export type UnitStatus = "settled" | "pending" | "overdue" | "vacant" | "maintenance";

export interface RentableUnit {
  id: string;
  unitCode: string;
  cluster: Cluster;
  floor: 1 | 2 | 3;
  floorLabel: string;
  type: string;
  basePrice: number;
  capacity: number;
  occupants: number;
  status: UnitStatus;
  tenantName: string | null;
  billingRule: string;
  amenities: string[];
  photo: string;
  waterRateType: "standard" | "linda_fixed";
  desc?: string;
}

export const PHOTOS = [
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=70",
];

export const HERO_PHOTO =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=75";

const BH_AMENITIES = ["Private bathroom", "Submetered electricity", "Ceiling fan", "Study desk", "Wi-Fi ready"];
const APT_AMENITIES = [
  "Private bathroom",
  "Kitchenette",
  "Submetered electricity",
  "Balcony access",
  "Wi-Fi ready",
  "Parking slot",
];

export const CANONICAL_32_UNITS: RentableUnit[] = [
  // 1st Floor BH (1A - 1H)
  { id: "bh-1a", unitCode: "1a", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "Studio Type Apartment", basePrice: 4500, capacity: 2, occupants: 2, status: "settled", tenantName: "Samantha Cruz", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[0], waterRateType: "standard" },
  { id: "bh-1b", unitCode: "1b", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 2, status: "settled", tenantName: "Maria Santos", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[1], waterRateType: "standard" },
  { id: "bh-1c", unitCode: "1c", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "1-Bedroom Apartment", basePrice: 5500, capacity: 3, occupants: 3, status: "settled", tenantName: "Gabriel Fernandez", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[2], waterRateType: "standard" },
  { id: "bh-1d", unitCode: "1d", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "1-Bedroom Apartment", basePrice: 6000, capacity: 3, occupants: 1, status: "pending", tenantName: "Jerome Mercado", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[3], waterRateType: "standard" },
  { id: "bh-1e", unitCode: "1e", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "Studio Type Apartment", basePrice: 6500, capacity: 2, occupants: 2, status: "settled", tenantName: "Michelle Bautista", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[4], waterRateType: "standard" },
  { id: "bh-1f", unitCode: "1f", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "1-Bedroom Apartment", basePrice: 4500, capacity: 3, occupants: 3, status: "settled", tenantName: "Andrea Villanueva", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[5], waterRateType: "standard" },
  { id: "bh-1g", unitCode: "1g", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 1, status: "overdue", tenantName: "Paolo Reyes", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[6], waterRateType: "standard" },
  { id: "bh-1h", unitCode: "1h", cluster: "BH", floor: 1, floorLabel: "Floor 1", type: "1-Bedroom Apartment", basePrice: 5500, capacity: 3, occupants: 2, status: "settled", tenantName: "Katrina Delos Reyes", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[7], waterRateType: "standard" },

  // 2nd Floor BH (2A - 2G)
  { id: "bh-2a", unitCode: "2a", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "Studio Type Apartment", basePrice: 6000, capacity: 2, occupants: 0, status: "vacant", tenantName: null, billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[0], waterRateType: "standard" },
  { id: "bh-2b", unitCode: "2b", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "1-Bedroom Apartment", basePrice: 6500, capacity: 3, occupants: 2, status: "settled", tenantName: "Rafael Aguilar", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[1], waterRateType: "standard" },
  { id: "bh-2c", unitCode: "2c", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "1-Bedroom Apartment", basePrice: 4500, capacity: 3, occupants: 3, status: "settled", tenantName: "Joyce Mangubat", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[2], waterRateType: "standard" },
  { id: "bh-2d", unitCode: "2d", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 1, status: "settled", tenantName: "Dennis Panganiban", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[3], waterRateType: "standard" },
  { id: "bh-2e", unitCode: "2e", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "Studio Type Apartment", basePrice: 5500, capacity: 2, occupants: 2, status: "settled", tenantName: "Liza Marasigan", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[4], waterRateType: "standard" },
  { id: "bh-2f", unitCode: "2f", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "1-Bedroom Apartment", basePrice: 6000, capacity: 3, occupants: 3, status: "settled", tenantName: "Ronnie Castillo", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[5], waterRateType: "standard" },
  { id: "bh-2g", unitCode: "2g", cluster: "BH", floor: 2, floorLabel: "Floor 2", type: "1-Bedroom Apartment", basePrice: 6500, capacity: 3, occupants: 1, status: "settled", tenantName: "Cherry Ann Dimaculangan", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[6], waterRateType: "standard" },

  // 3rd Floor BH (3A - 3G)
  { id: "bh-3a", unitCode: "3a", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "Studio Type Apartment", basePrice: 4500, capacity: 2, occupants: 2, status: "settled", tenantName: "Nico Bayani", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[7], waterRateType: "standard" },
  { id: "bh-3b", unitCode: "3b", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 3, status: "pending", tenantName: "Trisha Gonzales", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[0], waterRateType: "standard" },
  { id: "bh-3c", unitCode: "3c", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "1-Bedroom Apartment", basePrice: 5500, capacity: 3, occupants: 1, status: "settled", tenantName: "Arvin Malabanan", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[1], waterRateType: "standard" },
  { id: "bh-3d", unitCode: "3d", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "1-Bedroom Apartment", basePrice: 6000, capacity: 3, occupants: 2, status: "settled", tenantName: "Grace Hernandez", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[2], waterRateType: "standard" },
  { id: "bh-3e", unitCode: "3e", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "Studio Type Apartment", basePrice: 6500, capacity: 2, occupants: 3, status: "settled", tenantName: "Kevin Alcantara", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[3], waterRateType: "standard" },
  { id: "bh-3f", unitCode: "3f", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "1-Bedroom Apartment", basePrice: 4500, capacity: 3, occupants: 1, status: "overdue", tenantName: "Rowena Silva", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[4], waterRateType: "standard" },
  { id: "bh-3g", unitCode: "3g", cluster: "BH", floor: 3, floorLabel: "Floor 3", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 2, status: "settled", tenantName: "Mark Anthony Lopez", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: PHOTOS[5], waterRateType: "standard" },

  // Back Apartment (B1F, B2F, B2B, B3F, B3B)
  { id: "apt-b1f", unitCode: "B1F", cluster: "Back Apartment", floor: 1, floorLabel: "Floor 1", type: "2-Bedroom Apartment", basePrice: 7000, capacity: 4, occupants: 2, status: "settled", tenantName: "Bea Corpuz", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[2], waterRateType: "standard" },
  { id: "apt-b2f", unitCode: "B2F", cluster: "Back Apartment", floor: 2, floorLabel: "Floor 2", type: "2-Bedroom Apartment", basePrice: 8000, capacity: 4, occupants: 3, status: "settled", tenantName: "Julius Ramirez", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[3], waterRateType: "standard" },
  { id: "apt-b2b", unitCode: "B2B", cluster: "Back Apartment", floor: 2, floorLabel: "Floor 2", type: "2-Bedroom Apartment", basePrice: 7500, capacity: 4, occupants: 4, status: "pending", tenantName: "Diana Rosales", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[4], waterRateType: "standard" },
  { id: "apt-b3f", unitCode: "B3F", cluster: "Back Apartment", floor: 3, floorLabel: "Floor 3", type: "2-Bedroom Apartment", basePrice: 9000, capacity: 4, occupants: 2, status: "settled", tenantName: "Emman Tolentino", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[5], waterRateType: "standard" },
  { id: "apt-b3b", unitCode: "B3B", cluster: "Back Apartment", floor: 3, floorLabel: "Floor 3", type: "2-Bedroom Apartment", basePrice: 8500, capacity: 4, occupants: 0, status: "vacant", tenantName: null, billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[6], waterRateType: "standard" },

  // Penthouse (PH)
  { id: "apt-ph", unitCode: "PH", cluster: "Penthouse", floor: 3, floorLabel: "Floor 3", type: "3-Bedroom Penthouse Suite", basePrice: 12000, capacity: 5, occupants: 4, status: "settled", tenantName: "Precious Landicho", billingRule: "Rent + ₱200 / occupant water", amenities: [...APT_AMENITIES, "Roof deck", "Panoramic Tanauan view"], photo: PHOTOS[3], waterRateType: "standard" },

  // Front Apartment (F1, F2F, F2B)
  { id: "apt-f1", unitCode: "F1", cluster: "Front Apartment", floor: 1, floorLabel: "Floor 1", type: "2-Bedroom Apartment", basePrice: 8000, capacity: 4, occupants: 2, status: "settled", tenantName: "Allan Ilagan", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[5], waterRateType: "standard" },
  { id: "apt-f2f", unitCode: "F2F", cluster: "Front Apartment", floor: 2, floorLabel: "Floor 2", type: "2-Bedroom Apartment", basePrice: 10000, capacity: 4, occupants: 3, status: "overdue", tenantName: "Sofia Manalo", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[6], waterRateType: "standard" },
  { id: "apt-f2b", unitCode: "F2B", cluster: "Front Apartment", floor: 2, floorLabel: "Floor 2", type: "2-Bedroom Apartment", basePrice: 9000, capacity: 4, occupants: 4, status: "settled", tenantName: "Kevin Alcantara", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: PHOTOS[7], waterRateType: "standard" },

  // Linda Units (LF, LB)
  { id: "linda-lf", unitCode: "LF", cluster: "Linda Units", floor: 1, floorLabel: "Floor 1", type: "Linda Front Unit", basePrice: 6500, capacity: 3, occupants: 2, status: "settled", tenantName: "Rowena Silva", billingRule: "Fixed: ₱325 electricity + ₱400 water (remitted to Linda)", amenities: BH_AMENITIES, photo: PHOTOS[6], waterRateType: "linda_fixed" },
  { id: "linda-lb", unitCode: "LB", cluster: "Linda Units", floor: 1, floorLabel: "Floor 1", type: "Linda Back Unit", basePrice: 5500, capacity: 2, occupants: 1, status: "pending", tenantName: "Mark Anthony Lopez", billingRule: "Fixed: ₱325 electricity + ₱200 water (remitted to Linda)", amenities: BH_AMENITIES, photo: PHOTOS[7], waterRateType: "linda_fixed" },
];

export const CLUSTERS: Cluster[] = [
  "BH",
  "Back Apartment",
  "Penthouse",
  "Front Apartment",
  "Linda Units",
];

export const LINDA_FIXED: Record<string, { electricity: number; water: number }> = {
  LF: { electricity: 325, water: 400 },
  LB: { electricity: 325, water: 200 },
};

export const WATER_PER_OCCUPANT = 200;
export const GARBAGE_FEE = 600;

export function peso(value: number, decimals = 0) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
