<!--
  @file components/modals/AdminEditUnitModal.vue
  @description Admin modal for editing unit specs, monthly rates, occupant limits, and unit photo attachments.
  @systemBibleRef Section 3.1 - Room Directory Admin Controls
-->
<script setup lang="ts">
import { isAdminEditUnitModalOpen, activeAdminEditUnit, updateRoomUnit, requestSecondaryConfirm } from '@/lib/systemState';
import { X, Save, Image } from 'lucide-vue-next';

function closeModal() {
  isAdminEditUnitModalOpen.value = false;
}

function handleSave() {
  if (!activeAdminEditUnit.value) return;

  const unit = activeAdminEditUnit.value;
  requestSecondaryConfirm({
    title: `Review & Confirm Unit Specs (${unit.cluster})`,
    message: `Please review your modified specifications for Unit ${unit.unitCode} (${unit.cluster}):`,
    warningLevel: 'warning',
    requiresPin: true,
    confirmText: 'Confirm & Save Unit Specs',
    summaryFields: [
      { label: 'Unit Code & Cluster', value: `Unit ${unit.unitCode} (${unit.cluster})` },
      { label: 'Unit Category', value: unit.type },
      { label: 'Base Rent (₱)', value: `₱${unit.price.toLocaleString()}`, highlight: true },
      { label: 'Max Occupant Limit', value: `${unit.maxOccupants} occupants` },
      { label: 'Occupancy Status', value: unit.status.toUpperCase() },
      { label: 'Photo Attachment', value: unit.photo || 'N/A' },
      { label: 'Description Notes', value: unit.desc ? `${unit.desc.substring(0, 45)}...` : 'None' }
    ],
    onConfirm: () => {
      updateRoomUnit(unit.unitCode, {
        type: unit.type,
        price: unit.price,
        maxOccupants: unit.maxOccupants,
        status: unit.status,
        photo: unit.photo,
        desc: unit.desc
      });
      closeModal();
    }
  });
}
</script>

<template>
  <div v-if="isAdminEditUnitModalOpen && activeAdminEditUnit" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <span>Admin Edit: Unit {{ activeAdminEditUnit.unitCode }} ({{ activeAdminEditUnit.cluster }})</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84] cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="handleSave" class="p-6 space-y-3 text-xs text-[#172b4d]">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Unit Category</label>
            <select v-model="activeAdminEditUnit.type" class="jira-input">
              <option value="Studio">Studio</option>
              <option value="1-Bedroom">1-Bedroom</option>
              <option value="2-Bedroom">2-Bedroom</option>
              <option value="3-Bedroom">3-Bedroom</option>
              <option value="Penthouse Suite">Penthouse Suite</option>
              <option value="Special Unit">Special Unit</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Base Rent (₱)</label>
            <input v-model.number="activeAdminEditUnit.price" type="number" class="jira-input" required />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Max Occupants</label>
            <input v-model.number="activeAdminEditUnit.maxOccupants" type="number" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Occupancy Status</label>
            <select v-model="activeAdminEditUnit.status" class="jira-input">
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="pending">Pending Verification</option>
              <option value="overdue">Overdue Payment</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Unit Photo Filename / URL</label>
          <div class="flex gap-2 items-center">
            <Image class="w-4 h-4 text-[#5e6c84]" />
            <input v-model="activeAdminEditUnit.photo" type="text" class="jira-input" placeholder="room1a_photo.jpg" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Description & Notes</label>
          <textarea v-model="activeAdminEditUnit.desc" rows="3" class="jira-input"></textarea>
        </div>

        <div class="pt-3 border-t border-[#dfe1e6] flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1.5">
            <Save class="w-3.5 h-3.5" /> Save Unit Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
