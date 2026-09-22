<script setup lang="ts">
/**
 * @file PublicGuestView.vue
 * @description Public landing and room category overview for Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model & Section 16 - Inquiries
 * @rationale Main landing portal displaying the property hero, a statement section, category
 *            plates with direct navigation, the full availability table, FAQs, proximity map,
 *            and corporate footer.
 * @innovations Direct category routing and a per-row availability disclosure. The enquiry form
 *              is no longer here: it has its own screen at `/inquire` (`InquireView.vue`), which
 *              the navigation and the first-visit prompt both point at.
 *              Real compound entrance gate image placed at hero background with unblurred crisp
 *              rendering and balanced fluid typography.
 */
import { ref, computed, onMounted } from 'vue';
import { peso, publicStatusLabel } from '@/lib/canonicalUnits';
import { CATEGORIES } from '@/lib/unitCategories';
import { planFor, PLAN_SIZE } from '@/lib/floorPlans';
import { fetchRooms, rooms, roomsFetchFailed, roomsLoaded } from '@/lib/systemState';
import AvailabilityUnavailable from '@/components/public/AvailabilityUnavailable.vue';
import { api } from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton.vue';
import BookViewingPrompt from '@/components/modals/BookViewingPrompt.vue';
import { ArrowRight, ChevronDown, MapPin } from 'lucide-vue-next';

const isLoading = ref(true);
const openFaqIndex = ref<number | null>(0);

function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

/**
 * The answers a prospective tenant reads before they ring.
 *
 * A computed, not a constant, because one of them quotes a configured rate.
 *
 * THREE OF THESE USED TO ASSERT THINGS THE SYSTEM CANNOT SUPPORT
 * --------------------------------------------------------------
 *   water         quoted "P200 per head/occupant" as a literal. Now read from
 *                 `/public/rates`, and omitted entirely when that call fails.
 *
 *   electricity   quoted "P12.50 / kWh" and "readings are recorded on the 25th
 *                 of every month", which says the boarding house bills for
 *                 electricity. It does not. The owner answered this directly on
 *                 2026-09-17 (`CLIENT_ANSWERS_2026-09-17.md` Q5): *"the
 *                 electricity is not a feature or a part of the scope in our
 *                 system. Every unit has its own electric meter which is paid
 *                 separately by each tenant, and also is not recorded in the
 *                 income or even expenses."*
 *
 *                 That matches the build: `system_settings` holds five keys and
 *                 none is an electricity rate, and there is NO meter, reading or
 *                 utility table in the database at all - checked against
 *                 `information_schema.tables`. So the page was describing a
 *                 billing arrangement that exists nowhere, to people deciding
 *                 what living here would cost them.
 *
 *   move-in       SETTLED 2026-09-19, and the original text was right after
 *                 all. It said "1 month advance rent AND 1 month security
 *                 deposit"; OD-04 was then read as advance rent only, so the
 *                 answer was cut back to one month and eventually to no total
 *                 at all. Sean put it to the owner and relayed it plainly:
 *                 two months, one of rent and one of deposit, and the deposit
 *                 is spent at move-out on fixing and maintaining the unit the
 *                 tenant used.
 *
 *                 Understating this is the harmful direction: a prospect
 *                 budgeting one month's rent arrives needing two. So the
 *                 answer states the total and works a ₱4,500 unit through,
 *                 because "two months" is not a number anyone can act on.
 *
 *                 CORRECTED LATER THE SAME DAY. This block said the refund
 *                 was unconfirmed. It is not - she answered it on 2026-09-17
 *                 and `docs/02_BUSINESS_RULES.md` BR-039 has carried it since
 *                 the 18th. Her words, from CLIENT_ANSWERS_2026-09-17 Q7:
 *
 *                     "whatever is left of that entire expenses will be
 *                      refunded to the tenant. If it's 6500 and the expenses
 *                      is 6400, the 100 pesos will still be given back"
 *
 *                 I had read the stale code comments instead of the rule
 *                 register, which is the authority. The answer now says the
 *                 remainder comes back, WITH the condition attached - repairs
 *                 come out of it first - because a prospect who hears only
 *                 "refundable" expects the whole sum.
 */
