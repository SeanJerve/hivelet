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
import { Loader2, ArrowLeft } from 'lucide-vue-next';
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
  // Submit disables on `isSubmitting`, but Enter inside any field here submits
  // the form directly - a second Enter before Vue's next render still reaches
  // here with the button not yet visibly disabled, and would file the same
  // enquiry twice in the landlady's portal.
  if (isSubmitting.value) return;
  // `inquiries.prospect_email` is NOT NULL in the database, so the form asks for
  // an address rather than inventing one. It previously sent
  // 'prospect@hivelet.ph' whenever the field was blank, which put an address the
  // landlady cannot reply to on an inquiry she is expected to answer.
  /**
   * EVERY RULE THE ENDPOINT HAS, ASKED HERE FIRST.
   *
   * This checked three fields for emptiness and the email for an `@`. The
   * endpoint's schema is stricter on all five, and the message field was not
   * checked at all - it carries no `required` on the input and nothing here
   * looked at it, while `public.ts` requires `message: z.string().min(5)`.
   *
   * So a prospect who left the question blank, or typed "hi", got the toast
   * "Inquiry Submission Failed: Invalid inquiry payload." - which names no
   * field, suggests nothing to do, and reads like the site is broken. This is
   * the PUBLIC page. It is the first thing a prospective resident touches, and
   * the one screen where a dead end costs the owner a tenancy.
   *
   * Mirrored from `inquirySchema` in backend/src/routes/public.ts:
   *   prospectName   min 2,  max 120
   *   prospectEmail  a valid address
   *   prospectPhone  min 7,  max 30
   *   message        min 5,  max 2000
   * The server still enforces them - this only means she never has to.
   */
  const name = inquiryName.value.trim();
  const phone = inquiryPhone.value.trim();
  const email = inquiryEmail.value.trim();
  const message = inquiryMsg.value.trim();

  if (!name || !phone || !email) {
    showToast('error', 'Required Fields', 'Please provide your full name, contact number and email address.');
    return;
  }
  if (name.length < 2 || name.length > 120) {
    showToast('error', 'Check your name',
      'Please give your full name, between 2 and 120 characters.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('error', 'Check your email', 'That does not look like an email address.');
    return;
  }
  if (phone.length < 7 || phone.length > 30) {
    showToast('error', 'Check your contact number',
      'Please give a contact number she can reach you on - at least 7 characters.');
    return;
  }
  if (message.length < 5) {
    showToast('error', 'Tell her what you would like to ask',
      'Please write your question - a few words is enough. It is what she reads first.');
    return;
  }
  if (message.length > 2000) {
    showToast('error', 'That message is too long',
      'Please keep your question under 2000 characters.');
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
    /**
     * NEVER FALL BACK ONTO A RESERVED UNIT.
     *
     * The fallback was `available[0] ?? publicRooms[0]`, and BR-006 makes the
     * endpoint refuse a Reserved unit outright. So on a day with no vacancy the
     * general enquiry form filed against whatever unit happened to be first -
     * and if that one was Reserved, answered "Room 1a is currently reserved and
     * is not accepting new inquiries" to somebody who had never mentioned a
     * room. A refusal about a unit they did not ask about is worse than no
     * vacancy, which is at least true.
     */
    const anyNotReserved = (publicRooms ?? []).find(
      (r) => String(r.operational_status || '').toLowerCase() !== 'reserved'
    );
    const defaultRoom = available[0] ?? anyNotReserved ?? null;

    if (!defaultRoom) {
      showToast('error', 'Nothing is open for enquiries right now',
        'Every unit is either taken or reserved at the moment. Please try again in a few days, ' +
        'or message Mrs Fe directly.');
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
            <p class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Contact us</p>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press mt-1 inline-block py-1 text-sm font-medium text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
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
            <div class="sm:col-span-2">
              <label
                for="iq-msg"
                class="block text-xs text-ink-faint"
                >What would you like to ask</label
              >
              <!--
                A textarea, not a single-line input squeezed into half the
                grid row. The endpoint asks for a real question (min 5, max
                2000 characters - see the validation above), and a one-line
                box that scrolls its own text sideways does not invite one.
                Full width for the same reason: this is the field that
                decides whether Mrs. Da Silva has anything to answer.
              -->
              <textarea
                id="iq-msg"
                v-model="inquiryMsg"
                rows="3"
                placeholder="Tell her what you'd like to know - move-in timing, the unit, anything else."
                class="ws-textarea w-full mt-2"
              ></textarea>
            </div>
          </div>

          <!--
            Shortened to the one fact that changes what a reader does with this
            form: no automatic confirmation goes out, so leave a real way to be
            reached. The fuller account of where this is stored and who reads
            it now lives on its own page (B-50 in BLOCKED_FOR_SEAN.md), linked
            by name rather than just mentioned.
          -->
          <p class="mt-10 max-w-xl text-xs leading-relaxed text-ink-soft">
            No automatic confirmation is sent, so please include a number or address
            Mrs. {{ LANDLADY.name }} can reach you on. See the
            <RouterLink to="/privacy" class="press underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink">privacy policy</RouterLink>
            for what happens to this information.
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
            class="press inline-flex items-center gap-1.5 py-1 underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
          >
            <ArrowLeft class="size-3.5" aria-hidden="true" />
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
        </div>
      </aside>

    </div>
  </div>
</template>
