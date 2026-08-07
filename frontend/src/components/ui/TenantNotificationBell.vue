<script setup lang="ts">
/**
 * @component TenantNotificationBell
 * @description Luxury-styled notification dropdown for the Tenant Portal (FR-027). Same data model
 *              and query as components/ui/NotificationBell.vue (the admin dashboard's bell), kept as
 *              a separate component so the admin's Jira-styled bell stays visually untouched while
 *              the tenant shell gets the lux design language.
 */
import { ref, onMounted, computed } from 'vue';
import { Bell, X } from 'lucide-vue-next';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth';

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

const authStore = useAuthStore();
const notifications = ref<NotificationRow[]>([]);
const isOpen = ref(false);

const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length);

const loadNotifications = async () => {
  if (!authStore.profile) return;
  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, priority, is_read, created_at')
    .eq('recipient_profile_id', authStore.profile.id)
    .order('created_at', { ascending: false })
    .limit(20);
  notifications.value = data ?? [];
};

const markRead = async (id: string) => {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  const target = notifications.value.find((n) => n.id === id);
  if (target) target.is_read = true;
};

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) loadNotifications();
};

onMounted(loadNotifications);
</script>

<template>
  <div class="relative">
    <button @click="toggleOpen" class="relative p-2 text-[var(--lux-text)] hover:bg-[var(--lux-canvas)] rounded-full transition-colors" title="Notifications">
      <Bell class="w-4.5 h-4.5" />
      <span v-if="unreadCount > 0" class="absolute top-0.5 right-0.5 bg-[var(--lux-accent)] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false"></div>

    <div v-if="isOpen" class="absolute right-0 mt-2 w-80 lux-card bg-[var(--lux-surface)] shadow-lg z-50 max-h-96 overflow-y-auto">
      <div class="flex items-center justify-between p-3 border-b border-[var(--lux-border)]">
        <span class="lux-eyebrow">Notifications</span>
        <button @click="isOpen = false" class="text-[var(--lux-text-muted)]"><X class="w-3.5 h-3.5" /></button>
      </div>
      <div v-if="notifications.length === 0" class="p-5 text-xs text-[var(--lux-text-muted)] text-center">
        No notifications yet.
      </div>
      <button
        v-for="n in notifications"
        :key="n.id"
        @click="markRead(n.id)"
        :class="['w-full text-left p-3 border-b border-[var(--lux-border)] hover:bg-[var(--lux-canvas)] transition-colors', !n.is_read ? 'bg-[#f5ede0]/50' : '']"
      >
        <p class="text-xs font-semibold text-[var(--lux-text)]">{{ n.title }}</p>
        <p class="text-[11px] text-[var(--lux-text-muted)] mt-0.5">{{ n.message }}</p>
        <p class="text-[10px] text-[var(--lux-text-muted)] mt-1">{{ new Date(n.created_at).toLocaleString() }}</p>
      </button>
    </div>
  </div>
</template>
