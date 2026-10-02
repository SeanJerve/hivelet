import { createApp, nextTick, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setAuthFailureHandler } from './lib/api'
import { currentRole, handleAuthFailure, MOVED_OUT_FLAG } from './lib/authStore'
import { warmRoutes } from './lib/warmRoutes'
import { installStaleVersionRecovery } from './lib/staleVersion'
import { installTheme } from './lib/theme'
import { CATEGORIES } from './lib/unitCategories'
import './index.css'

// An open page that outlived a deploy loads the new version on its next
// navigation instead of going dead (lib/staleVersion.ts).
installStaleVersionRecovery(router)

// Dark mode: public/boot.js set the theme before the first paint; this
// keeps it following the OS and the Appearance control (lib/theme.ts).
installTheme()

/**
 * A dead session now redirects on its own.
 *
 * `setAuthFailureHandler` and `handleAuthFailure` have existed since before
 * this file's own history - api.ts's own comment on `isAuthFailure` calls
 * this exact wiring "a trap laid for whoever wires it up" - and nothing ever
 * called the setter. `handleAuthFailure` clears the session, but nothing
 * navigated: sitting on a portal page (tenant or admin), the screen stayed
 * exactly as it was, showing whatever it last held, and only a manual
 * refresh re-ran the router guard and actually reached /login (asked for
 * 2026-09-24).
 *
 * Wired here, in main.ts, rather than in App.vue's onMounted - the router's
 * OWN first navigation calls `restoreSession()` (router/index.ts
 * `beforeEach`), and that guard can run, and its `/auth/me` call can fail,
 * before App.vue's root component has finished setting up. Registering the
 * handler before `app.mount()` covers that first call too.
 *
 * The redirect reuses the router guard's own `?redirect=` mechanism
 * (router/index.ts, LoginView.vue's `deniedReason`) rather than inventing a
 * second way to say "sign in again" - the sentence a resident sees is the
 * same "Please sign in to access <section>." either way. Guarded against
 * already sitting on /login, so a second failed background call (the
 * notifications heartbeat, say) does not stomp a redirect target that is
 * already correct or reset a login the person is mid-typing.
 */
setAuthFailureHandler((error) => {
  handleAuthFailure()
  const current = router.currentRoute.value
  if (current.path === '/login') return
  // Moved out (ACCOUNT_INACTIVE): the sign-in page explains it once
  // (MOVED_OUT_FLAG). Only from a signed-in page, or the very first load, which
  // the router guard then sends to /login; not from a public page, where there
  // is nothing to explain.
  if (error.code === 'ACCOUNT_INACTIVE' && (current.matched.length === 0 || current.meta.roles)) {
    try {
      sessionStorage.setItem(MOVED_OUT_FLAG, '1')
    } catch {
      // Storage blocked: they still reach sign-in, just without the note.
    }
    // No `redirect`: "Please sign in to access your payments" under the note
    // would contradict it. There is nothing to come back to.
    if (current.meta.roles) {
      router.push('/login')
      return
    }
  }
  // Only a page that needs a sign-in sends you to one. A stale token on a public
  // page, or on the very first load (no route resolved yet, so no `meta.roles`),
  // just clears the session; the router's own guard still sends anyone headed
  // for a protected page to /login. It used to bounce a visitor with an expired
  // token from the landing page to "Sign in".
  if (!current.meta.roles) return
  router.push({
    path: '/login',
    query: { redirect: current.fullPath },
  })
})

/*
 * Every tab, and the installed app's window, reads "Hivelet" alone (Lloyd,
 * 2026-09-30: the home-screen app showed "Hivelet for Fe Galang Da Silva
 * Boarding House - Fe Galang Da Silva Boarding House, Legazpi City · Hivelet").
 * Per-page titles ("Monthly Income · Hivelet") were removed with it; each page
 * still announces itself through its own <h1>.
 *
 * 2026-10-02: the per-page titles are back in a browser tab only. The reason
 * above is the installed app's window, which still reads "Hivelet" alone; a
 * browser tab needs the page's name so tabs, history and bookmarks can be told
 * apart (WCAG 2.4.2), and Chapter 4 reports the 26 Sep fix "each page has one
 * name, used in the menu, the browser tab and its own heading". The names are
 * the menu's and the <h1>'s, short, with no business name in them.
 */
