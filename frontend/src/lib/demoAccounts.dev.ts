/**
 * @file lib/demoAccounts.dev.ts
 * @description The demonstration sign-in list. DEVELOPMENT ONLY - see below.
 *
 * WHY THIS FILE IS SEPARATE FROM THE LOGIN VIEW
 * --------------------------------------------
 * This list lived inline in `views/LoginView.vue` until 2026-09-16, which put
 * it in the production bundle. Verified, not assumed: `Hivelet@Admin2026`
 * appeared once and `Hivelet@Tenant2026` thirty-three times in
 * `dist/assets/index-*.js`. Anyone who loaded the site - or simply downloaded
 * that one JavaScript file - had the landlady's administrator password, and the
 * login page offered a button to use it.
 *
 * The same panel published, to anyone who opened the sign-in page:
 *   - the full name of all 33 real residents
 *   - each one's email address
 *   - **the room each of them lives in**
 *
 * That is the privacy half, and it is the half that does not get fixed by
 * rotating a password. BR-024 Tenant Privacy is recorded as Enforced.
 *
 * HOW IT IS KEPT OUT OF THE BUNDLE
 * --------------------------------
 * `LoginView` imports this module ONLY inside `if (import.meta.env.DEV)`, via a
 * dynamic import. Vite substitutes `false` for that expression when building, so
 * the branch and everything it reaches are eliminated. **Do not import this file
 * anywhere else, and do not import it statically** - either would put it back in
 * the bundle immediately and silently.
 *
 * NO PASSWORD IS WRITTEN IN THIS FILE, AND NONE MAY BE
 * -----------------------------------------------------
 * This repository is public. The literals that used to sit here were rotated on
 * 2026-09-13 and are burned, which left every button failing with "Invalid email
 * or password" until 2026-09-17. The current passwords live only in the
 * gitignored `credentials/creds.txt`; `vite.config.ts` hands them to the dev
 * server as `__DEMO_PASSWORDS__` and hands a build `null`. A future rotation
 * therefore needs no edit here - restart the dev server.
 *
 * `npm run check:secrets` still fails the build if the burned `Hivelet@...`
 * literals reach `dist`. It does not scan tracked files for the current ones.
 *
 * These are shared demonstration credentials for a capstone, not secrets a bank
 * would hold. They are still the credentials to a system holding the owner's real
 * financial records and 45 real people's contact details.
 */

declare const __DEMO_PASSWORDS__: { admin: string; tenant: string } | null;

export interface DemoAccount {
  roleLabel: string;
  roleType: 'admin' | 'tenant' | 'inactive';
  name: string;
  email: string;
  /** `null` when `credentials/creds.txt` is absent or unreadable on this machine. */
  password: string | null;
  room?: string;
  badgeClass: string;
}

const listed: Omit<DemoAccount, 'password'>[] = [
  {
    roleLabel: 'Landlady Admin',
    roleType: 'admin',
    name: 'Mrs. Fe Galang Da Silva',
    email: 'admin@hivelet.ph',
    badgeClass: 'badge-warning',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Lobby Toor',
    email: 'lobby.toor@gmail.com',
    room: 'Room 1A (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Jade Marmol',
    email: 'jade.marmol@gmail.com',
    room: 'Room 1B (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Daryl Rivero',
    email: 'daryl.rivero@gmail.com',
    room: 'Room 1C (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Sandrine Jammeka Mariano',
    email: 'sandrine.jammeka.mariano@gmail.com',
    room: 'Room 1D (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Princess Lana Aviso',
    email: 'princess.lana.aviso@gmail.com',
    room: 'Room 1E (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alberto Mestiola',
    email: 'alberto.mestiola@gmail.com',
    room: 'Room 1F (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Monica Bea Cabais',
    email: 'monica.bea.cabais@gmail.com',
    room: 'Room 1G (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Trisha Nicole Bellio',
    email: 'trisha.nicole.bellio@gmail.com',
    room: 'Room 1H (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Ron Juliene Dominguino',
    email: 'ron.juliene.dominguino@gmail.com',
    room: 'Room 2A (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Nikki Prollamante',
    email: 'nikki.prollamante@gmail.com',
    room: 'Room 2B (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alexa Allaine delapaz',
    email: 'alexa.allaine.delapaz@gmail.com',
    room: 'Room 2C (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Joan Rejuso',
    email: 'joan.rejuso@gmail.com',
    room: 'Room 2D (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Sian Danver Morta',
    email: 'sian.danver.morta@gmail.com',
    room: 'Room 2E (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Christine Golpeo',
    email: 'christine.golpeo@gmail.com',
    room: 'Room 2F (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Grace Trina metillo',
    email: 'grace.trina.metillo@gmail.com',
    room: 'Room 2G (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Gupreet Sigh',
    email: 'gupreet.sigh@gmail.com',
    room: 'Room 3A (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Myra Cadag',
    email: 'myra.cadag@gmail.com',
    room: 'Room 3B (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Bob Dumas',
    email: 'bob.dumas@gmail.com',
    room: 'Room 3C (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alejandro Delarosa',
    email: 'alejandro.delarosa@gmail.com',
    room: 'Room 3D (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Mireel Fatima Parcarey',
    email: 'mireel.fatima.parcarey@gmail.com',
    room: 'Room 3E (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Eunice Francisco',
    email: 'eunice.francisco@gmail.com',
    room: 'Room 3F (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Ann Kristine Diaz',
    email: 'ann.kristine.diaz@gmail.com',
    room: 'Room 3G (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Arvin Vega',
    email: 'arvin.vega@gmail.com',
    room: 'Room B1F (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Anna Sherra Jalmasco',
    email: 'anna.sherra.jalmasco@gmail.com',
    room: 'Room B2F (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Krizza Bellena',
    email: 'krizza.bellena@gmail.com',
    room: 'Room B2B (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Janna Berlarmino',
    email: 'janna.berlarmino@gmail.com',
    room: 'Room B3F (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Joecel Royo',
    email: 'joecel.royo@gmail.com',
    room: 'Room B3B (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Gayon Albay LGBT',
    email: 'gayon.albay.lgbt@gmail.com',
    room: 'Room F1 (Front)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Brian Sesbreno',
    email: 'brian.sesbreno@gmail.com',
    room: 'Room F2F (Front)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alfred John Laurinaria',
    email: 'alfred.john.laurinaria@gmail.com',
    room: 'Room F2B (Front)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Gayon LGPT',
    email: 'gayon.lgpt@gmail.com',
    room: 'Room LF (Linda)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Jaye Casia',
    email: 'jaye.casia@gmail.com',
    room: 'Room LB (Linda)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Inactive Tenant',
    roleType: 'inactive',
    name: 'Miguel Ramos',
    email: 'miguel.ramos@gmail.com',
    room: 'Vacated (BR-025)',
    badgeClass: 'badge-danger',
  },
];

export const demoAccounts: DemoAccount[] = listed.map((account) => ({
  ...account,
  password: __DEMO_PASSWORDS__
    ? account.roleType === 'admin'
      ? __DEMO_PASSWORDS__.admin
      : __DEMO_PASSWORDS__.tenant
    : null,
}));
