<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import { ref, watch, computed } from 'vue';
import { isAdminEditUnitModalOpen, activeAdminEditUnit, fetchRooms, fetchTenants, tenants, showToast, formatUnitOccupantsSummary, type RoomItem } from '@/lib/systemState';
import { peso, CANONICAL_UNITS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Check, Loader2, Upload, ChevronDown, Users, ShieldCheck, Home, ImageOff } from 'lucide-vue-next';

const unit = ref<RoomItem | null>(null);

/**
 * These must be the values of the `room_type_enum` database type, exactly.
 *
 * They used to read 'Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom'. Only the first is a
 * real enum value — the type is `Studio | One-bedroom | Two-bedroom | Three-bedroom` — and
 * `room_type` is sent on every save of this modal, including saves that only change the
 * rent. So editing any of the 13 non-Studio units wrote an invalid enum value and the
 * update was rejected by PostgreSQL (22P02). Twenty units are Studio and saved fine, which
 * is why it was not obvious.
 */
const UNIT_TYPE_CHOICES = [
  'Studio',
  'One-bedroom',
  'Two-bedroom',
  'Three-bedroom',
] as const;

const OPERATIONAL_STATUS_OPTIONS = [
  'Available',
  'Occupied',
  'Reserved',
  'Under Maintenance',
] as const;

/**
 * Coerces whatever a room record carries into a valid `room_type_enum` value, so the
 * select always has something to show and always saves something the column accepts.
 * Tolerant of the older loose spellings ('1 Bedroom', '3BR', 'penthouse') that this modal
 * itself used to produce.
 */
function normalizeUnitType(val?: string): string {
  if (!val) return 'Studio';
  const lower = val.toLowerCase();
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('3') || lower.includes('three') || lower.includes('penthouse')) return 'Three-bedroom';
  if (lower.includes('2') || lower.includes('two')) return 'Two-bedroom';
  if (lower.includes('1') || lower.includes('one')) return 'One-bedroom';
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
// Zero rather than a plausible figure. This writes rooms.current_price, which
// becomes the advance rent at move-in (BR-039) and every bill after it.
const monthlyRate = ref<number>(0);
const unitType = ref<string>('One-bedroom');
const editStatus = ref<'Available' | 'Occupied' | 'Reserved' | 'Under Maintenance'>('Available');
const billingRule = ref<string>('Rent + ₱200 / occupant water');
// Empty by default. This field is written straight to `rooms.description` on
// save, so a default of 'Private bathroom, Submetered electricity, Study desk'
// meant that opening a unit and pressing Save could overwrite the unit's real
// description with a sentence describing no unit in particular.
const amenitiesText = ref<string>('');
const editPhotoUrl = ref<string>('');

/**
 * Whether the unit appears on the public site.
 *
 * `visibility_status_type` is (Published | Hidden) and the admin API has accepted both since
 * the schema was written, but no control ever sent one - so every unit was permanently
 * Published, including one under maintenance or held back for a returning resident.
 *
 * Hidden is not cosmetic: `public.ts` filters both public listings on Published AND refuses
 * an inquiry for a room that is not Published, so hiding a unit stops new enquiries for it.
 */
