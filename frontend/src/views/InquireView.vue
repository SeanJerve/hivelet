<script setup lang="ts">
/**
 * @file InquireView.vue
 * @description Standalone enquiry page for prospective boarders.
 * @rationale The enquiry form used to be a card partway down the public landing
 *   page. It is now its own screen so the navigation can send someone straight
 *   to it, and so the form is the only thing competing for attention once they
 *   arrive.
 *
 * WHAT THIS FORM DOES NOT ASK FOR
 * -------------------------------
 * The layout this follows collects a postal address, a postcode, a brochure
 * preference and per-channel contact consent. `inquiries` has columns for none
 * of them, so asking would collect answers this system then discards - worse
 * than not asking. The fields below are exactly the four the endpoint accepts.
 * Adding the others is a schema change, not a design change.
 */
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2 } from 'lucide-vue-next';
import { showToast, LANDLADY } from '@/lib/systemState';
import { api } from '@/lib/api';

const router = useRouter();

const inquiryName = ref('');
const inquiryEmail = ref('');
const inquiryPhone = ref('');
const inquiryMsg = ref('');
const isSubmitting = ref(false);

/**
 * The water rate, from `/public/rates`.
 *
 * The panel beside this form quoted "P200/head monthly water rule" as a
 * literal. That number lives in `system_settings` and is applied by the
 * backend's billingService, so a copy written into the page quotes a
 * prospective tenant a price that stops being true the moment the landlady
 * changes the setting - the same defect this project has already fixed on the
 * category page, the on-site payment form and the tenant portal.
 *
 * Null until it answers, and the sentence then omits the figure rather than
 * guessing one.
 */
const waterRatePerOccupant = ref<number | null>(null);

onMounted(async () => {
  try {
    const r = await api.get<{ waterRatePerOccupant: number }>('/public/rates', false);
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
  } catch {
    // Leave it null. The sentence below drops the figure rather than inventing one.
  }
});