const FAQS = computed(() => [
  {
    q: 'How does the monthly water fee work?',
    a:
      waterRatePerOccupant.value !== null
        ? `Water is billed per person, at \u20B1${waterRatePerOccupant.value} for each registered occupant every month. It follows the number of people registered as living in the unit, so it changes if that changes.`
        : 'Water is billed per person, for each registered occupant every month. It follows the number of people registered as living in the unit. Ask the landlady for the current rate.',
  },
  {
    q: 'How is electricity handled?',
    a: 'Every unit has its own electric meter and you pay for your own electricity separately. It is not part of your rent, and the boarding house does not bill you for it.',
  },
  {
    q: 'What payment methods does the boarding house accept?',
    a: 'You can pay online with GCash through the portal, or hand the money to Mrs. Fe Galang Da Silva on site. Either way it is recorded against your unit and you can see it in your own account.',
  },
  {
    q: 'What are the curfew hours and security policies?',
    a: 'The property has a gated perimeter with a 10:00 PM curfew. Registered tenants hold key access for late arrivals and academic schedules.',
  },
  {
    q: 'What do I need to move in?',
    a:
            cheapestRent.value !== null
        ? `A valid government or student ID, the resident registration form, and two months of money: one month of rent in advance, and one month as a deposit. Our cheapest unit is ₱${cheapestRent.value.toLocaleString('en-PH')} a month, so that is ₱${(cheapestRent.value * 2).toLocaleString('en-PH')} to bring on the day; for a dearer unit it is twice that unit's rent. The deposit is held while you live here. When you move out it is put towards repairing and cleaning the unit, and whatever is left over is returned to you.`
        : 'A valid government or student ID, the resident registration form, and two months of money: one month of rent in advance, and one month as a deposit, so twice the monthly rent of the unit you take. The deposit is held while you live here. When you move out it is put towards repairing and cleaning the unit, and whatever is left over is returned to you.',
  },
  {
    q: 'Are visitors and guests allowed inside the rooms?',
    a: 'Daytime visitors are welcome in the common receiving areas between 8:00 AM and 8:00 PM. Anyone staying overnight has to be registered with the landlady beforehand.',
  },
]);



/**
 * The units in a category, and how many of them are free.
 *
 * Grouped on `room_type` - the unit's own kind - which is what
 * `lib/unitCategories.ts` keys on and what the category page behind each plate
 * lists. These plates used to group on the FIRST CHARACTER OF THE UNIT CODE,
 * which is the floor: the fix landed on the category page on 2026-09-18
 * (`e1d6e68`) and did not reach here, so the plate headed "1-Bedroom Unit"
 * counted ten of them over a link to the eight real one-bedrooms, and not one
 * of that ten was among them.
 *
 * `visibility` is filtered for the same reason `listedUnits` filters it: a
 * signed-in administrator's `fetchRooms()` reads `/admin/rooms`, which does not
 * hide anything, and a Hidden unit must not be counted on the public site.
 */
function unitsInCategory(key: string) {
  return liveUnits.filter((u) => u.visibility === 'Published' && u.type === key);
}

function availableInCategory(key: string) {
  return unitsInCategory(key).filter((u) => u.status === 'vacant').length;
}

/**
 * The live unit list, from `/public/rooms` via `fetchRooms()`.
 *
 * The vacancy and total counts on this page used to be computed from
 * `CANONICAL_UNITS`, a hardcoded table whose `status` field never changes. A
 * prospective tenant was shown a vacancy count that had no connection to the
 * property's actual occupancy, on the page whose whole purpose is to say what is
 * free. The database knows: 32 Occupied, 1 Available at the time of writing.
 */
const liveUnits = rooms;

/**
 * THREE STATES, NOT TWO.
 *
 * Every gate on this page asked `roomsFetchFailed`, which has exactly two
 * answers: the listing failed, or it is fine. There is a third - it has not
 * answered yet - and until it does, `rooms` holds the `CANONICAL_UNITS` seed:
 * 33 units, every one vacant, at rates written before migration 045.
 *
 * So a visitor arriving on a slow connection was shown, as plain fact, that the
 * whole property is free at prices thousands of pesos under what she charges.
 * Not a caveat, not a zero - a complete, confident, wrong table. This page's own
 * comments already argue the principle twice: "a caveat above a wrong number is
 * still a wrong number", and "a zero is a claim". A seed rendered as a listing
 * is the same mistake with better typography.
 */
const unitsReady = computed(() => roomsLoaded.value && !roomsFetchFailed.value);
const unitsPending = computed(() => !roomsLoaded.value && !roomsFetchFailed.value);

/**
 * The water rate, from `/public/rates`.
 *
 * The FAQ below quoted "a fixed standard rate of P200 per head/occupant" as a
 * literal. That figure lives in `system_settings` under `water_rate_per_occupant`
 * and is applied by billingService, so a copy written into the answer quotes a
 * prospective tenant a price that stops being true the moment she changes it.
 * Null until it answers; the answer then omits the figure rather than guessing.
 */
const waterRatePerOccupant = ref<number | null>(null);

/**
 * The cheapest published rent, read from the live units already on this page.
 *
 * The move-in answer used to say "For a unit at P4,500 that is P9,000". That
 * figure was hardcoded, and migration 045 has just made it plainly wrong - the
 * cheapest published unit is P5,000 and the dearest is P30,000.
 *
 * It was also invisible to the check written to catch exactly this.
 * `check:liveness` rule 5 looks for a headline of the form `P N /mo`, and this
 * sentence carries no `/mo`, so the rule found nothing to compare and printed
 * "nothing to get wrong - every rate there is read from /public/rooms". That
 * sentence was false while this literal sat twelve lines above it.
 *
 * Reading it from `liveUnits` removes the literal rather than correcting it, so
 * there is nothing left to go stale the next time she changes a rate.
 */
const cheapestRent = computed<number | null>(() => {
  const published = liveUnits.filter((u) => u.visibility === 'Published' && u.price > 0);
  return published.length === 0 ? null : Math.min(...published.map((u) => u.price));
});

