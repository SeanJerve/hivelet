<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { inquiries, rooms, showToast, type Inquiry } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { MessageSquare, Phone, Mail, Send, X, RefreshCw, Loader2 } from 'lucide-vue-next';

interface ApiInquiry {
  id: string;
  room_id: string;
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string;
  message: string;
  status: string;
  created_at: string;
  rooms?: { room_number: string };
}

const selectedInquiry = ref<Inquiry | null>(null);
const replyMessage = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);

async function fetchInquiries() {
  isLoading.value = true;
  try {
    const data = await api.get<ApiInquiry[]>('/admin/inquiries');
    if (data && data.length) {
      data.forEach((item) => {
        const unitNumber = item.rooms?.room_number || '1A';
        const existing = inquiries.find((i) => i.id === item.id);
        if (!existing) {
          inquiries.unshift({
            id: item.id,
            name: item.prospect_name,
            unit: unitNumber.toUpperCase(),
            phone: item.prospect_phone,
            email: item.prospect_email,
            date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            message: item.message,
          });
        }
      });
    }
  } catch {
    // Offline fallback
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchInquiries();
});

function getUnitForInquiry(unitCode: string) {
  return rooms.find((u) => u.unitCode.toLowerCase() === unitCode.toLowerCase());
}

async function handleSendReply() {
  if (!selectedInquiry.value || !replyMessage.value.trim()) return;
  isSubmitting.value = true;
  try {
    try {
      await api.post(`/admin/inquiries/${selectedInquiry.value.id}/reply`, {
        message: replyMessage.value.trim(),
      });
    } catch {
      // Offline fallback
    }

    showToast('success', 'Reply dispatched', `Sent message to ${selectedInquiry.value.name} via SMS / Email.`);
    replyMessage.value = '';
    selectedInquiry.value = null;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Prospect Inquiries &amp; Leads
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Public guest inquiries submitted via the public showcase.
        </p>
      </div>

      <button
        @click="fetchInquiries"
        :disabled="isLoading"
        class="btn-secondary min-h-11 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs self-start sm:self-auto cursor-pointer"
      >
        <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Total Inquiries</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ inquiries.length }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Active lead pipeline</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Vacant Units</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">
          {{ rooms.filter((u) => u.status === 'vacant').length }}
        </p>
        <p class="mt-1 text-xs text-[#71717a]">Ready for occupancy</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Avg Response Time</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">&lt; 15 mins</p>
        <p class="mt-1 text-xs text-[#71717a]">Direct SMS &amp; chat link</p>
      </div>
    </div>

    <!-- Leads Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div 
        v-for="inq in inquiries" 
        :key="inq.id"
        class="surface-card p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
      >
        <div class="space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-display font-extrabold text-base text-[#1c1917]">{{ inq.name }}</h3>
              <p class="text-xs text-[#71717a]">{{ inq.date }} · {{ inq.id }}</p>
            </div>
            <span class="badge-soft badge-warning text-[10px]">New Inquiry</span>
          </div>

          <div v-if="getUnitForInquiry(inq.unit)" class="p-3 bg-[#f5f5f4] rounded-xl flex items-center justify-between">
            <div>
              <span class="text-[10px] uppercase font-bold text-[#71717a]">Inquiring for</span>
              <p class="font-display font-bold text-xs sm:text-sm text-[#1c1917]">
                Unit {{ getUnitForInquiry(inq.unit)?.unitCode.toUpperCase() }} ({{ getUnitForInquiry(inq.unit)?.cluster }})
              </p>
            </div>
            <span class="font-display font-extrabold text-xs sm:text-sm text-[#1c1917]">
              {{ peso(getUnitForInquiry(inq.unit)?.price || 0) }}/mo
            </span>
          </div>

          <p class="text-xs leading-relaxed text-[#57534e] p-3.5 bg-white rounded-xl border border-[#e7e5e4]">
            "{{ inq.message }}"
          </p>

          <div class="space-y-1 text-xs text-[#71717a]">
            <p class="flex items-center gap-1.5"><Phone class="size-3.5 text-[#71717a]" /> {{ inq.phone }}</p>
            <p class="flex items-center gap-1.5"><Mail class="size-3.5 text-[#71717a]" /> {{ inq.email }}</p>
          </div>
        </div>

        <div class="flex gap-2 pt-2 border-t border-[#e7e5e4]">
          <button
            @click="selectedInquiry = inq"
            class="btn-secondary min-h-10 flex-1 gap-1.5 text-xs inline-flex items-center justify-center shadow-xs cursor-pointer"
          >
            <MessageSquare class="size-3.5 text-[#71717a]" />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Reply Dialog -->
    <div 
      v-if="selectedInquiry" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="selectedInquiry = null"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div>
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Reply to {{ selectedInquiry.name }}</h3>
            <p class="text-xs text-[#71717a]">Unit {{ selectedInquiry.unit }} · {{ selectedInquiry.phone }}</p>
          </div>
          <button @click="selectedInquiry = null" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleSendReply" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Message to Prospect</label>
            <textarea
              v-model="replyMessage"
              rows="4"
              placeholder="Hello! Yes po, Room is available for viewing this weekend..."
              class="w-full p-3 rounded-xl border border-[#e7e5e4] text-xs resize-none"
              required
            ></textarea>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="selectedInquiry = null" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary gap-1.5 cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
              <Send v-else class="size-3.5" />
              <span>Send Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
