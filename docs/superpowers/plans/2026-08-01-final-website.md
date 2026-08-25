# Final Web Application Implementation Plan (`website/`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone production web application in the `website/` directory combining Horizon Staycation landing aesthetics, Donezo clean corporate dashboard UIs, TripGlide/Hilya mobile bottom pill navigation, and an animated splash loading screen, backed by the 32 Canonical Units data store.

**Architecture:** Build a Vue 3 + TypeScript + Vite + TailwindCSS v4 SPA in `website/` containing responsive landing, dashboard, and mobile layouts, connected to centralized system state and capstone business logic.

**Tech Stack:** Vue 3 (Composition API / `<script setup>`), TypeScript, Vite, TailwindCSS v4, Lucide-Vue Icons, Vue Router.

---

### File Structure Map (`website/`)
- `website/package.json` — Project dependencies and build scripts
- `website/vite.config.ts` — Vite build configuration & path alias `@`
- `website/tsconfig.json` — TypeScript compiler configuration
- `website/index.html` — Main HTML entry with Google Fonts (Inter, Outfit)
- `website/src/index.css` — Custom design system tokens & Tailwind CSS imports
- `website/src/main.ts` — Vue app initialization
- `website/src/App.vue` — Main root application container mounting LoadingScreen, Navbar, Viewport, MobilePillNavbar, Modals, and Footer
- `website/src/lib/canonicalUnits.ts` — 32 canonical rentable units catalog across 5 property clusters
- `website/src/lib/systemState.ts` — Centralized reactive state store
- `website/src/components/common/LoadingScreen.vue` — Animated splash screen
- `website/src/components/layout/AppNavbar.vue` — Horizon dark/light top header with role switcher bar
- `website/src/components/layout/MobilePillNavbar.vue` — Floating bottom pill navbar for mobile screens
- `website/src/components/layout/AppFooter.vue` — Horizon-inspired dark footer
- `website/src/components/modals/RoomDetailModal.vue` — Room specifications modal
- `website/src/components/modals/AdminEditUnitModal.vue` — Admin room specs & photo edit modal
- `website/src/components/modals/TicketHoverModal.vue` — Maintenance ticket diagonal expand modal
- `website/src/components/modals/LiveChatheadModal.vue` — Floating live chathead inbox widget
- `website/src/components/modals/OnsitePaymentModal.vue` — Cash payment recorder modal
- `website/src/components/modals/TenantLoginModal.vue` — Tenant portal entry modal
- `website/src/components/modals/GuestEntryModal.vue` — Guest visitor entry modal
- `website/src/views/PublicLandingView.vue` — Horizon-inspired public landing page
- `website/src/views/AdminDashboardView.vue` — Donezo-inspired executive dashboard
- `website/src/views/TenantPortalView.vue` — Active tenant workspace
- `website/src/views/InquiriesView.vue` — Inquiry inbox management
- `website/src/views/SystemSettingsView.vue` — Business rules configuration
- `website/src/router/index.ts` — Vue Router configuration

---

### Task 1: Project Setup & Package Configuration

**Files:**
- Create: `website/package.json`
- Create: `website/vite.config.ts`
- Create: `website/tsconfig.json`
- Create: `website/index.html`
- Create: `website/src/index.css`
- Create: `website/src/main.ts`

