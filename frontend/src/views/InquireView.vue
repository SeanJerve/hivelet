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
import { ref, reactive, nextTick } from 'vue';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-vue-next';
import { LANDLADY } from '@/lib/systemState';
import { api } from '@/lib/api';
import {
  validateInquiry,
  serverFieldErrors,
  inquiryFailureMessage,
  type InquiryErrors,
} from '@/components/public/inquiryRules';

const inquiryName = ref('');
const inquiryEmail = ref('');
const inquiryPhone = ref('');
const inquiryMsg = ref('');
const isSubmitting = ref(false);

/**
 * WHAT IS WRONG IS SAID UNDER THE FIELD IT IS ABOUT, AND FOCUS GOES THERE.
 *
 * Every rule used to answer with a toast in the corner of the screen, one rule
 * at a time, with the cursor left wherever it was - and the three `required`
 * fields answered first with the browser's own bubble instead, so one form
 * spoke in two voices. On a phone the toast sat over the top of the page while
 * the field it meant was under the keyboard. `novalidate` hands every rule to
 * `validateInquiry`, each field carries its own note (`aria-describedby`,
 * `aria-invalid`), and the first field with a note takes focus.
 */
const errors = reactive<InquiryErrors>({});
const formError = ref<string | null>(null);
const formRef = ref<HTMLFormElement | null>(null);

function setErrors(next: InquiryErrors) {
  for (const key of Object.keys(errors) as (keyof InquiryErrors)[]) delete errors[key];
  Object.assign(errors, next);
}

