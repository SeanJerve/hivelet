<script setup lang="ts">
/**
 * @component ToastContainer
 * @description Floating top-right notification container rendering active toast alerts.
 * @systemBibleRef Section 22 - Core Design Principle (State Transitions & Action Feedback)
 * @rationale Ensures all administrative and user operations (payment recording, ticket dispatch,
 *              inquiry conversion, data correction) provide clear, non-techy feedback.
 * @innovations Multi-variant styling (Success, Warning, Error, Info) using Lucide icons without emojis.
 */
import { useToast } from '../../lib/useToast';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X 
} from 'lucide-vue-next';

const { toasts, dismissToast } = useToast();
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        :class="[
          'pointer-events-auto p-3.5 rounded-sm border shadow-md flex items-start gap-3 transition-all duration-200',
          toast.type === 'success' ? 'bg-[#e3fcef] border-[#abf5d1] text-[#006644]' : '',
          toast.type === 'warning' ? 'bg-[#fffae6] border-[#ffe380] text-[#826100]' : '',
          toast.type === 'error' ? 'bg-[#ffebe6] border-[#ffbdad] text-[#bf2600]' : '',
          toast.type === 'info' ? 'bg-[#deebff] border-[#b3d4ff] text-[#0747a6]' : ''
        ]"
      >
        <!-- Icon -->
        <div class="shrink-0 mt-0.5">
          <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-[#006644]" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-[#826100]" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-[#bf2600]" />
          <Info v-else class="w-5 h-5 text-[#0747a6]" />
        </div>

        <!-- Content -->
        <div class="flex-1">
          <h4 class="font-semibold text-xs leading-tight mb-0.5">{{ toast.title }}</h4>
          <p class="text-xs opacity-90 leading-relaxed">{{ toast.message }}</p>
        </div>

        <!-- Dismiss Button -->
        <button 
          @click="dismissToast(toast.id)"
          class="shrink-0 text-current opacity-60 hover:opacity-100 p-0.5 rounded-xs transition-opacity"
          aria-label="Dismiss Toast"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
