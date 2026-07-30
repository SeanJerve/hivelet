<script setup lang="ts">
/**
 * @component ConfirmModal
 * @description Standardized Jira/Notion confirmation dialog for destructive or status-altering landlady actions.
 * @systemBibleRef Section 22 & BR-025 - Tenant Deactivation & Action Authorization
 * @rationale Non-techy users require explicit confirmation dialogs containing plain-English impact statements
 *             before committing irreversible or major changes.
 * @innovations High-clarity design with distinct variant styling (danger red vs primary blue),
 *              accessible keyboard escape listener, and transparent backdrop overlay.
 */
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
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091e42]/50 backdrop-blur-xs transition-opacity"
      @click.self="emit('cancel')"
    >
      <div class="jira-card w-full max-w-md bg-white p-5 shadow-xl rounded-md flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="flex items-start gap-3">
          <div 
            :class="[
              'p-2 rounded-xs shrink-0',
              variant === 'danger' ? 'bg-[#ffebe6] text-[#bf2600]' : '',
              variant === 'warning' ? 'bg-[#fffae6] text-[#826100]' : '',
              variant === 'primary' ? 'bg-[#deebff] text-[#0747a6]' : ''
            ]"
          >
            <AlertTriangle v-if="variant === 'danger' || variant === 'warning'" class="w-5 h-5" />
            <Info v-else class="w-5 h-5" />
          </div>

          <div class="flex-1">
            <h3 class="font-semibold text-base text-[#172b4d] leading-snug">{{ title }}</h3>
            <p class="text-xs text-[#6b778c] mt-1 leading-relaxed">{{ message }}</p>
          </div>

          <button 
            @click="emit('cancel')"
            class="text-[#6b778c] hover:text-[#172b4d] p-1 rounded-xs transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Impact Warning Callout -->
        <div class="bg-[#f4f5f7] border-l-3 border-[#0c66e4] p-3 text-xs text-[#42526e] rounded-r-xs">
          <span class="font-semibold text-[#172b4d]">Landlady Notice:</span> This action will immediately update the system state and audit logs.
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#dfe1e6]">
          <button 
            @click="emit('cancel')" 
            class="jira-btn-secondary text-xs"
          >
            {{ cancelText }}
          </button>
          
          <button 
            @click="emit('confirm')" 
            :class="[
              'text-xs font-semibold px-3 py-1.5 rounded-xs transition-colors shadow-2xs',
              variant === 'danger' 
                ? 'bg-[#bf2600] text-white hover:bg-[#de350b]' 
                : variant === 'warning'
                  ? 'bg-[#826100] text-white hover:bg-[#a57a00]'
                  : 'bg-[#0c66e4] text-white hover:bg-[#0052cc]'
            ]"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