onMounted(async () => {
  try {
    await Promise.all([
      fetchRooms(),
      api
        .get<{ waterRatePerOccupant: number }>('/public/rates', false)
        .then((r) => {
          waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
        })
        .catch(() => {
          // Leave it null. The FAQ drops the figure rather than inventing one.
        }),
    ]);
  } finally {
    isLoading.value = false;
  }
});




/**
 * One row of the availability table is open at a time. All 33 units expanded
 * at once would push the FAQs and the map several screens down and leave the
 * reader with no sense of where they were.
 */
const openUnitId = ref<string | null>(null);
/**
 * Whether the open row's floor plan has actually painted, so it fades in
 * rather than popping in once the (lazy, per-unit) image lands. Reset on every
 * toggle: opening a different unit means a different plan to wait for.
 */
const planImageLoaded = ref(false);
function toggleUnit(id: string) {
  openUnitId.value = openUnitId.value === id ? null : id;
  planImageLoaded.value = false;
}

/**
 * Five rows are always on the page; the rest are behind the arrow.
 *
 * The whole table used to be collapsed, which meant the section read as a
 * heading and a button - nothing about the property was visible until the
 * reader guessed there was something worth opening. Thirty-three rows unrolled
 * by default is the other failure: it pushes the policies and the map several
 * screens down. Five is enough to show what a row contains and what the
 * columns mean, which is what makes the arrow worth pressing.
 */
const UNITS_PREVIEW_COUNT = 5;
const allUnitsShown = ref(false);

function toggleAllUnits() {
  allUnitsShown.value = !allUnitsShown.value;
  // A row opened among the hidden units would otherwise stay open behind the
  // fold, and its chevron would come back already rotated on the next reveal.
  if (!allUnitsShown.value) openUnitId.value = null;
}

/**
 * `/public/rooms` already returns Published units only, but `fetchRooms()`
 * reads `/admin/rooms` for a signed-in administrator, and that endpoint does
 * not filter. Without this, an administrator opening the landing page would
 * publish Hidden units onto it - the same rule `public.ts` enforces in three
 * places, applied to the one surface that reads the admin list.
 */
const listedUnits = computed(() =>
  rooms
    .filter((u) => u.visibility === 'Published')
    .slice()
    .sort((a, b) => a.floor - b.floor || a.unitCode.localeCompare(b.unitCode, 'en'))
);

/** The rows actually rendered: the first five, or all of them. */
const visibleUnits = computed(() =>
  allUnitsShown.value ? listedUnits.value : listedUnits.value.slice(0, UNITS_PREVIEW_COUNT)
);

const hiddenUnitCount = computed(() =>
  Math.max(0, listedUnits.value.length - UNITS_PREVIEW_COUNT)
);



/**
 * Keyless Google Maps embed, pinned to the PLACE rather than to a coordinate.
 *
 * WHY THIS IS A `pb=` URL AND NOT A TIDY `q=lat,lng`
 * ---------------------------------------------------
 * It used to be `output=embed` with `q=13.1416835,123.7302874`, a coordinate
 * taken from the OpenStreetMap geometry of Sapaguita Street. That coordinate
 * round-tripped correctly through Nominatim and was checked by loading it, and
 * it was still wrong in the way that matters: it marks a point ON THE STREET,
 * about twenty metres south of the compound gate. Google's own map drew its
 * place marker for "Galang's Compound" up the road, and our red pin sat below
 * it on the carriageway - two markers, disagreeing, on the page whose job is to
 * tell someone where to turn up.
 *
 * Sean spotted it on screen on 2026-09-19 and supplied this embed from Google
 * Maps directly. The part that matters inside the opaque `pb` string is
 * `1s0x33a103648fe297e5:0x54153ecf77cd6a`, which is Google's own identifier for
 * the place named Galang's Compound. Because the embed resolves the PLACE, the
 * marker is positioned by Google from its own record instead of by a number we
 * maintain, and it carries the name as a label. There is no second pin to
 * disagree with it.
 *
 * `2d`/`3d` in that string are the longitude and latitude Google centres on,
 * 123.73023905008277 and 13.141856739297554, and `1d` is the zoom span. The
 * trailing `4v...` is the timestamp Google stamps on a generated embed; it is
 * inert.
 */
/**
 * The compound location, for the reader who wants it in their own maps app.
 *
 * A plus code rather than a coordinate: `4PRJ+P4J` with its locality resolves
 * to roughly a fourteen-metre square, it is the form Sean gave for the
 * compound, and unlike a decimal pair a person can read it back and check it.
 */
const MAP_PLUS_CODE = "4PRJ+P4J";
/** A short plus code needs its locality to resolve. The sentence shows only the code. */
const MAP_PLUS_CODE_LOCALITY = "Old Albay District, Legazpi City, Albay";
const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${MAP_PLUS_CODE} ${MAP_PLUS_CODE_LOCALITY}`
)}`;
</script>

