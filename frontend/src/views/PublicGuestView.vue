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
import { fetchRooms, rooms, roomsFetchFailed } from '@/lib/systemState';
import { api } from '@/lib/api';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
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
 *                 of every month". There is no electricity rate in
 *                 `system_settings` - it holds five keys and none of them is
 *                 one - and there is NO meter, reading or utility table in the
 *                 database at all, checked against `information_schema.tables`.
 *                 Both may well be true of the house; neither is something this
 *                 system knows, and a rate quoted publicly is one a prospect
 *                 budgets against. The answer now describes the arrangement
 *                 without asserting a price or a reading day. Raised for the
 *                 owner to confirm - B-12.
 *
 *   move-in       said "1 month advance rent AND 1 month security deposit",
 *                 which is two months of somebody's money. OD-04 is CONTESTED:
 *                 on 2026-09-13 the owner described the move-in sum as advance
 *                 rent and NOT a refundable deposit; on 2026-09-17 she
 *                 described the same money as held, spent on repairs at
 *                 move-out and partly refunded. The decisions register says in
 *                 terms: "Do not build from either." Two months matches NEITHER
 *                 answer - both describe one month. The answer no longer states
 *                 a total, and points them at the person who can.
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
    q: 'How is electricity metered and billed?',
    a: 'Each of the 33 rentable units has its own electric submeter, and you are billed for what the meter shows you used rather than a share of a single bill. Ask the landlady for the current rate per unit of electricity and when she takes the readings.',
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
    a: 'A valid government or student ID, the resident registration form, and one month of rent up front. Ask Mrs. Da Silva to confirm the total before you come - what is held and how it is settled when you leave is something she will explain herself.',
  },
  {
    q: 'Are visitors and guests allowed inside the rooms?',
    a: 'Daytime visitors are welcome in the common receiving areas between 8:00 AM and 8:00 PM. Anyone staying overnight has to be registered with the landlady beforehand.',
  },
]);


/**
 * Which category plate the cursor or the keyboard is on.
 *
 * The plate being read is the only one at full strength; the others step back
 * to 40%. What steps them back is opacity alone - no blur and no filter -
 * because the counts under the dimmed plates still have to be readable, and a
 * prospect comparing four kinds of unit is doing exactly that.
 *
 * `focusin`/`focusout` sit beside the pointer handlers so tabbing through the
 * plates produces the same emphasis a mouse does; the transform half of the
 * effect is behind `motion-safe:` throughout, so a reader who has asked for
 * reduced motion gets the tonal change without the movement.
 */
const hoveredCategory = ref<string | null>(null);

function isDimmed(key: string): boolean {
  return hoveredCategory.value !== null && hoveredCategory.value !== key;
}

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
 * The water rate, from `/public/rates`.
 *
 * The FAQ below quoted "a fixed standard rate of P200 per head/occupant" as a
 * literal. That figure lives in `system_settings` under `water_rate_per_occupant`
 * and is applied by billingService, so a copy written into the answer quotes a
 * prospective tenant a price that stops being true the moment she changes it.
 * Null until it answers; the answer then omits the figure rather than guessing.
 */
const waterRatePerOccupant = ref<number | null>(null);

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
 * The landing hero draws its own navigation, so `AppHeader` is not mounted on
 * this route and its section links are not available to fall back on. Three
 * in-page targets remain - categories, faqs, location. Enquiries are a route
 * now, not an anchor, so that link is a RouterLink rather than a scroll.
 */
function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * One row of the availability table is open at a time. All 33 units expanded
 * at once would push the FAQs and the map several screens down and leave the
 * reader with no sense of where they were.
 */
