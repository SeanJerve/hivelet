<!--
  @component CategoryRoomsView
  @description Category showcase view for 1 Bed Room Unit, 2 Bed Room Unit, and 3 Bed Room Unit without card wrapper.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5.2 - Room Directory
  @rationale Clean page layout presenting category header, sample interior gallery, unit overview, and direct inquiry trigger seamlessly on the canvas without an enclosing card.
  @innovations Open layout presentation with pure Hanken Grotesk typography and responsive gallery.
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { openInquiryModal } from '@/lib/systemState';
import { 
  ArrowLeft, MessageSquare, ShieldCheck, Sparkles, Home
} from 'lucide-vue-next';

const route = useRoute();

// Category slug from route params
const categorySlug = computed(() => (route.params.categorySlug as string) || '1-bedroom');

// Category metadata configuration (Titles with no 'S' in Unit)
const categoryMeta = computed(() => {
  const slug = categorySlug.value.toLowerCase();
  if (slug === '1-bedroom' || slug === '1-bed-room' || slug === '1-bed') {
    return {
      name: '1 Bed Room Unit',
      title: '1 Bed Room Unit',
      slug: '1-bedroom',
      maxOccupants: 3,
      description: 'Private 1-bedroom boarding unit featuring a dedicated bedroom space, private bathroom, and comfortable study area. Designed for quiet living and academic focus.',
      highlights: [
        'Private tiled bathroom with shower fixtures',
        'Independent electrical sub-metering',
        'Dedicated study desk and storage cabinet',
        'Quiet residential environment ideal for students and reviewers'
      ]
    };
  }
  if (slug === '2-bedroom' || slug === '2-bed-room' || slug === '2-bed') {
    return {
      name: '2 Bed Room Unit',
      title: '2 Bed Room Unit',
      slug: '2-bedroom',
      maxOccupants: 4,
      description: 'Spacious 2-bedroom unit offering flexible shared living space for co-tenants, students, or small families with private bath and ample ventilation.',
      highlights: [
        'Two distinct bedroom spaces with natural lighting',
        'Shared kitchenette and dining area',
        'Private bathroom and individual sub-meter',
        'Ideal for room-sharing among university peers'
      ]
    };
  }
  if (slug === '3-bedroom' || slug === '3-bed-room' || slug === '3-bed') {
    return {
      name: '3 Bed Room Unit',
      title: '3 Bed Room Unit',
      slug: '3-bedroom',
      maxOccupants: 5,
      description: 'Premium multi-bedroom suite accommodating larger groups with expansive living spaces, high ceilings, and top-floor residential airflow.',
      highlights: [
        'Master bedroom and supplementary bedroom rooms',
        'Expansive open living room and balcony access',
        'Modern en-suite bathroom with complete fixtures',
        'Maximum privacy on top floor level'
      ]
    };
  }
  return {
    name: '1 Bed Room Unit',
    title: '1 Bed Room Unit',
    slug: '1-bedroom',
    maxOccupants: 3,
    description: 'Explore available boarding house accommodations at Fe Galang Da Silva Boarding House.',
    highlights: ['Private bathroom', 'Sub-metered electric', 'Secure premises']
  };
});

