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
  IncomeCollections: 'Money coming in',
  ExpensesLedger: 'Money going out',
  MaintenanceDispatch: 'Repairs',
  Inquiries: 'Inquiries',
  AdminAuditLogs: 'Activity',
}

router.afterEach((to) => {
  const slug = typeof to.params.categorySlug === 'string' ? to.params.categorySlug : ''
  // "one-bedroom" -> "One-bedroom units", the category's own spelling on the page.
  const category = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) + ' units' : ''
  const page = category || PAGE_TITLES[String(to.name)] || ''
  document.title = page ? `${page} · Hivelet` : 'Hivelet'
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
