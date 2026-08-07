<script setup lang="ts">
/**
 * @component App
 * @description Main application shell for Hivelet Web-Based Apartment Management System with Vue Router integration.
 * @systemBibleRef Section 1 - Product Identity & Section 4 - User Roles & Authorization
 * @rationale Serves as the central view layout manager wiring up the corporate Jira-style AppHeader,
 *              AppSidebar, responsive mobile drawer state, ToastContainer feedback engine, and RouterView container.
 * @innovations Integrated Vue Router view outlet and universal toast notification engine for landlady feedback.
 */
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './components/layout/AppHeader.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import TenantNavbar from './components/layout/TenantNavbar.vue';
import ToastContainer from './components/ui/ToastContainer.vue';
import { useAuthStore } from './stores/auth';

const isMobileSidebarOpen = ref(false);
const route = useRoute();
const authStore = useAuthStore();

// Three shells: public pages own their own PublicNavbar; the admin keeps the
// existing Jira/Notion/Airtable operational dashboard (AppHeader + AppSidebar);
// the tenant gets its own luxury-consumer app shell (TenantNavbar) -- same design
// language as the public site, but structured as a logged-in product, not a
// marketing page (project decision, 2026-08-07).
const shell = computed<'public' | 'admin' | 'tenant'>(() => {
  if (route.meta.public) return 'public';
  return authStore.isAdmin ? 'admin' : 'tenant';
});
</script>

<template>
  <!-- Admin: unchanged Jira/Notion/Airtable operational dashboard -->
  <div v-if="shell === 'admin'" class="min-h-screen bg-[#f4f5f7] text-[#172b4d] flex flex-col font-sans relative">
    <ToastContainer />

    <AppHeader
      :is-mobile-sidebar-open="isMobileSidebarOpen"
      @toggle-mobile-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
    />

    <div class="flex-1 flex overflow-hidden">
      <AppSidebar
        :is-mobile-sidebar-open="isMobileSidebarOpen"
        @close-mobile-sidebar="isMobileSidebarOpen = false"
      />

      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>

  <!-- Tenant: luxury consumer app shell -->
  <div v-else-if="shell === 'tenant'" class="lux-canvas min-h-screen flex flex-col">
    <ToastContainer />
    <TenantNavbar />
    <main class="flex-1">
      <div class="max-w-5xl mx-auto px-5 md:px-8 py-8">
        <router-view />
      </div>
    </main>
  </div>

  <!-- Public pages own their full layout (PublicNavbar + content) -->
  <template v-else>
    <ToastContainer />
    <router-view />
  </template>
</template>

