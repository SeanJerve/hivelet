<script setup lang="ts">
/**
 * @file PublicGuestView.vue
 * @description Public landing and room category overview for Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model & Section 16 - Inquiries
 * @rationale Main landing portal displaying property facade hero, category cards with direct navigation,
 *            property highlights, inline rectangular inquiry form, proximity map, and corporate footer.
 * @innovations Direct category routing, embedded wide rectangular inquiry section, and dark corporate footer.
 */
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CANONICAL_32_UNITS, HERO_PHOTO, type RentableUnit } from '@/lib/canonicalUnits';
import { showToast, LANDLADY, fetchRooms } from '@/lib/systemState';
import { api } from '@/lib/api';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import { 
  MapPin, 
  BedDouble, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Send, 
  Loader2,
  CheckCircle2,
  Wifi,
  Sparkles,
  KeyRound,
  GraduationCap,
  Navigation,
  Footprints,
  Compass,
  ChevronDown,
  HelpCircle
} from 'lucide-vue-next';

const router = useRouter();
const isLoading = ref(true);
const openFaqIndex = ref<number | null>(0);

function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

const FAQS = [
  {
    q: 'How does the monthly water fee work?',
    a: 'Per Fe Galang Da Silva Boarding House policy, water is billed at a fixed standard rate of ₱200 per head/occupant monthly. This is computed dynamically according to the number of registered occupants residing in the unit.'
  },
  {
    q: 'How is electricity metered and billed?',
    a: 'Each of the 32 rentable units is fitted with an individual electric submeter. Readings are recorded on the 25th of every month and billed at actual consumption rate (₱12.50 / kWh).'
  },
  {
    q: 'What payment methods does the boarding house accept?',
    a: 'Tenants can pay online conveniently via GCash through our integrated Adyen payment gateway, or pay directly on-site in cash to Landlady Fe Galang Da Silva.'
  },
  {
    q: 'What are the curfew hours and security policies?',
    a: 'The property has a secure gated perimeter with an evening curfew of 10:00 PM for tenant safety. All registered tenants hold key access for necessary late arrivals or academic schedules.'
  },
  {
    q: 'What are the move-in requirements and advance deposit?',
    a: 'Standard move-in requires 1 month advance rent and 1 month security deposit, a valid government/student ID, and completion of the resident profile registration form.'
  },
  {
    q: 'Are visitors and guests allowed inside the rooms?',
    a: 'Daytime visitors are permitted in designated common receiving areas between 8:00 AM and 8:00 PM. Overnight visitors must be registered with the landlady in advance.'
  }
];

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
    blurb: 'Top-floor suites and 3-bedroom penthouse with roof deck and panoramic view of Legazpi City.',
    icon: ShieldCheck,
    match: (u: RentableUnit) => 
      u.unitCode.toLowerCase().startsWith('3') || 
      u.type.toLowerCase().includes('3-bedroom') || 
      u.cluster === 'Penthouse' || 
      u.unitCode.toLowerCase() === 'ph',
  },
];

function navigateToCategory(slug: string) {
  router.push(`/category/${slug}`);
}

onMounted(async () => {
  try {
    await fetchRooms();
  } finally {
    isLoading.value = false;
  }
});

// Inline Rectangular Inquiry Form State
const inquiryName = ref('');
const inquiryPhone = ref('');
const inquiryEmail = ref('');
const inquiryMsg = ref('Good day po! Interested ako mag-inquire sa boarding house. Pwede po bang mag-viewing?');
const isSubmitting = ref(false);

function scrollToInquiry() {
  document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
}

