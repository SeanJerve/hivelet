<script setup lang="ts">
/**
 * @file CategoryRoomsView.vue
 * @description One kind of unit, the units of that kind, and the way to ask about one.
 * @systemBibleRef Section 4 - Public Visitor Role, Section 5 - Property Model, Section 16 - Inquiries
 *
 * THE CATEGORIES ARE THE UNIT'S OWN TYPE, AND USED NOT TO BE
 * ----------------------------------------------------------
 * This page offered three categories - "1-Bedroom", "2-Bedroom", "3-Bedroom /
 * Penthouse" - and sorted units into them by the FIRST CHARACTER OF THE UNIT
 * CODE. That digit is the floor. `2A` is room A on floor two, and the page read
 * it as two bedrooms.
 *
 * So "2-Bedroom Unit" listed fifteen units, opened on `2A`, and printed
 * "One-bedroom" underneath its own heading. Checked against the live database
 * rather than inferred:
 *
 *     Studio          x20   1a-1h, 2b-2g, 3b-3g
 *     One-bedroom      x8   2a, 3a, B1F, B2B, B2F, F1, LB, LF
 *     Two-bedroom      x4   B3B, B3F, F2B, F2F
 *     Three-bedroom    x1   PH
 *
 * Twenty of the thirty-three are studios and the site had no studio category at
 * all. A prospect looking for a two-bedroom was shown fifteen of them, of which
 * four were.
 *
 * The categories are now the four `room_type` values the database actually
 * holds, read from `/public/rooms`.
 *
 * WHY THIS PAGE NO LONGER MERGES THE SEEDED LIST
 * ----------------------------------------------
 * It used to overlay live data onto `CANONICAL_UNITS` and fall back to the seed
 * when a field was missing. The seed's types are wrong - it calls 1b through 1g
 * "1-Bedroom Apartment" where the database says every one of 1a-1h is a Studio -
 * so a fallback here does not degrade gracefully, it advertises the property
 * incorrectly.
 *
 * `/public/rooms` is therefore the only source. When it has not answered, the
 * page says so and shows nothing, which is the honest state for a public
 * listing whose whole job is to be accurate about what is for rent.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { peso } from '@/lib/canonicalUnits';
import { showToast } from '@/lib/systemState';
import { api } from '@/lib/api';
import SkeletonDetail from '@/components/ui/SkeletonDetail.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import WsModal from '@/components/ui/WsModal.vue';
import { ArrowLeft, MapPin, Loader2, ImageOff, Send } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const isLoading = ref(true);
/** Set when `/public/rooms` could not be read. Never replaced with seeded units. */
const loadFailed = ref(false);
const isSubmitting = ref(false);

interface DbRoom {
  id: string;
  room_number: string;
  floor: number;
  cluster_code: string;
  room_type: string;
  description: string;
  capacity: number;
  current_price: number;
  operational_status: string;
  visibility_status: string;
  available_from: string | null;
  is_linda_unit: boolean;
  room_photos?: { id: string; file_url: string; is_primary: boolean }[];
}

const publicRooms = ref<DbRoom[]>([]);

/**
 * Publicly quotable rates, from `/public/rates`.
 *
 * The water figure used to be the string "PHP 200 water / occupant" written into
 * the template. That number lives in `system_settings` and is applied by the
 * backend's billingService, so a hardcoded copy quoted a prospective tenant a
 * price that would stop matching the moment the landlady changed the setting.
 */
const waterRatePerOccupant = ref<number | null>(null);
const lindaFixedWaterCharge = ref<number | null>(null);

/** Never states a figure it has not been given. */
function waterLabel(room: DbRoom): string {
  if (room.is_linda_unit) {
    return lindaFixedWaterCharge.value !== null
      ? `${peso(lindaFixedWaterCharge.value)} fixed for water`
      : 'A fixed charge for water';
  }
  return waterRatePerOccupant.value !== null
    ? `${peso(waterRatePerOccupant.value)} for water, each person`
    : 'Water charged for each person';
}

/**
 * The four kinds of unit the property actually has, in the order someone
 * shopping would meet them: smallest first.
 *
 * `slug` is what appears in the address bar. The three old slugs still resolve,
 * because they have been linked from the landing page and may be in somebody's
 * history - see `resolveSlug`.
 */