- [ ] **Step 1: Create package.json and config files in website/**

Create `website/package.json`:
```json
{
  "name": "hivelet-website",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-vue-next": "^0.344.0",
    "vue": "^3.4.21",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-vue": "^5.0.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.2.2",
    "vite": "^5.1.6",
    "vue-tsc": "^2.0.6"
  }
}
```

Create `website/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
});
```

Create `website/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

Create `website/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hivelet — Fe Galang Da Silva Boarding House</title>
  <meta name="description" content="Discover affordable studio, 1-bedroom, 2-bedroom, and penthouse boarding house units at Fe Galang Da Silva Boarding House.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-[#f4f5f7] text-[#172b4d] font-sans antialiased selection:bg-[#0c66e4] selection:text-white">
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Create `website/src/index.css`:
```css
@import "tailwindcss";

@layer base {
  body {
    font-family: 'Inter', sans-serif;
  }
  h1, h2, h3, h4, .font-display {
    font-family: 'Outfit', sans-serif;
  }
}

.jira-card {
  background-color: #ffffff;
  border: 1px solid #dfe1e6;
  border-radius: 0.375rem;
}

.jira-btn-primary {
  background-color: #0c66e4;
  color: #ffffff;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: background-color 0.15s ease;
}
.jira-btn-primary:hover {
  background-color: #0052cc;
}

.jira-btn-secondary {
  background-color: #f4f5f7;
  color: #172b4d;
  border: 1px solid #dfe1e6;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: background-color 0.15s ease;
}
.jira-btn-secondary:hover {
  background-color: #ebecf0;
}

.jira-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: #f4f5f7;
  border: 1px solid #dfe1e6;
  border-radius: 0.25rem;
  color: #172b4d;
}
.jira-input:focus {
  background-color: #ffffff;
  border-color: #0c66e4;
  outline: none;
}

.jira-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
}
```

Create `website/src/main.ts`:
```typescript
import { createApp } from 'vue';
import './index.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');
```

- [ ] **Step 2: Install dependencies inside website/**

Run: `cd website && npm install`

- [ ] **Step 3: Commit Task 1**

```bash
git add website/
git commit -m "feat: scaffold website directory with Vite, Vue 3, TailwindCSS v4, and Lucide icons"
```

---

### Task 2: Shared Reactive System State Store

**Files:**
- Create: `website/src/lib/canonicalUnits.ts`
- Create: `website/src/lib/systemState.ts`

- [ ] **Step 1: Create canonicalUnits.ts & systemState.ts**

Create `website/src/lib/canonicalUnits.ts`:
```typescript
/**
 * @file lib/canonicalUnits.ts
 * @description 32 Canonical Rentable Units catalog for Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 5 - Property Model & BR-032 (Canonical Unit List)
 */
export interface RentableUnit {
  id: string;
  unitCode: string;
  cluster: 'BH (Main Rooms)' | 'Back Apartment' | 'Penthouse' | 'Front Apartment' | 'Linda';
  floorLabel: string;
  type: string;
  basePrice: number;
  status: 'occupied' | 'available' | 'maintenance' | 'reserved';
  tenantName: string | null;
  occupants: number;
  waterRateType: 'standard' | 'linda_fixed';
}

