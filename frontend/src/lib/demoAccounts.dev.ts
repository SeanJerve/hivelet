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
 * `npm run check:secrets` fails if these passwords appear in any tracked file
 * other than this one, and a build-output check in the same suite fails if they
 * reach `dist`. Neither existed before 2026-09-16, which is why this survived.
 *
 * The passwords here are shared demonstration credentials for a capstone, not
 * secrets a bank would hold. They are still the credentials to a system holding
 * the owner's real financial records and 45 real people's contact details.
 */

export interface DemoAccount {
  roleLabel: string;
  roleType: 'admin' | 'tenant' | 'inactive';
  name: string;
  email: string;
  password: string;
  room?: string;
  badgeClass: string;
}

export const demoAccounts: DemoAccount[] = [
  {
    roleLabel: 'Landlady Admin',
    roleType: 'admin',
    name: 'Mrs. Fe Galang Da Silva',
    email: 'admin@hivelet.ph',
    password: 'Hivelet@Admin2026',
    badgeClass: 'badge-warning',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Lobby Toor',
    email: 'lobby.toor@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1A (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Jade Marmol',
    email: 'jade.marmol@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1B (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Daryl Rivero',
    email: 'daryl.rivero@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1C (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Sandrine Jammeka Mariano',
    email: 'sandrine.jammeka.mariano@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1D (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Princess Lana Aviso',
    email: 'princess.lana.aviso@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1E (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alberto Mestiola',
    email: 'alberto.mestiola@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1F (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Monica Bea Cabais',
    email: 'monica.bea.cabais@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1G (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Trisha Nicole Bellio',
    email: 'trisha.nicole.bellio@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 1H (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Ron Juliene Dominguino',
    email: 'ron.juliene.dominguino@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2A (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Nikki Prollamante',
    email: 'nikki.prollamante@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2B (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alexa Allaine delapaz',
    email: 'alexa.allaine.delapaz@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2C (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Joan Rejuso',
    email: 'joan.rejuso@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2D (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Sian Danver Morta',
    email: 'sian.danver.morta@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2E (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Christine Golpeo',
    email: 'christine.golpeo@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2F (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Grace Trina metillo',
    email: 'grace.trina.metillo@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 2G (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Gupreet Sigh',
    email: 'gupreet.sigh@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3A (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Myra Cadag',
    email: 'myra.cadag@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3B (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Bob Dumas',
    email: 'bob.dumas@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3C (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alejandro Delarosa',
    email: 'alejandro.delarosa@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3D (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Mireel Fatima Parcarey',
    email: 'mireel.fatima.parcarey@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3E (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Eunice Francisco',
    email: 'eunice.francisco@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3F (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Ann Kristine Diaz',
    email: 'ann.kristine.diaz@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room 3G (BH)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Arvin Vega',
    email: 'arvin.vega@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room B1F (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Anna Sherra Jalmasco',
    email: 'anna.sherra.jalmasco@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room B2F (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Krizza Bellena',
    email: 'krizza.bellena@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room B2B (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Janna Berlarmino',
    email: 'janna.berlarmino@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room B3F (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Joecel Royo',
    email: 'joecel.royo@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room B3B (Back)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Gayon Albay LGBT',
    email: 'gayon.albay.lgbt@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room F1 (Front)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Brian Sesbreno',
    email: 'brian.sesbreno@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room F2F (Front)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Alfred John Laurinaria',
    email: 'alfred.john.laurinaria@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room F2B (Front)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Gayon LGPT',
    email: 'gayon.lgpt@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room LF (Linda)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Jaye Casia',
    email: 'jaye.casia@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Room LB (Linda)',
    badgeClass: 'badge-success',
  },
  {
    roleLabel: 'Inactive Tenant',
    roleType: 'inactive',
    name: 'Miguel Ramos',
    email: 'miguel.ramos@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Vacated (BR-025)',
    badgeClass: 'badge-danger',
  },
];