// Sample pictures for each category
const samplePhotosBySlug: Record<string, { url: string; label: string }[]> = {
  '1-bedroom': [
    { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', label: 'Main Bedroom Area' },
    { url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80', label: 'Study & Desk Area' },
    { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', label: 'Clean Tiled Bathroom' },
    { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80', label: 'Natural Window View' }
  ],
  '2-bedroom': [
    { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', label: 'Primary Bedroom' },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80', label: 'Second Bedroom' },
    { url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', label: 'Kitchenette & Living' },
    { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80', label: 'Hallway & Closet' }
  ],
  '3-bedroom': [
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80', label: 'Master Suite' },
    { url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80', label: 'Second Bedroom' },
    { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', label: 'Lounge & Balcony View' },
    { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', label: 'En-suite Bathroom' }
  ]
};

const currentPhotos = computed(() => {
  const slug = categoryMeta.value.slug;
  return samplePhotosBySlug[slug] || samplePhotosBySlug['1-bedroom'];
});

const activePhotoIndex = ref(0);
const activePhoto = computed(() => {
  return currentPhotos.value[activePhotoIndex.value] || currentPhotos.value[0];
});

watch(categorySlug, () => {
  activePhotoIndex.value = 0;
});

function handleInquireCategory() {
  openInquiryModal(categoryMeta.value.name);
}
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] text-[#172b4d] pb-16">
    <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <!-- Breadcrumbs & Category Identifier -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe1e6] pb-4">
        <router-link 
          to="/" 
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c66e4] hover:text-[#0052cc] transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Back to All Categories</span>
        </router-link>

        <div class="flex items-center gap-2 text-xs text-[#5e6c84]">
          <span>Fe Galang Da Silva BH</span>
          <span>•</span>
          <span class="font-bold text-[#172b4d]">{{ categoryMeta.name }}</span>
        </div>
      </div>

      <!-- Header Info (Outside Card) -->
      <div class="border-b border-[#dfe1e6] pb-6">
        <div class="space-y-1">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-[#172b4d] font-display tracking-tight">
            {{ categoryMeta.title }}
          </h1>

          <p class="text-xs sm:text-sm text-[#5e6c84]">
            Fe Galang Da Silva Boarding House • Barangay Sambat, Tanauan City
          </p>
        </div>
      </div>

      <!-- Sample Interior Pictures Gallery (Outside Card) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xs sm:text-sm font-bold text-[#172b4d] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles class="w-4 h-4 text-[#0c66e4]" />
            <span>Sample Pictures of the {{ categoryMeta.name }}</span>
          </h2>
          <span class="text-xs text-[#5e6c84]">
            Photo {{ activePhotoIndex + 1 }} of {{ currentPhotos.length }}
          </span>
        </div>

        <!-- Main Active Photo Display -->
        <div class="h-80 sm:h-[450px] w-full rounded-2xl overflow-hidden border border-[#dfe1e6] relative group shadow-md">
          <img 
            :src="activePhoto.url" 
            :alt="activePhoto.label" 
            class="w-full h-full object-cover transition-all duration-300"
          />
          <div class="absolute bottom-4 left-4 bg-[#0b132b]/85 backdrop-blur-xs text-white text-xs font-bold px-3.5 py-1.5 rounded-xl border border-white/20">
            {{ activePhoto.label }}
          </div>
        </div>

        <!-- Thumbnails Row -->
        <div class="grid grid-cols-4 gap-3 sm:gap-4">
          <button 
            v-for="(photo, pIdx) in currentPhotos" 
            :key="pIdx"
            @click="activePhotoIndex = pIdx"
            :class="[
              'h-20 sm:h-28 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative shadow-xs',
              activePhotoIndex === pIdx 
                ? 'border-[#0c66e4] ring-2 ring-[#0c66e4]/30 shadow-md' 
                : 'border-white opacity-75 hover:opacity-100'
            ]"
          >
            <img :src="photo.url" :alt="photo.label" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/10"></div>
          </button>
        </div>
      </div>

      <!-- Unit Description & Inclusions (Outside Card) -->
      <div class="space-y-6 pt-4 border-t border-[#dfe1e6]">
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">Unit Overview</h3>
          <p class="text-xs sm:text-sm text-[#172b4d] leading-relaxed bg-white p-5 rounded-2xl border border-[#dfe1e6] shadow-xs">
            {{ categoryMeta.description }}
          </p>
        </div>

        <!-- Key Features List -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">Key Inclusions</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div 
              v-for="(feat, fIdx) in categoryMeta.highlights" 
              :key="fIdx"
              class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#dfe1e6] text-[#172b4d] shadow-xs"
            >
              <ShieldCheck class="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span class="font-medium">{{ feat }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons (View Available Units & Direct Inquire) -->
      <div class="pt-4 border-t border-[#dfe1e6] flex flex-col sm:flex-row gap-3">
        <router-link 
          :to="`/category/${categoryMeta.slug}/units`"
          class="flex-1 bg-[#0c66e4] hover:bg-blue-600 text-white font-bold py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer text-center"
        >
          <Home class="w-4 h-4" />
          <span>View Available Units</span>
        </router-link>

        <button 
          type="button"
          @click="handleInquireCategory"
          class="sm:w-auto bg-white hover:bg-[#f4f5f7] text-[#172b4d] border border-[#dfe1e6] font-bold py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <MessageSquare class="w-4 h-4 text-[#0c66e4]" />
          <span>Inquire {{ categoryMeta.name }}</span>
        </button>
      </div>

    </div>
  </div>
</template>
