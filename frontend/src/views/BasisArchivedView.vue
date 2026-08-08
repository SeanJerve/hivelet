<!--
  @file BasisArchivedView.vue
  @description Dedicated Wireframe Reference Archive Landing Page on Port 5173.
  @systemBibleRef Section 1 — Architectural Governance & Wireframe Basis Scope
  @rationale Isolates the initial wireframe prototype into a reference archive (basis) to avoid confusion with the active production system running on Port 5174.
  @innovations Structured archive portal providing on-demand access to legacy wireframe routes upon explicit developer/agent request.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function navigateToBasis(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-12 px-4 space-y-8">
    <!-- Header Banner -->
    <div class="bg-white border border-[#dfe1e6] rounded-md p-8 shadow-xs text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-[#ebecf0] border border-[#dfe1e6] text-[#42526e] rounded-full text-xs font-semibold uppercase tracking-wider">
        Reference Basis Archive
      </div>
      
      <h1 class="text-3xl font-bold font-display text-[#172b4d]">
        Hivelet Wireframe Reference Basis
      </h1>
      
      <p class="text-sm text-[#5e6c84] max-w-2xl mx-auto leading-relaxed">
        Port <span class="font-mono bg-[#f4f5f7] px-1.5 py-0.5 rounded border border-[#dfe1e6] text-[#172b4d] font-bold">5173</span> serves strictly as the isolated wireframe prototype reference basis. The active production application is hosted on Port <span class="font-mono bg-[#0c66e4] text-white px-1.5 py-0.5 rounded font-bold">5174</span>.
      </p>

      <div class="pt-4 flex flex-wrap justify-center gap-3">
        <a 
          href="http://localhost:5174" 
          target="_blank" 
          class="jira-btn-primary text-sm px-5 py-2.5 shadow-xs"
        >
          Open Production Website (Port 5174)
        </a>
      </div>
    </div>

    <!-- Wireframe Route Directory -->
    <div class="bg-white border border-[#dfe1e6] rounded-md p-6 space-y-4">
      <h2 class="text-lg font-bold text-[#172b4d] font-display flex items-center justify-between">
        <span>Basis Wireframe Views Directory</span>
        <span class="text-xs text-[#6b778c] font-normal font-sans">Accessible for reference</span>
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <!-- Admin Basis -->
        <div class="p-4 border border-[#dfe1e6] rounded bg-[#f4f5f7] flex flex-col justify-between space-y-3">
          <div>
            <h3 class="font-bold text-[#172b4d] text-sm">Landlady Admin Overview</h3>
            <p class="text-xs text-[#5e6c84] mt-1">Original wireframe for admin metrics, tenant lists, and financial logs.</p>
          </div>
          <button 
            @click="navigateToBasis('/basis/admin/overview')" 
            class="jira-btn-secondary text-xs w-full justify-center"
          >
            Launch Admin Wireframe
          </button>
        </div>

        <!-- Tenant Portal Basis -->
        <div class="p-4 border border-[#dfe1e6] rounded bg-[#f4f5f7] flex flex-col justify-between space-y-3">
          <div>
            <h3 class="font-bold text-[#172b4d] text-sm">Tenant Portal View</h3>
            <p class="text-xs text-[#5e6c84] mt-1">Wireframe for tenant maintenance requests and billing submissions.</p>
          </div>
          <button 
            @click="navigateToBasis('/basis/tenant')" 
            class="jira-btn-secondary text-xs w-full justify-center"
          >
            Launch Tenant Wireframe
          </button>
        </div>

        <!-- Public Guest Basis -->
        <div class="p-4 border border-[#dfe1e6] rounded bg-[#f4f5f7] flex flex-col justify-between space-y-3">
          <div>
            <h3 class="font-bold text-[#172b4d] text-sm">Public Guest Landing</h3>
            <p class="text-xs text-[#5e6c84] mt-1">Wireframe for public room browsing and inquiry submissions.</p>
          </div>
          <button 
            @click="navigateToBasis('/basis/public')" 
            class="jira-btn-secondary text-xs w-full justify-center"
          >
            Launch Public Wireframe
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
