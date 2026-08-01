<!--
  @file components/common/LoadingScreen.vue
  @description Animated splash screen loading gate with live progress counter.
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { isLoadingScreenVisible } from '@/lib/systemState';

const progress = ref(0);

onMounted(() => {
  const interval = setInterval(() => {
    if (progress.value < 100) {
      progress.value += 5;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        isLoadingScreenVisible.value = false;
      }, 300);
    }
  }, 40);
});
</script>

<template>
  <div
    v-if="isLoadingScreenVisible"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#091e42] text-white transition-opacity duration-500"
  >
    <div class="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
      <!-- Animated Hexagon Logo -->
      <div class="relative flex items-center justify-center w-20 h-20 bg-[#0c66e4] rounded-2xl shadow-2xl shadow-blue-500/50 animate-pulse">
        <span class="text-4xl font-extrabold text-white font-mono tracking-tighter">H</span>
      </div>

      <div class="text-center space-y-1">
        <h1 class="text-2xl font-extrabold tracking-wider font-display">HIVELET</h1>
        <p class="text-xs text-slate-400 font-medium">Fe Galang Da Silva Boarding House System</p>
      </div>

      <!-- Micro Progress Bar -->
      <div class="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div class="bg-[#0c66e4] h-full transition-all duration-75" :style="{ width: `${progress}%` }"></div>
      </div>

      <p class="text-xs font-mono text-slate-400">{{ progress }}% Loaded</p>
    </div>
  </div>
</template>