export const CANONICAL_32_UNITS: RentableUnit[] = [
  { id: 'bh-1a', unitCode: '1a', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'occupied', tenantName: 'Juan Dela Cruz', occupants: 2, waterRateType: 'standard' },
  { id: 'bh-1b', unitCode: '1b', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'occupied', tenantName: 'Maria Santos', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-1c', unitCode: '1c', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '1-Bedroom', basePrice: 6000, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1d', unitCode: '1d', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'occupied', tenantName: 'Pedro Penduko', occupants: 2, waterRateType: 'standard' },
  { id: 'bh-1e', unitCode: '1e', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-1f', unitCode: '1f', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: '2-Bedroom', basePrice: 8000, status: 'occupied', tenantName: 'Ana Reyes', occupants: 3, waterRateType: 'standard' },
  { id: 'bh-1g', unitCode: '1g', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'occupied', tenantName: 'Carlos Ramos', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-1h', unitCode: '1h', cluster: 'BH (Main Rooms)', floorLabel: '1st Floor BH', type: 'Studio', basePrice: 4500, status: 'occupied', tenantName: 'Elena Toribio', occupants: 1, waterRateType: 'standard' },

  { id: 'bh-2a', unitCode: '2a', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'occupied', tenantName: 'Grace Poe', occupants: 2, waterRateType: 'standard' },
  { id: 'bh-2b', unitCode: '2b', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'occupied', tenantName: 'Lito Lapid', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-2c', unitCode: '2c', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'occupied', tenantName: 'Robin Padilla', occupants: 2, waterRateType: 'standard' },
  { id: 'bh-2d', unitCode: '2d', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '1-Bedroom', basePrice: 6200, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-2e', unitCode: '2e', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'occupied', tenantName: 'Joel Villanueva', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-2f', unitCode: '2f', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: 'Studio', basePrice: 4600, status: 'occupied', tenantName: 'Nancy Binay', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-2g', unitCode: '2g', cluster: 'BH (Main Rooms)', floorLabel: '2nd Floor BH', type: '2-Bedroom', basePrice: 8200, status: 'occupied', tenantName: 'Sonny Angara', occupants: 3, waterRateType: 'standard' },

  { id: 'bh-3a', unitCode: '3a', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'occupied', tenantName: 'Risa Hontiveros', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-3b', unitCode: '3b', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'occupied', tenantName: 'Koko Pimentel', occupants: 2, waterRateType: 'standard' },
  { id: 'bh-3c', unitCode: '3c', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'occupied', tenantName: 'Francis Tolentino', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-3d', unitCode: '3d', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'occupied', tenantName: 'Bong Go', occupants: 1, waterRateType: 'standard' },
  { id: 'bh-3e', unitCode: '3e', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'occupied', tenantName: 'Bong Revilla', occupants: 2, waterRateType: 'standard' },
  { id: 'bh-3f', unitCode: '3f', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: 'Studio', basePrice: 4700, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'bh-3g', unitCode: '3g', cluster: 'BH (Main Rooms)', floorLabel: '3rd Floor BH', type: '3-Bedroom', basePrice: 10000, status: 'occupied', tenantName: 'Cynthia Villar', occupants: 4, waterRateType: 'standard' },

  { id: 'back-b1f', unitCode: 'B1F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 1st Flr', type: '1-Bedroom', basePrice: 6500, status: 'occupied', tenantName: 'Mark Villar', occupants: 2, waterRateType: 'standard' },
  { id: 'back-b2f', unitCode: 'B2F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Front', type: '1-Bedroom', basePrice: 6500, status: 'occupied', tenantName: 'Alan Peter Cayetano', occupants: 1, waterRateType: 'standard' },
  { id: 'back-b2b', unitCode: 'B2B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 2nd Flr Back', type: '1-Bedroom', basePrice: 6500, status: 'occupied', tenantName: 'Pia Cayetano', occupants: 2, waterRateType: 'standard' },
  { id: 'back-b3f', unitCode: 'B3F', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Front', type: '1-Bedroom', basePrice: 6800, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },
  { id: 'back-b3b', unitCode: 'B3B', cluster: 'Back Apartment', floorLabel: 'Back Apt - 3rd Flr Back', type: '1-Bedroom', basePrice: 6800, status: 'occupied', tenantName: 'Bam Aquino', occupants: 2, waterRateType: 'standard' },

  { id: 'ph-top', unitCode: 'PH', cluster: 'Penthouse', floorLabel: 'Penthouse Level', type: 'Penthouse Suite', basePrice: 12000, status: 'occupied', tenantName: 'Chiz Escudero', occupants: 3, waterRateType: 'standard' },

  { id: 'front-f1', unitCode: 'F1', cluster: 'Front Apartment', floorLabel: 'Front Apt - 1st Flr', type: '2-Bedroom', basePrice: 8500, status: 'occupied', tenantName: 'Ping Lacson', occupants: 2, waterRateType: 'standard' },
  { id: 'front-f2f', unitCode: 'F2F', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Front', type: '2-Bedroom', basePrice: 8500, status: 'occupied', tenantName: 'Jinggoy Estrada', occupants: 2, waterRateType: 'standard' },
  { id: 'front-f2b', unitCode: 'F2B', cluster: 'Front Apartment', floorLabel: 'Front Apt - 2nd Flr Back', type: '2-Bedroom', basePrice: 8500, status: 'available', tenantName: null, occupants: 0, waterRateType: 'standard' },

  { id: 'linda-lf', unitCode: 'LF', cluster: 'Linda', floorLabel: 'Linda Front', type: 'Special Unit', basePrice: 5000, status: 'occupied', tenantName: 'Gayon', occupants: 2, waterRateType: 'linda_fixed' },
  { id: 'linda-lb', unitCode: 'LB', cluster: 'Linda', floorLabel: 'Linda Back', type: 'Special Unit', basePrice: 4800, status: 'occupied', tenantName: 'Jaye Casia', occupants: 1, waterRateType: 'linda_fixed' }
];

export const PROPERTY_CLUSTERS = [
  'BH (Main Rooms)',
  'Back Apartment',
  'Penthouse',
  'Front Apartment',
  'Linda'
] as const;
```

Create `website/src/lib/systemState.ts`:
```typescript
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
```

- [ ] **Step 2: Commit Task 2**

```bash
git add website/src/lib/
git commit -m "feat: add canonical units and reactive state store to website"
```

---

### Task 3: Splash Loading Screen & Layout Components

**Files:**
- Create: `website/src/components/common/LoadingScreen.vue`
- Create: `website/src/components/layout/AppNavbar.vue`
- Create: `website/src/components/layout/MobilePillNavbar.vue`
- Create: `website/src/components/layout/AppFooter.vue`

- [ ] **Step 1: Create LoadingScreen, AppNavbar, MobilePillNavbar, and AppFooter**

Create `website/src/components/common/LoadingScreen.vue`:
```vue
<!--
  @file components/common/LoadingScreen.vue
  @description Animated splash screen loading gate with live progress counter.
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { isLoadingScreenVisible } from '@/lib/systemState';

const progress = ref(0);

onMounted(() => {
  const interval = setInterval(() => {
    if (progress.value < 100) {
      progress.value += 5;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        isLoadingScreenVisible.value = false;
      }, 300);
    }
  }, 40);
});
</script>

<template>
  <div
    v-if="isLoadingScreenVisible"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#091e42] text-white transition-opacity duration-500"
  >
    <div class="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
      <!-- Animated Hexagon Logo -->
      <div class="relative flex items-center justify-center w-20 h-20 bg-[#0c66e4] rounded-2xl shadow-2xl shadow-blue-500/50 animate-pulse">
        <span class="text-4xl font-extrabold text-white font-mono tracking-tighter">H</span>
      </div>

      <div class="text-center space-y-1">
        <h1 class="text-2xl font-extrabold tracking-wider font-display">HIVELET</h1>
        <p class="text-xs text-slate-400 font-medium">Fe Galang Da Silva Boarding House System</p>
      </div>

      <!-- Micro Progress Bar -->
      <div class="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div class="bg-[#0c66e4] h-full transition-all duration-75" :style="{ width: `${progress}%` }"></div>
      </div>

      <p class="text-xs font-mono text-slate-400">{{ progress }}% Loaded</p>
    </div>
  </div>
</template>
```

Create `website/src/components/layout/AppNavbar.vue`:
```vue
<!--
  @file components/layout/AppNavbar.vue
  @description Horizon dark/light top navigation header with role switcher bar.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { activeRole, isLiveChatheadOpen, activeInquirers } from '@/lib/systemState';
import { Shield, User, Home, MessageSquare } from 'lucide-vue-next';

const router = useRouter();

function switchRole(role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  if (role === 'admin') router.push('/admin');
  else if (role === 'tenant') router.push('/tenant');
  else router.push('/');
}
</script>

<template>
  <header class="h-16 bg-[#091e42] text-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-md">
    <div class="flex items-center gap-3">
      <router-link to="/" class="flex items-center gap-2 font-bold text-lg tracking-tight">
        <span class="w-8 h-8 rounded-lg bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold shadow-md">H</span>
        <span class="font-display">HIVELET</span>
      </router-link>
    </div>

    <!-- Role Switcher Tabs -->
    <div class="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
      <button
        @click="switchRole('guest')"
        :class="['px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all', activeRole === 'guest' ? 'bg-[#0c66e4] text-white shadow-md' : 'text-slate-300 hover:text-white']"
      >
        <Home class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Public</span> Guest
      </button>

      <button
        @click="switchRole('admin')"
        :class="['px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all', activeRole === 'admin' ? 'bg-[#0c66e4] text-white shadow-md' : 'text-slate-300 hover:text-white']"
      >
        <Shield class="w-3.5 h-3.5" /> Landlady <span class="hidden sm:inline">Admin</span>
      </button>

      <button
        @click="switchRole('tenant')"
        :class="['px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all', activeRole === 'tenant' ? 'bg-[#0c66e4] text-white shadow-md' : 'text-slate-300 hover:text-white']"
      >
        <User class="w-3.5 h-3.5" /> Tenant <span class="hidden sm:inline">Portal</span>
      </button>
    </div>

    <!-- Live Chat Inbox Button -->
    <div class="flex items-center gap-2">
      <button @click="isLiveChatheadOpen = !isLiveChatheadOpen" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors">
        <MessageSquare class="w-3.5 h-3.5 text-sky-400" />
        <span class="hidden sm:inline">Live Chat</span>
        <span class="bg-[#0c66e4] text-white font-bold px-1.5 py-0.5 rounded-md text-[10px]">{{ activeInquirers.length }}</span>
      </button>
    </div>
  </header>
</template>
```

Create `website/src/components/layout/MobilePillNavbar.vue`:
```vue
<!--
  @file components/layout/MobilePillNavbar.vue
  @description Floating bottom pill navigation bar for mobile screens (Inspired by Images 4 & 5).
-->
<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { activeRole } from '@/lib/systemState';
import { Home, Building2, CreditCard, Wrench, MessageSquare } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

function navTo(path: string, role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  router.push(path);
}
</script>

<template>
  <div class="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
    <div class="bg-[#091e42]/95 backdrop-blur-md text-white p-2 rounded-full shadow-2xl border border-slate-700 flex items-center justify-around">
      <button
        @click="navTo('/', 'guest')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5', route.path === '/' ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <Home class="w-4 h-4" />
      </button>

      <button
        @click="navTo('/admin', 'admin')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5', route.path.startsWith('/admin') ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <Building2 class="w-4 h-4" />
      </button>

      <button
        @click="navTo('/tenant', 'tenant')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5', route.path.startsWith('/tenant') ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <CreditCard class="w-4 h-4" />
      </button>

      <button
        @click="navTo('/inquiries', 'admin')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5', route.path.startsWith('/inquiries') ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <MessageSquare class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
```

Create `website/src/components/layout/AppFooter.vue`:
```vue
<!--
  @file components/layout/AppFooter.vue
  @description Dark corporate footer inspired by Horizon.
-->
<template>
  <footer class="bg-[#091e42] text-slate-300 pt-12 pb-8 border-t border-slate-800 text-xs">
    <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-white font-bold text-lg">
          <span class="w-7 h-7 rounded-lg bg-[#0c66e4] flex items-center justify-center font-mono font-extrabold text-sm">H</span>
          <span class="font-display">HIVELET</span>
        </div>
        <p class="text-slate-400 leading-relaxed">
          Fe Galang Da Silva Boarding House Management System. 32 canonical rentable units across 5 property clusters in Bulacan.
        </p>
      </div>

      <div>
        <h4 class="font-bold text-white uppercase tracking-wider mb-3">Property Clusters</h4>
        <ul class="space-y-2 text-slate-400">
          <li>BH (Main Rooms - 22 Units)</li>
          <li>Back Apartment (5 Units)</li>
          <li>Penthouse Suite (1 Unit)</li>
          <li>Front Apartment (3 Units)</li>
          <li>Linda Units (2 Units)</li>
        </ul>
      </div>

      <div>
        <h4 class="font-bold text-white uppercase tracking-wider mb-3">Operational Rules</h4>
        <ul class="space-y-2 text-slate-400">
          <li>BR-014: ₱200/head Water Billing</li>
          <li>BR-040: Linda Fixed Rate Exception</li>
          <li>Spec 09: 50% Monthly Revenue Share</li>
          <li>Spec 10: Guided Expense Ledger</li>
        </ul>
      </div>

      <div>
        <h4 class="font-bold text-white uppercase tracking-wider mb-3">Landlady Contact</h4>
        <p class="text-slate-400 leading-relaxed mb-2">Fe Galang Da Silva Boarding House Office, Bulacan</p>
        <p class="text-slate-300 font-mono">Contact: (044) 791-2049</p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 md:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-slate-500 text-[11px]">
      © 2026 Fe Galang Da Silva Boarding House System (Hivelet). All rights reserved.
    </div>
  </footer>
</template>
```

- [ ] **Step 2: Commit Task 3**

```bash
git add website/src/components/common/ website/src/components/layout/
git commit -m "feat: add splash loading screen, Horizon top navbar, mobile bottom pill navbar, and footer"
```

---

### Task 4: Modals & Dialog Components

**Files:**
- Create: `website/src/components/modals/RoomDetailModal.vue`
- Create: `website/src/components/modals/AdminEditUnitModal.vue`
- Create: `website/src/components/modals/TicketHoverModal.vue`
- Create: `website/src/components/modals/LiveChatheadModal.vue`
- Create: `website/src/components/modals/OnsitePaymentModal.vue`
- Create: `website/src/components/modals/TenantLoginModal.vue`
- Create: `website/src/components/modals/GuestEntryModal.vue`

- [ ] **Step 1: Create all modal components in website/src/components/modals/**

*(Copy and adapt modal components from `frontend/` to `website/` using reactive `systemState.ts`)*

- [ ] **Step 2: Commit Task 4**

```bash
git add website/src/components/modals/
git commit -m "feat: add room specs, admin edit, ticket hover, live chat, and payment modals"
```

---

### Task 5: Horizon-Inspired Public Landing Page (`PublicLandingView.vue`)

**Files:**
- Create: `website/src/views/PublicLandingView.vue`

- [ ] **Step 1: Build Horizon Staycation Inspired Public Landing Page**

Create `website/src/views/PublicLandingView.vue`:
```vue
<!--
  @file views/PublicLandingView.vue
  @description High-end public property landing page inspired directly by Horizon Staycation design.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Catalog
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { rooms, openRoomDetail, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { CANONICAL_32_UNITS, PROPERTY_CLUSTERS } from '@/lib/canonicalUnits';
import { Search, Star, Building2, CheckCircle2, ShieldCheck, Banknote, ArrowRight } from 'lucide-vue-next';

const selectedCluster = ref('all');
const search = ref('');

const availableRooms = computed(() => {
  return rooms.filter(r => {
    const isAvailable = r.status === 'available';
    const matchesCluster = selectedCluster.value === 'all' || r.cluster === selectedCluster.value;
    const matchesSearch = search.value === '' || r.unitCode.toLowerCase().includes(search.value.toLowerCase()) || r.type.toLowerCase().includes(search.value.toLowerCase());
    return isAvailable && matchesCluster && matchesSearch;
  });
});

function handleInquire(unitCode: string) {
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div class="space-y-16 pb-16">
    <!-- HERO SECTION (Horizon Inspired) -->
    <section class="relative bg-[#091e42] text-white py-20 px-4 md:px-8 rounded-b-3xl overflow-hidden shadow-2xl">
      <!-- Background Cutout & Overlay -->
      <div class="absolute inset-0 bg-gradient-to-r from-[#091e42] via-[#091e42]/90 to-transparent z-10"></div>
      <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80" alt="Hivelet Boarding House Interior" class="absolute inset-0 w-full h-full object-cover opacity-30" />

      <div class="max-w-7xl mx-auto relative z-20 space-y-8">
        <div class="inline-flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
          <Star class="w-4 h-4 text-amber-400 fill-amber-400" />
          <span class="font-bold">4.9 Stars</span> — <span>Verified Boarding House Stays</span>
        </div>

        <div class="max-w-2xl space-y-4">
          <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight font-display">
            Find Your Best Staycation <br>In Hivelet Stays.
          </h1>
          <p class="text-sm md:text-base text-slate-300 leading-relaxed">
            Explore clean, affordable Studio, 1-Bedroom, 2-Bedroom, and Penthouse units across 5 property clusters in Bulacan. Private bathrooms & transparent sub-metered utilities.
          </p>
        </div>

        <!-- Glassmorphic Search Bar (Horizon Style) -->
        <div class="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-[#172b4d] grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl border border-white/20">
          <div>
            <label class="block text-[11px] font-bold uppercase text-[#5e6c84] mb-1">Location / Cluster</label>
            <select v-model="selectedCluster" class="w-full bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg p-2.5 text-xs font-bold focus:outline-none">
              <option value="all">All 5 Property Clusters</option>
              <option v-for="c in PROPERTY_CLUSTERS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase text-[#5e6c84] mb-1">Search Unit</label>
            <div class="relative">
              <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5e6c84]" />
              <input v-model="search" type="text" placeholder="Unit code (1a, B1F, PH)" class="w-full bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg pl-8 pr-2.5 py-2.5 text-xs font-bold focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase text-[#5e6c84] mb-1">Water Billing Rule</label>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-bold">
              ₱200 / head per month
            </div>
          </div>

          <div class="flex items-end">
            <button class="jira-btn-primary w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs">
              <span>Filter Units</span> <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- DISCOVER PROPERTY CLUSTERS -->
    <section class="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-[#172b4d] font-display">Discover Your Destination</h2>
        <p class="text-xs text-[#5e6c84]">Explore our 5 canonical property clusters designed for students and working professionals.</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div v-for="cluster in PROPERTY_CLUSTERS" :key="cluster" class="jira-card p-4 hover:shadow-lg transition-all cursor-pointer group space-y-2">
          <div class="w-10 h-10 rounded-lg bg-blue-50 text-[#0c66e4] flex items-center justify-center group-hover:bg-[#0c66e4] group-hover:text-white transition-colors">
            <Building2 class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-xs text-[#172b4d]">{{ cluster }}</h3>
          <p class="text-[10px] text-[#5e6c84]">Canonical Rentable Space</p>
        </div>
      </div>
    </section>

    <!-- AVAILABLE UNITS SHOWCASE GRID -->
    <section class="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-2xl font-bold text-[#172b4d] font-display">Available Units in Bulacan</h2>
          <p class="text-xs text-[#5e6c84]">Verified units ready for immediate leasing.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="room in availableRooms" :key="room.id" class="jira-card overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between">
          <div class="h-44 bg-slate-200 relative overflow-hidden">
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Unit Photo" class="w-full h-full object-cover" />
            <span class="absolute top-3 right-3 bg-emerald-600 text-white font-bold text-[10px] px-2 py-1 rounded-full uppercase">Available</span>
          </div>

          <div class="p-5 space-y-3">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-lg text-[#172b4d] font-display">Unit {{ room.unitCode }}</h3>
              <span class="text-xs font-semibold text-[#0c66e4] bg-blue-50 px-2 py-0.5 rounded-md">{{ room.type }}</span>
            </div>
            <p class="text-xs text-[#5e6c84] leading-relaxed">{{ room.desc }}</p>

            <div class="border-t border-[#dfe1e6] pt-3 flex justify-between items-center">
              <div>
                <p class="text-[10px] text-[#5e6c84] uppercase font-bold">Monthly Base Rent</p>
                <p class="text-lg font-bold text-[#172b4d]">₱{{ room.price.toLocaleString() }} <span class="text-xs font-normal text-[#5e6c84]">/ mo</span></p>
              </div>

              <button @click="handleInquire(room.unitCode)" class="jira-btn-primary text-xs">
                Inquire Unit
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 2: Commit Task 5**

```bash
git add website/src/views/PublicLandingView.vue
git commit -m "feat: implement Horizon-inspired public landing page"
```

---

### Task 6: Donezo-Inspired Admin Dashboard & Portals

**Files:**
- Create: `website/src/views/AdminDashboardView.vue`
- Create: `website/src/views/TenantPortalView.vue`
- Create: `website/src/views/InquiriesView.vue`
- Create: `website/src/views/SystemSettingsView.vue`

- [ ] **Step 1: Build Donezo-inspired Admin Dashboard & Portals**

Create `website/src/views/AdminDashboardView.vue`:
```vue
<!--
  @file views/AdminDashboardView.vue
  @description Donezo-inspired executive dashboard featuring 32-room occupancy matrix across 5 Property Clusters, Spec 09/10 ledgers, and ticket dispatch.
  @systemBibleRef Section 3 & Section 5 - Property Model
-->
<script setup lang="ts">
import { computed } from 'vue';
import { rooms, incomeLedger, expenseLedger, tickets, openRoomDetail, openAdminEditUnit, isOnsitePaymentModalOpen, openTicketHover, resolveTicket } from '@/lib/systemState';
import { Plus, Eye, Edit, Maximize2, CheckCircle, Building2, CreditCard, Receipt, Wrench } from 'lucide-vue-next';

const occupiedCount = computed(() => rooms.filter(r => r.status === 'occupied').length);
const vacantCount = computed(() => rooms.filter(r => r.status === 'available').length);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
    <!-- Header Controls -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[#172b4d] font-display">Executive Dashboard</h1>
        <p class="text-xs text-[#5e6c84]">Donezo-Inspired Management Suite for Fe Galang Da Silva Boarding House</p>
      </div>
      <button @click="isOnsitePaymentModalOpen = true" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] flex items-center gap-1.5">
        <Plus class="w-4 h-4" /> Record Cash Payment
      </button>
    </div>

    <!-- Donezo-Inspired Metric Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Monthly Revenue</p>
        <p class="text-2xl font-extrabold text-[#054e38] mt-1">₱178,500</p>
        <span class="inline-block mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">+₱12,000 vs last month</span>
      </div>

      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Occupancy Rate</p>
        <p class="text-2xl font-extrabold text-[#172b4d] mt-1">{{ occupiedCount }} / 32 <span class="text-xs font-normal">({{ ((occupiedCount / 32) * 100).toFixed(1) }}%)</span></p>
        <p class="text-[10px] text-[#5e6c84] mt-2">{{ vacantCount }} Vacant Units Available</p>
      </div>

      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Pending Verifications</p>
        <p class="text-2xl font-extrabold text-amber-700 mt-1">₱12,400</p>
        <span class="inline-block mt-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">2 GCash Online Payments</span>
      </div>

      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Maintenance Tickets</p>
        <p class="text-2xl font-extrabold text-red-700 mt-1">2 Open</p>
        <span class="inline-block mt-2 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">1 Emergency Ticket</span>
      </div>
    </div>

    <!-- 32-ROOM OCCUPANCY MATRIX (5 PROPERTY CLUSTERS) -->
    <div class="jira-card p-6 space-y-6">
      <div class="flex flex-wrap justify-between items-center gap-2 border-b border-[#dfe1e6] pb-3">
        <h2 class="text-base font-bold text-[#172b4d] font-display flex items-center gap-2">
          <Building2 class="w-5 h-5 text-[#054e38]" />
          <span>32 Canonical Rentable Units (5 Property Clusters)</span>
        </h2>
        <div class="flex items-center gap-3 text-xs text-[#5e6c84]">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500 rounded-2xs"></span> Settled</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-500 rounded-2xs"></span> Pending</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-500 rounded-2xs"></span> Overdue</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-slate-300 rounded-2xs"></span> Vacant</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        <div
          v-for="room in rooms"
          :key="room.id"
          :class="[
            'p-3 border rounded-lg text-xs space-y-1 relative group cursor-pointer transition-all hover:shadow-md',
            room.status === 'occupied' && room.paid ? 'bg-emerald-50 border-emerald-300' :
            room.status === 'pending' ? 'bg-amber-50 border-amber-300' :
            room.status === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-[#f4f5f7] border-[#dfe1e6]'
          ]"
        >
          <div class="flex justify-between items-center font-bold">
            <span>Unit {{ room.unitCode }}</span>
            <span class="text-[9px] text-[#5e6c84]">{{ room.type }}</span>
          </div>
          <p class="text-[10px] text-[#5e6c84] truncate">{{ room.tenant || 'Vacant' }}</p>
          <div class="flex gap-1 pt-1.5 border-t border-[#dfe1e6]">
            <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
            <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit Task 6**

```bash
git add website/src/views/
git commit -m "feat: implement Donezo-inspired admin dashboard and portals"
```

---

### Task 7: Vue Router & App.vue Integration

**Files:**
- Create: `website/src/router/index.ts`
- Modify: `website/src/App.vue`

- [ ] **Step 1: Configure Router & Root App**

Create `website/src/router/index.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router';
import PublicLandingView from '@/views/PublicLandingView.vue';
import AdminDashboardView from '@/views/AdminDashboardView.vue';

const routes = [
  { path: '/', name: 'PublicLanding', component: PublicLandingView },
  { path: '/admin', name: 'AdminDashboard', component: AdminDashboardView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

Update `website/src/App.vue`:
```vue
<script setup lang="ts">
import LoadingScreen from '@/components/common/LoadingScreen.vue';
import AppNavbar from '@/components/layout/AppNavbar.vue';
import MobilePillNavbar from '@/components/layout/MobilePillNavbar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';
import LiveChatheadModal from '@/components/modals/LiveChatheadModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] flex flex-col font-sans antialiased text-[#172b4d] relative pb-16 md:pb-0">
    <LoadingScreen />
    <AppNavbar />
    
    <main class="flex-1">
      <router-view />
    </main>

    <AppFooter />
    <MobilePillNavbar />

    <!-- MODAL MOUNT POINTS -->
    <RoomDetailModal />
    <AdminEditUnitModal />
    <TicketHoverModal />
    <LiveChatheadModal />
    <OnsitePaymentModal />
  </div>
</template>
```

- [ ] **Step 2: Commit Task 7**

```bash
git add website/src/router/ website/src/App.vue
git commit -m "feat: complete router and App.vue root layout integration"
```

---

### Task 8: Production Build Verification

- [ ] **Step 1: Test Production Build**

Run:
```bash
npm --prefix website run build
```
Expected output: `vue-tsc && vite build` completes with 0 errors.

- [ ] **Step 2: Final Git Commit**

```bash
git add .
git commit -m "feat: complete final website application in website/ folder"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-08-01-final-website.md`.

**Two execution options:**
1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach would you like to use?**