const CATEGORIES = [
  {
    key: 'Studio',
    slug: 'studio',
    title: 'Studio',
    blurb:
      'One room with its own bathroom, in the main boarding house. Electricity is submetered, so you pay for what you use.',
  },
  {
    key: 'One-bedroom',
    slug: 'one-bedroom',
    title: 'One-bedroom',
    blurb:
      'A separate bedroom, in the boarding house and in the apartments beside it. The two Linda units are here too, and they are billed a fixed charge for water.',
  },
  {
    key: 'Two-bedroom',
    slug: 'two-bedroom',
    title: 'Two-bedroom',
    blurb: 'The larger apartments at the back and front, with a kitchenette and room to park.',
  },
  {
    key: 'Three-bedroom',
    slug: 'three-bedroom',
    title: 'Three-bedroom',
    blurb: 'The penthouse on the top floor, with the roof deck and the view over Legazpi.',
  },
];

/**
 * Accepts the old addresses as well as the new ones.
 *
 * `1-bedroom`, `2-bedroom` and `3-bedroom` were this page's slugs until the
 * categories were corrected. They are linked from the landing page and may sit
 * in somebody's history, so they resolve to the category of that name rather
 * than 404 - which also means the old link now lands on units that really are
 * that kind, which it did not before.
 */
function resolveSlug(slugOrKey: string | null | undefined): string {
  const s = (slugOrKey ?? '').toLowerCase();
  const direct = CATEGORIES.find((c) => c.slug === s || c.key.toLowerCase() === s);
  if (direct) return direct.key;

  if (s === '1-bedroom' || s === '1br' || s === '1') return 'One-bedroom';
  if (s === '2-bedroom' || s === '2br' || s === '2') return 'Two-bedroom';
  if (s === '3-bedroom' || s === '3br' || s === '3' || s === 'ph' || s === 'penthouse') {
    return 'Three-bedroom';
  }
  return 'Studio';
}

const selectedCategoryKey = ref('Studio');
const selectedUnitCode = ref('');

const currentCat = computed(
  () => CATEGORIES.find((c) => c.key === selectedCategoryKey.value) ?? CATEGORIES[0]
);

/** How many of each kind are listed, so a category with none can say so. */
const countFor = (key: string) => publicRooms.value.filter((r) => r.room_type === key).length;

const categoryUnits = computed(() =>
  publicRooms.value
    .filter((r) => r.room_type === selectedCategoryKey.value)
    .sort((a, b) => a.room_number.localeCompare(b.room_number))
);

const activeUnit = computed(
  () =>
    categoryUnits.value.find(
      (u) => u.room_number.toLowerCase() === selectedUnitCode.value.toLowerCase()
    ) ?? categoryUnits.value[0]
);

/** `room_photos` carries the pictures; `is_primary` picks the one to lead with. */
function photoOf(room: DbRoom): string | null {
  const photos = room.room_photos ?? [];
  return photos.find((p) => p.is_primary)?.file_url ?? photos[0]?.file_url ?? null;
}

/**
 * What a visitor is told about availability.
 *
 * Only two answers matter to someone looking for a room: they can ask about it,
 * or somebody lives there. The operational states behind that - under repair,
 * reserved - are the owner's business and not a prospect's.
 */
function isAvailable(room: DbRoom): boolean {
  return room.operational_status === 'Available';
}

function selectUnit(unitCode: string) {
  selectedUnitCode.value = unitCode;
}

function syncFromRoute() {
  const param = (route.params.categorySlug as string) || (route.query.category as string);
  selectedCategoryKey.value = resolveSlug(param);

  const units = categoryUnits.value;
  const stillHere = units.some(
    (u) => u.room_number.toLowerCase() === selectedUnitCode.value.toLowerCase()
  );
  if (!stillHere) selectedUnitCode.value = units[0]?.room_number ?? '';
}

function goToCategory(slug: string) {
  router.push(`/category/${slug}`);
}

async function loadRates() {
  try {
    const r = await api.get<{ waterRatePerOccupant: number; lindaFixedWaterCharge: number | null }>(
      '/public/rates',
      false
    );
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
    lindaFixedWaterCharge.value = r?.lindaFixedWaterCharge ?? null;
  } catch {
    // Leave both null: the labels fall back to wording that quotes no figure.
  }
}

