export type Cluster = "BH" | "Back Apartment" | "Penthouse" | "Front Apartment" | "Linda Units";
/**
 * The states a unit can actually be in.
 *
 * `"overdue"` was a member and nothing in the live system could produce it.
 * `mapOperationalStatus()` maps the four values of `operational_status_type`
 * (Available, Reserved, Occupied, Under Maintenance) onto vacant, pending,
 * settled and maintenance, and never onto overdue. The only source was this
 * file: three canonical rows below carried `status: "vacant"` as seed data -
 * an invented arrears claim about three real units of a real person's property.
 *
 * It never reached a label reading "Overdue". `publicStatusLabel()` in
 * CategoryRoomsView funnels anything unrecognised to "Occupied", and the admin
 * directory reads from `systemState.rooms`, which is replaced wholesale by the
 * API. But a seeded payment status is the thing systemState's own comment warns
 * about - "It deliberately does NOT seed people or money ... invented payment
 * statuses" - and it was one override away from the screen.
 *
 * Wiring a genuine overdue state for a UNIT, as opposed to a bill, means
 * deciding what it should mean: a unit whose tenant has an overdue bill, or
 * something else. That is Mrs. Da Silva's call, not a transcription, so this
 * removes the dead branches rather than inventing behaviour to fill them.
 */
export type UnitStatus = "settled" | "pending" | "vacant" | "maintenance";

/**
 * NOTE: `tenantName` is intentionally blank on every entry.
 *
 * This file used to carry 33 invented residents - Samantha Cruz, Maria Santos,
 * Gabriel Fernandez and so on - and `systemState` seeded the room grid from them,
 * so fabricated people appeared as tenants of a real landlady's units until the
 * API replied, and indefinitely if it failed. The real residents are people like
 * Jaye Casia and the Gayon group, and their names come from the database.
 *
 * What this file legitimately provides is STRUCTURE: the 33 unit codes, their
 * clusters, floors, types and capacities, all verified against the live database.
 * Keep it that way - no people, no money.
 */
