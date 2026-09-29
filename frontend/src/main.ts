import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setAuthFailureHandler } from './lib/api'
import { handleAuthFailure } from './lib/authStore'
import './index.css'

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
setAuthFailureHandler(() => {
  handleAuthFailure()
  const current = router.currentRoute.value
  if (current.path === '/login') return
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
 * One tab title per page. Every page used to share index.html's single
 * title, so six open tabs of this app read identically in the tab strip,
 * in the history list, and to a screen reader announcing the new page after
 * a route change. The names match the sidebar's own labels (AppSidebar.vue)
 * so the tab says what the menu said. A route missing here falls back to
 * the plain product name rather than a wrong one.
 */
const PAGE_TITLES: Record<string, string> = {
  PublicGuest: 'Fe Galang Da Silva Boarding House, Legazpi City',
  Inquire: 'Send an inquiry',
  PrivacyPolicy: 'Privacy policy',
  Terms: 'Terms of use',
  Login: 'Sign in',
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
  AdminAuditLogs: 'Activity',
  NotFound: 'Page not found',
}

/*
 * What a search result shows under each public page's title. index.html carries
 * the landing page's own description, which every page used to share; the ones
 * below replace it on their page and it comes back everywhere else.
 */
const PAGE_DESCRIPTIONS: Record<string, string> = {
  Inquire: 'Send Mrs. Fe Galang Da Silva a question about a unit, or ask to arrange a viewing at the boarding house in Legazpi City.',
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
  const page = category || PAGE_TITLES[String(to.name)] || ''
  document.title = page ? `${page} · Hivelet` : 'Hivelet'

  const categoryDescription = category
    ? `${category} at the Fe Galang Da Silva Boarding House in Legazpi City: their rates, which are vacant, and the floor plan of each.`
    : ''
  descriptionTag.content = categoryDescription || PAGE_DESCRIPTIONS[String(to.name)] || defaultDescription
  const privatePage = Boolean(to.meta.roles) || to.name === 'Login' || to.name === 'NotFound'
  robotsTag.content = privatePage ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  canonicalTag.href = SITE + (to.path === '/' ? '/public' : to.path)
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
