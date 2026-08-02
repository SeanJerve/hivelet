<script setup lang="ts">
/**
 * @component LandingView
 * @description Public entry page. Property summary pulled directly from docs/01_SYSTEM_BIBLE.md
 *              Sections 1 and 5 -- no invented marketing copy or features beyond what's documented.
 */
import { useRouter } from 'vue-router';
import { Building2, MapPin, Car, Zap, Droplet, ArrowRight } from 'lucide-vue-next';
import PublicNavbar from '../components/layout/PublicNavbar.vue';

const router = useRouter();
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7]">
    <PublicNavbar />

    <main class="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <!-- Hero -->
      <div class="jira-card p-6 md:p-10 space-y-3 border-l-4 border-l-[#0c66e4]">
        <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Fe Galang Da Silva Boarding House</span>
        <h1 class="text-2xl md:text-3xl font-bold text-[#172b4d]">Hivelet Apartment Management</h1>
        <p class="text-sm text-[#5e6c84] max-w-2xl leading-relaxed">
          Centralized operational, financial, tenant, inquiry, maintenance, and communication
          workflows for the boarding house, in one place.
        </p>
        <div class="flex flex-wrap gap-2.5 pt-2">
          <button @click="router.push('/rooms')" class="jira-btn-primary text-xs">
            <Building2 class="w-3.5 h-3.5" />
            <span>View Available Rooms</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
          <button @click="router.push('/login')" class="jira-btn-secondary text-xs">
            Tenant / Admin Login
          </button>
        </div>
      </div>

      <!-- Property facts -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div class="jira-card p-4">
          <MapPin class="w-4 h-4 text-[#0c66e4] mb-2" />
          <div class="text-lg font-bold text-[#172b4d]">3 Floors</div>
          <p class="text-xs text-[#6b778c]">33 total rentable units across 5 clusters</p>
        </div>
        <div class="jira-card p-4">
          <Car class="w-4 h-4 text-[#0c66e4] mb-2" />
          <div class="text-lg font-bold text-[#172b4d]">Parking</div>
          <p class="text-xs text-[#6b778c]">Onsite parking &amp; shared common areas</p>
        </div>
        <div class="jira-card p-4">
          <Zap class="w-4 h-4 text-[#0c66e4] mb-2" />
          <div class="text-lg font-bold text-[#172b4d]">Separate Metering</div>
          <p class="text-xs text-[#6b778c]">Electricity billed via the private electric company</p>
        </div>
        <div class="jira-card p-4">
          <Droplet class="w-4 h-4 text-[#0c66e4] mb-2" />
          <div class="text-lg font-bold text-[#172b4d]">₱200 / head</div>
          <p class="text-xs text-[#6b778c]">Water charged per registered occupant</p>
        </div>
      </div>

      <!-- How it works -->
      <div class="jira-card p-6 space-y-3">
        <h2 class="text-base font-bold text-[#172b4d]">How Inquiries Work</h2>
        <ol class="text-xs text-[#42526e] space-y-1.5 list-decimal list-inside">
          <li>Browse available room units and their published status.</li>
          <li>Submit an inquiry for a specific room with your contact details.</li>
          <li>The administrator reviews your inquiry and reaches out directly.</li>
          <li>If it moves forward, your inquiry becomes the basis of onboarding -- no retyping.</li>
        </ol>
      </div>
    </main>
  </div>
</template>
