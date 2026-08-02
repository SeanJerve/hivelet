<script setup lang="ts">
/**
 * @component NotificationBell
 * @description Minimal in-system notification dropdown (FR-027). Reads/marks-read against the
 *              `notifications` table for the signed-in profile; rows are inserted inline by the
 *              relevant action handlers elsewhere (e.g. verifying a payment, closing a ticket).
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
    <button @click="toggleOpen" class="relative p-1.5 text-[#42526e] hover:bg-[#ebecf0] rounded-sm transition-colors" title="Notifications">
      <Bell class="w-4.5 h-4.5" />
      <span v-if="unreadCount > 0" class="absolute -top-0.5 -right-0.5 bg-[#bf2600] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false"></div>

    <div v-if="isOpen" class="absolute right-0 mt-2 w-80 jira-card bg-white shadow-lg z-50 max-h-96 overflow-y-auto">
      <div class="flex items-center justify-between p-3 border-b border-[#dfe1e6]">
        <span class="text-xs font-bold text-[#172b4d]">Notifications</span>
        <button @click="isOpen = false" class="text-[#6b778c]"><X class="w-3.5 h-3.5" /></button>
      </div>
      <div v-if="notifications.length === 0" class="p-4 text-xs text-[#6b778c] text-center">
        No notifications yet.
      </div>
      <button
        v-for="n in notifications"
        :key="n.id"
        @click="markRead(n.id)"
        :class="['w-full text-left p-3 border-b border-[#dfe1e6] hover:bg-[#f7f8f9] transition-colors', !n.is_read ? 'bg-[#deebff]' : '']"
      >
        <p class="text-xs font-semibold text-[#172b4d]">{{ n.title }}</p>
        <p class="text-[11px] text-[#5e6c84] mt-0.5">{{ n.message }}</p>
        <p class="text-[10px] text-[#8993a4] mt-1">{{ new Date(n.created_at).toLocaleString() }}</p>
      </button>
    </div>
  </div>
</template>