const editVisibility = ref<'Published' | 'Hidden'>('Published');
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
  // No stock photograph stands in for a unit that has none on file.
  return editPhotoUrl.value || '';
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
      editVisibility.value = newVal.visibility === 'Hidden' ? 'Hidden' : 'Published';
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
        visibility_status: editVisibility.value,
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
  <WsModal
    v-if="isAdminEditUnitModalOpen && unit"
    :title="`Unit ${unit.unitCode.toUpperCase()}`"
    :subtitle="`${unit.cluster}, floor ${unit.floor}, ${unit.type}`"
    size="lg"
    :dismissible="false"
    @close="closeModal"
  >
      <form id="edit-unit-form" @submit.prevent="handleSave" class="flex flex-col gap-5">
        
        <!-- Room Photo Upload (BLOB Database Storage) -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block font-semibold text-xs text-ink-soft">
              ROOM PHOTO
            </label>
            <span v-if="uploadedFileName" class="text-xs font-medium text-brand">
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
          <div class="relative group rounded-tile overflow-hidden border border-line bg-canvas transition-all">
            <div class="h-44 w-full relative bg-neutral-900">
              <img
                v-if="unitPhoto"
                :src="unitPhoto"
                :alt="`Unit ${unit.unitCode}`"
                class="size-full object-cover"
              />
              <div
                v-else
                class="size-full flex flex-col items-center justify-center gap-2 text-white/70"
              >
                <ImageOff class="size-7" />
                <span class="text-xs font-semibold">No photo on file — upload one below</span>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

              <div class="absolute bottom-3 left-3 flex items-center gap-2">
                <span class="badge-soft badge-neutral bg-tile/95 font-semibold backdrop-blur-xs">
                  {{ unit.cluster }}
                </span>
                <span v-if="editPhotoUrl.startsWith('data:')" class="badge-soft badge-success bg-tile/95 font-semibold">
                  New Photo Selected
                </span>
              </div>
            </div>

            <!-- Upload Action Bar -->
            <div class="p-3 bg-tile border-t border-line flex items-center justify-between gap-3">
              <span class="text-xs text-ink-soft">
                {{ uploadedFileName ? uploadedFileName : 'PNG, JPG, or WebP' }}
              </span>

              <button
                type="button"
                @click="triggerFileInput"
                :disabled="isUploadingPhoto"
                class="pill-btn shrink-0"
              >
                <Upload class="size-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Monthly Rate -->
        <div>
          <label class="mb-1.5 block text-xs text-ink-faint">
            MONTHLY RATE (₱)
          </label>
          <input
            v-model.number="monthlyRate"
            type="number"
            min="0"
            step="100"
            class="ws-input w-full"
            required
          />
        </div>

        <!-- Dynamic Registered Occupants (Based on actual tenants residing) -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block font-semibold text-xs text-ink-soft">
              REGISTERED OCCUPANTS
            </label>
            <span class="text-xs font-semibold text-brand">
              (Calculated dynamically from active tenant records)
            </span>
          </div>

          <div class="rounded-xl border border-line bg-canvas p-3.5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand ring-1 ring-brand-soft shrink-0">
                <Users class="size-4" />
              </div>
              <div>
                <p class="font-semibold text-sm text-ink">
                  {{ occupantsSummary.count }} {{ occupantsSummary.count === 1 ? 'Registered Occupant' : 'Registered Occupants' }}
                </p>
                <p class="text-xs text-ink-soft mt-0.5">
                  <template v-if="occupantsSummary.count > 0">
                    Active resident(s): <strong class="text-ink">{{ occupantsSummary.text }}</strong>
                  </template>
                  <template v-else>
                    No active tenants currently assigned to Unit {{ unit.unitCode.toUpperCase() }}
                  </template>
                </p>
              </div>
            </div>

            <span :class="[ 'badge-soft text-xs font-semibold shrink-0', occupantsSummary.count > 0 ? 'badge-success' : 'badge-neutral' ]">
              {{ occupantsSummary.count > 0 ? 'Occupied' : 'Vacant' }}
            </span>
          </div>
        </div>

        <!-- 2-Column: Unit Type & Operational Status Dropdowns -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Unit Type Dropdown -->
          <div>
            <label class="mb-1.5 block text-xs text-ink-faint">
              UNIT TYPE
            </label>
            <div class="relative">
              <select
                v-model="unitType"
                class="ws-select w-full pr-10"
                required
              >
                <option v-for="opt in UNIT_TYPE_CHOICES" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-soft">
                <ChevronDown class="size-4" />
              </div>
            </div>
          </div>

          <!-- Operational Status Dropdown -->
          <div>
            <label class="mb-1.5 block text-xs text-ink-faint">
              OPERATIONAL STATUS
            </label>
            <div class="relative">
              <select
                v-model="editStatus"
                class="ws-select w-full pr-10"
                required
              >
                <option v-for="opt in OPERATIONAL_STATUS_OPTIONS" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-soft">
                <ChevronDown class="size-4" />
              </div>
            </div>
          </div>
        </div>

        <!-- Public visibility - the column existed and the API accepted it; nothing sent it. -->
        <div>
          <label class="mb-1.5 block text-xs text-ink-faint">
            PUBLIC LISTING
          </label>
          <div class="relative">
            <select
              v-model="editVisibility"
              class="ws-select w-full pr-10"
              required
            >
              <option value="Published">Published — shown on the public site</option>
              <option value="Hidden">Hidden — not listed, no new enquiries</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-soft">
              <ChevronDown class="size-4" />
            </div>
          </div>
          <p class="text-xs text-ink-soft mt-1">
            Hiding a unit removes it from both public room pages and stops the enquiry form
            accepting messages about it. Residents already in the unit are unaffected.
          </p>
        </div>

        <!-- Billing Rule -->
        <div>
          <label class="mb-1.5 block text-xs text-ink-faint">
            BILLING RULE
          </label>
          <input
            v-model="billingRule"
            type="text"
            class="ws-input w-full"
            required
          />
        </div>

        <!-- Amenities / Inclusions Textarea -->
        <div>
          <label class="mb-1.5 block text-xs text-ink-faint">
            AMENITIES / INCLUSIONS
          </label>
          <textarea
            v-model="amenitiesText"
            rows="3"
            class="ws-textarea w-full"
            placeholder="Separate items with commas..."
          ></textarea>
        </div>

      </form>

    <template #actions>
      <button type="button" class="pill-btn" @click="closeModal">Cancel</button>
      <button type="submit" form="edit-unit-form" :disabled="isSaving" class="pill-btn-brand">
        <Loader2 v-if="isSaving" class="size-4 animate-spin" aria-hidden="true" />
        <Check v-else class="size-4" aria-hidden="true" />
        {{ isSaving ? 'Saving' : 'Save changes' }}
      </button>
    </template>
  </WsModal>
</template>