export interface RentableUnit {
  id: string;
  unitCode: string;
  cluster: Cluster;
  /** 1-3 are residential floors; 4 is the rooftop penthouse level occupied only by PH. */
  floor: 1 | 2 | 3 | 4;
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

/**
 * No stock photography.
 *
 * These were eight Unsplash images of unrelated apartments, dealt round-robin to
 * the 33 units and shown on the public listing as photographs of this property.
 * Thirty-two of the thirty-three units have no photograph on file; the interface
 * now says so instead of showing someone else's room.
 *
 * A unit's real photographs live in `rooms.room_photos` and arrive from the API.
 * An empty string here means "nothing on file", and every view that renders a
 * unit photo checks for it.
 */
export const PHOTOS: readonly string[] = [];

export const HERO_PHOTO = "";

const BH_AMENITIES = ["Private bathroom", "Submetered electricity", "Ceiling fan", "Study desk", "Wi-Fi ready"];
const APT_AMENITIES = [
  "Private bathroom",
  "Kitchenette",
  "Submetered electricity",
  "Balcony access",
  "Wi-Fi ready",
  "Parking slot",
];

/**
 * The canonical rentable units. THIRTY-THREE of them, across five clusters -
 * BH 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2 - on floors
 * 11 / 11 / 10 / 1.
 *
 * This was named CANONICAL_32_UNITS. The figure 32 comes from
 * docs/01_SYSTEM_BIBLE.md:146 and is wrong; the seed, the live database and the
 * owner's own spreadsheet all hold 33. Errata E-01 and E-02.
 */
export const CANONICAL_UNITS: RentableUnit[] = [
  // 1st Floor BH (1A - 1H)
  { id: "bh-1a", unitCode: "1a", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "Studio Type Apartment", basePrice: 4500, capacity: 2, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1b", unitCode: "1b", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1c", unitCode: "1c", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "1-Bedroom Apartment", basePrice: 5500, capacity: 3, occupants: 3, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1d", unitCode: "1d", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "1-Bedroom Apartment", basePrice: 6000, capacity: 3, occupants: 1, status: "pending", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1e", unitCode: "1e", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "Studio Type Apartment", basePrice: 6500, capacity: 2, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1f", unitCode: "1f", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "1-Bedroom Apartment", basePrice: 4500, capacity: 3, occupants: 3, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1g", unitCode: "1g", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 1, status: "vacant", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-1h", unitCode: "1h", cluster: "BH", floor: 1, floorLabel: "1st Floor", type: "1-Bedroom Apartment", basePrice: 5500, capacity: 3, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },

  // 2nd Floor BH (2A - 2G)
  { id: "bh-2a", unitCode: "2a", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "Studio Type Apartment", basePrice: 6000, capacity: 2, occupants: 0, status: "vacant", tenantName: null, billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-2b", unitCode: "2b", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "1-Bedroom Apartment", basePrice: 6500, capacity: 3, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-2c", unitCode: "2c", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "1-Bedroom Apartment", basePrice: 4500, capacity: 3, occupants: 3, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-2d", unitCode: "2d", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 1, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-2e", unitCode: "2e", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "Studio Type Apartment", basePrice: 5500, capacity: 2, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-2f", unitCode: "2f", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "1-Bedroom Apartment", basePrice: 6000, capacity: 3, occupants: 3, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-2g", unitCode: "2g", cluster: "BH", floor: 2, floorLabel: "2nd Floor", type: "1-Bedroom Apartment", basePrice: 6500, capacity: 3, occupants: 1, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },

  // 3rd Floor BH (3A - 3G)
  { id: "bh-3a", unitCode: "3a", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "Studio Type Apartment", basePrice: 4500, capacity: 2, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-3b", unitCode: "3b", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 3, status: "pending", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-3c", unitCode: "3c", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "1-Bedroom Apartment", basePrice: 5500, capacity: 3, occupants: 1, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-3d", unitCode: "3d", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "1-Bedroom Apartment", basePrice: 6000, capacity: 3, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-3e", unitCode: "3e", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "Studio Type Apartment", basePrice: 6500, capacity: 2, occupants: 3, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-3f", unitCode: "3f", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "1-Bedroom Apartment", basePrice: 4500, capacity: 3, occupants: 1, status: "vacant", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "bh-3g", unitCode: "3g", cluster: "BH", floor: 3, floorLabel: "3rd Floor", type: "1-Bedroom Apartment", basePrice: 5000, capacity: 3, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "standard" },

  // Back Apartment (B1F, B2F, B2B, B3F, B3B)
  { id: "apt-b1f", unitCode: "B1F", cluster: "Back Apartment", floor: 1, floorLabel: "1st Floor", type: "2-Bedroom Apartment", basePrice: 7000, capacity: 4, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "apt-b2f", unitCode: "B2F", cluster: "Back Apartment", floor: 2, floorLabel: "2nd Floor", type: "2-Bedroom Apartment", basePrice: 8000, capacity: 4, occupants: 3, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "apt-b2b", unitCode: "B2B", cluster: "Back Apartment", floor: 2, floorLabel: "2nd Floor", type: "2-Bedroom Apartment", basePrice: 7500, capacity: 4, occupants: 4, status: "pending", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "apt-b3f", unitCode: "B3F", cluster: "Back Apartment", floor: 3, floorLabel: "3rd Floor", type: "2-Bedroom Apartment", basePrice: 9000, capacity: 4, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "apt-b3b", unitCode: "B3B", cluster: "Back Apartment", floor: 3, floorLabel: "3rd Floor", type: "2-Bedroom Apartment", basePrice: 8500, capacity: 4, occupants: 0, status: "vacant", tenantName: null, billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },

  // Penthouse (PH)
  { id: "apt-ph", unitCode: "PH", cluster: "Penthouse", floor: 4, floorLabel: "Penthouse", type: "3-Bedroom Penthouse Suite", basePrice: 12000, capacity: 5, occupants: 4, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: [...APT_AMENITIES, "Roof deck", "Panoramic Tanauan view"], photo: "", waterRateType: "standard" },

  // Front Apartment (F1, F2F, F2B)
  { id: "apt-f1", unitCode: "F1", cluster: "Front Apartment", floor: 3, floorLabel: "3rd Floor", type: "2-Bedroom Apartment", basePrice: 8000, capacity: 4, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "apt-f2f", unitCode: "F2F", cluster: "Front Apartment", floor: 2, floorLabel: "2nd Floor", type: "2-Bedroom Apartment", basePrice: 10000, capacity: 4, occupants: 3, status: "vacant", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },
  { id: "apt-f2b", unitCode: "F2B", cluster: "Front Apartment", floor: 2, floorLabel: "2nd Floor", type: "2-Bedroom Apartment", basePrice: 9000, capacity: 4, occupants: 4, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: APT_AMENITIES, photo: "", waterRateType: "standard" },

  // Linda Units (LF, LB). `billingRule` used to read "Fixed: ₱400/200 water
  // (remitted to Linda)" here - BR-040, retired by the owner 2026-09-20. This
  // is the pre-API placeholder every unit falls back to (see `rooms` in
  // systemState.ts), so it now says exactly what every other row says: the
  // water is per occupant, same as everywhere else. `waterRateType` stays
  // `linda_fixed` - that field only flags which units' money routes to Linda,
  // not the rate, and nothing here reads it to compute a fee.
  { id: "linda-lf", unitCode: "LF", cluster: "Linda Units", floor: 1, floorLabel: "1st Floor", type: "Linda Unit", basePrice: 6500, capacity: 3, occupants: 2, status: "settled", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "linda_fixed" },
  { id: "linda-lb", unitCode: "LB", cluster: "Linda Units", floor: 1, floorLabel: "1st Floor", type: "Linda Unit", basePrice: 5500, capacity: 2, occupants: 1, status: "pending", tenantName: "", billingRule: "Rent + ₱200 / occupant water", amenities: BH_AMENITIES, photo: "", waterRateType: "linda_fixed" },
];

export const CLUSTERS: Cluster[] = [
  "BH",
  "Back Apartment",
  "Penthouse",
  "Front Apartment",
  "Linda Units",
];

/*
 * LINDA_FIXED, WATER_PER_OCCUPANT and GARBAGE_FEE were removed on 2026-09-14.
 *
 * All three were imported by `systemState.ts` and read by nothing, and all three
 * were wrong in a way that only showed up if someone used them:
 *
 *   - LINDA_FIXED carried `electricity: 325` for both units. Migration `017`
 *     retired that charge - the owner confirmed it was a workaround for unmetered
 *     units - so nothing records one for any unit now.
 *   - WATER_PER_OCCUPANT hardcoded the rate that BR-014 exists to make
 *     configurable. It has already been found hardcoded twice elsewhere and
 *     fixed both times; a constant named this, one import away from a view, is
 *     how it would come back a third time.
 *
 * The live figures come from `GET /api/public/rates`, which needs no
 * authentication precisely so the public pages can use it.
 */

/**
 * Whole pesos by default, which suits a summary tile and nothing else. The
 * money columns are `numeric(10,2)`, so a record's OWN amount (a ledger row, a
 * payment, an expense entry) passes `decimals = 2`, or ₱4,955.50 reads as
 * ₱4,956 (B-61). The default stays 0 because changing it would put centavos
 * on every rounded overview figure at once.
 */
export function peso(value: number, decimals = 0) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * How a unit's live status reads to a prospect.
 *
 * Was `status === 'vacant' ? 'Available' : 'Reserved'` in both places this
 * badge is drawn, so an OCCUPIED unit displayed as "Reserved" - verified
 * against the live database: unit 1A is `operational_status = 'Occupied'`,
 * mapped by `mapOperationalStatus()` to `'settled'`, and the badge read
 * "Reserved" regardless. A prospect reads "Reserved" as held, not taken -
 * the wrong signal for a unit that already has a tenant.
 *
 * It lives here, beside the `UnitStatus` union it switches on, because that
 * defect was found in two copies of the same switch. A third copy now has to
 * be a deliberate act rather than the default.
 *
 * `settled` is the default arm on purpose: it is what `mapOperationalStatus`
 * returns for 'Occupied', and the name says nothing about occupancy.
 */
export function publicStatusLabel(status: UnitStatus): string {
  switch (status) {
    case "vacant": return "Available";
    case "pending": return "Reserved";
    case "maintenance": return "Under Maintenance";
    default: return "Occupied";
  }
}
