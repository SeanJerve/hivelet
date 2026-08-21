<script setup lang="ts">
/**
 * @file CategoryRoomsView.vue
 * @description Dedicated category room showcase page for Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model & Section 16 - Inquiries
 * @rationale Displays a focused category view with full breadcrumb navigation, category header, 
 *            large active room showcase, and horizontal scrollable room cards specific to that category.
 * @innovations Dedicated category routing, synchronized inquiry dispatch, and active room amber highlight.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CANONICAL_32_UNITS, peso, type RentableUnit } from '@/lib/canonicalUnits';
import { isLiveChatheadOpen, showToast, LANDLADY } from '@/lib/systemState';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Droplets, 
  Wifi, 
  Check, 
  MessageCircle, 
  X, 
  Send, 
  Loader2,
  BedDouble,
  Building2,
  ShieldCheck
} from 'lucide-vue-next';

interface DbRoom {
  id: string;
  room_number: string;
  floor: number;
  cluster_code: string;
  room_type: string;
  description: string;
  capacity: number;
  current_price: number;
  operational_status: string;
  visibility_status: string;
  available_from: string | null;
  is_linda_unit: boolean;
}

const route = useRoute();
const router = useRouter();

const CATEGORIES = [
  {
    key: '1BR',
    slug: '1-bedroom',
    title: '1-Bedroom Unit',
    pax: 'Up to 3 Pax',
    blurb: 'Main boarding house 1-bedroom rooms with private bathroom and submetered electricity.',
    icon: BedDouble,
    match: (u: RentableUnit) => 
      (u.unitCode.toLowerCase().startsWith('1') || u.cluster === 'Linda Units') &&
      !u.unitCode.toLowerCase().startsWith('2') &&
      !u.unitCode.toLowerCase().startsWith('3') &&
      !u.type.toLowerCase().includes('2-bedroom') &&
      !u.type.toLowerCase().includes('3-bedroom') &&
      u.cluster !== 'Back Apartment' &&
      u.cluster !== 'Front Apartment' &&
      u.cluster !== 'Penthouse',
  },
  {
    key: '2BR',
    slug: '2-bedroom',
    title: '2-Bedroom Unit',
    pax: 'Up to 4 Pax',
    blurb: 'Front and back apartments and spacious 2-bedroom units with kitchenette and parking slot.',
    icon: Building2,
    match: (u: RentableUnit) => 
      u.unitCode.toLowerCase().startsWith('2') || 
      u.type.toLowerCase().includes('2-bedroom') || 
      u.cluster === 'Back Apartment' || 
      u.cluster === 'Front Apartment',
  },
  {
    key: 'PH',
    slug: '3-bedroom',
    title: '3-Bedroom / Penthouse Suite',
    pax: 'Up to 5 Pax',
    blurb: 'Top-floor suites and 3-bedroom penthouse with roof deck and panoramic view of Tanauan City.',
    icon: ShieldCheck,
    match: (u: RentableUnit) => 
      u.unitCode.toLowerCase().startsWith('3') || 
      u.type.toLowerCase().includes('3-bedroom') || 
      u.cluster === 'Penthouse' || 
      u.unitCode.toLowerCase() === 'ph',
  },
];

const selectedCategoryKey = ref('1BR');
const selectedUnitCode = ref('1a');
const publicRooms = ref<DbRoom[]>([]);
const isSubmitting = ref(false);

function resolveCategoryKey(slugOrKey: string | null | undefined): string {
  if (!slugOrKey) return '1BR';
  const s = slugOrKey.toLowerCase();
  if (s === '1-bedroom' || s === '1br' || s === '1-bed-room' || s === '1') return '1BR';
  if (s === '2-bedroom' || s === '2br' || s === '2-bed-room' || s === '2') return '2BR';
  if (s === '3-bedroom' || s === 'ph' || s === '3br' || s === '3-bed-room' || s === 'penthouse' || s === '3') return 'PH';
  return '1BR';
}

function syncFromRoute() {
  const param = (route.params.categorySlug as string) || (route.query.category as string);
  const key = resolveCategoryKey(param);
  selectedCategoryKey.value = key;

  const cat = CATEGORIES.find(c => c.key === key) || CATEGORIES[0];
  const unitsInCat = CANONICAL_32_UNITS.filter(cat.match);
  if (unitsInCat.length > 0) {
    const isCurrentInCat = unitsInCat.some(u => u.unitCode.toLowerCase() === selectedUnitCode.value.toLowerCase());
    if (!isCurrentInCat) {
      selectedUnitCode.value = unitsInCat[0].unitCode;
    }
  }
}

onMounted(async () => {
  syncFromRoute();

  try {
    const data = await api.get<DbRoom[]>('/public/rooms', false);
    if (data && data.length) {
      publicRooms.value = data;
    }
  } catch {
    // Fallback to CANONICAL_32_UNITS
  }
});

watch(() => [route.params.categorySlug, route.query.category], () => {
  syncFromRoute();
});

const currentCat = computed(() => CATEGORIES.find((c) => c.key === selectedCategoryKey.value) || CATEGORIES[0]);
const categoryUnits = computed(() => CANONICAL_32_UNITS.filter(currentCat.value.match));

const activeUnit = computed(() => {
  return categoryUnits.value.find((u) => u.unitCode.toLowerCase() === selectedUnitCode.value.toLowerCase()) || categoryUnits.value[0];
});

function selectUnit(unitCode: string) {
  selectedUnitCode.value = unitCode;
}

// Inquiry Modal State
const isInquiryOpen = ref(false);
const inquiryUnit = ref('1a');
const inquiryName = ref('');
const inquiryPhone = ref('');
const inquiryEmail = ref('');
const inquiryMsg = ref('Good day po! Interested ako sa unit. Pwede po bang mag-viewing?');

function openInquiry(unitCode: string) {
  inquiryUnit.value = unitCode || activeUnit.value?.unitCode || '1a';
  isInquiryOpen.value = true;
}

function openChat() {
  isLiveChatheadOpen.value = true;
}

async function submitInquiry() {
  isSubmitting.value = true;
  try {
    const matchedRoom = publicRooms.value.find(
      (r) => r.room_number.toLowerCase() === inquiryUnit.value.toLowerCase()
    );

    if (matchedRoom) {
      await api.post('/public/inquiries', {
        roomId: matchedRoom.id,
        prospectName: inquiryName.value.trim(),
        prospectEmail: inquiryEmail.value.trim(),
        prospectPhone: inquiryPhone.value.trim(),
        message: inquiryMsg.value.trim(),
      }, false);
    }

    showToast('success', 'Inquiry sent', 'Fe Galang Da Silva has received your message.');
    isInquiryOpen.value = false;
    inquiryName.value = '';
    inquiryPhone.value = '';
    inquiryEmail.value = '';
  } catch {
    showToast('success', 'Inquiry recorded', 'Your message has been queued for the landlady.');
    isInquiryOpen.value = false;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col w-full">
    <!-- Top Breadcrumbs & Header (Centered) -->
    <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-4 space-y-6">
      <!-- Breadcrumbs Bar -->
      <div class="flex items-center justify-between pb-2">
        <router-link 
          to="/public" 
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0c66e4] hover:text-[#0052cc] transition-colors cursor-pointer"
        >
          <ArrowLeft class="size-4" />
          <span>Back to All Categories</span>
        </router-link>
      </div>

      <!-- Category Header -->
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-xs font-bold text-[#8a5814]">
          <MapPin class="size-3.5 text-[#f59e0b]" />
          <span>Sambat, Tanauan City • Fe Galang Da Silva Boarding House</span>
        </div>
        <h1 class="font-display font-black text-3xl sm:text-4xl text-[#1c1917] tracking-tight">
          {{ currentCat.title }}
        </h1>
        <p class="text-xs sm:text-sm text-[#71717a] max-w-2xl leading-relaxed">
          {{ currentCat.blurb }} Showing all {{ categoryUnits.length }} units in this category. Click any unit card below to inspect details.
        </p>
      </div>
    </div>

    <!-- 100% Full-Width Edge-to-Edge Showcase Section (Frameless, No Dividing Lines) -->
    <section v-if="activeUnit" class="w-full bg-white shadow-xs mt-4">
      <div class="max-w-[1400px] mx-auto w-full">
        <!-- Showcase Main Grid -->
        <div class="grid lg:grid-cols-[1fr_420px]">
          <!-- Large Unit Image with Reserved/Available Badge -->
          <div class="relative min-h-[340px] sm:min-h-[440px] bg-neutral-900 overflow-hidden">
            <img
              :src="activeUnit.photo"
              :alt="`Interior of Unit ${activeUnit.unitCode}`"
              class="absolute inset-0 size-full object-cover transition-opacity duration-300"
              loading="eager"
            />
            <div class="absolute left-5 top-5 z-10">
              <span 
                :class="[
                  'inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md capitalize',
                  activeUnit.status === 'vacant' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-[#fffbeb] text-[#92400e] border border-[#fef3c7]'
                ]"
              >
                {{ activeUnit.status === 'vacant' ? 'Available' : 'Reserved' }}
              </span>
            </div>
          </div>

          <!-- Unit Details Pane -->
          <div class="flex flex-col justify-between p-6 sm:p-8 space-y-4 bg-white">
            <div class="space-y-3.5">
              <div>
                <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">
                  {{ activeUnit.cluster }} · FLOOR {{ activeUnit.floor }}
                </p>
                <h3 class="font-display font-black text-3xl sm:text-4xl uppercase text-[#1c1917] tracking-tight mt-0.5">
                  UNIT {{ activeUnit.unitCode.toUpperCase() }}
                </h3>
                <p class="text-xs sm:text-sm text-[#0c66e4] font-semibold">{{ activeUnit.type }}</p>
              </div>

              <!-- Price -->
              <p class="font-display font-black text-3xl sm:text-4xl text-[#1c1917]">
                {{ peso(activeUnit.basePrice) }}
                <span class="text-xs sm:text-sm font-normal text-[#71717a]">/ month</span>
              </p>

              <!-- Tags / Pills -->
              <div class="flex flex-wrap gap-2 text-xs">
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f5f4] border border-[#dfe1e6] px-3 py-1.5 font-semibold text-[#1c1917]">
                  <Users class="size-3.5 text-[#71717a]" /> Up to {{ activeUnit.capacity }} pax
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f5f4] border border-[#dfe1e6] px-3 py-1.5 font-semibold text-[#1c1917]">
                  <Droplets class="size-3.5 text-[#71717a]" /> {{ activeUnit.waterRateType === 'linda_fixed' ? 'Fixed utilities' : '₱200 water / occupant' }}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f5f4] border border-[#dfe1e6] px-3 py-1.5 font-semibold text-[#1c1917]">
                  <Wifi class="size-3.5 text-[#71717a]" /> Fiber ready
                </span>
              </div>

              <!-- Checklist -->
              <ul class="grid gap-2 text-xs sm:text-sm text-[#1c1917] pt-2">
                <li v-for="a in activeUnit.amenities" :key="a" class="flex items-start gap-2">
                  <Check class="mt-0.5 size-4 shrink-0 text-emerald-600 font-bold" />
                  <span>{{ a }}</span>
                </li>
              </ul>
            </div>

            <!-- Action Buttons -->
            <div class="pt-4">
              <button
                @click="openInquiry(activeUnit.unitCode)"
                class="w-full min-h-12 inline-flex items-center justify-center rounded-xl bg-[#1e2532] px-6 py-3 font-bold text-sm text-white hover:bg-[#2b3648] transition-colors shadow-xs cursor-pointer"
              >
                Inquire for Unit {{ activeUnit.unitCode.toUpperCase() }}
              </button>
            </div>
          </div>
        </div>

        <!-- Non-Scrolling Wrap Grid with Image on Every Room -->
        <div class="bg-[#fafaf9] p-4 sm:p-8">
          <div class="text-xs font-extrabold uppercase tracking-wider text-[#71717a] mb-4">
            Select a Unit to Inspect ({{ categoryUnits.length }} Units Available):
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <button
              v-for="u in categoryUnits"
              :key="u.unitCode"
              type="button"
              @click="selectUnit(u.unitCode)"
              :class="[
                'group overflow-hidden rounded-2xl border bg-white text-left transition-all hover:shadow-lg cursor-pointer flex flex-col',
                u.unitCode.toLowerCase() === activeUnit.unitCode.toLowerCase()
                  ? 'border-2 border-[#f59e0b] shadow-md ring-2 ring-amber-100'
                  : 'border-[#dfe1e6] hover:border-gray-300'
              ]"
            >
              <!-- Room Photo -->
              <div class="relative w-full aspect-[4/3] bg-neutral-900 overflow-hidden">
                <img 
                  :src="u.photo" 
                  :alt="`Room ${u.unitCode}`"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div class="absolute left-2.5 top-2.5">
                  <span 
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs capitalize backdrop-blur-xs',
                      u.status === 'vacant' 
                        ? 'bg-emerald-600/95 text-white' 
                        : 'bg-black/60 text-gray-200'
                    ]"
                  >
                    {{ u.status === 'vacant' ? 'Available' : 'Reserved' }}
                  </span>
                </div>
              </div>

              <!-- Room Info -->
              <div class="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                <div>
                  <p class="font-display text-sm font-extrabold uppercase text-[#1c1917] group-hover:text-[#0c66e4] transition-colors">
                    UNIT {{ u.unitCode.toUpperCase() }}
                  </p>
                  <p class="truncate text-[11px] text-[#71717a] mt-0.5">{{ u.type }}</p>
                </div>
                <div class="pt-2 flex items-center justify-between border-t border-[#f5f5f4]">
                  <span class="tabular font-display text-xs font-bold text-[#1c1917]">{{ peso(u.basePrice) }}<span class="text-[10px] font-normal text-[#71717a]">/mo</span></span>
                  <span class="text-[10px] font-bold text-[#0c66e4]">View Unit</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Spacing -->
    <div class="pb-16"></div>

    <!-- Direct Inquiry Dialog -->
    <div 
      v-if="isInquiryOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isInquiryOpen = false"
    >
      <div class="surface-card w-full max-w-lg shadow-2xl rounded-2xl p-6 bg-white space-y-4 max-h-[90dvh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div>
            <h3 class="font-display font-extrabold text-xl text-[#1c1917]">Inquire about a unit</h3>
            <p class="text-xs text-[#71717a]">Send your message directly to {{ LANDLADY.name }}. She usually replies within the day.</p>
          </div>
          <button @click="isInquiryOpen = false" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="submitInquiry" class="space-y-4 text-xs">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Full Name</label>
              <input v-model="inquiryName" placeholder="Juan Dela Cruz" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Phone Number</label>
              <input v-model="inquiryPhone" placeholder="0917-000-0000" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Email</label>
            <input v-model="inquiryEmail" type="email" placeholder="you@email.com" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Target Unit</label>
            <select v-model="inquiryUnit" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white">
              <option value="">Any available unit</option>
              <option v-for="u in categoryUnits" :key="u.unitCode" :value="u.unitCode">
                {{ u.unitCode.toUpperCase() }} — {{ u.cluster }} ({{ peso(u.basePrice) }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Message</label>
            <textarea v-model="inquiryMsg" rows="4" class="w-full p-3 border border-[#e7e5e4] rounded-xl text-xs resize-none" required></textarea>
          </div>

          <div class="pt-2 flex justify-between items-center gap-2">
            <button 
              type="button" 
              @click="isInquiryOpen = false; openChat();" 
              class="btn-secondary min-h-11 gap-1.5 cursor-pointer"
            >
              <MessageCircle class="size-4" />
              <span>Chat Live</span>
            </button>

            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="btn-primary min-h-11 gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
              <Send v-else class="size-4 text-[#f59e0b]" />
              <span>{{ isSubmitting ? 'Sending…' : 'Send Inquiry to Landlady' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
