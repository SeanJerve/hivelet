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
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { peso, publicStatusLabel } from '@/lib/canonicalUnits';
import { fetchRooms, rooms, roomsFetchFailed } from '@/lib/systemState';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import BookViewingPrompt from '@/components/modals/BookViewingPrompt.vue';
import { BedDouble, Building2, ShieldCheck, ChevronDown } from 'lucide-vue-next';

const router = useRouter();
const isLoading = ref(true);
const openFaqIndex = ref<number | null>(0);

function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

const FAQS = [
  {
    q: 'How does the monthly water fee work?',
    a: 'Per Fe Galang Da Silva Boarding House policy, water is billed at a fixed standard rate of ₱200 per head/occupant monthly. This is computed dynamically according to the number of registered occupants residing in the unit.'
  },
  {
    q: 'How is electricity metered and billed?',
    a: 'Each of the 33 rentable units is fitted with an individual electric submeter. Readings are recorded on the 25th of every month and billed at actual consumption rate (₱12.50 / kWh).'
  },
  {
    q: 'What payment methods does the boarding house accept?',
    a: 'Tenants can pay online conveniently via GCash through our integrated Adyen payment gateway, or pay directly on-site in cash to Landlady Fe Galang Da Silva.'
  },
  {
    q: 'What are the curfew hours and security policies?',
    a: 'The property has a secure gated perimeter with an evening curfew of 10:00 PM for tenant safety. All registered tenants hold key access for necessary late arrivals or academic schedules.'
  },
  {
    q: 'What are the move-in requirements and advance deposit?',
    a: 'Standard move-in requires 1 month advance rent and 1 month security deposit, a valid government/student ID, and completion of the resident profile registration form.'
  },
  {
    q: 'Are visitors and guests allowed inside the rooms?',
    a: 'Daytime visitors are permitted in designated common receiving areas between 8:00 AM and 8:00 PM. Overnight visitors must be registered with the landlady in advance.'
  }
];

const CATEGORIES = [
  {
    key: '1BR',
    slug: '1-bedroom',
    title: '1-Bedroom Unit',
    pax: 'Up to 3 Pax',
    blurb: 'Main boarding house 1-bedroom rooms with private bathroom and submetered electricity.',
    icon: BedDouble,
    match: (u: { unitCode: string; cluster: string; type: string }) => 
      (u.unitCode.toLowerCase().startsWith('1') || u.cluster === 'Linda Units') &&
      !u.unitCode.toLowerCase().startsWith('2') &&
      !u.unitCode.toLowerCase().startsWith('3') &&
      !u.type.toLowerCase().includes('2-bedroom') &&
      !u.type.toLowerCase().includes('3-bedroom') &&
      u.cluster !== 'Back Apartment' &&
      u.cluster !== 'Front Apartment' &&
      u.cluster !== 'Penthouse',
  },
  {
    key: '2BR',
    slug: '2-bedroom',
    title: '2-Bedroom Unit',
    pax: 'Up to 4 Pax',
    blurb: 'Front and back apartments and spacious 2-bedroom units with kitchenette and parking slot.',
    icon: Building2,
    match: (u: { unitCode: string; cluster: string; type: string }) => 
      u.unitCode.toLowerCase().startsWith('2') || 
      u.type.toLowerCase().includes('2-bedroom') || 
      u.cluster === 'Back Apartment' || 
      u.cluster === 'Front Apartment',
  },
  {
    key: 'PH',
    slug: '3-bedroom',
    title: '3-Bedroom / Penthouse Suite',
    pax: 'Up to 5 Pax',
    blurb: 'Top-floor suites and 3-bedroom penthouse with roof deck and panoramic view of Legazpi City.',
    icon: ShieldCheck,
    match: (u: { unitCode: string; cluster: string; type: string }) => 
      u.unitCode.toLowerCase().startsWith('3') || 
      u.type.toLowerCase().includes('3-bedroom') || 
      u.cluster === 'Penthouse' || 
      u.unitCode.toLowerCase() === 'ph',
  },
];


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

