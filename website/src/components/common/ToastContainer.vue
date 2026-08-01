<!--
  @file components/common/ToastContainer.vue
  @description Corporate toast notification banner stack for Hivelet admin feedback.
  @systemBibleRef System Feedback & Auditability
-->
<script setup lang="ts">
import { toasts, removeToast } from '@/lib/systemState';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-vue-next';
</script>

<template>
  <div class="fixed top-4 right-4 z-[110] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out transform"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in transform"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto p-3.5 rounded-sm shadow-md border flex items-start gap-3 bg-white text-[#172b4d]"
        :class="{
          'border-[#22c55e] bg-emerald-50/90': t.type === 'success',
          'border-[#0c66e4] bg-blue-50/90': t.type === 'info',
          'border-[#f59e0b] bg-amber-50/90': t.type === 'warning',
          'border-[#ef4444] bg-red-50/90': t.type === 'error'
        }"
      >
        <!-- Icon -->
        <CheckCircle2 v-if="t.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <Info v-else-if="t.type === 'info'" class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <AlertTriangle v-else-if="t.type === 'warning'" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <AlertCircle v-else class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

        <div class="flex-1 min-w-0">
          <h4 class="text-xs font-bold text-[#172b4d] leading-tight">{{ t.title }}</h4>
          <p class="text-[11px] text-[#5e6c84] mt-0.5 leading-snug">{{ t.message }}</p>
        </div>

        <button @click="removeToast(t.id)" class="text-[#5e6c84] hover:text-[#172b4d] p-0.5 rounded cursor-pointer">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
