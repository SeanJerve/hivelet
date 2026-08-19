<!--
  @component PublicGuestView
  @description Wireframe Public Guest portal on localhost:5173 with Available Units categories, full-screen unit showcase, and in-place Inquire Now pop-up card.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model
  @rationale Clean wireframe aesthetic (zero-image policy) featuring 3 Available Units category cards, direct navigation to first unit in full-screen view with Available tag, floor, capacity, and an in-place pop-up inquiry card modal on the same page.
  @innovations Wireframe layout blueprint without photographic images, in-place pop-up card inquiry synchronization with Landlady Inbox.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  rooms, activeInquirers, isLiveChatheadOpen, 
  selectedInquirerId, showToast, type RoomUnit 
} from '@/lib/systemState';
import { 
  Building2, ArrowLeft, Users, Layers, 
  Home, Grid, Compass, ShieldCheck, 
  MapPin, MessageSquare, X, Send, CheckCircle2 
} from 'lucide-vue-next';

// View Mode: 'categories' or 'unit-detail'
const currentView = ref<'categories' | 'unit-detail'>('categories');
const activeCategorySlug = ref<string>('1-bedroom');

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

// Active unit being viewed in full-screen view (defaults to the first unit of the category)
const activeUnitIndex = ref(0);

const activeUnit = computed<RoomUnit | null>(() => {
  if (categoryRooms.value.length === 0) return null;
  const idx = Math.min(Math.max(0, activeUnitIndex.value), categoryRooms.value.length - 1);
  return categoryRooms.value[idx];
});

function navigateToCategory(slug: string) {
  activeCategorySlug.value = slug;
  activeUnitIndex.value = 0;
  currentView.value = 'unit-detail';
}

function selectUnit(index: number) {
  activeUnitIndex.value = index;
}

function backToCategories() {
  currentView.value = 'categories';
}

// In-Place Pop-up Card Modal State
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

