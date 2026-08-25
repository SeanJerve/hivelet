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
  Compass
} from 'lucide-vue-next';

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

function navigateToCategory(slug: string) {
  router.push(`/category/${slug}`);
}

onMounted(() => {
  fetchRooms();
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
  <div class="flex-1 flex flex-col w-full">
    <!-- 100% Full-Width Edge-to-Edge Hero Header Section (No Card / No Rounded Corners) -->
    <section class="relative w-full overflow-hidden bg-[#1e2532] shadow-sm">
      <img
        :src="HERO_PHOTO"
        alt="Facade of Fe Galang Da Silva Boarding House"
        class="absolute inset-0 size-full object-cover"
        loading="eager"
      />
      <div class="absolute inset-0 bg-[#1e2532]/85 backdrop-blur-xs" />
      
      <div class="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <span class="inline-flex items-center gap-2 rounded-full bg-[#f59e0b] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#1c1917] shadow-sm">
          <MapPin class="size-3.5" /> 32 Sampaquita St., Brgy. 4 Sagpon, Old Albay, Legazpi City
        </span>
        
        <h1 class="mt-5 max-w-3xl font-display text-3xl font-black leading-[1.08] text-white sm:text-5xl lg:text-6xl">
          Fe Galang Da Silva Boarding House
        </h1>
        
        <p class="mt-4 max-w-xl text-sm sm:text-base text-gray-200 leading-relaxed">
          Thirty-two well-kept units across three floors — clean, secure, and located at 32 Sampaquita Street, Brgy. 4 Sagpon, Old Albay, Legazpi City. Transparent rates, submetered electricity, no hidden fees.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <button
            @click="scrollToInquiry"
            class="min-h-12 inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-6 py-3 font-display font-black text-sm text-[#1c1917] hover:bg-[#d97706] transition-colors shadow-md cursor-pointer"
          >
            <span>Inquire Now</span>
            <ArrowRight class="size-4" />
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

    <!-- 1. Category Explorer (Centered) -->
    <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
      <section class="space-y-6">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
            Explore by unit category
          </h2>
          <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
            Choose a category to browse live availability across the property. Click any category below to view all rooms in that category.
          </p>
        </div>

        <div class="grid gap-5 md:grid-cols-3">
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
              <span class="grid size-12 place-items-center rounded-xl bg-[#f5f5f4] text-[#1c1917] group-hover:bg-[#1e2532] group-hover:text-[#f59e0b] transition-colors">
                <component :is="c.icon" class="size-6 text-[#f59e0b] group-hover:text-[#f59e0b]" />
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

    <!-- 2. Why Choose Hivelet Section (100% Full-Width Edge-to-Edge Banner) -->
    <section class="w-full bg-white py-16 sm:py-20 shadow-xs">
      <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
        <div class="max-w-3xl space-y-2">
          <span class="text-xs font-extrabold uppercase tracking-widest text-[#0c66e4]">
            Why Choose Hivelet
          </span>
          <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
            Designed for Quiet & Secure Boarding
          </h2>
          <p class="text-xs sm:text-sm text-[#71717a] leading-relaxed">
            Managed directly by Mrs. Fe Galang Da Silva with strict adherence to house rules, clear individual submetering, and prompt maintenance response.
          </p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div class="p-6 rounded-2xl bg-[#fafaf9] border border-[#e7e5e4] space-y-3 hover:border-amber-300 transition-colors">
            <div class="size-11 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center text-[#f59e0b]">
              <Sparkles class="size-5" />
            </div>
            <h3 class="font-display font-bold text-base text-[#1c1917]">Clean & Well-Maintained</h3>
            <p class="text-xs text-[#71717a] leading-relaxed">Tiled bathrooms, fresh paint, and regular common area sanitization.</p>
          </div>

          <div class="p-6 rounded-2xl bg-[#fafaf9] border border-[#e7e5e4] space-y-3 hover:border-blue-300 transition-colors">
            <div class="size-11 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-[#0c66e4]">
              <KeyRound class="size-5" />
            </div>
            <h3 class="font-display font-bold text-base text-[#1c1917]">Secure Gate Access</h3>
            <p class="text-xs text-[#71717a] leading-relaxed">Gated perimeter with dedicated tenant access and evening curfew security.</p>
          </div>

          <div class="p-6 rounded-2xl bg-[#fafaf9] border border-[#e7e5e4] space-y-3 hover:border-emerald-300 transition-colors">
            <div class="size-11 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-emerald-600">
              <Wifi class="size-5" />
            </div>
            <h3 class="font-display font-bold text-base text-[#1c1917]">High-Speed Fiber Ready</h3>
            <p class="text-xs text-[#71717a] leading-relaxed">Reliable broadband connectivity suited for online schooling and remote work.</p>
          </div>

          <div class="p-6 rounded-2xl bg-[#fafaf9] border border-[#e7e5e4] space-y-3 hover:border-indigo-300 transition-colors">
            <div class="size-11 rounded-xl bg-indigo-50 border border-indigo-200 grid place-items-center text-indigo-600">
              <CheckCircle2 class="size-5" />
            </div>
            <h3 class="font-display font-bold text-base text-[#1c1917]">Direct Landlady Support</h3>
            <p class="text-xs text-[#71717a] leading-relaxed">Transparent billing ledgers, no hidden surcharges, and swift dispatch.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Rectangular Inquiry Form Section (Centered) -->
    <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
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
                class="w-full sm:w-auto min-h-12 px-8 rounded-2xl bg-[#1e2532] hover:bg-[#2b3648] text-white font-bold text-sm inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
                <Send v-else class="size-4 text-[#f59e0b]" />
                <span>{{ isSubmitting ? 'Sending…' : 'Send Inquiry to Landlady' }}</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>

    <!-- 4. Location & Proximity Map Section (100% Full-Width Edge-to-Edge with Top Spacing) -->
    <section class="w-full bg-white pt-16 sm:pt-20 pb-0 shadow-xs mt-8 sm:mt-12 space-y-8">
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
