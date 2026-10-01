import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setAuthFailureHandler } from './lib/api'
import { handleAuthFailure, MOVED_OUT_FLAG } from './lib/authStore'
import { installStaleVersionRecovery } from './lib/staleVersion'
import './index.css'

// An open page that outlived a deploy loads the new version on its next
// navigation instead of going dead (lib/staleVersion.ts).
installStaleVersionRecovery(router)

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
 */

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
  document.title = 'Hivelet'

  const categoryDescription = category
    ? `${category} at the Fe Galang Da Silva Boarding House in Legazpi City: their rates, which are vacant, and the floor plan of each.`
    : ''
  descriptionTag.content = categoryDescription || PAGE_DESCRIPTIONS[String(to.name)] || defaultDescription
  const privatePage = Boolean(to.meta.roles) || to.name === 'Login' || to.name === 'NotFound'
  robotsTag.content = privatePage ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  canonicalTag.href = SITE + (to.path === '/' ? '/public' : to.path)
})

/*
 * The first-load loader in index.html (Sean, 2026-10-01) leaves once the first
 * page has actually rendered: `router.isReady()` waits for the first route's
 * own code and guards, and the frame after that is the page painted. Taking it
 * down at `app.mount` alone would uncover the empty placeholder App.vue holds
 * open while the route's chunk downloads - the same blank wait it is covering.
 *
 * It goes whichever way the first navigation ends: a rejected one (a route
 * chunk that failed to download) or a script error during start-up still
 * uncovers the page rather than leaving the loader over it. If this file never
 * runs at all, index.html's own `splash-giveup` animation clears it at 15s.
 */
function dismissSplash() {
  const splash = document.getElementById('app-splash')
  if (!splash || splash.classList.contains('is-leaving')) return
  splash.classList.add('is-leaving')
  const remove = () => splash.remove()
  splash.addEventListener('transitionend', remove, { once: true })
  // `transitionend` never fires when there is nothing to animate (a background
  // tab, the 15s fallback already run), so the node goes on a timer as well.
  window.setTimeout(remove, 400)
}
window.addEventListener('error', dismissSplash, { once: true })

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
router
  .isReady()
  .catch(() => {})
  .finally(() => requestAnimationFrame(dismissSplash))
