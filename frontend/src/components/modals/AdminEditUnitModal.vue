<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import { ref, watch, computed } from 'vue';
import { isAdminEditUnitModalOpen, activeAdminEditUnit, fetchRooms, fetchTenants, tenants, showToast, formatUnitOccupantsSummary, type RoomItem } from '@/lib/systemState';
import type { UnitStatus } from '@/lib/canonicalUnits';
import { peso, CANONICAL_UNITS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Check, Loader2, Upload, ImageOff } from 'lucide-vue-next';
import StatusPill from '@/components/overview/StatusPill.vue';

const VISIBILITY_OPTIONS = [
  { value: 'Published', label: 'Listed, and open to enquiries' },
  { value: 'Hidden', label: 'Not listed, and closed to enquiries' },
];

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

/**
 * The exact inverse of `mapOperationalStatus` in systemState, which is what turned
 * the database value into the `UnitStatus` this modal receives.
 *
 * It has to be the inverse, because `operational_status` is sent on every save of
 * this modal - including a save that only changes the rent. Whatever this returns
 * is written back over the unit's real standing.
 *
 * It was not the inverse. `'pending'` is the `UnitStatus` that `mapOperationalStatus`
 * produces from a **Reserved** unit, and this mapped it to `'Occupied'`. So opening
 * a reserved unit and pressing Save - to correct a typo in its description, or set a
 * photo - silently reclassified it as occupied, and the toast then reported that as
 * a success. A unit held for someone arriving next month would read as tenanted, and
 * drop off the list of what is free to let.
 *
 * The other three round-tripped correctly by luck rather than by design, and the
 * branches for 'occupied', 'overdue' and 'reserved' were dead: `UnitStatus` is
 * (settled | pending | vacant | maintenance) and never carries any of those words.
 *
 * Switching exhaustively on the union means adding a fifth `UnitStatus` fails the
 * build here rather than quietly writing 'Available' over it.
 */
function mapUnitStatusToOperational(status?: UnitStatus): 'Available' | 'Occupied' | 'Reserved' | 'Under Maintenance' {
  if (!status) return 'Available';
  switch (status) {
    case 'settled':
      return 'Occupied';
    case 'pending':
      return 'Reserved';
    case 'maintenance':
      return 'Under Maintenance';
    case 'vacant':
      return 'Available';
  }
  // No `default`. A fifth `UnitStatus` reaches this line, and the `never`
  // assignment fails the build here - which is the point. A default branch
  // would have silently written 'Available' over whatever it was.
  const unhandled: never = status;
  return unhandled;
}

// Form Fields matching Screenshot 2
// Zero rather than a plausible figure. This writes rooms.current_price, which
// becomes the advance rent at move-in (BR-039) and every bill after it.
const monthlyRate = ref<number>(0);
const unitType = ref<string>('One-bedroom');
const editStatus = ref<'Available' | 'Occupied' | 'Reserved' | 'Under Maintenance'>('Available');
/**
 * How this unit is billed, shown so the rent above can be read in context.
 *
 * It is derived, not stored. `buildBillingRule` in systemState composes it from the
 * water rates on every fetch - ₱200 a head under BR-014, or Linda's fixed monthly
 * figure under BR-040 - and there is no `billing_rule` column for it to be saved to.
 *
 * It was a `required` text input bound to a writable ref, so it invited the landlady
 * to type a different arrangement. Nothing sent it anywhere. The sentence she typed
 * survived until the next `fetchRooms`, then reverted, and the bills had been raised
 * on the real rate the whole time. Read-only and derived, so it can only report.
 *
 * Changing how a unit is billed means changing the water rate, which BR-003 keeps a
 * dated history of - it is not free text on a unit.
 */
const billingRule = computed(() => unit.value?.billingRule || '');
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

/**
 * Whether the current photograph has actually finished loading.
 *
 * Both sources this can show - a URL already on the record, or the data URL
 * `compressImage` just produced - take a moment to decode, and without this
 * the frame popped straight from empty to fully painted the instant the
 * bytes arrived. Reset whenever the source itself changes, so switching units
 * or attaching a new photo fades the new one in rather than carrying over
 * "loaded" from whatever was there before.
 */
