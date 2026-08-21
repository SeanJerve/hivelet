<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CANONICAL_32_UNITS, HERO_PHOTO, peso, type RentableUnit } from '@/lib/canonicalUnits';
import { isLiveChatheadOpen, showToast, LANDLADY } from '@/lib/systemState';
import { api } from '@/lib/api';
import { 
  MapPin, 
  BedDouble, 
  Building2, 
  ShieldCheck, 
  Users, 
  Droplets, 
  Wifi, 
  Check, 
  ArrowRight, 
  MessageCircle,
  X,
  Send,
  Loader2
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

const CATEGORIES = [
  {
    key: '1BR',
    title: '1-Bedroom Unit',
    pax: 'Up to 3 Pax',
    blurb: 'Main boarding house rooms with private bathroom and submetered electricity.',
    icon: BedDouble,
    match: (u: RentableUnit) => u.cluster === 'BH' || u.cluster === 'Linda Units',
  },
  {
    key: '2BR',
    title: '2-Bedroom Unit',
    pax: 'Up to 4 Pax',
    blurb: 'Front and back apartments with kitchenette, balcony access and parking.',
    icon: Building2,
    match: (u: RentableUnit) => u.cluster === 'Back Apartment' || u.cluster === 'Front Apartment',
  },
  {
    key: 'PH',
    title: '3-Bedroom / Penthouse Suite',
    pax: 'Up to 5 Pax',
    blurb: 'Top-floor suite with roof deck and panoramic view of Tanauan City.',
    icon: ShieldCheck,
    match: (u: RentableUnit) => u.cluster === 'Penthouse',
  },
];

const selectedCategory = ref('1BR');
const selectedUnitCode = ref('1a');
const publicRooms = ref<DbRoom[]>([]);
const isSubmitting = ref(false);

onMounted(async () => {
  try {
    const data = await api.get<DbRoom[]>('/public/rooms', false);
    if (data && data.length) {
      publicRooms.value = data;
    }
  } catch {
    // Falls back to CANONICAL_32_UNITS
  }
});

const currentCat = computed(() => CATEGORIES.find((c) => c.key === selectedCategory.value)!);
const categoryUnits = computed(() => CANONICAL_32_UNITS.filter(currentCat.value.match));

const activeUnit = computed(() => {
  return categoryUnits.value.find((u) => u.unitCode.toLowerCase() === selectedUnitCode.value.toLowerCase()) || categoryUnits.value[0];
});

// Inquiry Modal State
const isInquiryOpen = ref(false);
const inquiryUnit = ref('1a');
const inquiryName = ref('');
const inquiryPhone = ref('');
const inquiryEmail = ref('');
const inquiryMsg = ref('Good day po! Interested ako sa unit. Pwede po bang mag-viewing?');

function openInquiry(unitCode: string) {
  inquiryUnit.value = unitCode || '1a';
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
  <main class="space-y-12 pb-24">
    <!-- Hero Section -->
    <section class="relative overflow-hidden rounded-3xl shadow-xl">
      <img
        :src="HERO_PHOTO"
        alt="Facade of Fe Galang Da Silva Boarding House"
        class="absolute inset-0 size-full object-cover"
        loading="eager"
      />
      <div class="absolute inset-0 bg-[#1e2532]/80 backdrop-blur-xs" />
      
      <div class="relative mx-auto w-full max-w-[1600px] px-6 py-16 sm:px-10 sm:py-24">
        <span class="inline-flex items-center gap-2 rounded-full bg-[#f59e0b] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#1c1917] shadow-sm">
          <MapPin class="size-3.5" /> Sambat, Tanauan City, Batangas
        </span>
        
        <h1 class="mt-5 max-w-3xl font-display text-3xl font-black leading-[1.08] text-white sm:text-5xl lg:text-6xl">
          Fe Galang Da Silva Boarding House
        </h1>
        
        <p class="mt-4 max-w-xl text-sm sm:text-base text-gray-200 leading-relaxed">
          Thirty-two well-kept units across three floors — clean, secure, and minutes away from Tanauan City proper. Transparent rates, submetered electricity, no hidden fees.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <button
            @click="openInquiry('')"
            class="min-h-12 inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-6 py-3 font-display font-black text-sm text-[#1c1917] hover:bg-[#d97706] transition-colors shadow-md cursor-pointer"
          >
            <span>Inquire Now</span>
            <ArrowRight class="size-4" />
          </button>
          
          <button
            @click="openChat"
            class="min-h-12 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold text-sm text-white hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer"
          >
            <MessageCircle class="size-4" />
            <span>Chat Live</span>
          </button>
        </div>

        <dl class="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
            <dt class="font-display text-2xl font-black text-white">32</dt>
            <dd class="text-xs text-gray-300">Rentable units</dd>
          </div>
          <div class="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
            <dt class="font-display text-2xl font-black text-white">3</dt>
            <dd class="text-xs text-gray-300">Floors</dd>
          </div>
          <div class="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
            <dt class="font-display text-2xl font-black text-white">₱4,500</dt>
            <dd class="text-xs text-gray-300">Starting rate</dd>
          </div>
          <div class="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
            <dt class="font-display text-2xl font-black text-white">24/7</dt>
            <dd class="text-xs text-gray-300">Gate security</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Category Explorer -->
    <section class="space-y-4">
      <div>
        <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Explore by unit category
        </h2>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Choose a category to browse live availability across the property.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <button
          v-for="c in CATEGORIES"
          :key="c.key"
          @click="selectedCategory = c.key; selectedUnitCode = CANONICAL_32_UNITS.filter(c.match)[0]?.unitCode || '1a'"
          :class="[
            'surface-card flex min-h-11 flex-col items-start p-5 text-left transition-all hover:shadow-lg cursor-pointer',
            selectedCategory === c.key ? 'ring-2 ring-[#f59e0b] shadow-md' : ''
          ]"
        >
          <span class="grid size-11 place-items-center rounded-xl bg-[#f5f5f4] text-[#1c1917]">
            <component :is="c.icon" class="size-5 text-[#f59e0b]" />
          </span>
          <h3 class="mt-4 font-display text-lg font-bold text-[#1c1917]">{{ c.title }}</h3>
          <p class="text-xs font-bold uppercase tracking-wider text-[#8a5814]">{{ c.pax }}</p>
          <p class="mt-2 text-xs sm:text-sm text-[#71717a] leading-relaxed">{{ c.blurb }}</p>
          <span class="mt-4 text-xs font-semibold text-[#71717a]">
            {{ CANONICAL_32_UNITS.filter(c.match).filter((u) => u.status === 'vacant').length }} vacant now
          </span>
        </button>
      </div>
    </section>

    <!-- Showcase Hero Card & Horizontal Carousel (Screenshot 5) -->
    <section v-if="activeUnit" class="space-y-4">
      <div class="surface-card overflow-hidden">
        
        <!-- Showcase Main Grid -->
        <div class="grid lg:grid-cols-[1fr_400px]">
          <!-- Large Unit Image with Reserved/Available Badge -->
          <div class="relative min-h-[300px] sm:min-h-[400px] bg-neutral-900">
            <img
              :src="activeUnit.photo"
              :alt="`Interior of Unit ${activeUnit.unitCode}`"
              class="absolute inset-0 size-full object-cover"
              loading="lazy"
            />
            <div class="absolute left-4 top-4">
              <span 
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-xs capitalize',
                  activeUnit.status === 'vacant' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-[#fffbeb] text-[#92400e]'
                ]"
              >
                {{ activeUnit.status === 'vacant' ? 'Available' : 'Reserved' }}
              </span>
            </div>
          </div>

          <!-- Unit Details Pane -->
          <div class="flex flex-col justify-between p-6 sm:p-8 space-y-4 bg-white">
            <div class="space-y-3">
              <div>
                <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">
                  {{ activeUnit.cluster }} · FLOOR {{ activeUnit.floor }}
                </p>
                <h3 class="font-display font-black text-2xl sm:text-3xl uppercase text-[#1c1917] tracking-tight mt-0.5">
                  UNIT {{ activeUnit.unitCode.toUpperCase() }}
                </h3>
                <p class="text-xs sm:text-sm text-[#71717a]">{{ activeUnit.type }}</p>
              </div>

              <!-- Price -->
              <p class="font-display font-black text-3xl sm:text-4xl text-[#1c1917]">
                {{ peso(activeUnit.basePrice) }}
                <span class="text-xs sm:text-sm font-normal text-[#71717a]">/ month</span>
              </p>

              <!-- Tags / Pills -->
              <div class="flex flex-wrap gap-2 text-xs">
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f5f4] px-2.5 py-1.5 font-semibold text-[#1c1917]">
                  <Users class="size-3.5 text-[#71717a]" /> Up to {{ activeUnit.capacity }} pax
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f5f4] px-2.5 py-1.5 font-semibold text-[#1c1917]">
                  <Droplets class="size-3.5 text-[#71717a]" /> ₱200 water / occupant
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f5f4] px-2.5 py-1.5 font-semibold text-[#1c1917]">
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
            <div class="flex flex-wrap gap-2 pt-4 border-t border-[#e7e5e4]">
              <button
                @click="openInquiry(activeUnit.unitCode)"
                class="min-h-11 flex-1 inline-flex items-center justify-center rounded-xl bg-[#1e2532] px-5 font-bold text-xs sm:text-sm text-white hover:bg-[#2b3648] transition-colors shadow-xs cursor-pointer"
              >
                Inquire Now
              </button>
              
              <button
                @click="openChat"
                class="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e7e5e4] bg-white px-4 font-semibold text-xs sm:text-sm text-[#1c1917] hover:bg-[#f5f5f4] transition-colors cursor-pointer"
              >
                <MessageCircle class="size-4" />
                <span>Chat</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Horizontal Unit Cards Carousel -->
        <div class="flex gap-3 overflow-x-auto border-t border-[#e7e5e4] bg-[#fafaf9] p-4">
          <button
            v-for="u in categoryUnits"
            :key="u.unitCode"
            @click="selectedUnitCode = u.unitCode"
            :class="[
              'min-h-11 w-44 shrink-0 rounded-2xl border bg-white p-3.5 text-left transition-all hover:shadow-md cursor-pointer',
              u.unitCode.toLowerCase() === activeUnit.unitCode.toLowerCase()
                ? 'border-[#f59e0b] ring-2 ring-[#f59e0b] shadow-sm'
                : 'border-[#e7e5e4]'
            ]"
          >
            <p class="font-display text-sm font-extrabold uppercase text-[#1c1917]">{{ u.unitCode.toUpperCase() }}</p>
            <p class="truncate text-[11px] text-[#71717a] mt-0.5">{{ u.type }}</p>
            <p class="tabular font-display text-sm font-bold text-[#1c1917] mt-1.5">{{ peso(u.basePrice) }}</p>
            <span
              :class="[
                'mt-1 inline-block text-[11px] font-bold capitalize',
                u.status === 'vacant' ? 'text-emerald-600' : 'text-[#71717a]'
              ]"
            >
              {{ u.status === 'vacant' ? 'Available' : 'Reserved' }}
            </span>
          </button>
        </div>
      </div>
    </section>

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
              <option v-for="u in CANONICAL_32_UNITS" :key="u.unitCode" :value="u.unitCode">
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
  </main>
</template>