<template>
  <div class="ws-focus flex-1 flex flex-col w-full bg-canvas">
    <BookViewingPrompt />
    <!--
      Editorial full-bleed property hero.

      Type is fluid rather than stepped: `clamp()` keeps the display line
      proportional to a full-bleed field at every width, which Tailwind's
      stepped `text-*` scale cannot express - it jumps at breakpoints and
      leaves the line either stranded or overflowing between them. That
      gap is the whole reason for the arbitrary value here.

      Editorial full-bleed property hero with real Galang Compound entrance photograph.

      Image is rendered clear and unblurred (no blur filters or backdrop-blur) to preserve
      authentic visual fidelity of the boarding house gate and grounds. A subtle dark gradient
      scrim ensures text legibility for the navigation and title without degrading image clarity.

      Type uses fluid typography: `clamp(2.5rem, 8vw, 7rem)` to keep the display line
      proportional to the full-bleed field at every viewport width.
    -->
    <section class="on-dark relative w-full min-h-screen min-h-[100dvh] bg-night text-white font-editorial overflow-hidden flex flex-col justify-end">
      <!-- Crisp entrance photograph background (unblurred, leveled) -->
      <div class="absolute inset-0 z-0 overflow-hidden">
        <!--
          The opposite treatment to the enquiry page's photograph, and for the
          opposite reason: this one is the largest thing in the first viewport,
          so it is the page's LCP. It is fetched eagerly and at high priority,
          and it carries its intrinsic size so the box is reserved before the
          bytes land rather than after.
        -->
        <img
          src="/fe-galang-building.webp"
          alt="The boarding house seen from the courtyard"
          class="w-full h-full object-cover object-center"
          width="1790"
          height="879"
          fetchpriority="high"
          decoding="async"
        />
        <!--
          The scrim is the brand's own dark, not plain black. `--night` is
          #0f1b15 - a green-black - so the photograph sits under the same
          colour every dark surface in the application uses, and the hero stops
          reading as a neutral stock header bolted onto a green product.
        -->
        <div class="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-night/50" />
        <div class="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-night via-night/60 to-transparent pointer-events-none" />
      </div>

      <div class="relative z-10 ws-page w-full flex flex-col justify-end pt-24 pb-12 sm:pb-16 lg:pb-20">
        <!--
          "Boarding House" comes off the display line and sits on the right
          aligned with the header navigation. Both stay inside the <h1>, so the
          accessible name is still the full "Fe Galang Da Silva Boarding House".
        -->
        <h1 class="font-editorial drop-shadow-sm flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 w-full">
          <span class="font-medium tracking-[-0.03em] leading-[0.9] text-[clamp(3.25rem,10.5vw,9.75rem)]"
            >Fe Galang Da Silva</span>
          <span class="ml-auto text-right whitespace-nowrap text-sm sm:text-base md:text-lg font-light tracking-wide text-white/90"
            >Boarding House</span>
        </h1>
      </div>
    </section>

    <!--
      Centred statement, in place of the metric strip that stood here.

      It carried two paragraphs of standfirst under the headline. They are gone
      on request, and the facts they held are not lost with them: every unit's
      rate is in the table below, and the water rule and the electricity
      arrangement are both answered in Policies and guidelines. The earlier
      comment here claimed those facts appeared nowhere else on the page, which
      was true when the metric strip was removed and has not been true since
      the availability table and the FAQ were rebuilt.

      "5 Property Clusters" comes off the headline too. A cluster is the
      owner's own word for a part of the property and means nothing to somebody
      deciding where to live; the units and the floors are what they are
      counting.
    -->
    <section aria-label="Property at a glance" class="w-full bg-canvas font-editorial">
      <div class="ws-page ws-band">

        <h2 class="text-center font-medium text-ink tracking-[-0.03em] leading-[0.95] text-[clamp(1.9rem,6vw,5.25rem)]">
          33 Units, 4 Floors
        </h2>

        <p class="mt-14 text-center text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
          32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City
        </p>

      </div>
    </section>

    <!-- 1. Category Explorer (Centered) -->
    <div id="categories" class="ws-page ws-band scroll-mt-20 font-editorial">
      <section>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
            Explore by unit category
          </h2>
          <p class="max-w-md text-xs sm:text-sm text-ink-soft leading-relaxed">
            The four kinds of unit on the property, smallest first. Choose one to browse live
            availability and view all rooms of that kind.
          </p>
        </div>

        <div v-if="isLoading" class="mt-8 sm:mt-10 border-t border-line">
          <div v-for="i in 4" :key="i" class="flex items-center gap-4 border-b border-line py-5">
            <Skeleton class-name="h-4 w-40 rounded-full" />
            <Skeleton class-name="h-3 w-24 rounded-full" />
          </div>
        </div>

        <!--
          A register, set like the availability table below it rather than as
          four framed plates.

          The plates were tonal frames with an icon in the middle, because no
          room photography exists. Sean asked for the pictures to come off:
          the drawings that matter are the floor plans, and those belong in the
          unit rows below, where a reader has already chosen a unit. A category
          is a row with a count and a sentence, which is what this is now.

          Each row is a real RouterLink, so middle-click, open-in-new-tab and
          the native Enter handling all work. The whole row is the target.
        -->
        <div v-else class="mt-8 sm:mt-10 overflow-hidden rounded-tile bg-tile border border-line">
          <p class="sr-only">Four kinds of unit. Each row opens that kind.</p>

          <div
            class="hidden border-b border-line px-5 py-3 text-[0.7rem] tracking-[0.14em] uppercase text-ink-soft sm:grid sm:grid-cols-[14rem_1fr_9rem_9rem] sm:gap-6"
          >
            <span>Kind</span>
            <span>What it is</span>
            <!--
              With the listing unreachable the rows carry one "could not be
              loaded" line across both right-hand columns, so heading them
              "Units" and "Free to rent" labels two columns that have no
              values under them. The header follows the rows.
            -->
            <template v-if="unitsReady">
              <span class="text-right">Units</span>
              <span class="text-right">Free to rent</span>
            </template>
            <span v-else class="text-right sm:col-span-2">Availability</span>
          </div>

          <RouterLink
            v-for="(c, i) in CATEGORIES"
            :key="c.key"
            :to="'/category/' + c.slug"
            class="list-reveal-item press-plate group block border-b border-line px-5 py-5 transition-colors hover:bg-canvas sm:grid sm:grid-cols-[14rem_1fr_9rem_9rem] sm:items-baseline sm:gap-6"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
          >
            <span class="flex items-baseline gap-2 text-base font-medium text-ink">
              {{ c.title }}
              <ArrowRight
                class="size-4 shrink-0 text-ink-faint transition-transform duration-300 ease-[var(--ease-out)] motion-safe:group-hover:translate-x-1 group-hover:text-brand"
                aria-hidden="true"
              />
            </span>

            <span class="mt-2 block max-w-xl text-xs leading-relaxed text-ink-soft sm:mt-0 sm:text-sm">
              {{ c.blurb }}
            </span>

            <!--
              The counts, or an admission that they are not known.

              With the room list unreachable, `rooms` still holds the seed from
              `systemState.ts`, whose types are the wrong ones - so grouping it
              by `room_type` matches nothing and every row would report nought.
              A zero is a claim: it says this property has no studios. B-01 in
              BLOCKED_FOR_SEAN.md is the open decision; this is the honest
              interim.
            -->
            <template v-if="roomsFetchFailed">
              <span class="mt-2 block text-xs text-ink-faint sm:col-span-2 sm:mt-0 sm:text-right">
                Availability could not be loaded
              </span>
            </template>
            <template v-else-if="unitsPending">
              <span class="mt-2 block text-xs text-ink-faint sm:col-span-2 sm:mt-0 sm:text-right">
                Checking what is free&hellip;
              </span>
            </template>
            <template v-else>
              <span class="mt-2 block text-xs tabular-nums text-ink-soft sm:mt-0 sm:text-right sm:text-sm">
                <span class="sm:hidden">Units: </span>{{ unitsInCategory(c.key).length }}
              </span>
              <span class="mt-1 block text-xs tabular-nums text-ink-soft sm:mt-0 sm:text-right sm:text-sm">
                <span class="sm:hidden">Free to rent: </span>{{ availableInCategory(c.key) }}
              </span>
            </template>
          </RouterLink>
        </div>
      </section>
    </div>

    <!--
      Every published unit, one row each, with the detail behind a per-row
      disclosure. Tenant names are deliberately absent: `RoomItem.tenant` is
      populated for occupied units and this is a public page.
    -->
    <section id="availability" class="w-full bg-canvas border-t border-line font-editorial scroll-mt-20">
      <div class="ws-page ws-band">

        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
            All units
          </h2>
          <p class="max-w-md text-xs sm:text-sm text-ink-soft leading-relaxed">
            Every unit on the property. Five are listed here and the arrow below opens the
            rest; open a row to see its floor, capacity, billing rule and what it includes.
          </p>
        </div>

        <!--
          B-01, settled by Sean on 2026-09-19: when the listing cannot be read, be
          honest and point them at her, rather than printing the seed.

          `rooms` keeps the always-vacant `CANONICAL_UNITS` seed when the fetch
          fails. This used to disclose that in a notice and then print the table
          anyway - 33 units, every one marked Available, on a property that is 32
          occupied, at rates where 30 of the 33 no longer match. A caveat above a
          wrong number is still a wrong number, and the category page was already
          refusing to show anything in the same situation. Same component both
          places now.
        -->
        <AvailabilityUnavailable v-if="roomsFetchFailed" subject="the units on the property" />

        <!--
          The listing has not answered yet. Says so, rather than printing the
          seed - see the note on `unitsReady`.
        -->
        <p v-else-if="unitsPending" class="mt-8 text-sm text-ink-soft">
          Reading the current listing&hellip;
        </p>

        <!--
          Seven columns need 44rem, so on a phone this table was 704px inside a
          375px screen: a sideways swipe to reach the rate and the status, which
          are the two things a person came to read.

          Below `sm` the same rows are stacked instead, in this page's own
          editorial manner - hairline rules, no tile, no card - rather than
          importing the workspace surfaces, which belong to the admin and tenant
          side and would read as a different site.
        -->
        <!--
          The workspace's own register, not a second one.

          This was a hand-rolled table set in the editorial manner - hairline
          rules, no surface under it, sitting straight on the page. Every
          register in the admin and tenant screens is `ws-table` inside
          `ws-table-wrap` on a `rounded-tile bg-tile` card, and the difference
          was one of the loudest things telling a reader the public site was a
          different product.

          It also fixes the hover Sean objected to. A row on the old table had
          no surface of its own, so highlighting it meant painting it WHITE -
          brighter than the page. On a white tile the workspace highlight is
          `--canvas`, the pale green used on the active-tenants register, and
          `ws-table` brings it with no extra rule here.
        -->
        <div v-if="unitsReady" class="mt-8 sm:mt-10 hidden overflow-hidden rounded-tile bg-tile sm:block">
          <div class="ws-table-wrap">
          <table class="ws-table">
            <caption class="sr-only">
              Every published unit on the property, with its cluster, type, floor, monthly rate and current status.
            </caption>
            <thead>
              <tr class="border-b border-line text-[0.7rem] tracking-[0.14em] uppercase text-ink-soft font-normal">
                <th scope="col" class="!px-5 !py-3 !text-[0.7rem] !tracking-[0.14em] !uppercase !text-ink-soft !font-normal">Unit</th>
                <th scope="col" class="!px-5 !py-3 !text-[0.7rem] !tracking-[0.14em] !uppercase !text-ink-soft !font-normal">Cluster</th>
                <th scope="col" class="!px-5 !py-3 !text-[0.7rem] !tracking-[0.14em] !uppercase !text-ink-soft !font-normal">Type</th>
                <th scope="col" class="!px-5 !py-3 !text-[0.7rem] !tracking-[0.14em] !uppercase !text-ink-soft !font-normal">Floor</th>
                <th scope="col" class="num !px-5 !py-3 !text-[0.7rem] !tracking-[0.14em] !uppercase !text-ink-soft !font-normal">Price</th>
                <th scope="col" class="!px-5 !py-3 !text-[0.7rem] !tracking-[0.14em] !uppercase !text-ink-soft !font-normal">Status</th>
                <th scope="col" class="w-12 !px-5 !py-3"><span class="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody id="all-units-body">
              <template v-for="(u, i) in visibleUnits" :key="u.id">
                <tr
                  :class="[
                    'list-reveal-item cursor-pointer select-none transition-colors group',
                    openUnitId === u.id ? 'is-active' : ''
                  ]"
                  :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                  @click="toggleUnit(u.id)"
                  :aria-expanded="openUnitId === u.id"
                  :aria-controls="`unit-panel-${u.id}`"
                  tabindex="0"
                  @keydown.enter.prevent="toggleUnit(u.id)"
                  @keydown.space.prevent="toggleUnit(u.id)"
                >
                  <td class="font-medium text-ink">{{ u.unitCode }}</td>
                  <td class="text-ink-soft">{{ u.cluster }}</td>
                  <td class="text-ink-soft">{{ u.type }}</td>
                  <td class="text-ink-soft">{{ u.floorLabel }}</td>
                  <td class="num text-ink-soft">{{ peso(u.price) }}</td>
                  <td class="text-ink-soft">{{ publicStatusLabel(u.status) }}</td>
                  <td>
                    <div
                      class="press grid size-8 place-items-center text-ink-soft group-hover:text-ink transition-colors"
                    >
                      <span class="sr-only">
                        {{ openUnitId === u.id ? 'Hide' : 'Show' }} details for unit {{ u.unitCode }}
                      </span>
                      <ChevronDown
                        :class="[
                          'size-4 transition-transform duration-200',
                          openUnitId === u.id ? 'rotate-180' : ''
                        ]"
                      />
                    </div>
                  </td>
                </tr>

                <tr v-if="openUnitId === u.id" :id="`unit-panel-${u.id}`" class="bg-tile unit-detail-row">
                  <!--
                    Two columns: what the unit is on the left, where it is on
                    the right.

                    Billing moved up under Capacity to clear the third column,
                    and the amenity list came out. It listed "Private Bathroom,
                    Submetered Electricity, Provision for Aircon, Wi-Fi Ready"
                    against every unit identically, which tells a reader
                    nothing about the one they just opened.
                  -->
                  <td colspan="7" class="px-4 py-6">
                    <div class="ws-reveal grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
                      <div>
                        <dl class="grid gap-x-10 gap-y-5 sm:grid-cols-2 text-xs sm:text-sm">
                          <div>
                            <dt class="text-ink-soft">Floor</dt>
                            <dd class="mt-1 text-ink">{{ u.floorLabel }}</dd>
                          </div>
                          <div>
                            <dt class="text-ink-soft">Capacity</dt>
                            <dd class="mt-1 text-ink">Up to {{ u.maxOccupants }} occupants</dd>
                            <dd class="mt-1 text-ink-soft">{{ u.billingRule }}</dd>
                          </div>
                        </dl>

                        <p v-if="u.desc" class="mt-6 max-w-2xl text-xs sm:text-sm text-ink-soft leading-relaxed">
                          {{ u.desc }}
                        </p>
                      </div>