function handleDirectChat() {
  closeInquireModal();
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
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
  <div class="space-y-6 max-w-5xl mx-auto text-[#172b4d] relative">
    
    <!-- Property Header Banner (Wireframe Style) -->
    <div class="jira-card p-6 bg-white space-y-2 border-l-4 border-l-[#0c66e4] border border-[#dfe1e6]">
      <div class="flex items-center gap-2">
        <Building2 class="w-4 h-4 text-[#0c66e4]" />
        <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Fe Galang Da Silva Boarding House</span>
      </div>
      <h1 class="text-2xl font-bold text-[#172b4d]">Public Guest Portal — Wireframe Basis</h1>
      <p class="text-xs text-[#5e6c84] max-w-2xl leading-relaxed">
        Barangay Sambat, Tanauan City, Batangas. Architectural wireframe specification for available boarding house units.
      </p>
    </div>

    <!-- ====================================================================
         VIEW 1: AVAILABLE UNITS CATEGORY CARDS (Wireframe Design, No Images)
         ==================================================================== -->
    <div v-if="currentView === 'categories'" class="space-y-6">
      
      <!-- Section Header -->
      <div class="jira-card bg-white p-6 rounded-xl border border-[#dfe1e6] space-y-2">
        <div class="flex items-center gap-2">
          <Grid class="w-4 h-4 text-[#0c66e4]" />
          <h2 class="text-lg font-bold text-[#172b4d]">Available Units</h2>
        </div>
        <p class="text-xs text-[#5e6c84] leading-relaxed">
          Select a category below to navigate directly into the first unit specification in full-screen wireframe mode.
        </p>
      </div>

      <!-- 3 Category Cards Grid (Pure Wireframe Design) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

        <!-- Category Card 1: 1 Bed Room Unit -->
        <div 
          @click="navigateToCategory('1-bedroom')"
          class="jira-card bg-white border-2 border-[#dfe1e6] hover:border-[#0c66e4] rounded-xl overflow-hidden p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-md transition-all group"
        >
          <div class="space-y-4">
            <!-- Wireframe Schematic Placeholder Box (No Images) -->
            <div class="h-40 w-full bg-[#f4f5f7] border-2 border-dashed border-[#dfe1e6] group-hover:border-[#0c66e4] rounded-lg flex flex-col items-center justify-center p-4 text-center space-y-2 transition-colors">
              <Home class="w-8 h-8 text-[#0c66e4]" />
              <span class="text-[11px] font-bold text-[#172b4d] uppercase tracking-wider">[ Wireframe Schematic ]</span>
              <span class="text-[10px] text-[#5e6c84]">1 Bed Room Layout Plan</span>
            </div>

            <!-- Content -->
            <div class="space-y-2">
              <button 
                type="button"
                @click.stop="navigateToCategory('1-bedroom')"
                class="text-lg font-bold text-[#0c66e4] group-hover:underline text-left block cursor-pointer"
              >
                1 Bed Room Unit
              </button>

              <p class="text-xs text-[#5e6c84] leading-relaxed">
                Private 1-bedroom boarding unit featuring dedicated bedroom space, private bathroom, and study desk.
              </p>

              <div class="bg-[#f4f5f7] p-2.5 rounded border border-[#dfe1e6] text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-[#5e6c84] font-medium">Capacity:</span>
                  <span class="font-bold text-[#172b4d]">Up to 3 Occupants</span>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-[#dfe1e6] flex items-center justify-between text-xs font-bold text-[#0c66e4]">
            <span>View First Unit (Full Screen)</span>
            <span>&rarr;</span>
          </div>
        </div>

        <!-- Category Card 2: 2 Bed Room Unit -->
        <div 
          @click="navigateToCategory('2-bedroom')"
          class="jira-card bg-white border-2 border-[#dfe1e6] hover:border-[#0c66e4] rounded-xl overflow-hidden p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-md transition-all group"
        >
          <div class="space-y-4">
            <!-- Wireframe Schematic Placeholder Box (No Images) -->
            <div class="h-40 w-full bg-[#f4f5f7] border-2 border-dashed border-[#dfe1e6] group-hover:border-[#0c66e4] rounded-lg flex flex-col items-center justify-center p-4 text-center space-y-2 transition-colors">
              <Layers class="w-8 h-8 text-[#0c66e4]" />
              <span class="text-[11px] font-bold text-[#172b4d] uppercase tracking-wider">[ Wireframe Schematic ]</span>
              <span class="text-[10px] text-[#5e6c84]">2 Bed Room Layout Plan</span>
            </div>

            <!-- Content -->
            <div class="space-y-2">
              <button 
                type="button"
                @click.stop="navigateToCategory('2-bedroom')"
                class="text-lg font-bold text-[#0c66e4] group-hover:underline text-left block cursor-pointer"
              >
                2 Bed Room Unit
              </button>

              <p class="text-xs text-[#5e6c84] leading-relaxed">
                Spacious 2-bedroom unit offering flexible shared living space for co-tenants or students with private bath.
              </p>

              <div class="bg-[#f4f5f7] p-2.5 rounded border border-[#dfe1e6] text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-[#5e6c84] font-medium">Capacity:</span>
                  <span class="font-bold text-[#172b4d]">Up to 4 Occupants</span>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-[#dfe1e6] flex items-center justify-between text-xs font-bold text-[#0c66e4]">
            <span>View First Unit (Full Screen)</span>
            <span>&rarr;</span>
          </div>
        </div>

        <!-- Category Card 3: 3 Bed Room Unit -->
        <div 
          @click="navigateToCategory('3-bedroom')"
          class="jira-card bg-white border-2 border-[#dfe1e6] hover:border-[#0c66e4] rounded-xl overflow-hidden p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-md transition-all group"
        >
          <div class="space-y-4">
            <!-- Wireframe Schematic Placeholder Box (No Images) -->
            <div class="h-40 w-full bg-[#f4f5f7] border-2 border-dashed border-[#dfe1e6] group-hover:border-[#0c66e4] rounded-lg flex flex-col items-center justify-center p-4 text-center space-y-2 transition-colors">
              <Building2 class="w-8 h-8 text-[#0c66e4]" />
              <span class="text-[11px] font-bold text-[#172b4d] uppercase tracking-wider">[ Wireframe Schematic ]</span>
              <span class="text-[10px] text-[#5e6c84]">3 Bed Room Layout Plan</span>
            </div>

            <!-- Content -->
            <div class="space-y-2">
              <button 
                type="button"
                @click.stop="navigateToCategory('3-bedroom')"
                class="text-lg font-bold text-[#0c66e4] group-hover:underline text-left block cursor-pointer"
              >
                3 Bed Room Unit
              </button>

              <p class="text-xs text-[#5e6c84] leading-relaxed">
                Premium multi-bedroom suite accommodating larger groups with expansive living spaces and top-floor residential airflow.
              </p>

              <div class="bg-[#f4f5f7] p-2.5 rounded border border-[#dfe1e6] text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-[#5e6c84] font-medium">Capacity:</span>
                  <span class="font-bold text-[#172b4d]">Up to 5 Occupants</span>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-[#dfe1e6] flex items-center justify-between text-xs font-bold text-[#0c66e4]">
            <span>View First Unit (Full Screen)</span>
            <span>&rarr;</span>
          </div>
        </div>

      </div>

    </div>

    <!-- ====================================================================
         VIEW 2: FULL-SCREEN SINGLE UNIT SPECIFICATION (Wireframe Layout)
         ==================================================================== -->
    <div v-else-if="currentView === 'unit-detail' && activeUnit" class="space-y-6">

      <!-- Breadcrumbs & Category Unit Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe1e6] pb-4">
        <button 
          @click="backToCategories"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c66e4] hover:text-[#0052cc] transition-colors cursor-pointer"
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
              'px-2.5 py-1 rounded text-xs font-bold border cursor-pointer transition-all',
              activeUnitIndex === uIdx 
                ? 'bg-[#0c66e4] text-white border-[#0c66e4]' 
                : 'bg-white text-[#172b4d] border-[#dfe1e6] hover:bg-slate-100'
            ]"
          >
            Unit {{ u.unitCode }}
          </button>
        </div>
      </div>

      <!-- Full-Screen Unit Showcase Card (Wireframe Schematic, No Images) -->
      <div class="jira-card bg-white p-6 sm:p-8 rounded-xl border border-[#dfe1e6] shadow-sm space-y-6">
        
        <!-- Unit Top Bar with Code, Available Tag, Floor, and Capacity -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe1e6] pb-5">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              <h2 class="text-3xl font-extrabold text-[#172b4d] font-mono">
                Unit {{ activeUnit.unitCode }}
              </h2>

              <!-- Available Tag (Rendered if available) -->
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

            <!-- What Floor & Cluster Location -->
            <p class="text-xs font-bold text-[#0c66e4] flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              <span>{{ activeUnit.floorLabel }} • {{ activeUnit.cluster }}</span>
            </p>
          </div>

          <!-- Max Capacity Badge -->
          <div class="bg-[#f4f5f7] p-3 rounded-lg border border-[#dfe1e6] flex items-center gap-3 w-fit">
            <Users class="w-4 h-4 text-[#0c66e4]" />
            <div>
              <span class="text-[10px] uppercase font-bold text-[#5e6c84] block leading-tight">Max Capacity</span>
              <span class="text-xs font-bold text-[#172b4d]">Up to {{ activeUnit.maxOccupants }} Occupants</span>
            </div>
          </div>
        </div>

        <!-- Wireframe Architectural Floorplan Schematic (No Images) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-[#172b4d] uppercase tracking-wider flex items-center gap-1.5">
              <Compass class="w-4 h-4 text-[#0c66e4]" />
              <span>Unit {{ activeUnit.unitCode }} Wireframe Layout Blueprint</span>
            </h3>
            <span class="text-[11px] font-mono text-[#5e6c84]">SCHEMATIC REF: #{{ activeUnit.id }}</span>
          </div>

          <!-- Pure Wireframe Blueprint Box Grid -->
          <div class="p-6 bg-[#f7f8f9] border-2 border-[#172b4d] rounded-xl space-y-4 font-mono">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              
              <!-- Blueprint Compartment 1 -->
              <div class="p-4 bg-white border-2 border-dashed border-[#172b4d] rounded flex flex-col justify-between space-y-2">
                <span class="font-bold text-[11px] text-[#0c66e4]">[ ZONE A: BEDROOM ]</span>
                <p class="text-[11px] text-[#5e6c84]">Sleeping quarters, bed frame mounting area & ambient ventilation window.</p>
                <div class="text-[10px] text-slate-400 border-t border-slate-200 pt-1">Capacity: {{ activeUnit.maxOccupants }} Pax</div>
              </div>

              <!-- Blueprint Compartment 2 -->
              <div class="p-4 bg-white border-2 border-dashed border-[#172b4d] rounded flex flex-col justify-between space-y-2">
                <span class="font-bold text-[11px] text-[#0c66e4]">[ ZONE B: STUDY / WORK ]</span>
                <p class="text-[11px] text-[#5e6c84]">Dedicated desk work space, overhead lighting & private electric sub-meter line.</p>
                <div class="text-[10px] text-slate-400 border-t border-slate-200 pt-1">Individual Sub-Meter</div>
              </div>

              <!-- Blueprint Compartment 3 -->
              <div class="p-4 bg-white border-2 border-dashed border-[#172b4d] rounded flex flex-col justify-between space-y-2">
                <span class="font-bold text-[11px] text-[#0c66e4]">[ ZONE C: BATHROOM ]</span>
                <p class="text-[11px] text-[#5e6c84]">En-suite tiled toilet & bath, private shower fixture & standard water sub-line.</p>
                <div class="text-[10px] text-slate-400 border-t border-slate-200 pt-1">Private T&B</div>
              </div>

            </div>
          </div>
        </div>

        <!-- Unit Description -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">Unit Description</h3>
          <p class="text-xs sm:text-sm text-[#172b4d] leading-relaxed bg-[#f4f5f7] p-4 rounded-lg border border-[#dfe1e6]">
            {{ activeUnit.desc }}
          </p>
        </div>

        <!-- Direct Inquiry Action Button (Opens Pop-Up Card on Same Page) -->
        <div class="pt-4 border-t border-[#dfe1e6] flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs text-[#5e6c84]">
            <ShieldCheck class="w-4 h-4 text-emerald-600" />
            <span>Direct submission to Mrs. Fe Galang's Landlady Inbox</span>
          </div>

          <button 
            type="button"
            @click="openInquireModal"
            class="jira-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Inquire Now</span>
          </button>
        </div>

      </div>

    </div>

    <!-- ====================================================================
         IN-PLACE INQUIRE NOW POP-UP CARD MODAL (Same Page Overlay)
         ==================================================================== -->
    <div 
      v-if="isInquireModalOpen"
      class="fixed inset-0 z-50 bg-[#091e42]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click.self="closeInquireModal"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 border border-[#dfe1e6] shadow-2xl space-y-6 relative">
        
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-[#dfe1e6] pb-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-[#0c66e4] rounded text-[11px] font-bold uppercase tracking-wider">
              <MessageSquare class="w-3 h-3" />
              <span>Direct Booking Inquiry</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-[#172b4d]">
              Inquire {{ activeUnit ? `Unit ${activeUnit.unitCode}` : 'Unit' }}
            </h2>
            <p class="text-xs text-[#5e6c84]">
              Send your booking inquiry directly to Mrs. Fe Galang's Landlady Inbox.
            </p>
          </div>

          <!-- Close Button -->
          <button 
            type="button"
            @click="closeInquireModal"
            class="text-[#5e6c84] hover:text-[#172b4d] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Success Confirmation State -->
        <div v-if="inquirySubmitted" class="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-4 text-xs">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <strong class="font-bold text-sm block">Inquiry Delivered Successfully!</strong>
              <span>Target: Unit {{ activeUnit ? activeUnit.unitCode : 'General' }}</span>
            </div>
          </div>
          <p class="leading-relaxed">
            Thank you, <strong>{{ prospectName }}</strong>. Your inquiry has been sent directly to Mrs. Fe Galang. She will get in touch with you shortly.
          </p>
          <div class="pt-2 flex items-center gap-3">
            <button 
              @click="handleDirectChat" 
              class="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>Open Live Chat Messenger</span>
            </button>
            <button 
              @click="closeInquireModal" 
              class="jira-btn-secondary text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>

        <!-- Inquiry Form -->
        <form v-else @submit.prevent="submitInquiry" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block font-bold text-[#5e6c84]">Full Name <span class="text-rose-500">*</span></label>
              <input 
                v-model="prospectName" 
                required 
                type="text" 
                placeholder="e.g. Gabriel Fernandez" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all" 
              />
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-[#5e6c84]">Contact Phone <span class="text-rose-500">*</span></label>
              <input 
                v-model="phone" 
                required 
                type="tel" 
                placeholder="e.g. 0917-123-4567" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all" 
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block font-bold text-[#5e6c84]">Email Address (Optional)</label>
            <input 
              v-model="email" 
              type="email" 
              placeholder="e.g. gabriel@gmail.com" 
              class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all" 
            />
          </div>

          <div class="space-y-1">
            <label class="block font-bold text-[#5e6c84]">Message / Inquiries for Mrs. Fe Galang</label>
            <textarea 
              v-model="message" 
              rows="3" 
              placeholder="State your preferred viewing time, target number of occupants, or questions..." 
              class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all"
            ></textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-3 border-t border-[#dfe1e6]">
            <button 
              type="button" 
              @click="closeInquireModal" 
              class="jira-btn-secondary text-xs font-bold px-4 py-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="jira-btn-primary text-xs font-bold px-5 py-2 flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{{ isSubmitting ? 'Sending...' : 'Send Inquiry to Landlady' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

  </div>
</template>
