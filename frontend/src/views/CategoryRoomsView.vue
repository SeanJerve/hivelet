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
 * it as two bedrooms, so "2-Bedroom Unit" listed fifteen units of which four
 * were. Corrected in `e1d6e68` against the live database:
 *
 *     Studio          x20   1a-1h, 2b-2g, 3b-3g
 *     One-bedroom      x8   2a, 3a, B1F, B2B, B2F, F1, LB, LF
 *     Two-bedroom      x4   B3B, B3F, F2B, F2F
 *     Three-bedroom    x1   PH
 *
 * The list itself now lives in `lib/unitCategories.ts`, because that correction
 * reached this page and not the landing page, which kept its own copy of the
 * old three - so a plate there advertised ten one-bedrooms over a link to the
 * eight real ones. One copy, read by both.
 *
 * WHY THIS PAGE DOES NOT MERGE THE SEEDED LIST
 * --------------------------------------------
 * It used to overlay live data onto `CANONICAL_UNITS` and fall back to the seed
 * field by field. The seed's types are wrong - it calls 1b through 1g
 * "1-Bedroom Apartment" where the database says every one of 1a-1h is a Studio -
 * so a fallback here does not degrade gracefully, it advertises the property
 * incorrectly. `/public/rooms` is the only source. When it has not answered,
 * the page says so and shows nothing, which is the honest state for a listing
 * whose whole job is to be accurate about what is for rent.
 *
 * SET IN THE PUBLIC REGISTER, NOT THE WORKSPACE ONE
 * -------------------------------------------------
 * The layout and copy are as `e1d6e68` left them; what changed on 2026-09-19 is
 * the vocabulary. This screen was drawn with the workspace system - `rounded-tile`
 * tiles on `bg-canvas`, brand pills, chips, `WsModal` - while the two pages that
 * link to it (`PublicGuestView` and `InquireView`) are editorial: hairline
 * rules, square corners, tonal frames, small-caps labels, text links and a
 * near-black rectangle for the one real action. Clicking "View all rooms" on
 * the landing page therefore landed the reader in what looked like a different
 * product.
 *
 * So the colour roles here are `foreground` / `muted-foreground` / `border`
 * rather than the workspace `ink` / `line` set. The public pages are on the
 * first group and the workspace screens on the second, and mixing them is what
 * produced the seam. Nothing about what the page CLAIMS changed: the four
 * categories, the live-only source, the failure state, the absent amenity list
 * and reporting a unit's availability by name are all still what that commit
 * decided. The exact wording moved on 2026-09-21 from "free to rent" to
 * "vacant" - shorter, and not a claim about price the way "free" can misread.
 *
 * @innovations An editorial masthead with the four kinds as an index line, a
 *              focus-card unit picker where the plate under the cursor is the
 *              only one at full strength, and a native `<dialog>` for the
 *              enquiry - Escape, focus containment and background inertness
 *              from the platform rather than reimplemented.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { peso } from '@/lib/canonicalUnits';
import { CATEGORIES, resolveSlug, type CategoryKey } from '@/lib/unitCategories';
import AvailabilityUnavailable from '@/components/public/AvailabilityUnavailable.vue';
import { showToast, LANDLADY, floorLabelFor, buildingNameFor } from '@/lib/systemState';
import { planFor, PLAN_SIZE } from '@/lib/floorPlans';
import { api } from '@/lib/api';
import SkeletonDetail from '@/components/ui/SkeletonDetail.vue';
import { ArrowUpRight, Loader2, Send, X } from 'lucide-vue-next';

const route = useRoute();

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

/**
 * Never states a figure it has not been given.
 *
 * Sits next to a `<dt>Water</dt>` label, so the word itself is dropped from
 * the value column - "PHP 200 for water, each person" was saying the row's
 * own name back to the reader.
 */
function waterLabel(room: DbRoom): string {
  if (room.is_linda_unit) {
    return lindaFixedWaterCharge.value !== null
      ? `${peso(lindaFixedWaterCharge.value)} fixed`
      : 'A fixed charge';
  }
  return waterRatePerOccupant.value !== null
    ? `${peso(waterRatePerOccupant.value)}, each person`
    : 'Charged for each person';
}

const selectedCategoryKey = ref<CategoryKey>('Studio');
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

interface FloorGroup {
  floor: number;
  label: string;
  units: DbRoom[];
}

