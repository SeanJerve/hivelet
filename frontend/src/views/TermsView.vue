<script setup lang="ts">
/**
 * @file TermsView.vue
 * @description How the public site and the resident portal may be used. The companion to
 *   PrivacyPolicyView.vue, in the same frame (components/layout/LegalPage.vue).
 *
 * IT PROMISES NOTHING THE SYSTEM DOES NOT DO
 * ------------------------------------------
 * Where the portal already tells a resident something, this page repeats it in the portal's
 * own words rather than paraphrasing, so the two cannot disagree:
 *
 *   "Online payments go through Adyen. Each one counts as paid once the landlady verifies it."
 *       TenantOverviewView.vue, the payment note under the amount due
 *   "tell the landlady ... do not pay again"      AdyenPaymentModal.vue, a failed payment
 *   "This money was not accepted, and the bill it was for is still owed."
 *                                                 TenantPaymentsView.vue, a rejected payment
 *   "issues bills as they fall due, not on a fixed date"   TenantPaymentsView.vue
 *   "Accounts are created by the landlady."       LoginView.vue
 *   "You can read what is already loaded, but nothing can be saved or paid until it is back."
 *                                                 App.vue, the no-connection banner
 *
 * The other facts, checked 2026-09-24: registering interest creates an `inquiries` row and
 * nothing else, so it reserves nothing (backend/src/routes/public.ts; a reservation is an
 * administrator's status change, BR-006); public sign-up is refused unless
 * ALLOW_PUBLIC_SIGNUP is set (routes/auth.ts); new accounts carry a one-time password
 * (migration 048); five failures lock for 15 minutes (config/env.ts); an inactive account is
 * refused at sign-in (authService.ts); ticket notifications are in-app rows only and no
 * email or SMS path exists, so a ticket does not ring her phone; the administrator closes
 * tickets (BR-023); everything done while signed in is recorded against the actor
 * (auditService.ts).
 *
 * Rates and availability are "subject to confirmation" for a measured reason, not as
 * boilerplate: CLIENT_MEETING_QUESTIONS.md 2f-i found 31 of 33 stored rates disagreeing with
 * what tenants actually pay, and the public site advertises from the stored figure.
 *
 * Two lines are policy rather than facts the code proves: that her tenancy arrangement comes
 * first where it differs from these terms, and that she may suspend a misused account (she
 * can: TENANT_DEACTIVATE). Both were open in CLIENT_MEETING_QUESTIONS.md section 3c and were
 * approved on 2026-09-24, so the page states them without qualification.
 */
import { RouterLink } from 'vue-router';
import LegalPage from '@/components/layout/LegalPage.vue';
import { LANDLADY } from '@/lib/systemState';

const S = {
  about: { id: 'about', title: 'About these terms' },
  site: { id: 'site', title: 'Units, rates and availability' },
  accounts: { id: 'accounts', title: 'Tenant accounts' },
  payments: { id: 'payments', title: 'Paying online' },
  tickets: { id: 'tickets', title: 'Maintenance tickets and messages' },
  use: { id: 'use', title: 'Acceptable use' },
  availability: { id: 'availability', title: 'When the site is unavailable' },
  privacy: { id: 'privacy', title: 'Your information' },
  changes: { id: 'changes', title: 'Changes to these terms' },
  contact: { id: 'contact', title: 'Contact' },
} as const;

const sections = Object.values(S);
</script>

