<script setup lang="ts">
/**
 * @file PrivacyPolicyView.vue
 * @description What Hivelet collects about a visitor, an enquirer or a resident, why, who
 *   else receives it, and how to use the rights the Data Privacy Act of 2012 (RA 10173) gives
 *   them. First written to close B-50 in BLOCKED_FOR_SEAN.md; rebuilt 2026-09-24 against the
 *   notice elements the Act and the National Privacy Commission expect.
 *
 * EVERY SENTENCE IS A CLAIM ABOUT THE CODE, CHECKED ON 2026-09-24
 * ----------------------------------------------------------------
 * Read these as claims with a date on them. If the code named here changes, the sentence it
 * supports may stop being true, and the page will not notice.
 *
 *   enquiry fields           backend/src/routes/public.ts `inquirySchema`: four fields
 *   enquiry audit row        same route, `auditFromRequest` INQUIRY_CREATE: name + IP address
 *   resident record          backend/src/routes/admin.ts `tenantOnboardSchema`
 *   what a resident edits    TenantProfileView.vue (phone, emergency contact, occupation, Facebook)
 *   tickets                  backend/src/routes/tenant.ts `ticketSchema` (photo as attachment)
 *   activity record          backend/src/services/auditService.ts; UPDATE and DELETE revoked
 *                            by migration 002, and no route edits or deletes an entry
 *   no email or SMS          no mail or SMS package in backend/package.json, no outbound call
 *                            but Supabase and Adyen (grep of `fetch(` across backend/src)
 *   sent to Adyen            adyenService.createCheckoutSession: amount, bill reference,
 *                            `shopperReference` (profile id), `shopperEmail` when on file
 *   back from Adyen          adyenWebhookHandler.ts payment insert: amount, method, reference
 *   Google Fonts             frontend/index.html stylesheet link
 *   browser storage          lib/api.ts (token), lib/authStore.ts (session snapshot, cleared on
 *                            sign-out), BookViewingPrompt.vue (dismissal flag); no
 *                            `document.cookie` in frontend/src, no `res.cookie` in backend/src,
 *                            no analytics script anywhere
 *   offline cache            frontend/vite.config.ts workbox: static files, fonts, and
 *                            /api/(public|health) for one hour; never /api/tenant or /api/admin
 *   developers' copies       scripts/backup-database.mjs writes every table to backups/
 *   lockout                  backend/src/config/env.ts: 5 failures, 15 minutes; bcrypt hashes
 *   one-time password        admin.ts onboarding + migration 048 `must_change_password`
 *   move-out                 BR-025: account made inactive, history kept; authService refuses
 *                            an inactive account at sign-in
 *
 * WHAT IT DELIBERATELY DOES NOT SAY
 * ---------------------------------
 * No named data protection officer, no NPC registration, and no email address for requests.
 * Asked on 2026-09-24: the first two are unknown, and requests go to Mrs. Da Silva by phone or
 * in person, which is what the page says. It names nobody as a developer, and gives no date for
 * the developers' access ending, because that is undecided.
 *
 * Two items left this list on 2026-09-24: the database's location (B-60, confirmed on the
 * Supabase dashboard, noted at the Supabase bullet) and the retention periods (Sean's answers,
 * noted at that section, which also says what is not yet built to carry them out).
 *
 * The lawful-basis section cites RA 10173 Section 12. That is a reading of the Act against what
 * the system does, for her to confirm with the rest of the page, not a fact the code proves.
 */
import { RouterLink } from 'vue-router';
import LegalPage from '@/components/layout/LegalPage.vue';
import { LANDLADY } from '@/lib/systemState';

const S = {
  who: { id: 'who', title: 'Who is responsible for your information' },
  collected: { id: 'collected', title: 'What is collected' },
  purposes: { id: 'purposes', title: 'What it is used for' },
  basis: { id: 'basis', title: 'The legal basis' },
  recipients: { id: 'recipients', title: 'Who else receives it' },
  browser: { id: 'browser', title: 'What your browser keeps' },
  retention: { id: 'retention', title: 'How long it is kept' },
  security: { id: 'security', title: 'How it is protected' },
  rights: { id: 'rights', title: 'Your rights, and how to use them' },
  complaints: { id: 'complaints', title: 'Complaints' },
  changes: { id: 'changes', title: 'Changes to this policy' },
} as const;