const openUnitId = ref<string | null>(null);
function toggleUnit(id: string) {
  openUnitId.value = openUnitId.value === id ? null : id;
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
 * Keyless Google Maps embed, pinned by coordinate.
 *
 * `output=embed` returns a real, interactive map with no API key, billing
 * account or script tag; the Maps JavaScript API needs all three and none of
 * them exist for this project. A `q=` of `lat,lng` puts Google's own red
 * marker on that point - which is the pin, rather than something drawn over
 * the iframe: an overlay would sit still while the map panned under it.
 *
 * WHERE THE COORDINATE COMES FROM, AND WHAT IT MARKS
 * --------------------------------------------------
 * This was the barangay name, and the reason was that querying the full street
 * address put the pin on "32 Sampaguita Ave, Daraga" - a different
 * municipality - because Google matched a similarly spelled street there.
 * Verified at the time by loading it: the embed's own info card named Daraga.
 * Asking for the barangay instead resolved correctly but marked the whole of
 * Sagpon, which is not an address.
 *
 * The coordinate below is the OpenStreetMap geometry of Sampaguita Street in
 * Sagpon, Legazpi - "Sapaguita" on the owner's paperwork is the local spelling
 * of the same street - and it round-trips: the forward search for that street
 * returns this point, and reversing this point returns "Sampaguita Street,
 * Sagpon, Legazpi, Albay, 4500". Checked against Nominatim on 2026-09-19.
 *
 * THEN IT WAS LOADED AND LOOKED AT, which is the only reason it is here.
 * The embed was opened at this coordinate on 2026-09-19 and Google's own map
 * puts a labelled place - "Galang's Compound" - within a few metres of the
 * marker, on the street it labels Sampaguita Street, with the Sagumayun River,
 * Rizal Avenue and the Bicol University campus around it. Old Albay, Legazpi.
 * Not Daraga. That is the same standard the Daraga mistake was caught by: the
 * previous author loaded the embed and read its info card, and so did this one.
 *
 * It is still not a surveyed position for the gate, so if Mrs. Da Silva gives a
 * `lat,lng` for the entrance, replace this one string - the embed, the marker
 * and the directions link all read it. The full address stays in text beside
 * the map because a third-party frame will not render with no network, and the
 * PWA caches an offline shell.
 */
const MAP_PIN = '13.1416835,123.7302874';
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(MAP_PIN)}&z=18&hl=en&output=embed`;

/** The same point, for the reader who wants it in their own maps app. */
const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_PIN)}`;

</script>

