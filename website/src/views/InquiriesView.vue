<!--
  @file views/InquiriesView.vue
  @description Public Inquiries Inbox with direct database integration and clean Atlassian spacing.
  @systemBibleRef Section 5.4 - Centralized Inquiries & Messenger Communication
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/lib/api';
import { activeInquirers, isLiveChatheadOpen, selectedInquirerId, showToast } from '@/lib/systemState';
import { ArrowRight, MessageSquare } from 'lucide-vue-next';

interface InquiryItem {
  id: string;
  prospectName: string;
  room: string;
  phone: string;
  email: string;
  date: string;
  status: string;
  message: string;
}

const inquiries = ref<InquiryItem[]>([]);
const loading = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const list = await api.get<any[]>('/admin/inquiries');
    if (list.length > 0) {
      inquiries.value = list.map(i => ({
        id: i.id,
        prospectName: i.prospect_name || 'Anonymous Visitor',
        room: i.rooms?.room_number ? `Unit ${i.rooms.room_number}` : 'General Inquiry',
        phone: i.phone_number || 'N/A',
        email: i.email_address || 'N/A',
        date: new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: i.status || 'Pending',
        message: i.message_content || 'No message contents provided.'
      }));
    } else {
      // Fallback: Let me see a sample prospect inquiry (as requested by user)
      inquiries.value = [
        {
          id: 'INQ-901',
          prospectName: 'Sophia Lopez',
          room: 'Unit 2b',
          phone: '0927-555-1234',
          email: 'sophia.lopez@gmail.com',
          date: 'Aug 19, 2026',
          status: 'Pending',
          message: 'Hello, is Unit 2b still available for move-in next week? I would like to schedule a viewing.'
        },
        {
          id: 'INQ-902',
          prospectName: 'Gabriella Santos',
          room: 'Unit 1h',
          phone: '0916-444-5678',
          email: 'gaby.santos@gmail.com',
          date: 'Aug 20, 2026',
          status: 'Contacted',
          message: 'Can I ask what the water billing rule is for Unit 1h? Is it fixed or standard?'
        }
      ];
    }
  } catch (err: any) {
    console.error('Failed to load inquiries:', err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

async function openReplyChat(inqId: string) {
  const item = inquiries.value.find(x => x.id === inqId);
  if (!item) return;

  try {
    // Soft-update status to contacted if pending
    if (item.status === 'Pending') {
      await api.patch(`/admin/inquiries/${inqId}`, {
        status: 'Contacted'
      });
      await loadData();
    }
  } catch (err: any) {
    console.error('Failed to update status:', err.message);
  }

  // Ensure inquirer exists in activeInquirers store
  let target = activeInquirers.find(i => i.id === inqId);
  if (!target) {
    activeInquirers.push({
      id: item.id,
      name: item.prospectName,
      room: item.room,
      type: 'Unit Inquirer',
      price: 6500,
      unread: false,
      messages: [
        { sender: 'Inquirer', time: 'Today', text: item.message }
      ]
    });
  }
  
  selectedInquirerId.value = inqId;
  isLiveChatheadOpen.value = true;
  showToast('info', 'Messenger Chat Head Triggered', `Directing reply channel to ${item.prospectName}.`);
}
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Inquiries Inbox</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Public Prospect Inquiries</h1>
        <p class="text-xs text-[#5e6c84]">Manage unit viewing requests, occupancy inquiries, and visitor follow-ups</p>
      </div>
    </div>

    <!-- Spaced and Mobile-Ready Inquiries Table -->
    <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6] rounded-lg shadow-xs">
      <div class="overflow-x-auto w-full">
        <table class="w-full text-left border-collapse text-xs min-w-[1000px]">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px]">
              <th class="py-3.5 px-5">Prospect Profile</th>
              <th class="py-3.5 px-5">Target Room</th>
              <th class="py-3.5 px-5">Inquiry Message</th>
              <th class="py-3.5 px-5">Contact Details</th>
              <th class="py-3.5 px-5">Date Received</th>
              <th class="py-3.5 px-5">Status</th>
              <th class="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-if="loading">
              <td colspan="7" class="p-8 text-center text-[#5e6c84] bg-[#f7f8f9]">Loading inquiries...</td>
            </tr>
            <tr v-for="inq in inquiries" :key="inq.id" class="hover:bg-[#f7f8f9] transition-colors border-b border-[#dfe1e6]/60">
              <!-- Prospect Profile -->
              <td class="py-4 px-5">
                <div class="font-bold text-[#172b4d] text-sm">{{ inq.prospectName }}</div>
                <div class="text-[#5e6c84] text-[11px] font-mono mt-0.5">{{ inq.email }}</div>
              </td>

              <!-- Target Room -->
              <td class="py-4 px-5">
                <span class="font-bold text-[#0c66e4] text-sm block">
                  {{ inq.room }}
                </span>
              </td>

              <!-- Message -->
              <td class="py-4 px-5 max-w-xs truncate">
                <div class="p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-xs text-[#172b4d] leading-relaxed select-text" :title="inq.message">
                  "{{ inq.message }}"
                </div>
              </td>

              <!-- Contact Phone -->
              <td class="py-4 px-5 text-[#5e6c84] font-medium font-subtle-num text-sm">
                {{ inq.phone }}
              </td>

              <!-- Date Received -->
              <td class="py-4 px-5 text-[#6b778c] font-medium font-subtle-num">
                {{ inq.date }}
              </td>

              <!-- Status Badge -->
              <td class="py-4 px-5">
                <span 
                  :class="[
                    'px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider',
                    inq.status === 'Pending' || inq.status === 'Pending Review' ? 'bg-[#fffae6] text-[#826100] border border-[#ffe380]' :
                    inq.status === 'Contacted' ? 'bg-[#deebff] text-[#0747a6] border border-[#b3d4ff]' :
                    'bg-[#e3fcef] text-[#006644] border border-[#abf5d1]'
                  ]"
                >
                  {{ inq.status }}
                </span>
              </td>

              <!-- Reply Action -->
              <td class="py-4 px-5 text-right">
                <button 
                  @click="openReplyChat(inq.id)"
                  class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white text-[11px] py-1.5 px-3.5 rounded-md font-semibold cursor-pointer inline-flex items-center gap-1 shadow-xs"
                >
                  <MessageSquare class="w-3.5 h-3.5" />
                  <span>Reply Chat</span>
                  <ArrowRight class="w-3 h-3" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
