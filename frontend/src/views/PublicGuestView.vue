<script setup lang="ts">
/**
 * @component PublicGuestView
 * @description Luxury public room catalog & inquiry portal.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
 * @rationale Prospective tenants can browse every published unit, see occupancy status, view room
 *            details, and submit a direct inquiry without needing an account -- login is admin-issued
 *            only (System Bible Section 4: visitors "cannot directly reserve or transact online").
 * @innovations Room-type photography is a curated Unsplash placeholder (no real property photos exist
 *              in the repo yet) -- swap for real unit photography before production deployment.
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Send, Users, MapPin, CheckCircle2, X } from 'lucide-vue-next';
import PublicNavbar from '../components/layout/PublicNavbar.vue';
import { supabase } from '../lib/supabase';

const router = useRouter();

interface PublicRoom {
  id: string;
  room_number: string;
  floor: number;
  room_type: string;
  description: string | null;
  capacity: number;
  current_price: number;
  operational_status: 'Available' | 'Reserved' | 'Occupied' | 'Under Maintenance';
  available_from: string | null;
}

const publicRooms = ref<PublicRoom[]>([]);
const loadingRooms = ref(false);
const loadRoomsError = ref('');

const fetchRooms = async () => {
  loadingRooms.value = true;
  loadRoomsError.value = '';

  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_number, floor, room_type, description, capacity, current_price, operational_status, available_from')
    .eq('visibility_status', 'Published')
    .order('room_number');

  if (error) {
    loadRoomsError.value = error.message;
  } else {
    publicRooms.value = (data as PublicRoom[]) || [];
  }

  loadingRooms.value = false;
};

onMounted(fetchRooms);

const availableCount = computed(
  () => publicRooms.value.filter((r) => r.operational_status === 'Available').length
);

// Placeholder photography keyed by room type -- pending real unit photos.
const ROOM_TYPE_PHOTOS: Record<string, string> = {
  Studio: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  'One-bedroom': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  'Two-bedroom': 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=80',
};
const roomPhoto = (type: string) => ROOM_TYPE_PHOTOS[type] || ROOM_TYPE_PHOTOS.Studio;

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'Occupied':
      return 'lux-badge-occupied';
    case 'Available':
      return 'lux-badge-available';
    case 'Reserved':
      return 'lux-badge-reserved';
    default:
      return 'lux-badge-maintenance'; // Under Maintenance
  }
};

const inquiryForm = ref({
  roomId: '',
  roomNumber: '',
  prospectName: '',
  phone: '',
  email: '',
  message: '',
});

const inquirySubmitted = ref(false);
const submitting = ref(false);
const submitError = ref('');
const showInquiryModal = ref(false);

const selectRoomForInquiry = (room: PublicRoom) => {
  inquiryForm.value.roomId = room.id;
  inquiryForm.value.roomNumber = room.room_number;
  inquirySubmitted.value = false;
  submitError.value = '';
  showInquiryModal.value = true;
};

const closeInquiryModal = () => {
  showInquiryModal.value = false;
};

const submitInquiry = async () => {
  if (!inquiryForm.value.roomId || !inquiryForm.value.prospectName || !inquiryForm.value.phone) return;

  submitting.value = true;
  submitError.value = '';

  // IMPORTANT: do NOT chain .select()/.single() after .insert() here.
  // Anonymous visitors have no SELECT policy on `inquiries` (by design — prospects
  // can't read back other people's inquiries), and Postgres RLS requires the
  // inserted row to pass a SELECT check for `RETURNING` to succeed. Chaining
  // .select() would make supabase-js request RETURNING and the whole insert
  // would fail, even though the INSERT itself is fully permitted.
  const { error } = await supabase.from('inquiries').insert({
    room_id: inquiryForm.value.roomId,
    prospect_name: inquiryForm.value.prospectName,
    prospect_email: inquiryForm.value.email,
    prospect_phone: inquiryForm.value.phone,
    message: inquiryForm.value.message,
  });

  submitting.value = false;

  if (error) {
    submitError.value = error.message;
    return;
  }

  inquirySubmitted.value = true;
};
</script>

<template>
  <div class="lux-canvas min-h-screen">
    <PublicNavbar variant="solid" />

    <main class="max-w-6xl mx-auto px-5 md:px-10 py-12 md:py-16 space-y-14">
      <!-- Header -->
      <div>
        <span class="lux-eyebrow">Fe Galang Da Silva Boarding House</span>
        <h1 class="lux-serif text-3xl md:text-4xl mt-2 text-[var(--lux-text)]">Available Room Units</h1>
        <p class="text-sm text-[var(--lux-text-muted)] mt-3 max-w-2xl leading-relaxed">
          Browse all published units across the property, see live occupancy status, and submit an inquiry directly to the administrator.
        </p>
      </div>

      <!-- Room Grid -->
      <div class="space-y-6">
        <h2 class="lux-serif text-xl text-[var(--lux-text)]">{{ availableCount }} Currently Available</h2>

        <div v-if="loadingRooms" class="lux-card p-10 text-center text-sm text-[var(--lux-text-muted)]">
          Loading room units…
        </div>

        <div v-else-if="loadRoomsError" class="p-4 bg-[#f7e6e2] border border-[#e3b7ac] rounded text-[#8a3a26] text-sm">
          Failed to load room units: {{ loadRoomsError }}
        </div>

        <div v-else-if="publicRooms.length === 0" class="lux-card p-10 text-center text-sm text-[var(--lux-text-muted)]">
          No units currently published. Please check back soon.
        </div>

        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="room in publicRooms" :key="room.id" class="lux-card overflow-hidden flex flex-col">
              <div class="relative aspect-[4/3]">
                <img :src="roomPhoto(room.room_type)" :alt="`${room.room_type} unit`" class="w-full h-full object-cover" />
                <span :class="['lux-badge absolute top-3 right-3', statusBadgeClass(room.operational_status)]">
                  {{ room.operational_status }}
                </span>
              </div>

              <div class="p-5 flex flex-col gap-3 flex-1">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="lux-serif text-lg text-[var(--lux-text)]">Room {{ room.room_number }}</h3>
                    <span class="lux-serif text-base text-[var(--lux-text)]">₱{{ Number(room.current_price).toLocaleString() }}<span class="text-xs text-[var(--lux-text-muted)]">/mo</span></span>
                  </div>
                  <div class="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--lux-text-muted)] uppercase tracking-wide">
                    <span class="flex items-center gap-1"><MapPin class="w-3 h-3" />Floor {{ room.floor }}</span>
                    <span>{{ room.room_type }}</span>
                    <span class="flex items-center gap-1"><Users class="w-3 h-3" />{{ room.capacity }} max</span>
                  </div>
                </div>

                <p class="text-xs text-[var(--lux-text-muted)] leading-relaxed flex-1">{{ room.description }}</p>

                <p v-if="room.operational_status !== 'Available' && room.available_from" class="text-[11px] text-[var(--lux-accent)]">
                  Available from {{ room.available_from }}
                </p>

                <button
                  v-if="room.operational_status !== 'Reserved'"
                  @click="selectRoomForInquiry(room)"
                  class="lux-btn-primary w-full justify-center mt-1"
                >
                  Inquire About This Room
                </button>
                <span v-else class="text-[11px] text-[var(--lux-text-muted)] italic text-center py-2">Reserved — not accepting inquiries</span>
              </div>
            </div>
          </div>
        </template>
      </div>

    </main>

    <footer class="border-t border-[var(--lux-border)] px-5 md:px-10 py-8 mt-10">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--lux-text-muted)]">
        <button @click="router.push('/')" class="lux-serif text-sm text-[var(--lux-text)]">Hivelet</button>
        <span>Fe Galang Da Silva Boarding House</span>
      </div>
    </footer>

    <!-- Inquiry Popup -->
    <div v-if="showInquiryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="closeInquiryModal">
      <div class="lux-card bg-[var(--lux-surface)] w-full max-w-lg p-6 md:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between border-b border-[var(--lux-border)] pb-4">
          <div>
            <span class="lux-eyebrow">Get In Touch</span>
            <h2 class="lux-serif text-xl mt-1 text-[var(--lux-text)]">Submit Inquiry for Room {{ inquiryForm.roomNumber }}</h2>
            <p class="text-xs text-[var(--lux-text-muted)] mt-1">Your message will be sent directly to the administrator.</p>
          </div>
          <button @click="closeInquiryModal" class="text-[var(--lux-text-muted)] hover:text-[var(--lux-text)] shrink-0"><X class="w-4 h-4" /></button>
        </div>

        <div v-if="inquirySubmitted" class="space-y-4">
          <div class="p-4 bg-[#e7efe6] border border-[#c3d9c0] rounded text-[#3f6b3f] text-sm flex items-start gap-2.5">
            <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong class="font-semibold">Inquiry submitted successfully.</strong>
              <p class="mt-0.5">Thank you, {{ inquiryForm.prospectName }}. The administrator will review your message shortly.</p>
            </div>
          </div>
          <button @click="closeInquiryModal" class="lux-btn-secondary w-full justify-center">Close</button>
        </div>

        <form v-else @submit.prevent="submitInquiry" class="space-y-4">
          <div v-if="submitError" class="p-3 bg-[#f7e6e2] border border-[#e3b7ac] rounded text-[#8a3a26] text-xs">
            {{ submitError }}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="lux-label">Full Name *</label>
              <input v-model="inquiryForm.prospectName" required type="text" placeholder="e.g. Gabriel Fernandez" class="lux-input" />
            </div>
            <div>
              <label class="lux-label">Contact Phone *</label>
              <input v-model="inquiryForm.phone" required type="text" placeholder="e.g. 0917-123-4567" class="lux-input" />
            </div>
          </div>

          <div>
            <label class="lux-label">Email Address *</label>
            <input v-model="inquiryForm.email" required type="email" placeholder="e.g. gabriel@gmail.com" class="lux-input" />
          </div>

          <div>
            <label class="lux-label">Message / Questions</label>
            <textarea v-model="inquiryForm.message" rows="3" placeholder="State your target move-in date, number of occupants, etc..." class="lux-input"></textarea>
          </div>

          <button type="submit" :disabled="submitting" class="lux-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send class="w-3.5 h-3.5" />
            <span>{{ submitting ? 'Sending…' : 'Send Inquiry Message' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
