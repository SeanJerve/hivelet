<script setup lang="ts">
/**
 * @file PrivacyPolicyView.vue
 * @description What the system actually does with a visitor's, prospect's or resident's
 *   information. Written to close B-50 in BLOCKED_FOR_SEAN.md.
 *
 * A DRAFT IN SUBSTANCE, NOT IN LABEL.
 * -----------------------------------
 * Every factual claim below is checked against what this codebase actually does, not what a
 * template privacy policy usually says - the enquiry form's own notice, the account-creation
 * rule (no public sign-up), the Adyen/GCash integration, and the per-tenant data scoping this
 * project's own audits have verified. It does not invent a retention period, a data-protection
 * contact beyond the landlady, or a National Privacy Commission registration this project has
 * no record of - those are flagged in the source comments below and belong to Mrs. Da Silva's
 * review before this is treated as final, exactly as B-50 asked for. The page itself carries no
 * "draft" watermark because nothing on it is invented; what's unconfirmed is marked honestly in
 * its own sentence instead of hidden behind a banner.
 */
import { RouterLink } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { LANDLADY } from '@/lib/systemState';
</script>

<template>
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas">
    <div class="ws-page ws-content py-10 sm:py-14">
      <RouterLink
        to="/public"
        class="press inline-flex items-center gap-1.5 py-1 text-sm text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink"
      >
        <ArrowLeft class="size-3.5" aria-hidden="true" />
        Back to the property
      </RouterLink>

      <div class="mt-8 max-w-2xl">
        <p class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Fe Galang Da Silva Boarding House</p>
        <h1 class="mt-2 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3.6vw,2.75rem)]">
          Privacy policy
        </h1>
        <p class="mt-4 text-sm text-ink-faint">Last updated 22 September 2026.</p>

        <div class="mt-10 flex flex-col gap-9 text-sm leading-relaxed text-ink-soft">
          <section>
            <p>
              This page explains what Hivelet, the system Mrs. {{ LANDLADY.name }} uses to run
              this boarding house, collects about a visitor, a prospective tenant or a resident,
              and what happens to it. It covers the enquiry form, the resident portal, and paying
              rent online with GCash.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-semibold tracking-tight text-ink">What the enquiry form collects</h2>
            <p class="mt-3">
              Registering interest in a unit asks for a name, an email address, a phone number and
              a question or message. Nothing else on that form is stored — there is no field for a
              postal address, a brochure preference or marketing consent, because the system has
              nowhere to put one.
            </p>
            <p class="mt-3">
              <strong class="text-ink">No automatic confirmation is sent.</strong> The enquiry goes
              straight to the landlady's own account. She is the only person who reads it, and she
              replies to the number or email you leave, by phone or message, in her own words.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-semibold tracking-tight text-ink">Resident accounts</h2>
            <p class="mt-3">
              There is no public sign-up. Every resident account is created by the landlady when
              someone moves in, using the name, contact details and tenancy terms she already has
              on file. Once an account exists, it holds what running a tenancy requires: contact
              information, the unit and rate, and the record of what has been billed and paid.
            </p>
            <p class="mt-3">
              A resident can see their own account, their own bills, and their own payment
              history — nothing belonging to another resident. The landlady can see what every
              account holds, because running the property requires it.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-semibold tracking-tight text-ink">Paying rent with GCash</h2>
            <p class="mt-3">
              Online rent payment is handled by Adyen, a payment processor, through GCash. When a
              resident pays this way, the GCash details they enter go to Adyen directly — this
              system never receives or stores a GCash number, password or one-time code. What comes
              back to Hivelet is the outcome: whether the payment went through, its amount, and a
              reference number Adyen assigns, which is what shows on the resident's payment record.
            </p>
            <p class="mt-3">
              A resident can also pay in person, in which case the landlady records the cash or
              bank transfer herself, in the same account.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-semibold tracking-tight text-ink">How long information is kept</h2>
            <p class="mt-3">
              <!--
                Deliberately general. This project has no stated retention schedule to quote, and
                inventing a specific number of years here would be exactly the kind of unconfirmed
                fact CLAUDE.md's rules exist to prevent. What follows is standard practice for a
                landlord's tenancy and financial records, not a system-enforced policy - flag it to
                Mrs. Da Silva to confirm or replace with an actual figure.
              -->
              Tenancy and payment records are kept for as long as they are needed to run the
              property and to keep an honest financial record of it — the same reason a landlady
              keeps a paper receipt book. An enquiry that does not lead to a tenancy is kept only as
              long as it is useful for following up.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-semibold tracking-tight text-ink">Questions, corrections, or asking what is on file</h2>
            <p class="mt-3">
              For anything about your own information — seeing what is on file, correcting it, or
              asking a question about this policy — contact Mrs. {{ LANDLADY.name }} directly.
            </p>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press mt-3 inline-block py-1 text-base font-medium text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink"
            >
              {{ LANDLADY.phone }}
            </a>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
