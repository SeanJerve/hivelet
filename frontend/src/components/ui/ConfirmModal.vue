<script setup lang="ts">
import { AlertTriangle, Info, X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}>(), {
  confirmText: 'Confirm Action',
  cancelText: 'Cancel',
  variant: 'primary'
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-xs transition-opacity"
      @click.self="emit('cancel')"
    >
      <div class="surface-card w-full max-w-md p-6 shadow-2xl rounded-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-start gap-3">
          <div 
            :class="[
              'p-2.5 rounded-xl shrink-0',
              variant === 'danger' ? 'bg-[#fef2f2] text-[#991b1b]' : '',
              variant === 'warning' ? 'bg-[#fffbeb] text-[#92400e]' : '',
              variant === 'primary' ? 'bg-[#f0f9ff] text-[#075985]' : ''
            ]"
          >
            <AlertTriangle v-if="variant === 'danger' || variant === 'warning'" class="w-5 h-5" />
            <Info v-else class="w-5 h-5" />
          </div>

          <div class="flex-1">
            <h3 class="font-display font-extrabold text-base text-foreground leading-snug">{{ title }}</h3>
            <p class="text-xs text-muted-foreground mt-1 leading-relaxed">{{ message }}</p>
          </div>

          <button 
            @click="emit('cancel')" 
            class="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted border border-border transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="bg-background border border-border p-3 text-xs text-foreground-soft rounded-xl">
          <span class="font-bold text-foreground">Notice:</span> This action will update the system state and audit logs immediately.
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button 
            @click="emit('cancel')" 
            class="btn-secondary"
          >
            {{ cancelText }}
          </button>
          
          <button 
            @click="emit('confirm')" 
            :class="[
              variant === 'danger' 
                ? 'btn-danger-solid' 
                : variant === 'warning'
                  ? 'btn-primary bg-amber-600 hover:bg-amber-700'
                  : 'btn-primary'
            ]"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
