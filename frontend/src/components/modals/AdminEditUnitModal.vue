<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { isAdminEditUnitModalOpen, activeAdminEditUnit, fetchRooms, fetchTenants, tenants, showToast, formatUnitOccupantsSummary, type RoomItem } from '@/lib/systemState';
import { peso, CANONICAL_32_UNITS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Check, Loader2, Upload, ChevronDown, Users } from 'lucide-vue-next';

const unit = ref<RoomItem | null>(null);

const UNIT_TYPE_CHOICES = [
  'Studio',
  '1 Bedroom',
  '2 Bedroom',
  '3 Bedroom',
] as const;

const OPERATIONAL_STATUS_OPTIONS = [
  'Available',
  'Occupied',
  'Reserved',
  'Under Maintenance',
] as const;

function normalizeUnitType(val?: string): string {
  if (!val) return 'Studio';
  const lower = val.toLowerCase();
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('3') || lower.includes('penthouse')) return '3 Bedroom';
  if (lower.includes('2')) return '2 Bedroom';
  if (lower.includes('1')) return '1 Bedroom';
  return 'Studio';
}

function mapUnitStatusToOperational(status?: string): 'Available' | 'Occupied' | 'Reserved' | 'Under Maintenance' {
  if (!status) return 'Available';
  const s = status.toLowerCase();
  if (s === 'occupied' || s === 'settled' || s === 'pending' || s === 'overdue') return 'Occupied';
  if (s === 'reserved') return 'Reserved';
  if (s === 'under maintenance' || s === 'maintenance') return 'Under Maintenance';
  return 'Available';
}

// Form Fields matching Screenshot 2
const monthlyRate = ref<number>(5000);
const unitType = ref<string>('1 Bedroom');
const editStatus = ref<'Available' | 'Occupied' | 'Reserved' | 'Under Maintenance'>('Available');
const billingRule = ref<string>('Rent + ₱200 / occupant water');
const amenitiesText = ref<string>('Private bathroom, Submetered electricity, Study desk');
const editPhotoUrl = ref<string>('');
const isSaving = ref(false);

const occupantsSummary = computed(() => {
  if (!unit.value) return { text: 'No active residents', count: 0, residents: [] };
  return formatUnitOccupantsSummary(unit.value.unitCode);
});

const dynamicOccupants = computed(() => {
  return occupantsSummary.value.count;
});

const fileInputRef = ref<HTMLInputElement | null>(null);
const isUploadingPhoto = ref(false);
const uploadedFileName = ref<string>('');
const uploadedFileSize = ref<string>('');

const unitPhoto = computed(() => {
  return editPhotoUrl.value || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70';
});

watch(
  () => activeAdminEditUnit.value,
  (newVal) => {
    if (newVal) {
      if (tenants.length === 0) {
        fetchTenants();
      }
      unit.value = newVal;
      monthlyRate.value = newVal.price;
      unitType.value = normalizeUnitType(newVal.type);
      editStatus.value = mapUnitStatusToOperational(newVal.status);
      billingRule.value = newVal.billingRule || 'Rent + ₱200 / occupant water';
      amenitiesText.value = newVal.desc || newVal.amenities.join(', ');
      editPhotoUrl.value = newVal.photo || '';
      uploadedFileName.value = '';
      uploadedFileSize.value = '';
    }
  },
  { immediate: true }
);

function closeModal() {
  isAdminEditUnitModalOpen.value = false;
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

/**
 * Compresses an image client-side to a web-optimized JPEG Data URL (BLOB)
 */
function compressImage(file: File, maxWidth = 1280, maxHeight = 960, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('error', 'Invalid File', 'Please select a valid image file (JPG, PNG, WebP).');
    return;
  }

  isUploadingPhoto.value = true;
  try {
    const compressed = await compressImage(file);
    editPhotoUrl.value = compressed;
    uploadedFileName.value = file.name;
    const kb = Math.round((compressed.length * 3 / 4) / 1024);
    uploadedFileSize.value = `${kb} KB`;
    showToast('info', 'Photo Attached', `Ready to save: ${file.name} (~${kb} KB).`);
  } catch (err: any) {
    showToast('error', 'Upload Error', 'Could not process selected image.');
  } finally {
    isUploadingPhoto.value = false;
  }
}

