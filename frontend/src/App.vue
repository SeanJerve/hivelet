<script setup lang="ts">
/**
 * @component App
 * @description Main application shell for Hivelet Web-Based Apartment Management System with Vue Router integration.
 * @systemBibleRef Section 1 - Product Identity & Section 4 - User Roles & Authorization
 * @rationale Serves as the central view layout manager wiring up the corporate Jira-style AppHeader,
 *              AppSidebar, responsive mobile drawer state, ToastContainer feedback engine, and RouterView container.
 * @innovations Integrated Vue Router view outlet and universal toast notification engine for landlady feedback.
 */
import { ref } from 'vue';
import AppHeader from './components/layout/AppHeader.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import ToastContainer from './components/ui/ToastContainer.vue';

const isMobileSidebarOpen = ref(false);
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] text-[#172b4d] flex flex-col font-sans relative">
    <!-- Universal Toast Feedback Container -->
    <ToastContainer />

    <!-- Corporate App Top Header Bar -->
    <AppHeader 
      :is-mobile-sidebar-open="isMobileSidebarOpen"
      @toggle-mobile-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
    />

    <!-- Main Workspace Layout (Sidebar + RouterView Content Area) -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Jira-Style Left Sidebar -->
      <AppSidebar 
        :is-mobile-sidebar-open="isMobileSidebarOpen"
        @close-mobile-sidebar="isMobileSidebarOpen = false"
      />

      <!-- Main Workspace Scrollable Router View Canvas -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