onMounted(async () => {
  await loadRates();
  try {
    const data = await api.get<DbRoom[]>('/public/rooms', false);
    publicRooms.value = Array.isArray(data) ? data : [];
    loadFailed.value = publicRooms.value.length === 0;
  } catch {
    // No seeded fallback. See the note at the top of this file: the seed's types
    // are wrong, so falling back to it would advertise the property incorrectly.
    publicRooms.value = [];
    loadFailed.value = true;
  } finally {
    isLoading.value = false;
  }
  syncFromRoute();
});

watch(() => [route.params.categorySlug, route.query.category], syncFromRoute);
watch(publicRooms, syncFromRoute);

// ---------------------------------------------------------------- inquiries

const isInquiryOpen = ref(false);
const inquiryUnit = ref('');
const inquiryName = ref('');
const inquiryPhone = ref('');
const inquiryEmail = ref('');
const inquiryMsg = ref('Good day po! Interested ako sa unit. Pwede po bang mag-viewing?');

function openInquiry(unitCode: string) {
  inquiryUnit.value = unitCode || activeUnit.value?.room_number || '';
  isInquiryOpen.value = true;
}

/**
 * Sends an inquiry, and says so only if it was actually sent.
 *
 * This function used to report success in two situations where nothing had been
 * saved. If no room matched the chosen unit code the POST was skipped entirely
 * and the success toast fired anyway; and the catch block showed a *success*
 * toast reading "Your message has been queued for the landlady" when the request
 * had failed and nothing was queued anywhere. A prospective tenant was told the
 * landlady had their message when she did not, and would never know to follow up.
 */
