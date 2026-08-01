import { createRouter, createWebHistory } from 'vue-router';
import PublicLandingView from '@/views/PublicLandingView.vue';
import AdminDashboardView from '@/views/AdminDashboardView.vue';

const routes = [
  { path: '/', name: 'PublicLanding', component: PublicLandingView },
  { path: '/admin', name: 'AdminDashboard', component: AdminDashboardView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