/**
 * Units grouped by floor in ascending order, displaying each floor in its own
 * row so the visitor can browse floor-by-floor without redundant floor labels
 * on individual cards.
 */
const unitsByFloor = computed<FloorGroup[]>(() => {
  const map = new Map<number, DbRoom[]>();
  for (const u of categoryUnits.value) {
    const list = map.get(u.floor) ?? [];
    list.push(u);
    map.set(u.floor, list);
  }
  return Array.from(map.entries())
    .sort(([floorA], [floorB]) => floorA - floorB)
    .map(([floor, units]) => ({
      floor,
      label: floorLabelFor(floor),
      units: units.slice().sort((a, b) =>
        a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
      ),
    }));
});

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

const availableHere = computed(() => categoryUnits.value.filter(isAvailable).length);

/**
 * The rates on the units in view, not a claim about the property. Printed as a
 * range only when the ends differ, so the one-unit category - the penthouse -
 * does not read "from X to X".
 */
const rateFloor = computed(() =>
  categoryUnits.value.length ? Math.min(...categoryUnits.value.map((u) => u.current_price)) : 0
);
const rateCeiling = computed(() =>
  categoryUnits.value.length ? Math.max(...categoryUnits.value.map((u) => u.current_price)) : 0
);


const activeUnit = computed(
  () =>
    categoryUnits.value.find(
      (u) => u.room_number.toLowerCase() === selectedUnitCode.value.toLowerCase()
    ) ?? categoryUnits.value[0]
);

/**
 * Whether the unit currently on view - its photo, or its floor plan when there
 * is no photo - has actually painted. Reset whenever the unit being looked at
 * changes, so the picture fades in rather than popping in over whatever the
 * previous unit left behind.
 */
const unitVisualLoaded = ref(false);
watch(
  () => activeUnit.value?.id,
  () => {
    unitVisualLoaded.value = false;
  }
);

/** `room_photos` carries the pictures; `is_primary` picks the one to lead with. */
function photoOf(room: DbRoom): string | null {
  const photos = room.room_photos ?? [];
  return photos.find((p) => p.is_primary)?.file_url ?? photos[0]?.file_url ?? null;
}

function selectUnit(unitCode: string) {
  selectedUnitCode.value = unitCode;
}

/**
 * Which plate the cursor or the keyboard is on, so the rest can step back.
 *
 * The same treatment as the category plates on the landing page, which is where
 * the reader has just come from. What steps a plate back is opacity alone - no
 * blur and no filter - because the rate and the status on the plates that are
 * not under the cursor are exactly what someone choosing between units is
 * comparing. `focusin`/`focusout` are here so tabbing through the grid produces
 * the emphasis a mouse does, and everything that moves is behind `motion-safe:`.
 */