const PAGE_TITLES: Record<string, string> = {
  Inquire: 'Send an inquiry',
  InquiryThread: 'Your inquiries',
  PrivacyPolicy: 'Privacy policy',
  Terms: 'Terms of use',
  Login: 'Sign in',
  NotFound: 'Page not found',
  TenantOverview: 'Overview',
  TenantPayments: 'Payments and billing',
  TenantTickets: 'Repairs',
  TenantProfile: 'My details',
  AdminOverview: 'Overview',
  RoomDirectory: 'Rooms and rates',
  TenantManagement: 'Tenants',
  IncomeCollections: 'Monthly Income',
  ExpensesLedger: 'Monthly Expenses',
  MaintenanceDispatch: 'Repairs',
  Inquiries: 'Inquiries',
}
const installedApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/*
 * What a search result shows under each public page's title. index.html carries
 * the landing page's own description, which every page used to share; the ones
 * below replace it on their page and it comes back everywhere else.
 */
const PAGE_DESCRIPTIONS: Record<string, string> = {
  Inquire: 'Ask about a unit at the Fe Galang Da Silva Boarding House in Legazpi City, or ask to arrange a viewing.',
  InquiryThread: 'Read the reply to your enquiry about the Fe Galang Da Silva Boarding House, and write back.',
  PrivacyPolicy: 'What the Fe Galang Da Silva Boarding House website collects, why, who else receives it, and your rights under the Data Privacy Act of 2012.',
  Terms: 'How the boarding house website and tenant portal may be used, including paying online, refunds and deposits.',
}

/*
 * Search engines: the public pages are indexed, with a canonical address on the
 * production domain and permission to show a large image (what Google Discover
 * and large link previews need). Everything behind a sign-in, the sign-in page
 * itself and the not-found page are marked noindex; public/robots.txt also keeps
 * crawlers out of /admin and /tenant.
 */
const SITE = 'https://hivelet.vercel.app'
const headTag = (selector: string, create: () => HTMLElement) => document.head.querySelector(selector) ?? document.head.appendChild(create())
const descriptionTag = headTag('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' })) as HTMLMetaElement
const defaultDescription = descriptionTag.content
const robotsTag = headTag('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' })) as HTMLMetaElement
const canonicalTag = headTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' })) as HTMLLinkElement

router.afterEach((to) => {
  const slug = typeof to.params.categorySlug === 'string' ? to.params.categorySlug : ''
  // "one-bedroom" -> "One-bedroom units", the category's own spelling on the page.
  const category = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) + ' units' : ''
  const categoryTitle = CATEGORIES.find((c) => c.slug === slug)?.title
  const pageName = categoryTitle ? `${categoryTitle} units` : PAGE_TITLES[String(to.name)]
  document.title = pageName && !installedApp() ? `${pageName} · Hivelet` : 'Hivelet'

  const categoryDescription = category
    ? `${category} at the Fe Galang Da Silva Boarding House in Legazpi City: their rates, which are vacant, and the floor plan of each.`
    : ''
  descriptionTag.content = categoryDescription || PAGE_DESCRIPTIONS[String(to.name)] || defaultDescription
  const privatePage = Boolean(to.meta.roles) || to.name === 'Login' || to.name === 'NotFound'
  robotsTag.content = privatePage ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  canonicalTag.href = SITE + (to.path === '/' ? '/public' : to.path)
})

/*
 * The loader in index.html (Sean, 2026-10-01), shown on the first load and on
 * full reloads of pages without a skeleton (public/boot.js), leaves once the first page has
 * actually rendered: `router.isReady()` waits for the first route's own code
 * and guards, `nextTick` for RouterView to have rendered that page into the
 * DOM, and the frame after that is it painted. Taking it down at `app.mount`
 * alone would uncover the stand-in App.vue holds open while the route's chunk
 * downloads (RouteSkeleton since 2026-10-02; before that an empty pale box
 * under the header, the "white page and the headers" it is there to cover).
 *
 * It can never trap anyone: it also goes if the first navigation fails (a
 * route chunk that did not download), on a script error during start-up, and
 * at 8s regardless (SPLASH_CAP_MS). If this file never runs at all,
 * index.html's own `splash-giveup` animation hides it at 8s too.
 */