<figure class="m-0">
                        <figcaption class="text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
                          Unit {{ u.unitCode }} on {{ u.floorLabel }}
                        </figcaption>

                        <div
                          v-if="planFor(u.unitCode)"
                          class="relative mt-3 overflow-hidden rounded-tile"
                        >
                          <img
                            :src="`/floorplans/${planFor(u.unitCode)!.plan}.png`"
                            :alt="`Floor plan of ${u.floorLabel}`"
                            :width="PLAN_SIZE[planFor(u.unitCode)!.plan]?.w"
                            :height="PLAN_SIZE[planFor(u.unitCode)!.plan]?.h"
                            :class="[
                              'block w-full mix-blend-multiply transition-opacity duration-300 ease-[var(--ease-out)]',
                              planImageLoaded ? 'opacity-100' : 'opacity-0',
                            ]"
                            loading="lazy"
                            decoding="async"
                            @load="planImageLoaded = true"
                          />
                          <span
                            v-if="planFor(u.unitCode)!.x !== null"
                            class="absolute rounded-full bg-brand px-2 py-0.5 text-[0.65rem] font-semibold text-on-brand shadow-lift"
                            :style="{
                              left: planFor(u.unitCode)!.x + '%',
                              top: planFor(u.unitCode)!.y + '%',
                              transform: 'translate(-30%, -100%)',
                            }"
                          >{{ u.unitCode }}</span>
                        </div>

                        <div
                          v-else
                          class="mt-3 grid aspect-[4/3] place-items-center rounded-tile border border-dashed border-hatch bg-canvas px-6 text-center"
                        >
                          <p class="text-xs leading-5 text-ink-faint">
                            There is no floor plan on file for this unit yet.
                          </p>
                        </div>
                      </figure>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          </div>
        </div>

        <!-- The same units, stacked, for a phone. -->
        <ul v-if="unitsReady" id="all-units-list" class="mt-10 sm:hidden">
          <li
            v-for="(u, i) in visibleUnits"
            :key="u.id"
            class="list-reveal-item border-b border-line"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
          >
            <button
              type="button"
              :aria-expanded="openUnitId === u.id"
              :aria-controls="`unit-card-${u.id}`"
              class="press-plate flex w-full items-center justify-between gap-4 py-4 text-left group"
              @click="toggleUnit(u.id)"
            >
              <span class="min-w-0">
                <span class="block font-medium text-ink">{{ u.unitCode }}</span>
                <span class="mt-0.5 block text-xs text-ink-soft">
                  {{ u.type }} &middot; {{ u.cluster }} &middot; {{ u.floorLabel }}
                </span>
              </span>
              <span class="flex items-center gap-3 shrink-0 text-right">
                <span>
                  <span class="block tabular-nums text-ink">{{ peso(u.price) }}</span>
                  <span class="mt-0.5 block text-xs text-ink-soft">
                    {{ publicStatusLabel(u.status) }}
                  </span>
                </span>
                <ChevronDown
                  :class="[
                    'size-4 text-ink-soft group-hover:text-ink transition-transform duration-200',
                    openUnitId === u.id ? 'rotate-180' : ''
                  ]"
                />
              </span>
            </button>

            <div v-if="openUnitId === u.id" :id="`unit-card-${u.id}`" class="ws-reveal pb-6">
              <dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                <div>
                  <dt class="text-ink-soft">Floor</dt>
                  <dd class="mt-1 text-ink">{{ u.floorLabel }}</dd>
                </div>
                <div>
                  <dt class="text-ink-soft">Capacity</dt>
                  <dd class="mt-1 text-ink">Up to {{ u.maxOccupants }} occupants</dd>
                  <dd class="mt-1 text-ink-soft">{{ u.billingRule }}</dd>
                </div>
              </dl>

              <p v-if="u.desc" class="mt-5 text-xs text-ink-soft leading-relaxed">
                {{ u.desc }}
              </p>