const hoveredUnit = ref<string | null>(null);
function isSubdued(unitCode: string): boolean {
  return hoveredUnit.value !== null && hoveredUnit.value.toLowerCase() !== unitCode.toLowerCase();
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

// --------------------------------------------------------------- inquiries ----

/**
 * A native `<dialog>`, as on the landing page's first-visit prompt.
 *
 * `showModal()` gives focus containment, Escape-to-close, background inertness
 * and a `::backdrop` from the platform. It replaces a `WsModal`, which owns all
 * of that in code - the right call in the workspace, where every dialog is one;
 * here it would have brought `rounded-tile` chrome and the workspace tokens
 * onto an editorial page, which is the seam this screen exists to close.
 *
 * A backdrop click deliberately does NOT close it: the WsModal it replaces was
 * opened with `:dismissible="false"` because the form holds typed input, and
 * losing a name, a number and a message to a stray click is worse than a
 * reader having to find Cancel. Escape still closes it, which is the platform
 * behaviour a reader expects of any dialog.
 *
 * `@keydown.esc` is belt and braces over that. Verified in the running app on
 * 2026-09-19: with the dialog open and `:modal` true, a dispatched Escape
 * reached the dialog element and it stayed open; the landing's first-visit
 * prompt, which relies on the platform alone, behaved the same way. That is
 * very probably the automated key dispatch not raising the default action
 * rather than a browser that cannot - but a modal is not a thing to ship on
 * "very probably", and `close()` on a closed dialog is a no-op.
 */
const inquiryDialog = ref<HTMLDialogElement | null>(null);
const inquiryUnit = ref('');
const inquiryName = ref('');
const inquiryPhone = ref('');
const inquiryEmail = ref('');
const inquiryMsg = ref('Good day po! Interested ako sa unit. Pwede po bang mag-viewing?');

function openInquiry(unitCode: string) {
  inquiryUnit.value = unitCode || activeUnit.value?.room_number || '';
  inquiryDialog.value?.showModal();
}

function closeInquiry() {
  inquiryDialog.value?.close();
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
    closeInquiry();
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
  <div class="ws-focus flex-1 flex flex-col w-full bg-canvas font-editorial">

    <!--
      This page draws its own masthead, in the three-line lockup the landing
      hero and the enquiry page use, so `AppHeader` is not mounted on this route
      - see `hidesGlobalHeader` in App.vue. Two mastheads on one screen was the
      first thing that gave the seam away.
    -->
    <header class="w-full border-b border-line">
      <div class="ws-page pt-7 pb-6 flex items-start justify-between gap-6 sm:gap-10">
        <RouterLink
          to="/public"
          class="press shrink-0 text-xl font-semibold tracking-tight text-ink hover:text-ink-soft transition-colors"
        >
          Hivelet
        </RouterLink>

        <nav aria-label="Property sections" class="flex flex-wrap justify-end items-baseline text-[0.8rem] font-light text-ink">
          <RouterLink
            to="/inquire"
            class="press inline-block py-1 underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
          >
            Inquire Now
          </RouterLink>
          <span aria-hidden="true" class="pr-2">,</span>
          <RouterLink
            to="/login"
            class="press inline-block py-1 underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
          >
            Sign In
          </RouterLink>
        </nav>
      </div>
    </header>

    <!--
      Category statement, in the register of the landing page's "33 Units, 4
      Floors" section: one fluid display line, then a standfirst and the
      address in small caps. `clamp()` rather than Tailwind's stepped scale for
      the same reason it is used there - the line stays proportional to the
      field at every width, where the stepped scale jumps at breakpoints.
    -->
    <section aria-label="Category overview" class="w-full">
      <div class="ws-page ws-band">

        <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
          <RouterLink
            to="/public"
            class="press hover:text-ink transition-colors underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink"
          >
            Property
          </RouterLink>
          <span class="text-line select-none" aria-hidden="true">/</span>
          <span class="text-ink font-semibold" aria-current="page">{{ currentCat.title }}</span>
        </nav>

        <h1 class="mt-5 font-medium text-ink tracking-[-0.03em] leading-[0.98] text-[clamp(2rem,6vw,4.5rem)]">
          {{ currentCat.title }}
        </h1>

        <div class="mt-10 sm:mt-14 grid gap-8 sm:grid-cols-2 max-w-3xl text-xs sm:text-[0.82rem] leading-relaxed text-ink-soft">
          <p>{{ currentCat.blurb }}</p>
          <p v-if="!isLoading && !loadFailed && categoryUnits.length">
            {{ categoryUnits.length }} {{ categoryUnits.length === 1 ? 'unit' : 'units' }} of this
            kind, <strong class="font-semibold text-ink">{{ availableHere }} vacant</strong> at the moment.
            <template v-if="rateCeiling > rateFloor">
              {{ peso(rateFloor) }} to {{ peso(rateCeiling) }} a month.
            </template>
            <template v-else-if="rateFloor">
              {{ peso(rateFloor) }} a month.
            </template>
            Pick one below to see it at size.
          </p>
        </div>

        <p class="mt-12 text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
          32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City
        </p>

      </div>
    </section>

    <!--
      The four kinds as an index line, with how many of each there are.

      This was a row of `.chip` buttons - the workspace's filter control, an ink
      fill for the selected one. Here they are text links on a hairline rule,
      which is how the rest of the public site moves between places, and they
      are RouterLinks rather than buttons because each one IS an address:
      middle-click and open-in-new-tab work, and `aria-current="page"` says
      which one you are on without relying on the weight of the rule.

      The counts are rendered only when the listing loaded. A "0" beside
      Studio would be a claim that this property has no studios.
    -->
    <nav
      v-if="!isLoading && !loadFailed"
      aria-label="Kind of unit"
      class="w-full border-t border-line"
    >
      <div class="ws-page">
        <ul class="flex flex-wrap items-baseline gap-x-8 gap-y-3 py-5 sm:gap-x-12">
          <li v-for="c in CATEGORIES" :key="c.key">
            <!--
              `inline` here, not `inline-flex`. A flex container draws its
              underline per child rather than across the gap between them, so
              "Studio" and its count each got their own short line with a bare
              patch in between instead of one line under the whole label. Plain
              inline text with a left margin on the count keeps the same
              baseline alignment `items-baseline` gave the flex version, and
              the underline runs continuously underneath both.
            -->
            <RouterLink
              :to="`/category/${c.slug}`"
              :aria-current="c.key === selectedCategoryKey ? 'page' : undefined"
              :class="[
                'press inline py-1 text-sm transition-colors',
                c.key === selectedCategoryKey
                  ? 'text-ink underline underline-offset-4 decoration-1 decoration-ink'
                  : 'text-ink-soft hover:text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink',
              ]"
            >
              <span>{{ c.title }}</span>
              <span class="ml-2 text-xs tabular-nums text-ink-faint">{{ countFor(c.key) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- The shape that is about to arrive: a frame, its figures beside it, then the plates. -->
    <div v-if="isLoading" class="ws-page py-16">
      <SkeletonDetail />
    </div>

    <!--
      The listing could not be read. Nothing is shown rather than the seeded
      list, whose unit types are wrong - see the note at the top of this file.

      This used to be written out here, and the landing page answered the same
      outage by listing all 33 units as Available. One component now, so the two
      pages cannot tell a visitor opposite things again.
    -->
    <AvailabilityUnavailable
      v-else-if="loadFailed"
      :subject="`which ${currentCat.title.toLowerCase()} units are free`"
    />

    <section
      v-else-if="categoryUnits.length === 0"
      :key="selectedCategoryKey"
      class="list-reveal-item w-full border-t border-line"
    >
      <div class="ws-page ws-band">
        <h2 class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
          Nothing of this kind is listed
        </h2>
        <p class="mt-5 max-w-xl text-xs sm:text-sm text-ink-soft leading-relaxed">
          Try another kind above, or
          <RouterLink
            to="/inquire"
            class="press inline-block text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
          >ask the landlady</RouterLink>
          what is coming free.
        </p>
      </div>
    </section>

    <template v-else-if="activeUnit">

      <!--
        The unit being looked at. Two columns divided by a hairline rather than
        two tiles on a canvas: the frame is the page, and that rule is the only
        separator the rest of the public site uses.
      -->
      <!--
        Keyed on the category, not the unit: switching category is a real
        mode change - a different kind of room, a different set of plates
        below - and gets a fast fade so the swap reads as a new view rather
        than a jump cut. Picking a different unit WITHIN the category is the
        frequent interaction and stays instant; only the photo and floor plan
        (below) mark that change, by fading themselves in.
      -->
      <section
        :key="selectedCategoryKey"
        aria-label="The unit being looked at"
        class="list-reveal-item w-full border-t border-line"
      >
        <div class="ws-page grid lg:grid-cols-[1fr_26rem]">

          <div class="relative aspect-[4/3] lg:aspect-auto lg:min-h-[30rem] border-b border-line lg:border-b-0 lg:border-r bg-tile overflow-hidden">
            <img
              v-if="photoOf(activeUnit)"
              :src="photoOf(activeUnit)!"
              :alt="`Inside unit ${activeUnit.room_number}`"
              :class="[
                'absolute inset-0 size-full object-cover transition-opacity duration-300 ease-[var(--ease-out)]',
                unitVisualLoaded ? 'opacity-100' : 'opacity-0',
              ]"
              loading="eager"
              @load="unitVisualLoaded = true"
            />
            <!--
              Only one of the thirty-three units has a photograph on file, so
              this is not the edge case - it is what almost every visitor sees.
              It used to borrow a stock image of an unrelated apartment, which
              was replaced by an honest tonal frame: two small grey lines
              centred in a panel about 600 by 640, apologising and saying
              nothing else.

              Honest, and still the largest thing on the page saying nothing. A
              prospect choosing between twenty studios wants to know WHERE the
              unit is - stairs, heat and street noise all follow from the
              floor - and the page stated that only as "BH — Floor 1" in small
              type in the column beside it.

              So the panel carries the building instead: one rule per floor,
              top-most floor at the top, the unit's own floor drawn solid and
              named. The floors come from the live list, so this is the same
              data the rest of the page is answerable to.

              This is also where the floor plans go when Sean exports them.
              They are coming as SVG (HANDOFF_TO_DESIGN section 7b), and an SVG
              plan with the unit shapes carrying their codes replaces this
              stack in the same box without the section being rebuilt.
            -->
            <div v-else class="absolute inset-0 flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10">
              <!--
                The floor plan, now that there is one for every unit.

                This panel used to draw an abstract stack - one rule per floor
                of the building with the unit's own floor picked out - because
                no drawing existed. One does now, so it shows the actual plan
                with the unit marked on it, which is the thing the stack was
                standing in for. Same pictures and same chip as the unit rows
                on the landing page, from the one `floorPlans` module.

                The stack is gone rather than kept alongside: two drawings of
                the same fact, one of them abstract, is worse than one.
              -->
              <div v-if="planFor(activeUnit.room_number)" class="relative mx-auto w-full max-w-md">
                <img
                  :src="`/floorplans/${planFor(activeUnit.room_number)!.plan}.png`"
                  :alt="'Floor plan of the ' + floorLabelFor(activeUnit.floor) + ' of the ' + buildingNameFor(activeUnit.cluster_code)"
                  :width="PLAN_SIZE[planFor(activeUnit.room_number)!.plan]?.w"
                  :height="PLAN_SIZE[planFor(activeUnit.room_number)!.plan]?.h"
                  :class="[
                    'block w-full mix-blend-multiply transition-opacity duration-300 ease-[var(--ease-out)]',
                    unitVisualLoaded ? 'opacity-100' : 'opacity-0',
                  ]"
                  loading="lazy"
                  decoding="async"
                  @load="unitVisualLoaded = true"
                />
                <span
                  v-if="planFor(activeUnit.room_number)!.x !== null"
                  class="absolute rounded-full bg-brand px-2 py-0.5 text-[0.65rem] font-semibold text-on-brand shadow-lift"
                  :style="{
                    left: planFor(activeUnit.room_number)!.x + '%',
                    top: planFor(activeUnit.room_number)!.y + '%',
                    transform: 'translate(-30%, -100%)',
                  }"
                >{{ activeUnit.room_number }}</span>
                <p class="sr-only">
                  Unit {{ activeUnit.room_number }} is on the
                  {{ floorLabelFor(activeUnit.floor) }} of the
                  {{ buildingNameFor(activeUnit.cluster_code) }}.
                </p>
              </div>

              <p class="max-w-xs text-xs sm:text-sm text-ink-faint leading-relaxed">
                See exactly where your unit sits in the building.
              </p>
            </div>

            <!--
              Two answers, and no more. "Under repair" and "reserved" are the
              owner's business, not a prospect's - `isAvailable` collapses the
              four operational states into the only distinction that matters to
              someone looking for a room.
            -->
            <p class="absolute left-0 top-0 border-r border-b border-line bg-canvas px-4 py-2 text-[0.7rem] tracking-[0.18em] uppercase text-ink">
              {{ isAvailable(activeUnit) ? 'Free to rent' : 'Someone lives here' }}
            </p>
          </div>

          <div class="flex flex-col justify-between px-6 sm:px-8 lg:px-10 py-10 sm:py-12">
            <div>
              <p class="text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
                {{ activeUnit.cluster_code }} — Floor {{ activeUnit.floor }}
              </p>

              <h2 class="mt-4 font-medium text-ink tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,5vw,3.25rem)]">
                Unit {{ activeUnit.room_number }}
              </h2>

              <p class="mt-8 font-medium text-ink tracking-[-0.02em] text-[clamp(1.5rem,3.4vw,2.25rem)] tabular-nums">
                {{ peso(activeUnit.current_price) }}<span class="ml-2 text-xs sm:text-sm font-normal tracking-normal text-ink-soft">a month</span>
              </p>

              <dl class="mt-10 border-t border-ink text-xs sm:text-sm">
                <!-- Phrased as the limit it is. "4 people" on its own, beside a
                     status, reads as the number living there. -->
                <div class="flex items-baseline justify-between gap-6 border-b border-line py-4">
                  <dt class="text-ink-soft">Room for</dt>
                  <dd class="text-right text-ink">
                    up to {{ activeUnit.capacity }}
                    {{ activeUnit.capacity === 1 ? 'person' : 'people' }}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-6 border-b border-line py-4">
                  <dt class="text-ink-soft">Water</dt>
                  <dd class="text-right text-ink">{{ waterLabel(activeUnit) }}</dd>
                </div>
              </dl>

              <!-- The unit's own description, as the landlady recorded it. -->
              <p v-if="activeUnit.description" class="mt-7 text-xs sm:text-sm text-ink-soft leading-relaxed">
                {{ activeUnit.description }}
              </p>

              <!--
                There is no amenity list here, and that is deliberate. The
                system stores none per unit, so the five ticks this panel used
                to show - private bathroom, submetered electricity, ceiling fan,
                study desk, wifi - were a hardcoded list printed under "typical
                for this cluster", beside a sentence admitting it might not be
                true of the unit being looked at. A prospect cannot tell a
                promise from a guess, so it is better to say nothing and let
                them come and look.
              -->
            </div>

            <div class="mt-12">
              <button
                type="button"
                class="pill-btn-brand w-full px-8"
                @click="openInquiry(activeUnit.room_number)"
              >
                <span>Ask about unit {{ activeUnit.room_number }}</span>
                <ArrowUpRight class="size-4 shrink-0" />
              </button>
            </div>
          </div>

        </div>
      </section>

      <!--
        Picking a unit.

        No photographs, which `e1d6e68` decided and this keeps: one unit in
        thirty-three has one, so a picture-led grid was thirty-two identical
        grey placeholders. What a person choosing between units compares is the
        rate, the floor and whether it is free, so that is what a plate carries.

        The plate under the cursor is the only one at full strength - the rest
        step back to 40% - which is the same treatment as the category plates on
        the landing page. On the selected plate the rule is drawn in
        `border-ink` and the label says so in words, because a border
        alone is not a state a screen reader can hear; `aria-pressed` carries it.
      -->
      <section aria-label="The units of this kind" class="w-full border-t border-line">
        <div class="ws-page ws-band">

          <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
              The {{ categoryUnits.length }}
              {{ categoryUnits.length === 1 ? 'unit' : 'units' }} of this kind
            </h2>
            <p class="max-w-md text-xs sm:text-sm text-ink-soft leading-relaxed">
              Pick one to see it above.
              <strong class="font-semibold text-ink">
                {{ availableHere }} of them {{ availableHere === 1 ? 'is' : 'are' }} vacant
              </strong>
              at the moment.
            </p>
          </div>

          <div class="mt-14 space-y-12" @mouseleave="hoveredUnit = null">
            <div
              v-for="group in unitsByFloor"
              :key="group.floor"
              class="border-t border-line pt-8 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-8 items-start"
            >
              <div class="mb-4 sm:mb-0">
                <h3 class="text-xs font-semibold tracking-[0.16em] uppercase text-ink">
                  {{ group.label }}
                </h3>
                <p class="mt-1 text-xs text-ink-faint">
                  {{ group.units.length }} {{ group.units.length === 1 ? 'unit' : 'units' }}
                </p>
              </div>

              <div
                class="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              >
                <button
                  v-for="(u, i) in group.units"
                  :key="u.id"
                  type="button"
                  :aria-pressed="u.room_number === activeUnit.room_number"
                  :class="[
                    'list-reveal-item press-plate group block w-full text-left cursor-pointer transition-opacity duration-500',
                    isSubdued(u.room_number) ? 'opacity-40' : 'opacity-100',
                  ]"
                  :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                  @click="selectUnit(u.room_number)"
                  @mouseenter="hoveredUnit = u.room_number"
                  @focusin="hoveredUnit = u.room_number"
                  @focusout="hoveredUnit = null"
                >
                  <div
                    :class="[
                      'relative overflow-hidden border-t pt-5 pb-6 px-4 transition-colors duration-500',
                      u.room_number === activeUnit.room_number
                        ? 'border-brand bg-brand-soft'
                        : 'border-line group-hover:border-ink/60',
                    ]"
                  >
                    <!-- A hairline frame that draws itself in under the cursor. -->
                    <span
                      aria-hidden="true"
                      class="pointer-events-none absolute inset-2 border border-ink/15 opacity-0 transition duration-500 ease-[var(--ease-out)] motion-safe:scale-95 group-hover:opacity-100 motion-safe:group-hover:scale-100 group-focus-visible:opacity-100"
                    />

                    <span class="relative block text-lg font-medium uppercase leading-none tracking-[-0.02em] text-ink">
                      {{ u.room_number }}
                    </span>

                    <span class="relative mt-4 block text-sm tabular-nums text-ink">
                      {{ peso(u.current_price) }}
                    </span>

                    <!--
                      Whether it is free, and nothing else. This plate used to read
                      "4 people - occupied", which is the unit's CAPACITY beside its
                      status - but nobody reads it that way. It reads as four people
                      living there, which is a fact about residents and none of a
                      visitor's business. BR-024.
                    -->
                    <span class="relative mt-1.5 block text-xs text-ink-soft">
                      {{ isAvailable(u) ? 'Free to rent' : 'Occupied' }}
                    </span>

                    <span
                      v-if="u.room_number === activeUnit.room_number"
                      class="relative mt-3 block text-[0.65rem] tracking-[0.16em] uppercase text-ink"
                    >
                      Shown above
                    </span>
                    <span
                      v-else
                      aria-hidden="true"
                      class="relative mt-3 flex items-center gap-1.5 text-[0.65rem] tracking-[0.16em] uppercase text-ink-soft opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <span>See it</span>
                      <ArrowUpRight class="size-3 shrink-0 transition-transform duration-500 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

    </template>

    <!--
      Asking about a unit. Native, so focus containment, background inertness
      and the ::backdrop come from the platform. See the note on `inquiryDialog`
      for why a backdrop click does not close it and why Escape is handled
      explicitly as well.
    -->
    <dialog
      ref="inquiryDialog"
      aria-labelledby="inquiry-dialog-title"
      class="ws-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-tile border border-line bg-tile shadow-lift p-0 font-editorial text-ink backdrop:bg-night/70"
      @keydown.esc="closeInquiry"
    >
      <form class="relative px-6 py-10 sm:px-12 sm:py-14" @submit.prevent="submitInquiry">
        <button
          type="button"
          class="icon-btn absolute right-3 top-3"
          @click="closeInquiry"
        >
          <span class="sr-only">Close</span>
          <X class="size-4" />
        </button>

        <h2
          id="inquiry-dialog-title"
          class="font-medium tracking-[-0.025em] leading-[1.15] text-[clamp(1.35rem,3.4vw,1.9rem)]"
        >
          Ask about unit {{ inquiryUnit.toUpperCase() }}
        </h2>

        <p class="mt-4 max-w-md text-xs text-ink-soft leading-relaxed">
          Mrs. {{ LANDLADY.name }} reads these herself. Nothing is emailed or texted
          automatically, so leave a number or an address she can reach you on.
        </p>

        <div class="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="cq-name" class="block text-xs text-ink-faint">
              Your name
            </label>
            <!--
              `autofocus` so opening the dialog lands on the first thing to type in.
              `showModal()` otherwise focuses the first focusable element, which is
              the close cross in the corner - verified in the running app, where
              it took the focus ring the moment the dialog opened, and a ring on
              the cross reads as "press this to leave" on a form somebody asked
              to see. The WsModal this replaced picked the first input in script
              for the same reason; the platform does it from the attribute.
            -->
            <input
              id="cq-name"
              v-model="inquiryName"
              type="text"
              autofocus
              required
              class="ws-input mt-2"
            />
          </div>

          <div>
            <label for="cq-phone" class="block text-xs text-ink-faint">
              Your phone number
            </label>
            <input
              id="cq-phone"
              v-model="inquiryPhone"
              type="tel"
              required
              placeholder="0917-000-0000"
              class="ws-input mt-2"
            />
          </div>

          <div>
            <label for="cq-email" class="block text-xs text-ink-faint">
              Your email
            </label>
            <input
              id="cq-email"
              v-model="inquiryEmail"
              type="email"
              required
              placeholder="you@email.com"
              class="ws-input mt-2"
            />
          </div>

          <div class="sm:col-span-2">
            <label for="cq-msg" class="block text-xs text-ink-faint">
              What you would like to ask
            </label>
            <textarea
              id="cq-msg"
              v-model="inquiryMsg"
              rows="4"
              class="ws-textarea mt-2"
            ></textarea>
          </div>
        </div>

        <div class="mt-10 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="pill-btn-brand px-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            <Send v-else class="size-4" />
            <span>{{ isSubmitting ? 'Sending' : 'Send' }}</span>
          </button>

          <button
            type="button"
            class="press inline-block py-1 text-xs text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors cursor-pointer"
            @click="closeInquiry"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>

  </div>
</template>
