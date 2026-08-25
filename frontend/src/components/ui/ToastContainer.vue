<script setup lang="ts">
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
          'pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start gap-3 transition-all duration-200 backdrop-blur-xs',
          toast.type === 'success' ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]' : '',
          toast.type === 'warning' ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' : '',
          toast.type === 'error' ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]' : '',
          toast.type === 'info' ? 'bg-[#f0f9ff] border-[#b9e6fe] text-[#075985]' : ''
        ]"
      >
        <div class="shrink-0 mt-0.5">
          <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-600" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-rose-600" />
          <Info v-else class="w-5 h-5 text-sky-600" />
        </div>

        <div class="flex-1">
          <h4 class="font-display font-bold text-xs leading-tight mb-0.5">{{ toast.title }}</h4>
          <p class="text-xs opacity-90 leading-relaxed">{{ toast.message }}</p>
        </div>

        <button 
          @click="dismissToast(toast.id)"
          class="shrink-0 text-current opacity-50 hover:opacity-100 p-0.5 rounded-lg transition-opacity"
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