<figure class="m-0 mt-5">
                <figcaption class="text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
                  Unit {{ u.unitCode }} on {{ u.floorLabel }}
                </figcaption>

                <div
                  v-if="planFor(u.unitCode)"
                  class="relative mt-3 overflow-hidden rounded-tile"
                >
                  <img
                    :src="`/floorplans/${planFor(u.unitCode)!.plan}.png`"
                    :alt="`Floor plan of ${u.floorLabel}`"
                    :width="PLAN_SIZE[planFor(u.unitCode)!.plan]?.w"
                    :height="PLAN_SIZE[planFor(u.unitCode)!.plan]?.h"
                    :class="[
                      'block w-full mix-blend-multiply transition-opacity duration-300 ease-[var(--ease-out)]',
                      planImageLoaded ? 'opacity-100' : 'opacity-0',
                    ]"
                    loading="lazy"
                    decoding="async"
                    @load="planImageLoaded = true"
                  />
                  <span
                    v-if="planFor(u.unitCode)!.x !== null"
                    class="absolute rounded-full bg-brand px-2 py-0.5 text-[0.65rem] font-semibold text-on-brand shadow-lift"
                    :style="{
                      left: planFor(u.unitCode)!.x + '%',
                      top: planFor(u.unitCode)!.y + '%',
                      transform: 'translate(-30%, -100%)',
                    }"
                  >{{ u.unitCode }}</span>
                </div>

                <div
                  v-else
                  class="mt-3 grid aspect-[4/3] place-items-center rounded-tile border border-dashed border-hatch bg-canvas px-6 text-center"
                >
                  <p class="text-xs leading-5 text-ink-faint">
                    There is no floor plan on file for this unit yet.
                  </p>
                </div>
              </figure>
            </div>
          </li>
        </ul>

        <!--
          The arrow, under the five rows rather than over them.

          `aria-expanded` and `aria-controls` point at the table body that
          grows, so a screen reader is told this is a disclosure and what it
          discloses - the chevron alone says that to sighted readers only. The
          button is not rendered at all when there is nothing behind it, which
          is the case if the property is ever listed with five units or fewer.
        -->
        <div v-if="unitsReady && hiddenUnitCount > 0" class="mt-4 sm:mt-6">
          <button
            type="button"
            :aria-expanded="allUnitsShown"
            aria-controls="all-units-body all-units-list"
            class="press-plate group flex w-full items-center justify-between gap-6 py-2 text-left sm:pr-[17px]"
            @click="toggleAllUnits"
          >
            <span class="text-sm font-semibold text-brand underline underline-offset-4 decoration-brand/60 group-hover:decoration-brand group-hover:text-brand-strong transition-colors">
              {{ allUnitsShown ? `Show only the first ${UNITS_PREVIEW_COUNT} units` : `Show the remaining ${hiddenUnitCount} units` }}
            </span>
            <span class="grid size-8 place-items-center shrink-0">
              <ChevronDown
                :class="[
                  'size-4 text-brand group-hover:text-brand-strong transition-all duration-200',
                  allUnitsShown ? 'rotate-180' : ''
                ]"
              />
            </span>
          </button>
        </div>

      </div>
    </section>

    <!-- 2. Frequently Asked Questions (FAQ Section) -->
    <section id="faqs" class="w-full bg-canvas border-t border-line font-editorial ws-band scroll-mt-20">
      <div class="ws-page">

        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
            Policies &amp; guidelines
          </h2>
          <p class="max-w-md text-xs sm:text-sm text-ink-soft leading-relaxed">
            Standard operating guidelines, individual utilities submetering, security curfews, and payment methods for Fe Galang Da Silva Boarding House.
          </p>
        </div>

        <!--
          Same disclosure pattern as the availability table above: a hairline
          rule per item, the chevron as the only affordance, and one answer open
          at a time. `openFaqIndex` already enforced the last of those.
        -->
        <dl class="mt-12 border-t border-line">
          <div v-for="(faq, idx) in FAQS" :key="idx" class="border-b border-line">
            <dt>
              <button
                type="button"
                :aria-expanded="openFaqIndex === idx"
                :aria-controls="`faq-panel-${idx}`"
                class="press-plate w-full flex items-center justify-between gap-6 py-5 text-left group cursor-pointer"
                @click="toggleFaq(idx)"
              >
                <span class="inline-block text-sm sm:text-base text-ink group-hover:text-ink-soft transition-colors">
                  {{ faq.q }}
                </span>
                <span class="grid size-8 place-items-center shrink-0">
                  <ChevronDown
                    :class="[
                      'size-4 text-ink-soft group-hover:text-ink transition-transform duration-200 ease-[var(--ease-out)]',
                      openFaqIndex === idx ? 'rotate-180' : ''
                    ]"
                  />
                </span>
              </button>
            </dt>

            <dd v-if="openFaqIndex === idx" :id="`faq-panel-${idx}`" class="ws-reveal pb-7 pr-10 max-w-3xl text-xs sm:text-sm text-ink-soft leading-relaxed">
              {{ faq.a }}
            </dd>
          </div>
        </dl>

      </div>
    </section>

    <!--
      A live map, replacing `property-map.png` and the SVG drawn over it. That
      overlay traced a red route to Bicol University and labelled a transit
      waypoint; both are gone at the owner's request and the map now shows the
      compound alone.

      It is a third-party frame, so: lazy-loaded, referrer trimmed, and titled
      for anyone who reaches it by keyboard or screen reader. It will not render
      with no network - the PWA caches an offline shell - which is why the
      address stays in text beside it rather than living only on the map.
    -->
    <section id="location" class="w-full bg-canvas border-t border-line font-editorial scroll-mt-20">
      <div class="ws-page ws-band">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
            Location
          </h2>
          <div class="max-w-md">
            <p class="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Galang's Compound, 32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City, Albay.
            </p>

            <div class="mt-3">
              <a
                :href="mapLinkUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="press inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand hover:text-brand-strong underline underline-offset-4 decoration-brand/50 hover:decoration-brand transition-colors"
              >
                <MapPin class="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span>Open in Google Maps</span>
                <span class="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>

        <!--
          The gate, because it is the thing somebody is actually looking for
          when they arrive. A map pin puts you on the street; this is what
          tells you that you are at the right one. It sits between the address
          and the map for that reason, and it is lazy because it is well below
          the fold.
        -->
        <figure class="m-0 mt-12">
          <img
            src="/fe-galang-gate.webp"
            alt="The blue gate of Galang's Compound, lettered GALANG COMPOUND"
            class="block w-full rounded-tile border border-line object-cover"
            width="1790"
            height="879"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="mt-3 text-xs text-ink-soft">
            Look for this gate on Sapaguita Street.
          </figcaption>
        </figure>
      </div>
    </section>

  </div>
</template>
