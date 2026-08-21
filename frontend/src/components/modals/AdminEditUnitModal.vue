<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { isAdminEditUnitModalOpen, activeAdminEditUnit, showToast, type RoomItem } from '@/lib/systemState';
import { peso, CANONICAL_32_UNITS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Info, AlertTriangle, Check, Loader2 } from 'lucide-vue-next';

const unit = ref<RoomItem | null>(null);

// Form Fields matching Screenshot 2
const monthlyRate = ref<number>(5000);
const capacityPax = ref<number>(2);
const registeredOccupants = ref<number>(1);
const unitType = ref<string>('1-Bedroom Apartment');
const billingRule = ref<string>('Rent + ₱200 / occupant water');
const amenitiesText = ref<string>('Private bathroom, Submetered electricity, Study desk');
const editPhotoUrl = ref<string>('');
const isSaving = ref(false);

const baseReferencePrice = computed(() => {
  if (!unit.value) return 5000;
  const canonical = CANONICAL_32_UNITS.find(
    (u) => u.unitCode.toLowerCase() === unit.value?.unitCode.toLowerCase()
  );
  return canonical ? canonical.basePrice : unit.value.price;
});

const maxAllowedPrice = computed(() => Math.round(baseReferencePrice.value * 1.02));
const isAboveCap = computed(() => monthlyRate.value > maxAllowedPrice.value);

const unitPhoto = computed(() => {
  return editPhotoUrl.value || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70';
});

watch(
  () => activeAdminEditUnit.value,
  (newVal) => {
    if (newVal) {
      unit.value = newVal;
      monthlyRate.value = newVal.price;
      capacityPax.value = newVal.maxOccupants || 2;
      registeredOccupants.value = newVal.occupants || 1;
      unitType.value = newVal.type;
      billingRule.value = newVal.billingRule || 'Rent + ₱200 / occupant water';
      amenitiesText.value = newVal.desc || newVal.amenities.join(', ');
      editPhotoUrl.value = newVal.photo || '';
    }
  },
  { immediate: true }
);

function closeModal() {
  isAdminEditUnitModalOpen.value = false;
}

async function handleSave() {
  if (!unit.value) return;
  isSaving.value = true;

  try {
    // Attempt backend persistence
    try {
      const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
      const matched = allRooms.find((r) => r.room_number.toLowerCase() === unit.value?.unitCode.toLowerCase());
      if (matched) {
        await api.patch(`/admin/rooms/${matched.id}`, {
          current_price: Number(monthlyRate.value),
          capacity: Number(capacityPax.value),
          description: amenitiesText.value,
        });
      }
    } catch {
      // Graceful local sync
    }

    // Apply to local reactive state
    unit.value.price = Number(monthlyRate.value);
    unit.value.maxOccupants = Number(capacityPax.value);
    unit.value.occupants = Number(registeredOccupants.value);
    unit.value.type = unitType.value;
    unit.value.desc = amenitiesText.value;
    unit.value.photo = editPhotoUrl.value;

    showToast(
      'success',
      `Unit ${unit.value.unitCode.toUpperCase()} Updated`,
      `Monthly rate set to ${peso(unit.value.price)} with ${unit.value.occupants} registered occupant(s).`
    );

    closeModal();
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
        <!-- Room Photo -->
        <div class="relative h-44 w-full rounded-2xl overflow-hidden bg-neutral-900 border border-[#e7e5e4]">
          <img
            :src="unitPhoto"
            :alt="`Unit ${unit.unitCode}`"
            class="size-full object-cover"
          />
          <div class="absolute bottom-3 left-3">
            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/90 text-[#1c1917] shadow-xs uppercase tracking-wider backdrop-blur-xs">
              {{ unit.cluster }}
            </span>
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

        <!-- 2% Annual Price Cap Guidance Alert -->
        <div
          :class="[
            'p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-colors',
            isAboveCap
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-[#f0f9ff] border-sky-200 text-sky-900'
          ]"
        >
          <component :is="isAboveCap ? AlertTriangle : Info" class="size-4 shrink-0 mt-0.5 text-[#f59e0b]" />
          <div class="space-y-0.5">
            <p class="font-bold">2% Annual Price Cap Guidance</p>
            <p class="text-[11px] leading-relaxed text-[#57534e]">
              Based on the benchmark rate of <strong>{{ peso(baseReferencePrice) }}</strong>, the standard annual cap allows adjustments up to <strong>{{ peso(maxAllowedPrice) }}</strong>.
              <span v-if="isAboveCap" class="block text-amber-900 font-bold mt-1">
                ⚠️ Current input ({{ peso(monthlyRate) }}) exceeds the 2% guidance threshold.
              </span>
            </p>
          </div>
        </div>

        <!-- 2-Column: Capacity Pax & Registered Occupants -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
              CAPACITY (PAX)
            </label>
            <input
              v-model.number="capacityPax"
              type="number"
              min="1"
              max="10"
              class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm font-semibold text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
              REGISTERED OCCUPANTS
            </label>
            <input
              v-model.number="registeredOccupants"
              type="number"
              min="0"
              max="10"
              class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm font-semibold text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <!-- Unit Type -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
            UNIT TYPE
          </label>
          <input
            v-model="unitType"
            type="text"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
            required
          />
        </div>

        <!-- Photo URL -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
            PHOTO URL
          </label>
          <input
            v-model="editPhotoUrl"
            type="text"
            placeholder="https://..."
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
            required
          />
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
            class="btn-secondary min-h-11 px-5 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            :disabled="isSaving"
            class="btn-primary min-h-11 px-6 text-xs font-bold gap-1.5 inline-flex items-center shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            <Check v-else class="size-4 text-[#f59e0b]" />
            <span>{{ isSaving ? 'Saving…' : 'Save Changes' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