const SPLASH_CAP_MS = 8000
function dismissSplash() {
  const splash = document.getElementById('app-splash')
  if (!splash || splash.classList.contains('is-leaving')) return
  // Never drawn (public/boot.js's `no-splash`): there is no fade to wait for.
  if (document.documentElement.classList.contains('no-splash')) {
    splash.remove()
    return
  }
  splash.classList.add('is-leaving')
  const remove = () => splash.remove()
  splash.addEventListener('transitionend', remove, { once: true })
  // `transitionend` never fires when there is nothing to animate (a background
  // tab, index.html's 8s fallback already run), so the node goes on a timer as well.
  window.setTimeout(remove, 400)
}
window.addEventListener('error', dismissSplash, { once: true })
window.setTimeout(dismissSplash, SPLASH_CAP_MS)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
/*
 * After the first page has rendered: remember that this browser has seen
 * Hivelet, so public/boot.js leaves the loader off a later load of a page with
 * its own skeleton (Sean, 2026-10-01: "the main spinner should show only the
 * first time"); then, once idle, fetch the code of the pages this person is
 * likely to open next (lib/warmRoutes.ts), and again if they sign in or out.
 * Set only on success: a first load whose route failed keeps the loader for
 * next time.
 */
const SEEN_FLAG = 'hivelet.seen'
function firstPageRendered() {
  try {
    localStorage.setItem(SEEN_FLAG, '1')
  } catch {
    // Storage blocked (private mode): every load counts as a first one.
  }
  markActive()
  warmRoutes(router, currentRole.value)
  watch(currentRole, (role) => warmRoutes(router, role))
}

/*
 * "Away" for public/boot.js: the last moment Hivelet was on screen. Written
 * while the page is visible (each minute, and when it is shown or hidden), so
 * a tab left open and in use is never "away", and the installed app reopened
 * after half an hour is (Sean, 2026-10-02 evening: the loader when opening the
 * app after a while).
 */
function markActive() {
  try {
    localStorage.setItem('hivelet.lastActive', String(Date.now()))
  } catch {
    // Storage blocked: boot.js then always draws the loader, the safe side.
  }
}
document.addEventListener('visibilitychange', markActive)
window.addEventListener('pagehide', markActive)
window.setInterval(() => {
  if (document.visibilityState === 'visible') markActive()
}, 60_000)

/*
 * "Rendered" means the page itself is in <main> with a height, checked each
 * frame, not only that the router is ready (Sean, 2026-10-02). `isReady` plus
 * a tick was right for every page measured, but it is a claim about Vue's
 * scheduling rather than about the screen, and the loader coming down early
 * is exactly what uncovered the header over an empty page. RouteSkeleton
 * (`data-boot-skeleton`) does not count: it is the stand-in, not the page.
 * The 8s cap above still applies, and the cap never sets `hivelet.seen`: a
 * load that did not render keeps the loader for next time.
 */
function pageInMain(): boolean {
  const main = document.getElementById('main')
  if (!main) return false
  return Array.from(main.children).some(
    (el) => !el.hasAttribute('data-boot-skeleton') && el.getBoundingClientRect().height > 0,
  )
}
function whenPageInMain(done: () => void) {
  const started = performance.now()
  const look = () => {
    if (pageInMain()) done()
    else if (performance.now() - started < SPLASH_CAP_MS) requestAnimationFrame(look)
  }
  requestAnimationFrame(look)
}

router
  .isReady()
  .then(
    () =>
      nextTick().then(() =>
        whenPageInMain(() => {
          dismissSplash()
          firstPageRendered()
        }),
      ),
    () => requestAnimationFrame(dismissSplash),
  )