async function submitInquiry() {
  // `inquiries.prospect_email` is NOT NULL in the database, so the form asks for
  // an address rather than inventing one. It previously sent
  // 'prospect@hivelet.ph' whenever the field was blank, which put an address the
  // landlady cannot reply to on an inquiry she is expected to answer.
  if (!inquiryName.value.trim() || !inquiryPhone.value.trim() || !inquiryEmail.value.trim()) {
    showToast('error', 'Required Fields', 'Please provide your full name, contact number and email address.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiryEmail.value.trim())) {
    showToast('error', 'Check your email', 'That does not look like an email address.');
    return;
  }

  isSubmitting.value = true;
  try {
    // `inquiries.room_id` is required, and this form is a general enquiry with no
    // unit attached. Every message from this page used to be filed against
    // `publicRooms[0]` - unit 1a - so the landlady's inbox attributed general
    // interest to one specific room regardless of what the prospect wanted.
    // A vacant unit is a better guess than an arbitrary one, and the message body
    // carries what they actually asked.
    const publicRooms = await api.get<any[]>('/public/rooms', false);
    const available = (publicRooms ?? []).filter(
      (r) => String(r.operational_status || '').toLowerCase() === 'available'
    );
    const defaultRoom = available[0] ?? (publicRooms ?? [])[0] ?? null;

    if (!defaultRoom) {
      showToast('error', 'Inquiry Error', 'No active room available for inquiry submission.');
      return;
    }

    await api.post('/public/inquiries', {
      roomId: defaultRoom.id,
      prospectName: inquiryName.value.trim(),
      // Sent blank when blank. This used to substitute 'prospect@hivelet.ph',
      // writing a fake address into the inquiry the landlady would try to reply to.
      prospectEmail: inquiryEmail.value.trim(),
      prospectPhone: inquiryPhone.value.trim(),
      message: inquiryMsg.value.trim(),
    }, false);

    // The system saves the inquiry for the landlady to read in her portal. It
    // sends no email or SMS, so "sent to Mrs. Fe Galang Da Silva" claimed a
    // delivery channel that does not exist.
    showToast('success', 'Inquiry received', 'Your message has been saved and will reach Mrs. Fe Galang Da Silva in her portal.');
    inquiryName.value = '';
    inquiryPhone.value = '';
    inquiryEmail.value = '';
    inquiryMsg.value = '';
  } catch (err: any) {
    showToast('error', 'Inquiry Submission Failed', err.message || 'Could not save inquiry to server database.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas">
    <div class="grid min-h-screen lg:grid-cols-2">

      <!-- Left: the form -->
      <div class="flex flex-col px-4 sm:px-6 lg:px-14 py-10 sm:py-14">

        <div class="flex items-start justify-between gap-6">
          <RouterLink
            to="/public"
            class="press text-xl font-semibold tracking-tight text-ink hover:text-ink-soft transition-colors"
          >
            Hivelet
          </RouterLink>

          <div class="text-right shrink-0">
            <p class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Landlady</p>
            <p class="mt-1 text-sm font-medium text-ink">{{ LANDLADY.name }}</p>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press mt-0.5 inline-block py-1 text-sm text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
            >
              {{ LANDLADY.phone }}
            </a>
          </div>
        </div>

        <h1 class="mt-12 sm:mt-16 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3.6vw,2.75rem)] max-w-lg">
          Viewings by appointment, register your interest
        </h1>

        <!--
          The labels are visible, and were placeholders.

          A placeholder disappears the moment somebody types, so a half-filled
          form became four identical rules with no way to tell which was the
          phone and which was the email - worst for the person coming back to
          check before sending, which is exactly when it matters. The asterisks
          went with them: every field here but the last is required, and the
          three that are carry `required`.
        -->
        <form class="mt-10 sm:mt-12 max-w-2xl" @submit.prevent="submitInquiry">
          <div class="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <div>
              <label
                for="iq-name"
                class="block text-xs text-ink-faint"
                >Your name</label
              >
              <input
                id="iq-name"
                v-model="inquiryName"
                type="text"
                required
                class="ws-input mt-2"
              />
            </div>
            <div>
              <label
                for="iq-email"
                class="block text-xs text-ink-faint"
                >Email</label
              >
              <input
                id="iq-email"
                v-model="inquiryEmail"
                type="email"
                required
                class="ws-input mt-2"
              />
            </div>
            <div>
              <label
                for="iq-phone"
                class="block text-xs text-ink-faint"
                >Phone</label
              >
              <input
                id="iq-phone"
                v-model="inquiryPhone"
                type="tel"
                required
                class="ws-input mt-2"
              />
            </div>
            <div>
              <label
                for="iq-msg"
                class="block text-xs text-ink-faint"
                >What would you like to ask</label
              >
              <input
                id="iq-msg"
                v-model="inquiryMsg"
                type="text"
                class="ws-input mt-2"
              />
            </div>
          </div>

          <!--
            States what the system actually does with this. The submit handler
            writes the enquiry to the landlady's portal and sends no email or
            SMS, so this must not imply a reply will arrive by either.
          -->
          <p class="mt-10 max-w-xl text-xs leading-relaxed text-ink-soft">
            What you send is saved to Mrs. {{ LANDLADY.name }}'s portal for her to read and reply to
            directly. The system does not send an automatic email or SMS confirmation, so please
            include a number or address she can reach you on. Your details are used to answer this
            enquiry and are not passed to anyone else.
          </p>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="pill-btn-brand mt-10 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            <span>{{ isSubmitting ? 'Sending…' : 'Register your interest' }}</span>
          </button>
        </form>

        <p class="mt-12 text-xs text-ink-soft">
          <RouterLink
            to="/public"
            class="press inline-block py-1 underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
          >
            Back to the property
          </RouterLink>
        </p>
      </div>

      <!-- Right: Real building exterior showcase with clear background image -->
      <aside class="relative hidden lg:flex flex-col justify-between text-white px-10 sm:px-14 py-10 sm:py-14 overflow-hidden bg-night">
        <!-- Crisp building background photograph (unblurred) -->
        <!--
          `loading="lazy"` is doing real work here, not box-ticking. This panel
          is `hidden lg:flex`, and display:none does NOT stop a browser
          fetching an <img> inside it - checked in the network log at 375px,
          where the building photograph came back 200 OK on a screen that never
          shows it. That is 284 KB of someone's mobile data for a picture they
          cannot see. Lazy defers it until it scrolls into view, which on a
          phone is never.
        -->
        <img
          src="/fe-galang-building.webp"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover object-center"
          width="1790"
          height="879"
          loading="lazy"
        />
        <!-- Contrast gradient overlay: unblurred to keep building details clear and vibrant -->
        <div class="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-night/50" />

        <div class="relative z-10">
          <p class="text-[0.7rem] tracking-[0.18em] uppercase text-white/80 drop-shadow-sm">
            {{ LANDLADY.address }}
          </p>
        </div>

        <div class="relative z-10">
          <p class="font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,4.4vw,3.75rem)] drop-shadow-sm">
            Fe Galang Da Silva<br />Boarding House
          </p>
          <p class="mt-6 max-w-sm text-sm text-white/80 leading-relaxed drop-shadow-sm">
            33 units across four levels, in 5 property clusters. Individual electric submeters,
            <template v-if="waterRatePerOccupant !== null"
              >water at &#8369;{{ waterRatePerOccupant }} for each person each month,</template
            ><template v-else>water charged for each person each month,</template>
            and a secure gated perimeter.
          </p>
        </div>
      </aside>

    </div>
  </div>
</template>