<template>
  <div class="flex-1 flex flex-col w-full bg-surface-sunken">
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
    <section class="relative w-full bg-neutral-dark text-white font-editorial overflow-hidden">
      <!-- Crisp entrance photograph background (unblurred, leveled) -->
      <div class="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/galang-compound.jpg"
          alt="Fe Galang Da Silva Boarding House - Galang Compound Gate"
          class="w-full h-full object-cover object-center"
        />
        <!-- Subtle contrast overlay: unblurred to keep image details crystal clear and vibrant -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40" />
        <!-- Bottom black gradient for smooth anchoring of the hero frame -->
        <div class="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      </div>

      <div class="relative z-10 max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 flex flex-col min-h-[clamp(34rem,94vh,58rem)] pt-7 pb-10 sm:pb-14">

        <!--
          Navigation is drawn over the hero rather than in a bar above it, so
          `AppHeader` is not mounted on this route - see `isLandingPage` in
          App.vue. These five destinations are the ones it carried, with the
          same four section ids and the same labels; losing any of them here
          would strip the page's only navigation.
        -->
        <header class="flex items-start justify-between gap-6 sm:gap-10">
          <RouterLink
            to="/public"
            class="shrink-0 text-[0.8rem] leading-[1.25] font-light tracking-[-0.01em] hover:text-white/65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors drop-shadow-sm"
          >
            Fe Galang<br />Da Silva<br />Boarding House
          </RouterLink>

          <nav aria-label="Property sections" class="flex flex-wrap justify-end items-baseline text-[0.8rem] font-light drop-shadow-sm">
            <button @click="scrollToSection('categories')" class="underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">Category Section</button>
            <span aria-hidden="true" class="pr-2">,</span>
            <button @click="scrollToSection('faqs')" class="underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">FAQs</button>
            <span aria-hidden="true" class="pr-2">,</span>
            <RouterLink to="/inquire" class="underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">Inquire Now</RouterLink>
            <span aria-hidden="true" class="pr-2">,</span>
            <button @click="scrollToSection('location')" class="underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">Location</button>
            <span aria-hidden="true" class="pr-2">,</span>
            <RouterLink to="/login" class="underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">Sign In</RouterLink>
          </nav>
        </header>

        <h1 class="mt-auto pt-24 font-editorial font-medium tracking-[-0.03em] leading-[0.93] text-[clamp(2.5rem,8vw,7rem)] drop-shadow-sm">
          Fe Galang Da Silva<br class="hidden sm:inline" /> Boarding House
        </h1>

      </div>
    </section>

    <!--
      Centred statement, in place of the metric strip that stood here.

      The strip was deleted on request, but three of its facts appear nowhere
      else on this page - the street address, the ₱4,500 starting rate and the
      floor count - so they are carried in this section's headline and standfirst
      rather than dropped. A prospective boarder cannot decide anything without
      the rate.

      The two standfirst columns are the existing hero sentence split at its
      full stop, not new copy. The headline is the only authored line here.
    -->
    <section aria-label="Property at a glance" class="w-full bg-background font-editorial">
      <div class="max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 py-24 sm:py-32 lg:py-40">

        <h2 class="text-center font-medium text-foreground tracking-[-0.03em] leading-[0.95] text-[clamp(1.9rem,6vw,5.25rem)]">
          33 Units, 4 Floors<br />5 Property Clusters
        </h2>

        <div class="mt-12 sm:mt-16 mx-auto max-w-3xl grid gap-8 sm:grid-cols-2 text-xs sm:text-[0.82rem] leading-relaxed text-muted-foreground">
          <p>
            Canonical 33-unit residential boarding house across three residential floors plus a rooftop penthouse level, in 5 property clusters.
          </p>
          <p>
            Verified individual electric submeters, ₱200/head monthly water rule, and secure gated perimeter. Starting base rate ₱4,500/mo.
          </p>
        </div>

        <p class="mt-14 text-center text-[0.7rem] tracking-[0.18em] uppercase text-muted-foreground">
          32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City
        </p>

      </div>
    </section>

    <!-- 1. Category Explorer (Centered) -->
    <div id="categories" class="max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 py-20 sm:py-28 scroll-mt-20 font-editorial">
      <section class="space-y-14">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-foreground tracking-[-0.02em]">
            Explore by unit category
          </h2>
          <p class="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The four kinds of unit on the property, smallest first. Choose one to browse live
            availability and view all rooms of that kind.
          </p>
        </div>

        <div v-if="isLoading" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard variant="category" :count="4" />
        </div>

        <!--
          Project-index layout: each category is one framed plate with its
          caption set beneath it, alternating down the page rather than sitting
          in a row of equal cards.

          Each plate is a real RouterLink to the `/category/:slug` route that
          `navigateToCategory` used to push; that function had no other caller
          and went with the cards. A link restores middle-click, open-in-new-tab
          and the native Enter/Space handling that `role="button" tabindex="0"`
          only partly reimplemented.

          The plate is a tonal frame, not a photograph: no room imagery exists
          in this repository. The reference this follows frames an empty plate
          the same way, so the placeholder is not a broken state.
        -->
        <!--
          Interactive focus plates.

          Hovering or tab-focusing one plate is what brings it forward: the
          others drop to 40% (`isDimmed`), a hairline frame draws itself in
          inside the border, the icon lifts, and the "View all rooms" strip
          slides up from the bottom edge. Only one plate is ever at full
          strength, which is the point - four equal frames with no photography
          in them give a reader nothing to fix on.

          Everything that MOVES is behind `motion-safe:`, so a reader who has
          asked their system for reduced motion still gets the whole effect in
          tone and colour, with nothing sliding or scaling. Every hover state
          has a `group-focus-visible:` twin, so the keyboard sees what the
          mouse sees rather than a bare outline.

          The strip is decoration over a link that already says where it goes;
          the caption beneath the plate carries the same words as text, so
          nothing here is only available to a pointer.
        -->
        <div
          v-else
          class="grid gap-x-12 gap-y-16 sm:grid-cols-2 sm:gap-x-10 lg:gap-x-16 lg:gap-y-20"
          @mouseleave="hoveredCategory = null"
        >
          <RouterLink
            v-for="(c, i) in CATEGORIES"
            :key="c.key"
            :to="`/category/${c.slug}`"
            :class="[
              'group block transition-opacity duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground',
              i % 2 === 1 ? 'sm:mt-20 lg:mt-28' : '',
              isDimmed(c.key) ? 'opacity-40' : 'opacity-100'
            ]"
            @mouseenter="hoveredCategory = c.key"
            @focusin="hoveredCategory = c.key"
            @focusout="hoveredCategory = null"
          >
            <div
              class="relative aspect-[3/2] sm:aspect-[4/3] w-full overflow-hidden border border-border bg-muted transition-colors duration-500 group-hover:border-foreground/40 group-focus-visible:border-foreground/40"
            >
              <!-- A tonal wash, deepening under the cursor. -->
              <span
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors duration-500 group-hover:bg-foreground/[0.04] group-focus-visible:bg-foreground/[0.04]"
              />

              <!-- The inner frame, drawing itself in. -->
              <span
                aria-hidden="true"
                class="pointer-events-none absolute inset-5 border border-foreground/15 opacity-0 transition-all duration-500 ease-out motion-safe:scale-95 group-hover:opacity-100 motion-safe:group-hover:scale-100 group-focus-visible:opacity-100 motion-safe:group-focus-visible:scale-100"
              />

              <span class="absolute inset-0 grid place-items-center">
                <component
                  :is="c.icon"
                  class="size-9 text-muted-foreground-soft transition-all duration-500 ease-out group-hover:text-foreground motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:scale-110 group-focus-visible:text-foreground"
                />
              </span>

              <span
                aria-hidden="true"
                class="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between gap-4 bg-foreground px-5 py-3.5 text-background transition-transform duration-500 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none"
              >
                <span class="text-[0.7rem] tracking-[0.18em] uppercase">View all rooms</span>
                <ArrowRight class="size-4 shrink-0 transition-transform duration-500 motion-safe:group-hover:translate-x-1" />
              </span>
            </div>

            <div class="mt-5 flex items-baseline justify-between gap-6">
              <h3 class="text-base sm:text-lg font-medium text-foreground">{{ c.title }}</h3>
              <span class="shrink-0 text-sm text-muted-foreground underline underline-offset-4 decoration-1 decoration-border-strong group-hover:text-foreground group-hover:decoration-foreground group-focus-visible:text-foreground transition-colors">
                View All Rooms
              </span>
            </div>

            <!--
              The counts, or an admission that they are not known.

              With the room list unreachable, `rooms` still holds the seed from
              `systemState.ts` - and the seed's types are the wrong ones
              (`"Studio Type Apartment"`, `"1-Bedroom Apartment"`), so grouping it
              by `room_type` matches nothing and every plate would report a
              count of nought. A zero is a claim: it says this property has no
              studios. The
              category page behind these plates refuses to show a seeded listing
              for the same reason, so the plate says which state it is in
              instead. B-01 in BLOCKED_FOR_SEAN.md is the open decision about
              what the landing should do here; this is the honest interim.
            -->
            <div class="mt-2 flex items-baseline justify-between gap-6 text-xs text-muted-foreground">
              <template v-if="roomsFetchFailed">
                <span>Availability could not be loaded</span>
              </template>
              <template v-else>
                <span>
                  {{ unitsInCategory(c.key).length }}
                  {{ unitsInCategory(c.key).length === 1 ? 'unit' : 'units' }}
                </span>
                <span>{{ availableInCategory(c.key) }} available now</span>
              </template>
            </div>

            <p class="mt-3 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">{{ c.blurb }}</p>
          </RouterLink>
        </div>
      </section>
    </div>

    <!--
      Every published unit, one row each, with the detail behind a per-row
      disclosure. Tenant names are deliberately absent: `RoomItem.tenant` is
      populated for occupied units and this is a public page.
    -->
    <section id="availability" class="w-full bg-background border-t border-border font-editorial scroll-mt-20">
      <div class="max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 py-20 sm:py-28">

        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-foreground tracking-[-0.02em]">
            All units
          </h2>
          <p class="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Every unit on the property. Five are listed here and the arrow below opens the
            rest; open a row to see its floor, capacity, billing rule and what it includes.
          </p>
        </div>

        <!--
          B-01: `rooms` keeps the always-vacant `CANONICAL_UNITS` seed when the
          fetch fails, so without this the table would assert 33 free units on a
          property that is 32 occupied. Disclosing the staleness is presentation;
          what the counts should then say is Sean's call, logged in BLOCKED_FOR_SEAN.md.
        -->
        <p
          v-if="roomsFetchFailed"
          role="status"
          class="mt-8 border border-border-strong bg-muted px-4 py-3 text-xs sm:text-sm text-foreground-soft leading-relaxed"
        >
          Live details could not be reached, so what follows is the property's standard listing.
          The status, the rate and the kind of unit may all be out of date &mdash; 30 of the 33
          built-in rates no longer match, the worst by &#8369;2,000. Please confirm with the
          landlady before relying on any of it.
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
        <div class="mt-10 hidden sm:block">
          <table class="w-full border-collapse text-sm">
            <caption class="sr-only">
              Every published unit on the property, with its cluster, type, floor, monthly rate and current status.
            </caption>
            <thead>
              <tr class="border-b border-foreground text-[0.7rem] tracking-[0.14em] uppercase text-muted-foreground">
                <th scope="col" class="py-3 pr-4 text-left font-normal">Unit</th>
                <th scope="col" class="py-3 px-4 text-left font-normal">Cluster</th>
                <th scope="col" class="py-3 px-4 text-left font-normal">Type</th>
                <th scope="col" class="py-3 px-4 text-left font-normal">Floor</th>
                <th scope="col" class="py-3 px-4 text-right font-normal">Price</th>
                <th scope="col" class="py-3 px-4 text-left font-normal">Status</th>
                <th scope="col" class="py-3 pl-4 w-12"><span class="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody id="all-units-body">
              <template v-for="u in visibleUnits" :key="u.id">
                <tr class="border-b border-border">
                  <td class="py-4 pr-4 font-medium text-foreground">{{ u.unitCode }}</td>
                  <td class="py-4 px-4 text-foreground-soft">{{ u.cluster }}</td>
                  <td class="py-4 px-4 text-foreground-soft">{{ u.type }}</td>
                  <td class="py-4 px-4 text-foreground-soft">{{ u.floorLabel }}</td>
                  <td class="py-4 px-4 text-right text-foreground-soft tabular-nums">{{ peso(u.price) }}</td>
                  <td class="py-4 px-4 text-foreground-soft">{{ publicStatusLabel(u.status) }}</td>
                  <td class="py-4 pl-4">
                    <button
                      @click="toggleUnit(u.id)"
                      :aria-expanded="openUnitId === u.id"
                      :aria-controls="`unit-panel-${u.id}`"
                      class="grid size-8 place-items-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-colors"
                    >
                      <span class="sr-only">
                        {{ openUnitId === u.id ? 'Hide' : 'Show' }} details for unit {{ u.unitCode }}
                      </span>
                      <ChevronDown :class="['size-4 transition-transform', openUnitId === u.id ? 'rotate-180' : '']" />
                    </button>
                  </td>
                </tr>

                <tr v-if="openUnitId === u.id" :id="`unit-panel-${u.id}`" class="border-b border-border bg-muted">
                  <td colspan="7" class="px-4 py-6">
                    <dl class="grid gap-x-10 gap-y-5 sm:grid-cols-3 text-xs sm:text-sm">
                      <div>
                        <dt class="text-muted-foreground">Floor</dt>
                        <dd class="mt-1 text-foreground">{{ u.floorLabel }}</dd>
                      </div>
                      <div>
                        <dt class="text-muted-foreground">Capacity</dt>
                        <dd class="mt-1 text-foreground">Up to {{ u.maxOccupants }} occupants</dd>
                      </div>
                      <div>
                        <dt class="text-muted-foreground">Billing</dt>
                        <dd class="mt-1 text-foreground">{{ u.billingRule }}</dd>
                      </div>
                    </dl>

                    <p v-if="u.desc" class="mt-6 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {{ u.desc }}
                    </p>

                    <ul v-if="u.amenities && u.amenities.length" class="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                      <li v-for="a in u.amenities" :key="a">{{ a }}</li>
                    </ul>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- The same units, stacked, for a phone. -->
        <ul id="all-units-list" class="mt-10 sm:hidden">
          <li v-for="u in visibleUnits" :key="u.id" class="border-b border-border">
            <button
              type="button"
              :aria-expanded="openUnitId === u.id"
              :aria-controls="`unit-card-${u.id}`"
              class="flex w-full items-start justify-between gap-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              @click="toggleUnit(u.id)"
            >
              <span class="min-w-0">
                <span class="block font-medium text-foreground">{{ u.unitCode }}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  {{ u.type }} &middot; {{ u.cluster }} &middot; {{ u.floorLabel }}
                </span>
              </span>
              <span class="shrink-0 text-right">
                <span class="block tabular-nums text-foreground">{{ peso(u.price) }}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  {{ publicStatusLabel(u.status) }}
                </span>
              </span>
            </button>

            <div v-if="openUnitId === u.id" :id="`unit-card-${u.id}`" class="pb-6">
              <dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                <div>
                  <dt class="text-muted-foreground">Floor</dt>
                  <dd class="mt-1 text-foreground">{{ u.floorLabel }}</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Capacity</dt>
                  <dd class="mt-1 text-foreground">Up to {{ u.maxOccupants }} occupants</dd>
                </div>
                <div class="col-span-2">
                  <dt class="text-muted-foreground">Billing</dt>
                  <dd class="mt-1 text-foreground">{{ u.billingRule }}</dd>
                </div>
              </dl>

              <p v-if="u.desc" class="mt-5 text-xs text-muted-foreground leading-relaxed">
                {{ u.desc }}
              </p>

              <ul
                v-if="u.amenities && u.amenities.length"
                class="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground"
              >
                <li v-for="a in u.amenities" :key="a">{{ a }}</li>
              </ul>
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
        <div v-if="hiddenUnitCount > 0" class="border-t border-foreground">
          <button
            type="button"
            :aria-expanded="allUnitsShown"
            aria-controls="all-units-body all-units-list"
            class="group flex w-full items-baseline justify-between gap-6 pt-5 pb-1 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            @click="toggleAllUnits"
          >
            <span class="text-sm text-foreground group-hover:text-muted-foreground transition-colors">
              {{ allUnitsShown ? `Show only the first ${UNITS_PREVIEW_COUNT} units` : `Show the remaining ${hiddenUnitCount} units` }}
            </span>
            <ChevronDown
              :class="[
                'size-4 shrink-0 text-muted-foreground transition-transform duration-300',
                allUnitsShown ? 'rotate-180' : ''
              ]"
            />
          </button>
        </div>

      </div>
    </section>

    <!-- 2. Frequently Asked Questions (FAQ Section) -->
    <section id="faqs" class="w-full bg-background border-t border-border font-editorial py-20 sm:py-28 scroll-mt-20">
      <div class="max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10">

        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-foreground tracking-[-0.02em]">
            Policies &amp; guidelines
          </h2>
          <p class="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Standard operating guidelines, individual utilities submetering, security curfews, and payment methods for Fe Galang Da Silva Boarding House.
          </p>
        </div>

        <!--
          Same disclosure pattern as the availability table above: a hairline
          rule per item, the chevron as the only affordance, and one answer open
          at a time. `openFaqIndex` already enforced the last of those.
        -->
        <dl class="mt-12 border-t border-foreground">
          <div v-for="(faq, idx) in FAQS" :key="idx" class="border-b border-border">
            <dt>
              <button
                type="button"
                :aria-expanded="openFaqIndex === idx"
                :aria-controls="`faq-panel-${idx}`"
                class="w-full flex items-baseline justify-between gap-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground group"
                @click="toggleFaq(idx)"
              >
                <span class="text-sm sm:text-base text-foreground group-hover:text-muted-foreground transition-colors">
                  {{ faq.q }}
                </span>
                <ChevronDown
                  :class="['size-4 shrink-0 text-muted-foreground transition-transform', openFaqIndex === idx ? 'rotate-180' : '']"
                />
              </button>
            </dt>

            <dd v-if="openFaqIndex === idx" :id="`faq-panel-${idx}`" class="pb-7 pr-10 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
    <section id="location" class="w-full bg-background border-t border-border font-editorial scroll-mt-20">
      <div class="max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 py-20 sm:py-28">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-xl sm:text-2xl font-medium text-foreground tracking-[-0.02em]">
            Location
          </h2>
          <div class="max-w-md">
            <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Galang's Compound, 32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City, Albay.
            </p>

            <!--
              What the pin on the map below is, in words, because a marker on
              its own does not say how precise it is. The comment on MAP_PIN
              has the provenance: it is the street in the right barangay, not a
              surveyed position for the gate.
            -->
            <p class="mt-5 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
              <MapPin class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                The red pin marks the compound on Sapaguita Street in Brgy. 4 Sagpon.
                <a
                  :href="mapLinkUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-foreground underline underline-offset-4 decoration-1 decoration-border-strong hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground transition-colors"
                >Open in Google Maps<span class="sr-only"> (opens in a new tab)</span></a>
                for directions, or call the landlady for the gate.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="w-full border-t border-border">
        <iframe
          :src="mapEmbedUrl"
          title="Map with a red pin on Galang's Compound, 32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City"
          class="block w-full aspect-[16/11] sm:aspect-[24/9] border-0"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
      </div>
    </section>

  </div>
</template>
