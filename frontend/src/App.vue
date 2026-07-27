<template>
  <div class="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider">
          H
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            HIVELET
            <span class="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Fe Galang Da Silva Boarding House
            </span>
          </h1>
          <p class="text-xs text-slate-400">Apartment Management & Financial Operations Platform</p>
        </div>
      </div>

      <!-- System Health Indicator -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          <span class="relative flex h-2.5 w-2.5">
            <span :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isApiOnline ? 'bg-emerald-400' : 'bg-rose-400']"></span>
            <span :class="['relative inline-flex rounded-full h-2.5 w-2.5', isApiOnline ? 'bg-emerald-500' : 'bg-rose-500']"></span>
          </span>
          <span class="font-medium text-slate-300">
            Backend API: <strong :class="isApiOnline ? 'text-emerald-400' : 'text-rose-400'">{{ isApiOnline ? 'Online' : 'Checking...' }}</strong>
          </span>
        </div>

        <button class="amber-button px-4 py-2 rounded-lg text-xs font-semibold shadow-md flex items-center gap-2">
          <span>Admin Portal</span>
        </button>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
      <!-- Decision Support Banner -->
      <section class="glass-panel-amber p-6 rounded-2xl relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div class="space-y-1">
            <span class="text-xs font-bold uppercase tracking-widest text-amber-400">Decision Support Center</span>
            <h2 class="text-2xl font-bold text-white tracking-tight">What needs your attention today?</h2>
            <p class="text-sm text-slate-300 max-w-2xl">
              Hivelet centralizes room operations, overdue payment tracking, maintenance tickets, and GCash verification into an actionable daily dashboard for the landlady.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button @click="checkHealth" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all">
              Refresh Diagnostics
            </button>
          </div>
        </div>
      </section>

      <!-- Operational Overview Cards -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <!-- Room Occupancy Card -->
        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Rooms</p>
              <h3 class="text-3xl font-extrabold text-white mt-1">32</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
              3F
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Occupancy Model</span>
            <span class="text-amber-400 font-semibold">Room-Centric</span>
          </div>
        </div>

        <!-- Overdue Payments Alert Card -->
        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between border-rose-500/20">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-rose-400">Pending / Overdue</p>
              <h3 class="text-3xl font-extrabold text-white mt-1">0</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-sm">
              ₱
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Individual Move-in Dates</span>
            <span class="text-slate-300">Grace Period Aware</span>
          </div>
        </div>

        <!-- Maintenance Tickets Card -->
        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Tickets</p>
              <h3 class="text-3xl font-extrabold text-white mt-1">0</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
              🛠️
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Priority Queue</span>
            <span class="text-emerald-400 font-semibold font-mono">Emergency / High</span>
          </div>
        </div>

        <!-- System Architecture Blueprint -->
        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Stack Status</p>
              <h3 class="text-lg font-bold text-white mt-1">Phase 1 Foundation</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
              Vite
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Vue 3 + Node Express</span>
            <span class="text-blue-400 font-semibold">MySQL Configured</span>
          </div>
        </div>
      </section>

      <!-- System Diagnostic Details -->
      <section class="glass-panel p-6 rounded-2xl space-y-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span>Backend Connection & System Status</span>
        </h3>
        
        <div class="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
          <div v-if="apiResponse">
            <pre class="text-emerald-400">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
          </div>
          <div v-else class="text-slate-500 italic">
            Connecting to backend API (http://localhost:5000/api/health)...
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="glass-panel border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
      Hivelet Capstone Operations System &copy; 2026 — Fe Galang Da Silva Boarding House
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isApiOnline = ref<boolean>(false);
const apiResponse = ref<any>(null);

async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      apiResponse.value = data;
      isApiOnline.value = true;
    } else {
      isApiOnline.value = false;
    }
  } catch (err) {
    isApiOnline.value = false;
    apiResponse.value = {
      status: 'offline',
      message: 'Could not connect to Express backend server at http://localhost:5000',
    };
  }
}

onMounted(() => {
  checkHealth();
});
</script>
