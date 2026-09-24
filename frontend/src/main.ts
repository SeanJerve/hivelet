import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './index.css'

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
  Inquire: 'Register interest',
  PrivacyPolicy: 'Privacy policy',
  Terms: 'Terms of use',
  Login: 'Sign in',
  TenantOverview: 'Unit overview',
  TenantPayments: 'Payment and billing',
  TenantTickets: 'Maintenance tickets',
  TenantProfile: 'My profile',
  AdminOverview: 'Executive overview',
  RoomDirectory: 'Room and rate directory',
  TenantManagement: 'Active tenants',
  IncomeCollections: 'Income and collections',
  ExpensesLedger: 'Monthly expenses',
  MaintenanceDispatch: 'Maintenance dispatch',
  Inquiries: 'Prospect inquiries',
  AdminAuditLogs: 'System audit trail',
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