const isPhotoLoaded = ref(false);
watch(unitPhoto, () => {
  isPhotoLoaded.value = false;
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
      /**
       * The RAW description, never the display fallback.
       *
       * This read `newVal.desc || newVal.amenities.join(', ')`. Both are
       * invented when the column is empty: `desc` falls back to
       * "<type> unit in <cluster>." and `amenities` is a four-item literal
       * identical for all 33 units. Whichever won was then PATCHed back by the
       * save below, so editing the rate on a unit with no description wrote one
       * that nobody had written.
       *
       * Empty stays empty. The field shows a placeholder instead.
       */
      amenitiesText.value = newVal.rawDesc ?? '';
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

    // A miss used to fall straight through: no PATCH was sent, and the code below
    // still refreshed, still wrote the new figures onto the local object, and still
    // showed "Unit 2C Updated - Status set to Occupied at ₱6,500/mo." The rent had
    // not moved. The next hard refresh put the old figure back, and the only record
    // of the edit was a success message the landlady had already believed.
    //
    // Nothing recoverable happens on a miss, so it is an error, not a quiet no-op.
    if (!matched) {
      throw new Error(
        `No unit numbered "${unit.value.unitCode.toUpperCase()}" came back from the server, so nothing was saved. Reload the unit list and try again.`
      );
    }

    await api.patch(`/admin/rooms/${matched.id}`, {
      current_price: Number(monthlyRate.value),
      // Empty means empty, not the empty string: leaving it blank must clear
      // the column rather than replace a null with ''. The schema takes nullish.
      description: amenitiesText.value.trim() === '' ? null : amenitiesText.value,
      room_type: unitType.value,
      operational_status: editStatus.value,
      visibility_status: editVisibility.value,
      photo: editPhotoUrl.value,
    });

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
      <!--
        Capped and scrollable on a phone, for the reason `OnsitePaymentModal`
        sets out at length: this form's Cancel and "Save changes" live in
        `WsModal`'s footer slot, which is drawn after the body, so the only way
        to keep them on screen is to stop the body being taller than the screen.
        A photograph, seven controls and three helper paragraphs is a long way
        past 812px.

        `dvh` rather than `vh` (the phone's bars are showing when this opens),
        and `px-1.5 -mx-1.5` so the 3px focus ring is not clipped by the scroll
        container, which clips on both axes. All of it is off again at `sm`.
      -->
      <form
        id="edit-unit-form"
        @submit.prevent="handleSave"
        class="flex flex-col gap-5 max-h-[60dvh] overflow-y-auto px-1.5 -mx-1.5 sm:mx-0 sm:max-h-none sm:overflow-visible sm:px-0"
      >
        <!-- The photograph -->
        <div class="ws-field">
          <span>Photograph</span>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="sr-only"
            aria-label="Choose a photograph of this unit"
            @change="onFileSelected"
          />

          <div class="overflow-hidden rounded-2xl bg-canvas">
            <div class="relative h-44 w-full bg-night">
              <!--
                Faded in on `@load` rather than shown the instant the `src`
                is set, so a slow connection sees the dark frame it is already
                sitting in rather than a hard pop once the bytes land.
                `@error` also counts as "loaded" - a broken photograph should
                show its broken state immediately, not stay invisible forever
                waiting for an event that will never fire.
              -->
              <img
                v-if="unitPhoto"
                :src="unitPhoto"
                :alt="`Unit ${unit.unitCode}`"
                class="size-full object-cover transition-opacity duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                :class="isPhotoLoaded ? 'opacity-100' : 'opacity-0'"
                @load="isPhotoLoaded = true"
                @error="isPhotoLoaded = true"
              />
              <div
                v-else
                class="flex size-full flex-col items-center justify-center gap-2 text-on-night-soft"
              >
                <ImageOff class="size-6" aria-hidden="true" />
                <span class="text-sm">No photograph on file</span>
              </div>

              <span
                v-if="editPhotoUrl.startsWith('data:')"
                class="ws-reveal absolute bottom-3 left-3 rounded-full bg-tile px-3 py-1 text-xs font-semibold text-brand"
              >
                Chosen, not saved yet
              </span>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 p-3">
              <span class="min-w-0 truncate text-sm text-ink-soft">
                {{ uploadedFileName ? `${uploadedFileName} (${uploadedFileSize})` : 'PNG, JPG or WebP' }}
              </span>

              <button
                type="button"
                class="pill-btn shrink-0"
                :disabled="isUploadingPhoto"
                @click="triggerFileInput"
              >
                <Upload class="size-3.5" aria-hidden="true" />
                <span>Choose a photograph</span>
              </button>
            </div>
          </div>
        </div>

        <!-- `step="any"` like every other money field. It was `step="100"`, so a
             rate off the hundred could not be saved at all: unit 1D's live ₱7,250
             was refused by the browser before the form submitted (B-61). -->
        <label class="ws-field">
          Rent a month
          <input
            v-model.number="monthlyRate"
            type="number"
            min="0"
            step="any"
            class="ws-input w-full"
            required
          />
        </label>

        <!-- Read from the tenancy records, not typed here. -->
        <div class="ws-field">
          <span>Who lives here</span>
          <div class="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink">
                <template v-if="occupantsSummary.count > 0">{{ occupantsSummary.text }}</template>
                <template v-else>Nobody</template>
              </p>
              <p class="ws-hint mt-0.5">
                Counted from the tenancy records. Change it by moving someone in or out.
              </p>
            </div>
            <StatusPill :tone="occupantsSummary.count > 0 ? 'paid' : 'neutral'">
              {{ occupantsSummary.count > 0 ? 'Occupied' : 'Vacant' }}
            </StatusPill>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="ws-field">
            Kind of unit
            <PillSelect v-model="unitType" :options="[...UNIT_TYPE_CHOICES]" aria-label="Kind of unit" widthClass="w-full" />
          </label>

          <label class="ws-field">
            Standing
            <PillSelect v-model="editStatus" :options="[...OPERATIONAL_STATUS_OPTIONS]" aria-label="Standing" widthClass="w-full" />
          </label>
        </div>

        <!-- Public visibility - the column existed and the API accepted it; nothing sent it. -->
        <label class="ws-field">
          On the public site
          <PillSelect v-model="editVisibility" :options="VISIBILITY_OPTIONS" aria-label="On the public site" widthClass="w-full" />
          <span class="ws-hint">
            Hiding a unit takes it off the public room pages and stops the enquiry form accepting
            messages about it. Anyone already living there is unaffected.
          </span>
        </label>

        <label class="ws-field">
          How it is billed
          <input :value="billingRule" type="text" class="ws-input w-full" readonly disabled />
          <span class="ws-hint">
            Worked out from the water rate, not stored on the unit. To change it, change the
            water rate - the rate history is what the bills are raised from.
          </span>
        </label>

        <label class="ws-field">
          What comes with it
          <textarea
            v-model="amenitiesText"
            rows="3"
            class="ws-textarea w-full"
            placeholder="Separate each one with a comma"
          ></textarea>
        </label>
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
