<!--
  @component PublicGuestView
  @description Available Rentable Units Blueprint Showcase for Fe Galang Da Silva Boarding House.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model & Section 16 - Inquiries
  @rationale Clean wireframe layout blueprint (zero-clutter policy) displaying active category unit selector pills, single-unit architectural zones (Bedroom, Study/Work, Bathroom), capacity badge, and direct 1-click inquiry synchronization with the Landlady Inbox.
  @innovations Wireframe layout blueprint compartments, category unit pill navigation, and in-place inquiry popup modal.
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  rooms, activeInquirers, 
  selectedInquirerId, showToast, type RoomUnit 
} from '@/lib/systemState';
import { 
  ArrowLeft, Users, Compass, ShieldCheck, 
  MapPin, MessageSquare, X, Send, CheckCircle2 
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// Active category slug ('1-bedroom', '2-bedroom', '3-bedroom')
const activeCategorySlug = ref<string>('1-bedroom');

// Active unit index within the current category
const activeUnitIndex = ref(0);

interface CategoryDefinition {
  slug: string;
  name: string;
  title: string;
  description: string;
  maxOccupants: number;
  filterFn: (r: RoomUnit) => boolean;
}

const categories: CategoryDefinition[] = [
  {
    slug: '1-bedroom',
    name: '1 Bed Room Unit',
    title: '1 Bed Room Unit',
    description: 'Private 1-bedroom boarding unit featuring dedicated bedroom space, private bathroom, and study desk.',
    maxOccupants: 3,
    filterFn: (r: RoomUnit) => r.type.includes('1-Bedroom') || r.type.includes('1-Bed')
  },
  {
    slug: '2-bedroom',
    name: '2 Bed Room Unit',
    title: '2 Bed Room Unit',
    description: 'Spacious 2-bedroom unit offering flexible shared living space for co-tenants or students with private bath.',
    maxOccupants: 4,
    filterFn: (r: RoomUnit) => r.type.includes('2-Bedroom') || r.type.includes('2-Bed')
  },
  {
    slug: '3-bedroom',
    name: '3 Bed Room Unit',
    title: '3 Bed Room Unit',
    description: 'Premium multi-bedroom suite accommodating larger groups with expansive living spaces and top-floor residential airflow.',
    maxOccupants: 5,
    filterFn: (r: RoomUnit) => r.type.includes('3-Bedroom') || r.type.includes('3-Bed') || r.type.includes('Penthouse')
  }
];

const activeCategory = computed(() => {
  return categories.find(c => c.slug === activeCategorySlug.value) || categories[0];
});

const categoryRooms = computed(() => {
  return rooms.filter(activeCategory.value.filterFn);
});

const activeUnit = computed<RoomUnit | null>(() => {
  if (categoryRooms.value.length === 0) return null;
  const idx = Math.min(Math.max(0, activeUnitIndex.value), categoryRooms.value.length - 1);
  return categoryRooms.value[idx];
});

onMounted(() => {
  const paramSlug = (route.params.categorySlug as string) || (route.query.category as string);
  if (paramSlug && categories.some(c => c.slug === paramSlug)) {
    activeCategorySlug.value = paramSlug;
  }
});

watch(() => route.params.categorySlug, (newSlug) => {
  if (newSlug && categories.some(c => c.slug === newSlug)) {
    activeCategorySlug.value = newSlug as string;
    activeUnitIndex.value = 0;
  }
});

function selectUnit(index: number) {
  activeUnitIndex.value = index;
}

function handleBack() {
  router.push(`/category/${activeCategorySlug.value}`);
}

// In-Place Inquiry Modal State
const isInquireModalOpen = ref(false);
const prospectName = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const isSubmitting = ref(false);
const inquirySubmitted = ref(false);

function openInquireModal() {
  isInquireModalOpen.value = true;
  inquirySubmitted.value = false;
}

function closeInquireModal() {
  isInquireModalOpen.value = false;
}

function submitInquiry() {
  if (!prospectName.value.trim() || !phone.value.trim()) return;

  isSubmitting.value = true;
  const targetCode = activeUnit.value ? activeUnit.value.unitCode : 'General';
  const newInquirerId = `inq-${Date.now()}`;

  activeInquirers.unshift({
    id: newInquirerId,
    name: prospectName.value.trim(),
    room: targetCode,
    type: activeUnit.value ? activeUnit.value.type : 'Boarding Unit',
    price: activeUnit.value ? activeUnit.value.price : 4500,
    unread: true,
    messages: [
      {
        sender: 'Inquirer',
        time: 'Just now',
        text: message.value.trim() || `Hi Mrs. Fe Galang, I am inquiring about Unit ${targetCode}. Contact: ${phone.value.trim()} (${email.value.trim() || 'No email'})`
      }
    ]
  });

  isSubmitting.value = false;
  inquirySubmitted.value = true;
  selectedInquirerId.value = newInquirerId;
  showToast('success', 'Inquiry Delivered', `Your inquiry for Unit ${targetCode} has been sent to Mrs. Fe Galang.`);
}
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] text-[#172b4d] pb-16">
    <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    
    <!-- Top Bar: Back Link & Category Unit Switcher Pills -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe1e6] pb-4">
      <button 
        type="button"
        @click="handleBack"
        class="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c66e4] hover:underline cursor-pointer transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Back to Available Units</span>
      </button>

      <!-- Unit Selector Pills -->
      <div class="flex items-center flex-wrap gap-1.5">
        <span class="text-xs text-[#5e6c84] font-bold mr-1">Units in {{ activeCategory.name }}:</span>
        <button 
          v-for="(u, uIdx) in categoryRooms" 
          :key="u.id"
          @click="selectUnit(uIdx)"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-bold font-mono-num border cursor-pointer transition-all',
            activeUnitIndex === uIdx 
              ? 'bg-[#0c66e4] text-white border-[#0c66e4] shadow-xs' 
              : 'bg-white text-[#172b4d] border-[#dfe1e6] hover:bg-slate-50'
          ]"
        >
          Unit {{ u.unitCode }}
        </button>
      </div>
    </div>

    <!-- Main Unit Showcase Card (Exact Blueprint Wireframe Layout) -->
    <div v-if="activeUnit" class="jira-card bg-white p-6 sm:p-8 rounded-2xl border border-[#dfe1e6] shadow-sm space-y-6">
      
      <!-- Unit Top Bar: Unit Code, Availability Tag, Location & Max Capacity -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe1e6] pb-5">
        <div class="space-y-1.5">
          <div class="flex items-center gap-3">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#172b4d] font-display">
              Unit {{ activeUnit.unitCode }}
            </h1>

            <!-- Availability Tag -->
            <span 
              v-if="activeUnit.status === 'available'"
              class="px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300"
            >
              AVAILABLE
            </span>
            <span 
              v-else
              class="px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300"
            >
              OCCUPIED
            </span>
          </div>

          <!-- Floor & Cluster Location -->
          <p class="text-xs font-bold text-[#0c66e4] flex items-center gap-1.5">
            <MapPin class="w-3.5 h-3.5" />
            <span>{{ activeUnit.floorLabel }} • {{ activeUnit.cluster }}</span>
          </p>
        </div>

        <!-- Max Capacity Badge Card -->
        <div class="bg-white sm:bg-[#f4f5f7] p-3 sm:px-4 sm:py-3 rounded-xl border border-[#dfe1e6] flex items-center gap-3 w-fit">
          <Users class="w-5 h-5 text-[#0c66e4]" />
          <div>
            <span class="text-[10px] uppercase font-bold text-[#5e6c84] tracking-wider block leading-tight">MAX CAPACITY</span>
            <span class="text-xs sm:text-sm font-bold text-[#172b4d]">Up to {{ activeUnit.maxOccupants || activeUnit.occupants || 3 }} Occupants</span>
          </div>
        </div>
      </div>

      <!-- Wireframe Architectural Floorplan Schematic Blueprint -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider flex items-center gap-1.5">
            <Compass class="w-4 h-4 text-[#0c66e4]" />
            <span>UNIT {{ activeUnit.unitCode.toUpperCase() }} WIREFRAME LAYOUT BLUEPRINT</span>
          </h2>
          <span class="text-[11px] font-mono-num text-[#5e6c84] uppercase">SCHEMATIC REF: #{{ activeUnit.id }}</span>
        </div>

        <!-- Blueprint Container with 3 Dashed Compartments -->
        <div class="p-4 sm:p-6 bg-white sm:bg-[#f7f8f9] border-2 border-[#172b4d] rounded-2xl space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            
            <!-- Zone A: Bedroom -->
            <div class="p-4 bg-white border-2 border-dashed border-[#172b4d] rounded-xl flex flex-col justify-between space-y-3">
              <span class="font-bold text-xs text-[#0c66e4] font-mono">[ ZONE A: BEDROOM ]</span>
              <p class="text-xs text-[#5e6c84] leading-relaxed">
                Sleeping quarters, bed frame mounting area & ambient ventilation window.
              </p>
              <div class="text-[11px] text-slate-500 border-t border-slate-200 pt-2 font-medium">
                Capacity: {{ activeUnit.maxOccupants || activeUnit.occupants || 3 }} Pax
              </div>
            </div>

            <!-- Zone B: Study / Work -->
            <div class="p-4 bg-white border-2 border-dashed border-[#172b4d] rounded-xl flex flex-col justify-between space-y-3">
              <span class="font-bold text-xs text-[#0c66e4] font-mono">[ ZONE B: STUDY / WORK ]</span>
              <p class="text-xs text-[#5e6c84] leading-relaxed">
                Dedicated desk work space, overhead lighting & private electric sub-meter line.
              </p>
              <div class="text-[11px] text-slate-500 border-t border-slate-200 pt-2 font-medium">
                Individual Sub-Meter
              </div>
            </div>

            <!-- Zone C: Bathroom -->
            <div class="p-4 bg-white border-2 border-dashed border-[#172b4d] rounded-xl flex flex-col justify-between space-y-3">
              <span class="font-bold text-xs text-[#0c66e4] font-mono">[ ZONE C: BATHROOM ]</span>
              <p class="text-xs text-[#5e6c84] leading-relaxed">
                En-suite tiled toilet & bath, private shower fixture & standard water sub-line.
              </p>
              <div class="text-[11px] text-slate-500 border-t border-slate-200 pt-2 font-medium">
                Private T&B
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Unit Description Section -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">UNIT DESCRIPTION</h3>
        <p class="text-xs sm:text-sm text-[#172b4d] leading-relaxed bg-[#f4f5f7] p-4 rounded-xl border border-[#dfe1e6]">
          {{ activeUnit.desc || 'Renovated unit with private bathroom and individual electric submeter.' }}
        </p>
      </div>

      <!-- Direct Inquiry Action Footer -->
      <div class="pt-4 border-t border-[#dfe1e6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-xs text-[#5e6c84]">
          <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Direct submission to Mrs. Fe Galang's Landlady Inbox</span>
        </div>

        <button 
          type="button"
          @click="openInquireModal"
          class="bg-[#0c66e4] hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer text-sm"
        >
          <MessageSquare class="w-4 h-4" />
          <span>Inquire Now</span>
        </button>
      </div>

    </div>

    <!-- In-Place Pop-Up Inquiry Modal -->
    <div 
      v-if="isInquireModalOpen"
      class="fixed inset-0 z-50 bg-[#091e42]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click.self="closeInquireModal"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 border border-[#dfe1e6] shadow-2xl space-y-6 relative">
        
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-[#dfe1e6] pb-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-[#0c66e4] rounded text-[11px] font-bold uppercase tracking-wider">
              <MessageSquare class="w-3 h-3" />
              <span>Direct Booking Inquiry</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-[#172b4d] font-display">
              Inquire {{ activeUnit ? `Unit ${activeUnit.unitCode}` : 'Unit' }}
            </h2>
            <p class="text-xs text-[#5e6c84]">
              Send your booking inquiry directly to Mrs. Fe Galang's Landlady Inbox.
            </p>
          </div>

          <button 
            type="button"
            @click="closeInquireModal"
            class="text-[#5e6c84] hover:text-[#172b4d] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Success Message -->
        <div v-if="inquirySubmitted" class="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-4 text-xs">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <strong class="font-bold text-sm block font-display">Inquiry Delivered Successfully!</strong>
              <span>Target: Unit {{ activeUnit ? activeUnit.unitCode : 'General' }}</span>
            </div>
          </div>
          <p class="leading-relaxed">
            Thank you, <strong>{{ prospectName }}</strong>. Your inquiry has been sent directly to Mrs. Fe Galang. She will get in touch with you shortly.
          </p>
          <div class="pt-2 border-t border-emerald-200 flex justify-end">
            <button 
              type="button"
              @click="closeInquireModal"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

        <!-- Inquiry Form -->
        <form v-else @submit.prevent="submitInquiry" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#172b4d] mb-1">Your Full Name *</label>
              <input 
                v-model="prospectName"
                type="text" 
                required
                placeholder="e.g. Gabriel Fernandez"
                class="w-full p-2.5 bg-[#fafbfc] border border-[#dfe1e6] rounded-lg text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none"
              />
            </div>

            <div>
              <label class="block font-bold text-[#172b4d] mb-1">Contact Phone Number *</label>
              <input 
                v-model="phone"
                type="text" 
                required
                placeholder="e.g. 0917-123-4567"
                class="w-full p-2.5 bg-[#fafbfc] border border-[#dfe1e6] rounded-lg text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#172b4d] mb-1">Email Address (Optional)</label>
            <input 
              v-model="email"
              type="email" 
              placeholder="e.g. gabriel@gmail.com"
              class="w-full p-2.5 bg-[#fafbfc] border border-[#dfe1e6] rounded-lg text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-bold text-[#172b4d] mb-1">Inquiry Message / Move-in Date *</label>
            <textarea 
              v-model="message"
              rows="3" 
              required
              placeholder="State your target move-in date, occupancy requirements, or questions..."
              class="w-full p-2.5 bg-[#fafbfc] border border-[#dfe1e6] rounded-lg text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none leading-relaxed"
            ></textarea>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full bg-[#0c66e4] hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Send class="w-4 h-4" />
              <span>{{ isSubmitting ? 'Delivering Inquiry…' : `Submit Inquiry for Unit ${activeUnit ? activeUnit.unitCode : ''}` }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

  </div>
  </div>
</template>