async function submitInquiry() {
  // `inquiries.prospect_email` is NOT NULL, so ask rather than invent.
  if (!inquiryName.value.trim() || !inquiryPhone.value.trim() || !inquiryEmail.value.trim()) {
    showToast('error', 'Something is missing', 'Please give your name, phone number and email.');
    return;
  }

  // A unit is required: `inquiries.room_id` is NOT NULL. Checked before the lookup so an
  // empty selection says what to do, rather than reporting an unfindable blank unit.
  if (!inquiryUnit.value.trim()) {
    showToast('error', 'Choose a unit', 'Please pick which unit you are asking about.');
    return;
  }

  const matchedRoom = publicRooms.value.find(
    (r) => r.room_number.toLowerCase() === inquiryUnit.value.toLowerCase()
  );

  if (!matchedRoom) {
    showToast(
      'error',
      'That unit is not listed',
      `Unit ${inquiryUnit.value} could not be found, so nothing was sent. Reload the page and try again.`
    );
    return;
  }

  isSubmitting.value = true;
  try {
    await api.post(
      '/public/inquiries',
      {
        roomId: matchedRoom.id,
        prospectName: inquiryName.value.trim(),
        prospectEmail: inquiryEmail.value.trim(),
        prospectPhone: inquiryPhone.value.trim(),
        message: inquiryMsg.value.trim(),
      },
      false
    );

    showToast('success', 'Message sent', 'Mrs. Da Silva has your message.');
    isInquiryOpen.value = false;
    inquiryName.value = '';
    inquiryPhone.value = '';
    inquiryEmail.value = '';
  } catch (err: unknown) {
    showToast(
      'error',
      'Message not sent',
      err instanceof Error ? err.message : 'Your message could not be delivered. Please try again.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="ws-focus w-full flex-1 bg-canvas">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <router-link
        to="/public"
        class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft class="size-4" aria-hidden="true" />
        <span>All the kinds of unit</span>
      </router-link>

      <!-- What this page is -->
      <div class="mt-4">
        <p class="flex items-start gap-2 text-sm text-ink-soft">
          <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            32 Sapaguita Street, Brgy. 4 Sagpon, Old Albay, Legazpi City &middot; Fe Galang Da Silva
            Boarding House
          </span>
        </p>
        <h1 class="mt-2 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          {{ currentCat.title }}
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          {{ currentCat.blurb }}
        </p>
      </div>

      <!-- The four kinds, with how many of each there are -->
      <div
        v-if="!isLoading && !loadFailed"
        class="mt-6 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Kind of unit"
      >
        <button
          v-for="c in CATEGORIES"
          :key="c.key"
          type="button"
          class="chip"
          :aria-pressed="selectedCategoryKey === c.key"
          @click="goToCategory(c.slug)"
        >
          {{ c.title }}
          <span class="chip-count">{{ countFor(c.key) }}</span>
        </button>
      </div>

      <!-- Loading -->
      <!-- The shape that is about to arrive: a photograph, its facts beside
           it, then the money. -->
      <div v-if="isLoading" class="mt-6">
        <SkeletonDetail />
      </div>

      <!--
        The listing could not be read. Nothing is shown rather than the seeded
        list, whose unit types are wrong - see the note at the top of this file.
      -->
      <div v-else-if="loadFailed" class="mt-6 rounded-tile bg-tile p-6 sm:p-8" role="alert">
        <p class="text-base font-semibold text-ink">The units could not be loaded.</p>
        <p class="mt-1 max-w-xl text-sm leading-6 text-ink-soft">
          This is not the same as having nothing free. Reload the page, and if it keeps happening,
          ring the landlady on
          <strong class="text-ink">0917-123-4567</strong> and she will tell you what is available.
        </p>
      </div>

      <div
        v-else-if="categoryUnits.length === 0"
        class="mt-6 rounded-tile bg-tile px-6 py-16 text-center"
      >
        <p class="text-base font-semibold text-ink">Nothing of this kind is listed</p>
        <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
          Try another kind above, or ask the landlady what is coming free.
        </p>
      </div>

      <template v-else-if="activeUnit">
        <!-- The unit being looked at -->
        <div class="mt-6 grid gap-4 lg:grid-cols-12">
          <div class="overflow-hidden rounded-tile bg-tile lg:col-span-7">
            <div class="relative aspect-[4/3] w-full bg-night sm:aspect-[16/10]">
              <img
                v-if="photoOf(activeUnit)"
                :src="photoOf(activeUnit)!"
                :alt="`Inside unit ${activeUnit.room_number.toUpperCase()}`"
                class="absolute inset-0 size-full object-cover"
                loading="eager"
              />
              <!-- Only one of the 33 units has a photograph on file. The rest
                   used to borrow a stock image of an unrelated apartment. -->
              <div
                v-else
                class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-night-soft"
              >
                <ImageOff class="size-8" aria-hidden="true" />
                <p class="text-sm font-semibold">No photograph yet</p>
                <p class="max-w-xs px-6 text-center text-sm leading-6">
                  Ask for a viewing and you can see it for yourself.
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-col rounded-tile bg-tile p-6 sm:p-8 lg:col-span-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {{ activeUnit.cluster_code }} &middot; Floor {{ activeUnit.floor }}
                </p>
                <h2 class="mt-1 text-3xl font-semibold uppercase leading-none tracking-tight text-ink">
                  Unit {{ activeUnit.room_number }}
                </h2>
                <p class="mt-1.5 text-sm text-ink-soft">{{ activeUnit.room_type }}</p>
              </div>
              <StatusPill :tone="isAvailable(activeUnit) ? 'paid' : 'neutral'">
                {{ isAvailable(activeUnit) ? 'Free to rent' : 'Someone lives here' }}
              </StatusPill>
            </div>

            <p class="tabular mt-5 text-4xl font-semibold leading-none text-ink">
              {{ peso(activeUnit.current_price) }}
              <span class="text-base font-normal text-ink-soft">a month</span>
            </p>

            <dl class="mt-5 divide-y divide-line border-y border-line text-sm">
              <div class="flex items-baseline justify-between gap-3 py-3">
                <dt class="text-ink-soft">How many can stay</dt>
                <dd class="font-semibold text-ink">
                  {{ activeUnit.capacity }} {{ activeUnit.capacity === 1 ? 'person' : 'people' }}
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3 py-3">
                <dt class="text-ink-soft">Water</dt>
                <dd class="text-right font-semibold text-ink">{{ waterLabel(activeUnit) }}</dd>
              </div>
            </dl>

            <!-- The unit's own description, as the landlady recorded it. -->
            <p v-if="activeUnit.description" class="mt-5 text-sm leading-6 text-ink-soft">
              {{ activeUnit.description }}
            </p>

            <!--
              There is no amenity list here any more. The system stores none per
              unit, so the five ticks this panel used to show - private bathroom,
              submetered electricity, ceiling fan, study desk, wifi - were a
              hardcoded list printed under the heading "typical for this
              cluster", beside a sentence admitting it might not be true of the
              unit being looked at. A prospect cannot tell a promise from a
              guess, so it is better to say nothing and let them come and look.
            -->
            <button
              type="button"
              class="pill-btn-brand mt-auto w-full justify-center pt-0"
              @click="openInquiry(activeUnit.room_number)"
            >
              Ask about unit {{ activeUnit.room_number.toUpperCase() }}
            </button>
          </div>
        </div>

        <!--
          Picking a unit. No photographs: one unit in thirty-three has one, so a
          picture-led grid was thirty-two identical grey placeholders. What a
          person choosing between units actually compares is the rate, the size
          and whether it is free, so that is what each one shows.
        -->
        <div class="mt-4 rounded-tile bg-tile p-5 sm:p-6">
          <h2 class="text-base font-semibold text-ink">
            The {{ categoryUnits.length }}
            {{ categoryUnits.length === 1 ? 'unit' : 'units' }} of this kind
          </h2>
          <p class="mt-1 text-sm leading-6 text-ink-soft">Pick one to see it above.</p>

          <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <li v-for="u in categoryUnits" :key="u.id">
              <button
                type="button"
                :aria-current="u.room_number === activeUnit.room_number ? 'true' : undefined"
                :class="[
                  'flex w-full flex-col gap-2 rounded-2xl p-4 text-left transition-colors',
                  u.room_number === activeUnit.room_number
                    ? 'bg-brand text-on-brand'
                    : 'bg-canvas text-ink hover:bg-brand-soft',
                ]"
                @click="selectUnit(u.room_number)"
              >
                <span class="flex items-baseline justify-between gap-2">
                  <span class="text-lg font-semibold uppercase leading-none">
                    {{ u.room_number }}
                  </span>
                  <span
                    :class="[
                      'text-xs',
                      u.room_number === activeUnit.room_number ? 'text-on-brand-soft' : 'text-ink-faint',
                    ]"
                  >
                    Floor {{ u.floor }}
                  </span>
                </span>

                <span class="tabular text-base font-semibold">{{ peso(u.current_price) }}</span>

                <span
                  :class="[
                    'text-xs',
                    u.room_number === activeUnit.room_number ? 'text-on-brand-soft' : 'text-ink-soft',
                  ]"
                >
                  {{ u.capacity }} {{ u.capacity === 1 ? 'person' : 'people' }} &middot;
                  {{ isAvailable(u) ? 'free to rent' : 'occupied' }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <!-- Asking about a unit -->
    <WsModal
      v-if="isInquiryOpen"
      :title="`Ask about unit ${inquiryUnit.toUpperCase()}`"
      subtitle="Mrs. Da Silva reads these herself."
      size="md"
      :dismissible="false"
      @close="isInquiryOpen = false"
    >
      <form id="inquiry-form" class="flex flex-col gap-5" @submit.prevent="submitInquiry">
        <label class="ws-field">
          Your name
          <input v-model="inquiryName" class="ws-input w-full" required />
        </label>

        <div class="grid gap-5 sm:grid-cols-2">
          <label class="ws-field">
            Your phone number
            <input
              v-model="inquiryPhone"
              type="tel"
              placeholder="0917-123-4567"
              class="ws-input w-full"
              required
            />
          </label>
          <label class="ws-field">
            Your email
            <input
              v-model="inquiryEmail"
              type="email"
              placeholder="you@email.com"
              class="ws-input w-full"
              required
            />
          </label>
        </div>

        <label class="ws-field">
          What you would like to ask
          <textarea v-model="inquiryMsg" rows="4" class="ws-textarea w-full"></textarea>
        </label>
      </form>

      <template #actions>
        <button type="button" class="pill-btn" @click="isInquiryOpen = false">Cancel</button>
        <button type="submit" form="inquiry-form" :disabled="isSubmitting" class="pill-btn-brand">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
          <Send v-else class="size-4" aria-hidden="true" />
          <span>{{ isSubmitting ? 'Sending' : 'Send it' }}</span>
        </button>
      </template>
    </WsModal>
  </div>
</template>