const sections = Object.values(S);
</script>

<template>
  <LegalPage title="Privacy policy" effective="2026-09-24" updated="2026-09-26" :sections="sections">
    <template #lead>
      <p>
        This policy explains what Hivelet, the system Mrs. {{ LANDLADY.name }} uses to run her
        boarding house, collects about the people who visit this site, register their interest
        in a unit, or live here; what it is used for; who else receives it; and what you can ask
        her to do about it. The Data Privacy Act of 2012 (Republic Act No. 10173) gives you
        rights over this information, and this page says how to use them.
      </p>
      <p>
        How the site and the tenant portal may be used is set out separately in the
        <RouterLink to="/terms">terms of use</RouterLink>.
      </p>
    </template>

    <section :aria-labelledby="S.who.id">
      <h2 :id="S.who.id" tabindex="-1">{{ S.who.title }}</h2>
      <p>
        Mrs. {{ LANDLADY.name }}, who owns and runs the {{ LANDLADY.property }}, decides what
        Hivelet collects and what it is used for. Under the Data Privacy Act she is the personal
        information controller. For anything about your information, contact her directly:
      </p>
      <address class="mt-4 border-l-2 border-line pl-4">
        <strong>Mrs. {{ LANDLADY.name }}</strong><br />
        {{ LANDLADY.property }}<br />
        {{ LANDLADY.address }}<br />
        <a :href="`tel:${LANDLADY.phone}`" class="press inline-flex min-h-11 items-center">{{ LANDLADY.phone }}</a>
      </address>
    </section>

    <section :aria-labelledby="S.collected.id">
      <h2 :id="S.collected.id" tabindex="-1">{{ S.collected.title }}</h2>
      <p>Only what running the boarding house needs. What that is depends on how you use the site.</p>

      <h3>If you register your interest</h3>
      <p>
        The inquiry form asks for your name, email address, phone number and your question. It
        has no field for anything else. The system also notes when the inquiry arrived, and the
        network (IP) address it came from, in the activity record described below.
      </p>

      <h3>If you live here</h3>
      <p>
        Mrs. Da Silva creates your account when you move in. It holds your name, the email
        address or phone number you sign in with, your unit, your move-in date, the amount paid
        on moving in, and how many people live in the unit, because water is charged per person.
        On the My details screen you can add or change your phone number, an emergency contact's
        name and number, your occupation and your Facebook page.
      </p>
      <p>
        An emergency contact is someone else's name and number. Please let them know you have
        given it.
      </p>

      <h3>Bills and payments</h3>
      <p>
        Each bill, what it is for, and what has been paid against it: amounts, dates, how it was
        paid, receipt or reference numbers, and whether Mrs. Da Silva has verified it. Cash and
        bank transfers are recorded by her.
      </p>

      <h3>Maintenance tickets</h3>
      <p>
        What you report: a title, a description, a category, how urgent it is, a photo if you
        attach one, and the messages you and Mrs. Da Silva exchange about it.
      </p>

      <h3>The activity record</h3>
      <p>
        Hivelet records important actions, such as signing in, changes to an account, payments,
        tickets and inquiries: who did it, when, what changed, and the network address the
        request came from. Entries cannot be edited or deleted through Hivelet. The server also
        keeps a routine technical log of the requests it receives.
      </p>
    </section>

    <section :aria-labelledby="S.purposes.id">
      <h2 :id="S.purposes.id" tabindex="-1">{{ S.purposes.title }}</h2>
      <ul>
        <li>To answer your inquiry and arrange a viewing.</li>
        <li>To set up and run your tenancy: your account, your bills, and the record of what you have paid.</li>
        <li>To take online payments and match each one to the right bill.</li>
        <li>To deal with the maintenance problems you report.</li>
        <li>To reach you, or the person you named, if something happens to you.</li>
        <li>
          To keep the boarding house's income and expense records accurate. Mrs. Da Silva can
          export them as a spreadsheet for her own bookkeeping.
        </li>
        <li>To keep the system secure: limiting sign-in attempts, and being able to tell who changed what.</li>
      </ul>
      <p>
        Hivelet has no mailing list and shows no advertising. It sends no emails or text messages
        of any kind, so nothing is sent to you automatically, including a confirmation of an
        inquiry.
      </p>
    </section>

    <section :aria-labelledby="S.basis.id">
      <h2 :id="S.basis.id" tabindex="-1">{{ S.basis.title }}</h2>
      <p>
        Section 12 of the Data Privacy Act lists the grounds on which personal information may be
        processed. Hivelet relies on two of them:
      </p>
      <ul>
        <li>
          <strong>Your inquiry and your tenancy.</strong> Processing needed to act on your request
          before a tenancy begins, and to carry out the tenancy once it does (Section 12(b)).
        </li>
        <li>
          <strong>The activity record, sign-in limits and the property's financial records.</strong>
          The legitimate interest in running the property securely and keeping an accurate account
          of it (Section 12(f)).
        </li>
      </ul>
      <p>
        No form in Hivelet asks for sensitive personal information, such as a government ID
        number or health details. Please leave it out of messages and tickets unless it is needed.
      </p>
    </section>

    <section :aria-labelledby="S.recipients.id">
      <h2 :id="S.recipients.id" tabindex="-1">{{ S.recipients.title }}</h2>
      <p>
        Inside Hivelet, a tenant sees only their own account, bills, payments and tickets, and
        only Mrs. Da Silva's account can open an inquiry. She sees every account, because running
        the property requires it. Outside Hivelet, these receive some of your information, and
        only for the purpose given:
      </p>
      <ul>
        <li>
          <strong>Adyen</strong>, the payment processor, when you pay online with GCash. Hivelet
          sends Adyen the amount, a reference for the bill, a reference for your account, and your
          email address if one is on file. The GCash details you enter go to Adyen directly:
          Hivelet never receives or stores your GCash number, MPIN or any one-time code. Adyen
          sends back whether the payment went through, the amount, and its own reference number.
          Adyen and GCash handle the payment itself under their own terms.
        </li>
        <!--
          The region (B-60): AWS ap-northeast-2, Seoul. First inferred from DNS
          on 2026-09-24 (the database host resolves into 2406:da12::/36, which
          AWS's ip-ranges.json lists as ap-northeast-2), then confirmed by Sean
          on the Supabase dashboard (Project Settings > General) the same day.
          If the project ever moves, this sentence moves with it. The API host's
          region belongs here too once it is chosen.
        -->
        <li>
          <strong>Supabase</strong>, which hosts Hivelet's database. Everything described on this
          page is stored there. Those records are kept on servers in Seoul, South Korea, which is
          outside the Philippines.
        </li>
        <li>
          <strong>Google Fonts.</strong> The site's typefaces are loaded from Google's servers, so
          your browser contacts Google on each visit and Google receives its network address.
          Nothing you type is sent.
        </li>
        <li>
          <strong>The developers who built Hivelet and maintain it.</strong> They can reach the
          database to keep the system working, and keep backup copies of it so records can be
          restored if something goes wrong.
        </li>
      </ul>
      <p>
        Hivelet connects to no other service. The Facebook and map links on this site open those
        services, and what you do there is covered by their own policies.
      </p>
    </section>

    <section :aria-labelledby="S.browser.id">
      <h2 :id="S.browser.id" tabindex="-1">{{ S.browser.title }}</h2>
      <p>
        Hivelet sets no cookies and runs no analytics, advertising or tracking. This is all it
        keeps in your browser:
      </p>
      <ul>
        <li>
          <strong>When you sign in:</strong> a sign-in token, so you stay signed in between visits,
          and a copy of your name, email address and role, so the portal can still open on a
          phone with no signal. Signing out removes both. On a phone or computer other people
          use, sign out when you finish.
        </li>
        <li>
          <strong>If you close the viewing invitation</strong> on the home page: a note that you
          did, so it is not shown again.
        </li>
        <li>
          <strong>An offline copy of the site.</strong> Hivelet installs a small helper in your
          browser (a service worker) that keeps the site's own files, its typefaces, and the public
          information about the units, so pages still open on a weak connection. The unit
          information is kept for up to an hour. It never keeps your bills, payments, tickets or
          account details.
        </li>
      </ul>
      <p>
        While you pay, Adyen's payment form runs inside the page, under Adyen's own privacy terms.
        You can clear everything above at any time from your browser's settings for this site.
      </p>
    </section>

    <!--
      RETENTION: the rules Sean gave on 2026-09-24. They are stated as the rules
      that apply, and deliberately NOT as something the system does by itself:
      nothing in Hivelet deletes on a schedule today.

      ⚠ The first two need a deletion step before the site goes public - an
      enquiry six months after its last message, and a former tenant's phone,
      emergency contact and Facebook one month after move-out. Tracked for the
      backend. Whoever builds it: the INQUIRY_CREATE row in `audit_logs` holds
      the enquirer's name and IP address, the log is append-only (migration
      002), and "the activity record is permanent" below is still true of it.
      Decide that together with the deletion, or this page contradicts itself.
    -->
    <section :aria-labelledby="S.retention.id">
      <h2 :id="S.retention.id" tabindex="-1">{{ S.retention.title }}</h2>
      <ul>
        <li>
          <strong>An inquiry</strong> that does not lead to a tenancy is kept for up to six
          months after the last message about it, and then deleted.
        </li>
        <li>
          <strong>When a tenant moves out</strong>, the account is made inactive and can no
          longer sign in. Their phone number, emergency contact and Facebook page are kept for one
          month after move-out, and then removed.
        </li>
        <li>
          <strong>Tenancy and payment history</strong> is kept for as long as Mrs. Da Silva keeps
          the property's books, because her financial records depend on it, until she chooses to
          delete it.
        </li>
        <li><strong>The activity record</strong> is permanent.</li>
      </ul>
      <p>
        To ask for something of yours to be removed sooner, or to ask how long a particular record
        will be kept, contact Mrs. Da Silva.
      </p>
    </section>

    <section :aria-labelledby="S.security.id">
      <h2 :id="S.security.id" tabindex="-1">{{ S.security.title }}</h2>
      <ul>
        <li>Passwords are stored only in scrambled (hashed) form, so nobody, Mrs. Da Silva included, can read yours.</li>
        <li>Every new tenant account starts with a one-time password, which has to be replaced the first time it is used.</li>
        <li>Five wrong passwords in a row lock an account for 15 minutes.</li>
        <li>
          Your browser never reads the database directly. Every request goes through Hivelet's
          server, which checks who is asking and lets a tenant reach only their own records.
        </li>
        <li>Payment details stay with Adyen.</li>
        <li>The activity record shows who changed what, and cannot be edited.</li>
      </ul>
      <p>
        If you think someone else has used your account, tell Mrs. Da Silva straight away.
      </p>
    </section>

    <section :aria-labelledby="S.rights.id">
      <h2 :id="S.rights.id" tabindex="-1">{{ S.rights.title }}</h2>
      <p>Under the Data Privacy Act you have the right to:</p>
      <ul>
        <li>be told how your information is used, which is what this page is for;</li>
        <li>see the information held about you;</li>
        <li>have it corrected if it is wrong;</li>
        <li>object to its use, or ask for it to be removed or blocked;</li>
        <li>receive a copy of it in a form you can use elsewhere;</li>
        <li>be compensated for damage caused by inaccurate or unlawfully used information; and</li>
        <li>complain to the National Privacy Commission.</li>
      </ul>
      <p>
        To use any of them, contact Mrs. Da Silva by phone on
        <a :href="`tel:${LANDLADY.phone}`">{{ LANDLADY.phone }}</a> or in person at the address
        above. Tenants can already see their bills, payments and tickets in the portal, and
        correct their own phone number, emergency contact, occupation and Facebook page on the My
        details screen. For anything else, including your name, ask her.
      </p>
      <p>
        Records that are part of the property's financial history, and the activity record, are
        kept after an account is closed, as described under
        <a :href="`#${S.retention.id}`">how long it is kept</a>.
      </p>
    </section>

    <section :aria-labelledby="S.complaints.id">
      <h2 :id="S.complaints.id" tabindex="-1">{{ S.complaints.title }}</h2>
      <p>
        If something about your information worries you, raise it with Mrs. Da Silva first. If that
        does not settle it, you can complain to the National Privacy Commission, the government
        body that enforces the Data Privacy Act. Its website,
        <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">privacy.gov.ph<span class="sr-only"> (opens in a new tab)</span></a>,
        explains how.
      </p>
    </section>

    <section :aria-labelledby="S.changes.id">
      <h2 :id="S.changes.id" tabindex="-1">{{ S.changes.title }}</h2>
      <p>
        When this policy changes, the date at the top of the page changes with it. If you want to
        know what changed, ask Mrs. Da Silva.
      </p>
    </section>
  </LegalPage>
</template>