async function focusFirstInvalid() {
  await nextTick();
  formRef.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

/**
 * What was sent, kept for the confirmation after the fields are cleared - so it
 * can say which number and address she will reply to.
 */
const sentTo = ref<{ phone: string; email: string } | null>(null);
const sentHeading = ref<HTMLElement | null>(null);

async function sendAnother() {
  sentTo.value = null;
  await nextTick();
  document.getElementById('iq-name')?.focus();
}

async function submitInquiry() {
  // Submit disables on `isSubmitting`, but Enter inside any field here submits
  // the form directly - a second Enter before Vue's next render still reaches
  // here with the button not yet visibly disabled, and would file the same
  // enquiry twice in the landlady's portal.
  if (isSubmitting.value) return;
  formError.value = null;
  // `inquiries.prospect_email` is NOT NULL in the database, so the form asks for
  // an address rather than inventing one. It previously sent
  // 'prospect@hivelet.ph' whenever the field was blank, which put an address the
  // landlady cannot reply to on an inquiry she is expected to answer.
  //
  // The rules themselves, and why they live in one file shared with the
  // category page's dialog, are in `components/public/inquiryRules.ts`.
  setErrors(
    validateInquiry({
      name: inquiryName.value,
      email: inquiryEmail.value,
      phone: inquiryPhone.value,
      message: inquiryMsg.value,
    })
  );
  if (Object.keys(errors).length) {
    await focusFirstInvalid();
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
      formError.value =
        'Your message was not sent: every unit is taken or reserved at the moment, so none ' +
        `is open for enquiries. Please try again in a few days, or ring Mrs. ${LANDLADY.name} ` +
        `on ${LANDLADY.phone}.`;
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

    /**
     * A confirmation that stays, in place of the form, rather than a toast.
     *
     * The toast was the only sign the message had gone, and it left in a few
     * seconds - above a form that had just emptied itself, which reads the same
     * as a form that lost what you typed. What it said was honest (the system
     * saves the enquiry for her portal and sends no email or SMS, so "sent to
     * Mrs. Fe Galang Da Silva" claimed a channel that does not exist); what it
     * did not say is what happens next. The panel says who reads it, how she
     * replies (the privacy page's own wording), and to which number and address.
     */
    sentTo.value = { phone: inquiryPhone.value.trim(), email: inquiryEmail.value.trim() };
    inquiryName.value = '';
    inquiryPhone.value = '';
    inquiryEmail.value = '';
    inquiryMsg.value = '';
    await nextTick();
    sentHeading.value?.focus();
  } catch (err: unknown) {
    // The fields are kept, so pressing the button again resends exactly this.
    const fieldErrors = serverFieldErrors(err);
    setErrors(fieldErrors);
    formError.value = inquiryFailureMessage(err);
    if (Object.keys(fieldErrors).length) await focusFirstInvalid();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas">
    <!--
      One screen tall on desktop, not a page to scroll. `lg:h-dvh` pins the two
      columns to the viewport, and the form stays top-aligned under the
      masthead (centred was tried and read as floating). On a screen too short
      for the form, only this column scrolls (`lg:overflow-y-auto`), so the
      submit button is never cut off. Phones scroll the page as normal: four
      fields and the on-screen keyboard do not fit on one phone screen.

      On desktop the question box sits beside the three short fields instead
      of under them, and the title is allowed two lines instead of three.
      Measured 2026-09-24: that is what lets the whole form fit a 1536x864
      laptop (Windows at 125% scaling) without scrolling.
    -->
    <div class="grid min-h-dvh lg:h-dvh lg:grid-cols-2">

      <!-- Left: the form -->
      <div class="ws-page flex flex-col pb-8 sm:pb-10 lg:pb-8 lg:overflow-y-auto">

        <!--
          The landing page's masthead bar, repeated: `h-16 items-center`, the
          same `font-display` wordmark, on the same `ws-page` gutter. Moving
          from the landing page to here, "Hivelet" now stays exactly where it
          was. It used to start 32px down inside this column's padding, so the
          page visibly dropped on arrival. Contact goes onto one line for the
          same reason: two stacked lines do not fit a 64px bar. It may wrap on
          a 320px phone, which the bar's height still holds.
        -->
        <!--
          `inline-flex min-h-11 items-center` on both links: they measured 70x28
          and 99x28 at 375px. The bar centres them, so a 44px box around the
          same line of text leaves the text exactly where it was (x=56,
          y=18-46 at 1366) and only the part that answers a thumb grows.
        -->
        <div class="flex h-16 items-center justify-between gap-6">
          <RouterLink
            to="/public"
            class="press inline-flex min-h-11 items-center font-display text-xl font-semibold tracking-tight text-ink hover:text-ink-soft transition-colors"
          >
            Hivelet
          </RouterLink>

          <p class="flex flex-wrap items-baseline justify-end gap-x-3">
            <span class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Contact us</span>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
            >
              {{ LANDLADY.phone }}
            </a>
          </p>
        </div>

        <!--
          A breadcrumb above the title, where the way back used to be a link
          at the very bottom of the form. `min-h-11` keeps "Home" at the
          app's 44px tap-target size.
        -->
        <nav aria-label="Breadcrumb" class="mt-8 sm:mt-10 lg:mt-6">
          <ol class="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
            <li>
              <RouterLink
                to="/public"
                class="press inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
              >
                <ArrowLeft class="size-3.5" aria-hidden="true" />
                Home
              </RouterLink>
            </li>
            <li aria-hidden="true" class="text-ink-faint">/</li>
            <li aria-current="page" class="text-ink">Register interest</li>
          </ol>
        </nav>

        <h1 class="mt-1 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3vw,2.75rem)] max-w-xl">
          Viewings by appointment, register your interest
        </h1>

        <!--
          The labels are visible, and were placeholders.

          A placeholder disappears the moment somebody types, so a half-filled
          form became four identical rules with no way to tell which was the
          phone and which was the email - worst for the person coming back to
          check before sending, which is exactly when it matters. The asterisks
          went with them: every field here is required, the question too (the
          endpoint wants at least five characters), and each carries `required`
          for assistive technology. `novalidate` keeps the browser's own bubble
          out of it - see `errors` in the script.
        -->
        <!--
          The confirmation takes the form's place once the message is saved.
          Focus moves to its heading, so a screen reader reads the outcome and
          a keyboard continues from here rather than from the top of the page.
        -->
        <div v-if="sentTo" class="ws-reveal mt-8 lg:mt-6 max-w-2xl">
          <h2
            ref="sentHeading"
            tabindex="-1"
            class="text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em] outline-none"
          >
            Your message is saved
          </h2>
          <p class="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            Mrs. {{ LANDLADY.name }} reads every enquiry herself, and replies by phone or message
            to <span class="text-ink break-all">{{ sentTo.phone }}</span> or
            <span class="text-ink break-all">{{ sentTo.email }}</span>. No automatic confirmation
            email or text is sent.
          </p>
          <p class="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            If it is urgent, ring her on
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
            >{{ LANDLADY.phone }}</a>.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-6">
            <RouterLink to="/public" class="pill-btn-brand px-8">Back to the property</RouterLink>
            <button
              type="button"
              class="press inline-flex min-h-11 items-center text-xs text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors cursor-pointer"
              @click="sendAnother"
            >
              Send another message
            </button>
          </div>
        </div>

        <form
          v-else
          ref="formRef"
          novalidate
          class="mt-8 lg:mt-6 max-w-2xl"
          @submit.prevent="submitInquiry"
        >
          <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div class="lg:col-start-1">
              <label
                for="iq-name"
                class="block text-xs text-ink-faint"
                >Your name</label
              >
              <input
                id="iq-name"
                v-model="inquiryName"
                type="text"
                autocomplete="name"
                required
                :aria-invalid="errors.name ? 'true' : undefined"
                :aria-describedby="errors.name ? 'iq-name-error' : undefined"
                :class="['ws-input mt-2', errors.name && 'border-overdue']"
                @input="delete errors.name"
              />
              <p v-if="errors.name" id="iq-name-error" class="mt-1.5 text-xs leading-relaxed text-overdue">
                {{ errors.name }}
              </p>
            </div>
            <div class="lg:col-start-1">
              <label
                for="iq-email"
                class="block text-xs text-ink-faint"
                >Email</label
              >
              <input
                id="iq-email"
                v-model="inquiryEmail"
                type="email"
                autocomplete="email"
                required
                :aria-invalid="errors.email ? 'true' : undefined"
                :aria-describedby="errors.email ? 'iq-email-error' : undefined"
                :class="['ws-input mt-2', errors.email && 'border-overdue']"
                @input="delete errors.email"
              />
              <p v-if="errors.email" id="iq-email-error" class="mt-1.5 text-xs leading-relaxed text-overdue">
                {{ errors.email }}
              </p>
            </div>
            <div class="lg:col-start-1">
              <label
                for="iq-phone"
                class="block text-xs text-ink-faint"
                >Phone</label
              >
              <input
                id="iq-phone"
                v-model="inquiryPhone"
                type="tel"
                autocomplete="tel"
                required
                :aria-invalid="errors.phone ? 'true' : undefined"
                :aria-describedby="errors.phone ? 'iq-phone-error' : undefined"
                :class="['ws-input mt-2', errors.phone && 'border-overdue']"
                @input="delete errors.phone"
              />
              <p v-if="errors.phone" id="iq-phone-error" class="mt-1.5 text-xs leading-relaxed text-overdue">
                {{ errors.phone }}
              </p>
            </div>
            <div class="sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col">
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
                decides whether Mrs. Da Silva has anything to answer. On
                desktop it takes the whole height of the three fields beside
                it instead, which is more room, not less.
              -->
              <textarea
                id="iq-msg"
                v-model="inquiryMsg"
                rows="3"
                required
                placeholder="Tell her what you'd like to know - move-in timing, the unit, anything else."
                :aria-invalid="errors.message ? 'true' : undefined"
                :aria-describedby="errors.message ? 'iq-msg-error' : undefined"
                :class="['ws-textarea w-full mt-2 lg:flex-1', errors.message && 'border-overdue']"
                @input="delete errors.message"
              ></textarea>
              <p v-if="errors.message" id="iq-msg-error" class="mt-1.5 text-xs leading-relaxed text-overdue">
                {{ errors.message }}
              </p>
            </div>
          </div>

          <!--
            Shortened to the one fact that changes what a reader does with this
            form: no automatic confirmation goes out, so leave a real way to be
            reached. The fuller account of where this is stored and who reads
            it now lives on its own page (B-50 in BLOCKED_FOR_SEAN.md), linked
            by name rather than just mentioned.
          -->
          <p class="mt-6 max-w-xl text-xs leading-relaxed text-ink-soft">
            No automatic confirmation is sent, so please include a number or address
            Mrs. {{ LANDLADY.name }} can reach you on. See the
            <RouterLink to="/privacy" class="press underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink">privacy policy</RouterLink>
            for what happens to this information.
          </p>

          <!--
            A failed send says so here, beside the button that retries it, and
            stays until the next attempt. It used to be a toast that left after
            a few seconds, worded for a developer ("Check that the API is
            running") or not at all ("Internal server error.").
          -->
          <div
            v-if="formError"
            role="alert"
            class="ws-reveal mt-6 flex max-w-xl items-start gap-2.5 rounded-2xl bg-overdue-soft px-4 py-3 text-sm text-overdue"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ formError }}
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="pill-btn-brand mt-6 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            <span>{{ isSubmitting ? 'Sending…' : 'Register your interest' }}</span>
          </button>
        </form>
      </div>

      <!-- Right: Real building exterior showcase with clear background image -->
      <aside class="relative hidden lg:flex flex-col justify-between text-white px-10 sm:px-14 pb-10 sm:pb-14 overflow-hidden bg-night">
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

        <!-- On the masthead's line, not 56px below it: the same 64px bar. -->
        <div class="relative z-10 flex h-16 items-center">
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
