/**
 * @file canonicalUnits.ts
 * @description Master data structure representing the 32 canonical rentable units of Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 5 - Property Model & BR-032 (Canonical Unit List)
 * @rationale Authoritative unit catalog strictly adhering to Section 2 of 09_MONTHLY_INCOME_REPORT.md.
 *              Eliminates non-authentic 100-series numbers and maps unit codes to their proper property clusters.
 */

export interface RentableUnit {
  id: string;
  unitCode: string; // e.g. '1a', '2f', 'B1F', 'PH', 'F1', 'LF'
  cluster: 'BH (Main Rooms)' | 'Back Apartment' | 'Penthouse' | 'Front Apartment' | 'Linda';
  floorLabel: string;
  type: string;
  basePrice: number;
  status: 'occupied' | 'available' | 'maintenance' | 'reserved';
  tenantName: string | null;
  occupants: number;
  waterRateType: 'standard' | 'linda_fixed'; // BR-014 (₱200/head) vs BR-040 (Linda fixed rate)
}

export const CANONICAL_32_UNITS: RentableUnit[] = [
  // 1. BH (Main Rooms) - 1st Floor (8 units: 1a - 1h)
  { id: 'bh-1a', unitCode: '1a', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1b', unitCode: '1b', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1c', unitCode: '1c', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '1-Bedroom', basePrice: 6000, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1d', unitCode: '1d', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1e', unitCode: '1e', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1f', unitCode: '1f', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '2-Bedroom', basePrice: 8000, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1g', unitCode: '1g', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1h', unitCode: '1h', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  // BH (Main Rooms) - 2nd Floor (7 units: 2a - 2g)
  { id: 'bh-2a', unitCode: '2a', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2b', unitCode: '2b', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2c', unitCode: '2c', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2d', unitCode: '2d', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '1-Bedroom', basePrice: 6200, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2e', unitCode: '2e', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2f', unitCode: '2f', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2g', unitCode: '2g', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '2-Bedroom', basePrice: 8200, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  // BH (Main Rooms) - 3rd Floor (7 units: 3a - 3g)
  { id: 'bh-3a', unitCode: '3a', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3b', unitCode: '3b', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3c', unitCode: '3c', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3d', unitCode: '3d', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3e', unitCode: '3e', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3f', unitCode: '3f', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3g', unitCode: '3g', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: '3-Bedroom', basePrice: 10000, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  // 2. Back Apartment (5 units: B1F, B2F, B2B, B3F, B3B)
  { id: 'back-b1f', unitCode: 'B1F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 1st Flr', type: '1-Bedroom', basePrice: 6500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'back-b2f', unitCode: 'B2F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Front', type: '1-Bedroom', basePrice: 6500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'back-b2b', unitCode: 'B2B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Back', type: '1-Bedroom', basePrice: 6500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'back-b3f', unitCode: 'B3F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Front', type: '1-Bedroom', basePrice: 6800, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'back-b3b', unitCode: 'B3B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Back', type: '1-Bedroom', basePrice: 6800, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  // 3. Penthouse (1 unit: PH)
  { id: 'ph-top', unitCode: 'PH', cluster: 'Penthouse', floorLabel: 'Penthouse Level', type: 'Penthouse Suite', basePrice: 12000, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  // 4. Front Apartment (3 units: F1, F2F, F2B)
  { id: 'front-f1', unitCode: 'F1', cluster: 'Front Apartment', floorLabel: 'Front Apt - 1st Flr', type: '2-Bedroom', basePrice: 8500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'front-f2f', unitCode: 'F2F', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Front', type: '2-Bedroom', basePrice: 8500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'front-f2b', unitCode: 'F2B', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Back', type: '2-Bedroom', basePrice: 8500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  // 5. Linda (2 units: LF, LB) - Special Billing Exception (BR-040)
  { id: 'linda-lf', unitCode: 'LF', cluster: 'Linda', floorLabel: 'Linda Front', type: 'Special Unit', basePrice: 5000, status: 'available', tenantName: null, occupants: 0, waterRateType: 'linda_fixed' },
  { id: 'linda-lb', unitCode: 'LB', cluster: 'Linda', floorLabel: 'Linda Back', type: 'Special Unit', basePrice: 4800, status: 'available', tenantName: null, occupants: 0, waterRateType: 'linda_fixed' }
];

export const PROPERTY_CLUSTERS = [
  'BH (Main Rooms)',
  'Back Apartment',
  'Penthouse',
  'Front Apartment',
  'Linda'
] as const;