onMounted(async () => {
  try {
    await fetchRooms();
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
 * The whole table collapses too, and starts collapsed. Thirty-three rows
 * between the category plates and the policies is a long scroll for a reader
 * who has already been told the counts above; the heading and the unit total
 * stay visible so the section is still findable when shut.
 */
const unitsOpen = ref(false);

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

/**
 * Keyless Google Maps embed. `output=embed` returns a real, interactive map for
 * a query string with no API key, billing account or script tag; the Maps
 * JavaScript API needs all three, and none of them exist for this project.
 *
 * THE QUERY IS THE BARANGAY, NOT THE STREET, AND THAT IS DELIBERATE.
 *
 * Querying the full street address put the pin on "32 Sampaguita Ave, Daraga" -
 * a different municipality - because Google matched a similarly spelled street
 * there and nothing at this address in Sagpon. Verified by loading it: the
 * embed's own info card named Daraga. A confident pin on the wrong town is
 * worse than an honest one on the right barangay, so this asks for Sagpon,
 * Legazpi City, which resolves correctly.
 *
 * No surveyed coordinate for the compound exists anywhere in this repository
 * and inventing one would put the pin where nobody is. To place the building
 * exactly, replace this string with `lat,lng` from the owner - the embed needs
 * no other change. The precise address stays in text beside the map meanwhile.
 */
const MAP_QUERY = 'Sagpon, Legazpi City, Albay, Philippines';
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`;

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

      No facade photograph exists in this repository - `public/` holds only
      `property-map.png`, a location map - so the field is tonal rather than
      photographic. Dropping a real facade image behind this section is a
      contained change; inventing one is not, because a stock building would
      misrepresent the property to a prospective boarder.
    -->
    <section class="relative w-full bg-neutral-dark text-white font-editorial overflow-hidden">
      <div class="relative max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 flex flex-col min-h-[clamp(34rem,94vh,58rem)] pt-7 pb-10 sm:pb-14">

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
            class="shrink-0 text-[0.8rem] leading-[1.25] font-light tracking-[-0.01em] hover:text-white/65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors"
          >
            Fe Galang<br />Da Silva<br />Boarding House
          </RouterLink>

          <nav aria-label="Property sections" class="flex flex-wrap justify-end items-baseline text-[0.8rem] font-light">
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

        <h1 class="mt-auto pt-24 font-editorial font-medium tracking-[-0.03em] leading-[0.93] text-[clamp(2.5rem,8vw,7rem)]">
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
            Choose a category to browse live availability across the property. Click any category below to view all rooms in that category.
          </p>
        </div>

        <div v-if="isLoading" class="grid gap-5 md:grid-cols-3">
          <SkeletonCard variant="category" :count="3" />
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
        <div v-else class="grid gap-x-12 gap-y-16 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-24">
          <RouterLink
            v-for="(c, i) in CATEGORIES"
            :key="c.key"
            :to="`/category/${c.slug}`"
            :class="[
              'group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground',
              i % 2 === 1 ? 'lg:mt-28' : ''
            ]"
          >
            <div class="relative aspect-[3/2] sm:aspect-[4/3] w-full border border-border bg-muted overflow-hidden transition-colors group-hover:border-foreground/30">
              <span class="absolute inset-0 grid place-items-center">
                <component :is="c.icon" class="size-9 text-muted-foreground-soft" />
              </span>
            </div>

            <div class="mt-5 flex items-baseline justify-between gap-6">
              <h3 class="text-base sm:text-lg font-medium text-foreground">{{ c.title }}</h3>
              <span class="shrink-0 text-sm text-muted-foreground underline underline-offset-4 decoration-1 decoration-border-strong group-hover:text-foreground group-hover:decoration-foreground transition-colors">
                View All Rooms
              </span>
            </div>

            <div class="mt-2 flex items-baseline justify-between gap-6 text-xs text-muted-foreground">
              <span>{{ c.pax }}</span>
              <span>
                {{ liveUnits.filter(c.match).filter((u) => u.status === 'vacant').length }} vacant
                of {{ liveUnits.filter(c.match).length }} units
              </span>
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
            Every unit on the property. Open a row to see its floor, capacity, billing rule and what it includes.
          </p>
        </div>

        <button
          type="button"
          :aria-expanded="unitsOpen"
          aria-controls="all-units-panel"
          class="mt-10 flex w-full items-baseline justify-between gap-6 border-t border-foreground pt-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground group"
          @click="unitsOpen = !unitsOpen"
        >
          <span class="text-sm text-foreground group-hover:text-muted-foreground transition-colors">
            {{ unitsOpen ? 'Hide' : 'Show' }} all {{ listedUnits.length }} units
          </span>
          <ChevronDown
            :class="['size-4 shrink-0 text-muted-foreground transition-transform', unitsOpen ? 'rotate-180' : '']"
          />
        </button>

        <div v-show="unitsOpen" id="all-units-panel">

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
          Live availability could not be reached, so the status column below may not be current. Please confirm with the landlady before relying on it.
        </p>

        <div class="mt-10 overflow-x-auto">
          <table class="w-full min-w-[44rem] border-collapse text-sm">
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
            <tbody>
              <template v-for="u in listedUnits" :key="u.id">
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
          <p class="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Galang's Compound, 32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City, Albay.
          </p>
        </div>
      </div>

      <div class="w-full border-t border-border">
        <iframe
          :src="mapEmbedUrl"
          title="Map showing Galang's Compound at 32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City"
          class="block w-full aspect-[16/11] sm:aspect-[24/9] border-0"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
      </div>
    </section>

  </div>
</template>