async function handleSave() {
  if (!unit.value) return;
  isSaving.value = true;

  try {
    const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
    const matched = allRooms.find((r) => r.room_number.toLowerCase() === unit.value?.unitCode.toLowerCase());
    if (matched) {
      await api.patch(`/admin/rooms/${matched.id}`, {
        current_price: Number(monthlyRate.value),
        description: amenitiesText.value,
        room_type: unitType.value,
        operational_status: editStatus.value,
        photo: editPhotoUrl.value,
      });
    }

    // Refresh reactive rooms cache across the app
    await fetchRooms();

    // Apply to local reactive state
    unit.value.price = Number(monthlyRate.value);
    unit.value.occupants = dynamicOccupants.value;
    unit.value.type = unitType.value;
    unit.value.desc = amenitiesText.value;
    unit.value.photo = editPhotoUrl.value;

    showToast(
      'success',
      `Unit ${unit.value.unitCode.toUpperCase()} Updated`,
      `Status set to ${editStatus.value} at ${peso(unit.value.price)}/mo.`
    );

    closeModal();
  } catch (err: any) {
    showToast('error', 'Save Failed', err?.message || 'Could not save unit changes.');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div
    v-if="isAdminEditUnitModalOpen && unit"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="closeModal"
  >
    <!-- Modal Card (Screenshot 2) -->
    <div
      class="surface-card w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl bg-white animate-in fade-in zoom-in-95 duration-150 my-6"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 pb-4 border-b border-[#e7e5e4]">
        <div>
          <h3 class="font-display font-black text-xl text-[#1c1917] tracking-tight uppercase">
            UNIT {{ unit.unitCode.toUpperCase() }} — RATE &amp; SPECS
          </h3>
          <p class="text-xs text-[#71717a] mt-0.5">
            {{ unit.cluster }} · Floor {{ unit.floor }} · {{ unit.type }}
          </p>
        </div>
        <button
          @click="closeModal"
          class="grid size-9 place-items-center rounded-full text-[#71717a] hover:bg-[#f5f5f4] border border-[#e7e5e4] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X class="size-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSave" class="p-6 space-y-4 text-xs text-[#1c1917] max-h-[75vh] overflow-y-auto">
        
        <!-- Room Photo Upload (BLOB Database Storage) -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a]">
              ROOM PHOTO
            </label>
            <span v-if="uploadedFileName" class="text-[10px] font-medium text-emerald-700">
              Selected: {{ uploadedFileName }} ({{ uploadedFileSize }})
            </span>
          </div>

          <!-- Hidden File Input -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onFileSelected"
          />

          <!-- Upload Dropzone & Photo Card -->
          <div class="relative group rounded-2xl overflow-hidden border border-[#e7e5e4] bg-[#fafaf9] transition-all">
            <div class="h-44 w-full relative bg-neutral-900">
              <img
                :src="unitPhoto"
                :alt="`Unit ${unit.unitCode}`"
                class="size-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

              <div class="absolute bottom-3 left-3 flex items-center gap-2">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/90 text-[#1c1917] shadow-xs uppercase tracking-wider backdrop-blur-xs">
                  {{ unit.cluster }}
                </span>
                <span v-if="editPhotoUrl.startsWith('data:')" class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-600 text-white shadow-xs">
                  New Photo Selected
                </span>
              </div>
            </div>

            <!-- Upload Action Bar -->
            <div class="p-3 bg-white border-t border-[#e7e5e4] flex items-center justify-between gap-3">
              <span class="text-xs text-[#71717a]">
                {{ uploadedFileName ? uploadedFileName : 'PNG, JPG, or WebP' }}
              </span>

              <button
                type="button"
                @click="triggerFileInput"
                :disabled="isUploadingPhoto"
                class="btn-secondary shrink-0"
              >
                <Upload class="size-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Monthly Rate -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
            MONTHLY RATE (₱)
          </label>
          <input
            v-model.number="monthlyRate"
            type="number"
            min="0"
            step="100"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-base font-bold text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
            required
          />
        </div>

        <!-- Dynamic Registered Occupants (Based on actual tenants residing) -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a]">
              REGISTERED OCCUPANTS
            </label>
            <span class="text-[10px] font-semibold text-[#0c66e4]">
              (Calculated dynamically from active tenant records)
            </span>
          </div>

          <div class="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-3.5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="grid size-9 place-items-center rounded-lg bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 shrink-0">
                <Users class="size-4" />
              </div>
              <div>
                <p class="font-display font-extrabold text-sm text-[#1c1917]">
                  {{ occupantsSummary.count }} {{ occupantsSummary.count === 1 ? 'Registered Occupant' : 'Registered Occupants' }}
                </p>
                <p class="text-[11px] text-[#71717a] mt-0.5">
                  <template v-if="occupantsSummary.count > 0">
                    Active resident(s): <strong class="text-[#1c1917]">{{ occupantsSummary.text }}</strong>
                  </template>
                  <template v-else>
                    No active tenants currently assigned to Unit {{ unit.unitCode.toUpperCase() }}
                  </template>
                </p>
              </div>
            </div>

            <span :class="[
              'badge-soft text-[10px] font-bold px-2.5 py-1 rounded-md shrink-0',
              occupantsSummary.count > 0 ? 'badge-success' : 'badge-neutral'
            ]">
              {{ occupantsSummary.count > 0 ? 'Occupied' : 'Vacant' }}
            </span>
          </div>
        </div>

        <!-- 2-Column: Unit Type & Operational Status Dropdowns -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Unit Type Dropdown -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
              UNIT TYPE
            </label>
            <div class="relative">
              <select
                v-model="unitType"
                class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm font-semibold text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors cursor-pointer appearance-none pr-10"
                required
              >
                <option v-for="opt in UNIT_TYPE_CHOICES" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#71717a]">
                <ChevronDown class="size-4" />
              </div>
            </div>
          </div>

          <!-- Operational Status Dropdown -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
              OPERATIONAL STATUS
            </label>
            <div class="relative">
              <select
                v-model="editStatus"
                class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm font-semibold text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors cursor-pointer appearance-none pr-10"
                required
              >
                <option v-for="opt in OPERATIONAL_STATUS_OPTIONS" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#71717a]">
                <ChevronDown class="size-4" />
              </div>
            </div>
          </div>
        </div>

        <!-- Billing Rule -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
            BILLING RULE
          </label>
          <input
            v-model="billingRule"
            type="text"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
            required
          />
        </div>

        <!-- Amenities / Inclusions Textarea -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
            AMENITIES / INCLUSIONS
          </label>
          <textarea
            v-model="amenitiesText"
            rows="3"
            class="w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-3 text-xs leading-relaxed text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors resize-none"
            placeholder="Separate items with commas..."
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="pt-3 border-t border-[#e7e5e4] flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="closeModal"
            class="btn-secondary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            :disabled="isSaving"
            class="btn-primary"
          >
            <Loader2 v-if="isSaving" class="size-3.5 animate-spin" />
            <Check v-else class="size-3.5 text-white" />
            <span>{{ isSaving ? 'Saving…' : 'Save Changes' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
