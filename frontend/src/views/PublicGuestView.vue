<script setup lang="ts">
/**
 * @component PublicGuestView
 * @description Minimalist Corporate Public Property Catalog & Room Inquiry Portal.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
 * @rationale Provides prospective tenants with clear property specifications, room availability grids,
 *              and direct inquiry submission without distracting consumer marketing gimmicks.
 * @innovations Built a clean, mobile-first room availability grid with integrated direct inquiry modal.
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Send, ArrowLeft } from 'lucide-vue-next';
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

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'Occupied':
      return 'jira-badge-done';
    case 'Available':
      return 'jira-badge-progress';
    case 'Reserved':
      return 'jira-badge-warning';
    case 'Under Maintenance':
      return 'jira-badge-emergency';
    default:
      return 'jira-badge-todo';
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

const selectRoomForInquiry = (room: PublicRoom) => {
  inquiryForm.value.roomId = room.id;
  inquiryForm.value.roomNumber = room.room_number;
  inquirySubmitted.value = false;
  submitError.value = '';
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
  <div class="min-h-screen bg-white">
    <div class="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
    <!-- Back Button -->
    <button
      @click="router.push('/')"
      class="flex items-center gap-1.5 text-xs font-medium text-[#42526e] hover:text-[#0c66e4] transition-colors"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>Back to Home</span>
    </button>

    <!-- Property Header Banner -->
    <div class="jira-card p-6 bg-white space-y-2 border-l-4 border-l-[#0c66e4]">
      <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Fe Galang Da Silva Boarding House</span>
      <h1 class="text-2xl font-bold text-[#172b4d]">Available Room Units Directory</h1>
      <p class="text-xs text-[#5e6c84] max-w-2xl">
        Centralized apartment management catalog. View verified available units across 3 floors and submit inquiries directly to the landlady.
      </p>
    </div>

    <!-- Available Units Grid -->
    <div class="space-y-4">
      <h2 class="text-base font-bold text-[#172b4d]">Currently Available Units ({{ availableCount }})</h2>

      <div v-if="loadingRooms" class="jira-card p-6 text-center text-xs text-[#6b778c]">
        Loading room units...
      </div>

      <div v-else-if="loadRoomsError" class="p-4 bg-[#ffebe6] border border-[#ffbdad] rounded-xs text-[#bf2600] text-xs">
        Failed to load room units: {{ loadRoomsError }}
      </div>

      <div v-else-if="publicRooms.length === 0" class="jira-card p-6 text-center text-xs text-[#6b778c]">
        No units currently available, please check back soon.
      </div>

      <template v-else>
        <div v-if="availableCount === 0" class="p-3 bg-[#deebff] border border-[#b3d4ff] rounded-xs text-[#0747a6] text-xs">
          No units currently available, please check back soon. Other listed units are shown below for reference.
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="room in publicRooms" :key="room.id" class="jira-card p-4 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <h3 class="font-bold text-base text-[#172b4d]">Room {{ room.room_number }}</h3>
                <span :class="['jira-badge', statusBadgeClass(room.operational_status)]">
                  {{ room.operational_status.toUpperCase() }}
                </span>
              </div>
              <p class="text-xs text-[#0c66e4] font-medium mb-2">{{ room.room_type }} • Floor {{ room.floor }}</p>
              <p class="text-xs text-[#5e6c84] leading-relaxed">{{ room.description }}</p>
              <p v-if="room.operational_status !== 'Available' && room.available_from" class="text-xs text-[#6b778c] mt-1">
                Available from {{ room.available_from }}
              </p>
            </div>

            <div class="border-t border-[#dfe1e6] pt-3 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-[#6b778c] block uppercase font-semibold">Monthly Rate</span>
                <strong class="text-base font-bold text-[#172b4d]">₱{{ Number(room.current_price).toLocaleString() }}/mo</strong>
              </div>

              <button
                v-if="room.operational_status !== 'Reserved'"
                @click="selectRoomForInquiry(room)"
                class="jira-btn-primary text-xs"
              >
                Inquire
              </button>
              <span v-else class="text-[10px] text-[#6b778c] italic">Reserved — not accepting inquiries</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Inquiry Submission Form Card -->
    <div class="jira-card p-6 bg-white space-y-4 max-w-2xl">
      <div class="border-b border-[#dfe1e6] pb-3">
        <h2 class="text-base font-bold text-[#172b4d]">
          Submit Inquiry{{ inquiryForm.roomNumber ? ` for Room ${inquiryForm.roomNumber}` : '' }}
        </h2>
        <p class="text-xs text-[#6b778c]">Your message will be sent directly to the landlady's central inbox.</p>
      </div>

      <div v-if="inquirySubmitted" class="p-4 bg-[#e3fcef] border border-[#abf5d1] rounded-xs text-[#006644] text-xs space-y-1">
        <strong class="font-bold text-sm">Inquiry Submitted Successfully!</strong>
        <p>Thank you, {{ inquiryForm.prospectName }}. The landlady will review your message shortly.</p>
      </div>

      <form v-else @submit.prevent="submitInquiry" class="space-y-3 text-xs">
        <p v-if="!inquiryForm.roomId" class="p-2.5 bg-[#fffae6] border border-[#f5cd47] rounded-xs text-[#826100]">
          Select a unit above using "Inquire" before submitting.
        </p>

        <div v-if="submitError" class="p-3 bg-[#ffebe6] border border-[#ffbdad] rounded-xs text-[#bf2600]">
          {{ submitError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Full Name *</label>
            <input v-model="inquiryForm.prospectName" required type="text" placeholder="e.g. Gabriel Fernandez" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Contact Phone *</label>
            <input v-model="inquiryForm.phone" required type="text" placeholder="e.g. 0917-123-4567" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Email Address *</label>
          <input v-model="inquiryForm.email" required type="email" placeholder="e.g. gabriel@gmail.com" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Message / Questions</label>
          <textarea v-model="inquiryForm.message" rows="3" placeholder="State your target move-in date, number of occupants, etc..." class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"></textarea>
        </div>

        <button type="submit" :disabled="!inquiryForm.roomId || submitting" class="jira-btn-primary w-full justify-center py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
          <Send class="w-3.5 h-3.5" />
          <span>{{ submitting ? 'Sending...' : 'Send Inquiry Message' }}</span>
        </button>
      </form>
    </div>
    </div>
  </div>
</template>