<template>
  <LegalPage title="Terms of use" effective="2026-09-24" updated="2026-09-26" :sections="sections">
    <template #lead>
      <p>
        These terms cover this website and its tenant portal, both run on Hivelet, the system
        Mrs. {{ LANDLADY.name }} uses to manage the {{ LANDLADY.property }}. What happens to the
        information you give is set out in the
        <RouterLink to="/privacy">privacy policy</RouterLink>.
      </p>
    </template>

    <section :aria-labelledby="S.about.id">
      <h2 :id="S.about.id" tabindex="-1">{{ S.about.title }}</h2>
      <p>
        Using the site means accepting these terms. They cover the website only: your tenancy
        itself is whatever you arrange with Mrs. Da Silva, and where the two differ, that
        arrangement comes first.
      </p>
    </section>

    <section :aria-labelledby="S.site.id">
      <h2 :id="S.site.id" tabindex="-1">{{ S.site.title }}</h2>
      <p>
        The units, rates, photos and availability shown on this site are for information. A unit
        shown as available may already be taken, and a rate may have changed since it was last
        updated here. Nothing on the site is an offer or a reservation: confirm the unit and the
        price with Mrs. Da Silva before you rely on either.
      </p>
      <p>
        Viewings are by appointment. Registering your interest sends your details and your
        question to Mrs. Da Silva and nothing more. It does not reserve a unit or hold a price,
        and no automatic confirmation is sent, so leave a number or address she can reach you on.
      </p>
    </section>

    <section :aria-labelledby="S.accounts.id">
      <h2 :id="S.accounts.id" tabindex="-1">{{ S.accounts.title }}</h2>
      <p>
        There is no public sign-up. Accounts are created by the landlady: Mrs. Da Silva sets one up
        for a tenant when they move in, and makes it inactive when they move out, after which it
        can no longer sign in.
      </p>
      <ul>
        <li>
          Your account starts with a one-time password. You will be asked to replace it with your
          own the first time you sign in.
        </li>
        <li>
          Keep your password to yourself, and do not let anyone else use your account. Everything
          done while you are signed in is recorded against it.
        </li>
        <li>On a phone or computer other people use, sign out when you finish.</li>
        <li>Five wrong passwords in a row lock the account for 15 minutes.</li>
        <li>
          If you cannot sign in, or think someone else has used your account, tell Mrs. Da Silva.
        </li>
      </ul>
    </section>

    <section :aria-labelledby="S.payments.id">
      <h2 :id="S.payments.id" tabindex="-1">{{ S.payments.title }}</h2>
      <p>
        You can pay a bill from the portal with GCash. Online payments go through Adyen. Each one
        counts as paid once the landlady verifies it. Until she does, it shows as waiting for
        verification, and the bill stays on your balance.
      </p>
      <ul>
        <li>
          If a payment does not go through but money has left your GCash, tell the landlady and do
          not pay again.
        </li>
        <li>
          If she does not accept a payment, it is marked as not accepted, and the bill it was for
          is still owed.
        </li>
        <li>You can also pay in person, by cash or bank transfer. Mrs. Da Silva records those herself.</li>
        <li>The landlady issues bills as they fall due, not on a fixed date.</li>
        <li>
          If what the portal shows does not match your own receipts, raise it with Mrs. Da Silva.
        </li>
      </ul>
    </section>

    <section :aria-labelledby="S.tickets.id">
      <h2 :id="S.tickets.id" tabindex="-1">{{ S.tickets.title }}</h2>
      <p>
        Use a ticket to report a problem in your own unit, and describe it as accurately as you
        can. Mark it as an emergency only when it is one. Keep messages courteous, and attach only
        photos of the problem, not of other people.
      </p>
      <p>
        <strong>A ticket does not call or text anyone.</strong> It reaches Mrs. Da Silva inside
        Hivelet, and she sees it when she next checks. For anything urgent or dangerous, phone her
        directly on
        <a :href="`tel:${LANDLADY.phone}`">{{ LANDLADY.phone }}</a>.
      </p>
      <p>She decides when a ticket is resolved, and closes it.</p>
    </section>

    <section :aria-labelledby="S.use.id">
      <h2 :id="S.use.id" tabindex="-1">{{ S.use.title }}</h2>
      <p>Please do not:</p>
      <ul>
        <li>try to reach another tenant's information, or any part of the site your account is not for;</li>
        <li>interfere with the site, probe its security, or overload it, including by sending the same inquiry repeatedly;</li>
        <li>give false information, or register interest in someone else's name; or</li>
        <li>use the site for anything unlawful.</li>
      </ul>
      <p>Mrs. Da Silva may suspend an account that is misused.</p>
    </section>

    <section :aria-labelledby="S.availability.id">
      <h2 :id="S.availability.id" tabindex="-1">{{ S.availability.title }}</h2>
      <p>
        There is no promise that the site will always be available. It may be down for
        maintenance, or out of reach when your connection is. With no connection, you can read
        what is already loaded, but nothing can be saved or paid until it is back.
      </p>
    </section>

    <section :aria-labelledby="S.privacy.id">
      <h2 :id="S.privacy.id" tabindex="-1">{{ S.privacy.title }}</h2>
      <p>
        What Hivelet collects, why, who else receives it, and your rights over it are set out in
        the <RouterLink to="/privacy">privacy policy</RouterLink>.
      </p>
    </section>

    <section :aria-labelledby="S.changes.id">
      <h2 :id="S.changes.id" tabindex="-1">{{ S.changes.title }}</h2>
      <p>
        When these terms change, the date at the top of the page changes with them. If you want to
        know what changed, ask Mrs. Da Silva.
      </p>
    </section>

    <section :aria-labelledby="S.contact.id">
      <h2 :id="S.contact.id" tabindex="-1">{{ S.contact.title }}</h2>
      <address class="border-l-2 border-line pl-4">
        <strong>Mrs. {{ LANDLADY.name }}</strong><br />
        {{ LANDLADY.property }}<br />
        {{ LANDLADY.address }}<br />
        <a :href="`tel:${LANDLADY.phone}`" class="press inline-flex min-h-11 items-center">{{ LANDLADY.phone }}</a>
      </address>
    </section>
  </LegalPage>
</template>