async function submitInquiry() {
  if (!inquiryName.value.trim() || !inquiryPhone.value.trim()) {
    showToast('error', 'Required Fields', 'Please provide your full name and contact number.');
    return;
  }

  isSubmitting.value = true;
  try {
    const publicRooms = await api.get<any[]>('/public/rooms', false);
    const defaultRoom = publicRooms && publicRooms.length ? publicRooms[0] : null;

    if (!defaultRoom) {
      showToast('error', 'Inquiry Error', 'No active room available for inquiry submission.');
      return;
    }

    await api.post('/public/inquiries', {
      roomId: defaultRoom.id,
      prospectName: inquiryName.value.trim(),
      prospectEmail: inquiryEmail.value.trim() || 'prospect@hivelet.ph',
      prospectPhone: inquiryPhone.value.trim(),
      message: inquiryMsg.value.trim(),
    }, false);

    showToast('success', 'Inquiry Delivered & Saved', 'Your message has been saved to the database and sent to Mrs. Fe Galang Da Silva.');
    inquiryName.value = '';
    inquiryPhone.value = '';
    inquiryEmail.value = '';
  } catch (err: any) {
    showToast('error', 'Inquiry Submission Failed', err.message || 'Could not save inquiry to server database.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col w-full bg-[#f4f5f7]">
    <!-- Academic Clean Property Hero Header Section -->
    <section class="w-full bg-[#1e2532] text-white border-b border-[#334155] shadow-xs">
      <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        <div class="inline-flex items-center gap-2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
          <MapPin class="size-3.5 text-blue-400" />
          <span>32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City</span>
        </div>

        <h1 class="font-display text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Fe Galang Da Silva Boarding House
        </h1>

        <p class="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
          Canonical 32-unit residential boarding house across 3 floors and 5 property clusters. Verified individual electric submeters, ₱200/head monthly water rule, and secure gated perimeter.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <button
            @click="scrollToInquiry"
            class="btn-primary min-h-11 px-6 text-sm"
          >
            <span>Inquire Directly</span>
            <ArrowRight class="size-4 text-white" />
          </button>
          
          <a
            href="#categories"
            class="btn-secondary min-h-11 px-5 text-sm bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <span>Browse Unit Inventory</span>
          </a>
        </div>

        <!-- 4 Key Property Metrics -->
        <div class="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          <div class="rounded-xl bg-white/5 p-3.5 border border-white/10">
            <p class="text-xs text-slate-400 font-bold uppercase">Total Inventory</p>
            <p class="font-display text-2xl font-black text-white mt-1">32 Units</p>
          </div>
          <div class="rounded-xl bg-white/5 p-3.5 border border-white/10">
            <p class="text-xs text-slate-400 font-bold uppercase">Property Floors</p>
            <p class="font-display text-2xl font-black text-white mt-1">3 Floors</p>
          </div>
          <div class="rounded-xl bg-white/5 p-3.5 border border-white/10">
            <p class="text-xs text-slate-400 font-bold uppercase">Starting Base Rate</p>
            <p class="font-display text-2xl font-black text-blue-400 mt-1">₱4,500/mo</p>
          </div>
          <div class="rounded-xl bg-white/5 p-3.5 border border-white/10">
            <p class="text-xs text-slate-400 font-bold uppercase">Water Billing Rule</p>
            <p class="font-display text-2xl font-black text-emerald-400 mt-1">₱200/head</p>
          </div>
        </div>

      </div>
    </section>

    <!-- 1. Category Explorer (Centered) -->
    <div id="categories" class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20">
      <section class="space-y-6">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
            Explore by unit category
          </h2>
          <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
            Choose a category to browse live availability across the property. Click any category below to view all rooms in that category.
          </p>
        </div>

        <div v-if="isLoading" class="grid gap-5 md:grid-cols-3">
          <SkeletonCard variant="category" :count="3" />
        </div>

        <div v-else class="grid gap-5 md:grid-cols-3">
          <div
            v-for="c in CATEGORIES"
            :key="c.key"
            @click="navigateToCategory(c.slug)"
            role="button"
            tabindex="0"
            @keydown.enter="navigateToCategory(c.slug)"
            class="surface-card group flex min-h-11 flex-col items-start p-6 text-left transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer rounded-2xl border border-[#dfe1e6] bg-white relative overflow-hidden"
          >
            <div class="flex items-center justify-between w-full">
              <span class="grid size-12 place-items-center rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 group-hover:bg-[#0c66e4] group-hover:text-white transition-colors">
                <component :is="c.icon" class="size-6" />
              </span>
              <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {{ CANONICAL_32_UNITS.filter(c.match).filter((u) => u.status === 'vacant').length }} Vacant
              </span>
            </div>

            <h3 class="mt-5 font-display text-xl font-extrabold text-[#1c1917] group-hover:text-[#0c66e4] transition-colors">
              {{ c.title }}
            </h3>
            <p class="text-xs font-bold uppercase tracking-wider text-[#8a5814] mt-0.5">{{ c.pax }}</p>
            <p class="mt-2.5 text-xs sm:text-sm text-[#71717a] leading-relaxed flex-1">{{ c.blurb }}</p>
            
            <div class="mt-5 pt-4 border-t border-[#e7e5e4] w-full flex items-center justify-between text-xs">
              <span class="font-semibold text-[#71717a]">
                {{ CANONICAL_32_UNITS.filter(c.match).length }} Total Units
              </span>
              <span class="font-bold text-[#0c66e4] group-hover:text-[#0052cc] flex items-center gap-1.5 transition-colors">
                <span>View All Rooms</span>
                <ArrowRight class="size-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 2. Frequently Asked Questions (FAQ Section) -->
    <section id="faqs" class="w-full bg-white py-16 sm:py-20 shadow-xs scroll-mt-20">
      <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
        <div class="max-w-3xl space-y-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#0c66e4]">
            <HelpCircle class="size-3.5" />
            Frequently Asked Questions
          </span>
          <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
            Boarding House Policies &amp; Guidelines
          </h2>
          <p class="text-xs sm:text-sm text-[#71717a] leading-relaxed">
            Standard operating guidelines, individual utilities submetering, security curfews, and payment methods for Fe Galang Da Silva Boarding House.
          </p>
        </div>

        <div class="grid gap-3.5 max-w-4xl">
          <div 
            v-for="(faq, idx) in FAQS" 
            :key="idx"
            class="surface-card rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] overflow-hidden transition-all"
          >
            <button
              type="button"
              @click="toggleFaq(idx)"
              class="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white transition-colors"
            >
              <span class="font-display font-extrabold text-sm sm:text-base text-[#1c1917]">
                {{ faq.q }}
              </span>
              <span class="size-8 rounded-xl bg-white border border-[#e7e5e4] grid place-items-center shrink-0 text-[#71717a]">
                <ChevronDown :class="['size-4 transition-transform duration-200', openFaqIndex === idx ? 'rotate-180 text-[#0c66e4]' : '']" />
              </span>
            </button>

            <div 
              v-if="openFaqIndex === idx"
              class="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-[#57534e] leading-relaxed border-t border-[#e7e5e4]/60 pt-4 bg-white animate-in fade-in duration-150"
            >
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Rectangular Inquiry Form Section (Centered) -->
    <div id="inquire-now" class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
      <section id="inquiry-form" class="scroll-mt-20">
        <div class="surface-card w-full max-w-5xl mx-auto rounded-3xl border border-[#dfe1e6] bg-white p-8 sm:p-12 shadow-sm space-y-6">
          
          <!-- Header -->
          <div class="space-y-1">
            <h2 class="font-display font-extrabold text-2xl sm:text-3xl text-[#1c1917] tracking-tight">
              Inquire with the Landlady
            </h2>
            <p class="text-xs sm:text-sm text-[#71717a]">
              Send your message directly to {{ LANDLADY.name }}.
            </p>
          </div>

          <!-- Form Fields -->
          <form @submit.prevent="submitInquiry" class="space-y-5 text-xs">
            <!-- Row 1: Full Name & Phone Number -->
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                  FULL NAME
                </label>
                <input 
                  v-model="inquiryName" 
                  type="text" 
                  placeholder="Juan Dela Cruz" 
                  class="min-h-12 w-full px-4 border border-[#dfe1e6] rounded-2xl text-sm bg-white text-[#1c1917] focus:border-[#0c66e4] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" 
                  required 
                />
              </div>

              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                  PHONE NUMBER
                </label>
                <input 
                  v-model="inquiryPhone" 
                  type="tel" 
                  placeholder="0917-000-0000" 
                  class="min-h-12 w-full px-4 border border-[#dfe1e6] rounded-2xl text-sm bg-white text-[#1c1917] focus:border-[#0c66e4] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" 
                  required 
                />
              </div>
            </div>

            <!-- Row 2: Email -->
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                EMAIL
              </label>
              <input 
                v-model="inquiryEmail" 
                type="email" 
                placeholder="you@email.com" 
                class="min-h-12 w-full px-4 border border-[#dfe1e6] rounded-2xl text-sm bg-white text-[#1c1917] focus:border-[#0c66e4] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" 
              />
            </div>

            <!-- Row 3: Message -->
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                MESSAGE
              </label>
              <textarea 
                v-model="inquiryMsg" 
                rows="4" 
                placeholder="Good day po! Interested ako mag-inquire sa boarding house. Pwede po bang mag-viewing?" 
                class="w-full p-4 border border-[#dfe1e6] rounded-2xl text-sm bg-white text-[#1c1917] focus:border-[#0c66e4] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-none leading-relaxed" 
                required
              ></textarea>
            </div>

            <!-- Actions Row -->
            <div class="pt-2 flex justify-end">
              <button 
                type="submit" 
                :disabled="isSubmitting"
                class="btn-primary min-h-12 px-8 text-sm"
              >
                <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
                <Send v-else class="size-4 text-white" />
                <span>{{ isSubmitting ? 'Sending…' : 'Send Inquiry to Landlady' }}</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>

    <!-- 4. Location & Proximity Map Section (100% Full-Width Edge-to-Edge with Top Spacing) -->
    <section id="location" class="w-full bg-white pt-16 sm:pt-20 pb-0 shadow-xs mt-8 sm:mt-12 space-y-8 scroll-mt-20">
      <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#0c66e4]">
          <Compass class="size-3.5" />
          Location & Proximity
        </span>
        <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
          Strategic Location Near Bicol University Main Campus
        </h2>
        <p class="text-xs sm:text-sm text-[#71717a] leading-relaxed max-w-3xl">
          Situated at Galang's Compound with direct, well-paved transit access to Bicol University colleges, student libraries, and nearby convenience hubs.
        </p>
      </div>

      <!-- 100% Full-Width Edge-to-Edge Map Viewport with Interactive SVG Redline Waypoint Overlay -->
      <div class="relative w-full overflow-hidden bg-slate-100 aspect-[16/9] sm:aspect-[24/9]">
        <!-- Base Map Image -->
        <img 
          src="/property-map.png" 
          alt="Map route between Galang's Compound and Bicol University Main Campus" 
          class="w-full h-full object-cover select-none pointer-events-none"
        />

        <!-- SVG Waypoint Route Overlay -->
        <svg 
          viewBox="0 0 1000 425" 
          class="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <!-- Glow filter for redline -->
            <filter id="red-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <!-- Linear Gradient for Route -->
            <linearGradient id="route-gradient" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="#dc2626" />
            </linearGradient>
          </defs>

          <!-- Route Path Background Glow -->
          <path 
            d="M 625 240 L 570 286 L 540 260 L 490 215 L 430 180 L 380 145 L 310 120 L 250 145 L 190 140 L 130 95 L 115 78" 
            fill="none" 
            stroke="#fee2e2" 
            stroke-width="10" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            opacity="0.85"
          />

          <!-- Red Glowing Base Line -->
          <path 
            d="M 625 240 L 570 286 L 540 260 L 490 215 L 430 180 L 380 145 L 310 120 L 250 145 L 190 140 L 130 95 L 115 78" 
            fill="none" 
            stroke="url(#route-gradient)" 
            stroke-width="5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            filter="url(#red-glow)"
          />

          <!-- Animated Dashed Foreground Waypoint Line -->
          <path 
            d="M 625 240 L 570 286 L 540 260 L 490 215 L 430 180 L 380 145 L 310 120 L 250 145 L 190 140 L 130 95 L 115 78" 
            fill="none" 
            stroke="#ffffff" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            stroke-dasharray="8 6"
            class="animate-pulse"
          />

          <!-- Waypoint Origin: Galang's Compound -->
          <g transform="translate(625, 240)">
            <circle r="14" fill="#ef4444" opacity="0.3" class="animate-ping" />
            <circle r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
          </g>

          <!-- Waypoint Destination: Bicol University Main Campus -->
          <g transform="translate(115, 78)">
            <circle r="16" fill="#0c66e4" opacity="0.3" class="animate-ping" />
            <circle r="8" fill="#0c66e4" stroke="#ffffff" stroke-width="2.5" />
          </g>
        </svg>

        <!-- Floating Label 1: Galang's Compound (Hivelet) -->
        <div class="absolute right-[31%] top-[56%] -translate-y-full z-10 pointer-events-auto">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e2532] text-white shadow-xl border border-white/20 text-[11px] font-bold">
            <MapPin class="size-3.5 text-rose-500" />
            <span>Hivelet (Galang's Compound)</span>
          </div>
        </div>

        <!-- Floating Label 2: Bicol University Main Campus -->
        <div class="absolute left-[3%] top-[12%] z-10 pointer-events-auto">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c66e4] text-white shadow-xl border border-white/20 text-[11px] font-bold">
            <GraduationCap class="size-3.5 text-amber-300" />
            <span>Bicol University (Main Campus)</span>
          </div>
        </div>

        <!-- Route Summary Pill Badge -->
        <div class="absolute left-[34%] top-[38%] -translate-x-1/2 z-10 pointer-events-auto hidden sm:block">
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-rose-700 shadow-md border border-rose-200 text-[10px] font-extrabold backdrop-blur-xs">
            <Navigation class="size-3 text-rose-600" />
            <span>Direct Transit Waypoint</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
