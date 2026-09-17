<!--
  @file components/layout/NotificationPopover.vue
  @description Atlassian/Jira inspired Notification Popover Drawer with live filtering and deep-link actions.
  @systemBibleRef Section 16 (Communication Centralization), Section 22 (Core Design Principles)
  @requirements   FR-026, FR-027
-->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  notifications, 
  unreadCount, 
  isLoading, 
  isPopoverOpen, 
  activeFilter, 
  filteredNotifications,
  markAsRead, 
  markAllAsRead, 
  fetchNotifications,
  type NotificationItem,
  type NotificationFilter
} from '@/lib/notificationsStore';
import { isAdmin } from '@/lib/authStore';
import { 
  Bell, 
  CheckCheck, 
  X, 
  CreditCard, 
  Wrench, 
  Mail, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink,
  MessageSquare,
  Clock,
  Loader2
} from 'lucide-vue-next';

const router = useRouter();

function getIconForType(type: string) {
  switch (type) {
    case 'Payment':
    case 'Billing':
      return CreditCard;
    case 'Maintenance':
      return Wrench;
    case 'Inquiry':
      return Mail;
    case 'Chat':
      return MessageSquare;
    default:
      return AlertTriangle;
  }
}

function getIconColorForType(type: string, priority: string) {
  if (priority === 'Emergency') return 'text-overdue bg-overdue-soft border-overdue-soft';
  if (priority === 'High') return 'text-verify bg-verify-soft border-verify-soft';
  
  switch (type) {
    case 'Payment':
    case 'Billing':
      return 'text-brand bg-brand-soft border-brand-soft';
    case 'Maintenance':
      return 'text-brand bg-brand-soft border-brand-soft';
    case 'Inquiry':
      return 'text-teal-600 bg-teal-50 border-teal-200';
    default:
      return 'text-ink-soft bg-canvas border-line';
  }
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

async function handleNotificationClick(item: NotificationItem) {
  await markAsRead(item.id);
  isPopoverOpen.value = false;

  // Contextual deep-linking
  if (isAdmin.value) {
    if (item.type === 'Payment' || item.type === 'Billing') {
      router.push('/admin/income?tab=verify');
    } else if (item.type === 'Maintenance') {
      router.push('/admin/tickets');
    } else if (item.type === 'Inquiry') {
      router.push('/admin/inquiries');
    }
  } else {
    // Tenant navigation
    if (item.type === 'Payment' || item.type === 'Billing') {
      router.push('/tenant/payments');
    } else if (item.type === 'Maintenance') {
      router.push('/tenant/tickets');
    } else {
      router.push('/tenant');
    }
  }
}

// Close on escape key
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isPopoverOpen.value) {
    isPopoverOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div v-if="isPopoverOpen" class="relative">
    <!-- Backdrop overlay for mobile -->
    <div 
      class="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs sm:hidden"
      @click="isPopoverOpen = false"
    />

    <!-- Popover Card -->
    <div 
      class="fixed sm:absolute right-2 sm:right-0 top-16 z-50 w-[calc(100vw-1rem)] sm:w-[420px] max-h-[calc(100vh-5rem)] bg-tile rounded-tile border border-line shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="px-4 py-3.5 border-b border-line bg-canvas flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-sm text-ink">Notifications</h3>
          <span 
            v-if="unreadCount > 0"
            class="px-2 py-0.5 text-xs font-semibold bg-brand text-white rounded-full"
          >
            {{ unreadCount }} new
          </span>
          <span v-else class="text-xs text-ink-soft font-medium">
            All caught up
          </span>
        </div>

        <div class="flex items-center gap-1">
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="p-1.5 text-xs text-brand hover:bg-brand-soft rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Mark all as read"
          >
            <CheckCheck class="size-3.5" />
            <span class="text-xs">Mark all read</span>
          </button>
          
          <button
            @click="isPopoverOpen = false"
            class="grid size-7 place-items-center rounded-full text-ink-soft hover:bg-canvas border border-line transition-colors cursor-pointer"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center gap-1 px-3 py-2 border-b border-line bg-tile overflow-x-auto">
        <button
          v-for="tab in ([
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'payments', label: 'Billing' },
            { key: 'maintenance', label: 'Maintenance' },
            { key: 'inquiries', label: 'Inquiries' }
          ] as const)"
          :key="tab.key"
          @click="activeFilter = tab.key"
          :class="[ 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer', activeFilter === tab.key ? 'bg-brand text-white font-semibold' : 'text-ink-soft hover:bg-canvas hover:text-ink' ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Notifications List Stream -->
      <div class="flex-1 overflow-y-auto divide-y divide-line/60 max-h-[440px]">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 text-center text-xs text-ink-soft flex flex-col items-center gap-2">
          <Loader2 class="size-5 text-brand animate-spin" />
          <span>Refreshing notifications...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredNotifications.length === 0" class="py-12 px-4 text-center">
          <ShieldCheck class="size-10 text-brand mx-auto mb-2 opacity-80" />
          <p class="text-xs font-semibold text-ink">No notifications found</p>
          <p class="text-xs text-ink-soft mt-1">
            {{ activeFilter === 'unread' ? 'You have read all your notifications.' : 'No alerts in this category.' }}
          </p>
        </div>

        <!-- Items Stream -->
        <div
          v-for="item in filteredNotifications"
          :key="item.id"
          @click="handleNotificationClick(item)"
          :class="[ 'p-3.5 flex items-start gap-3 hover:bg-canvas transition-colors cursor-pointer group relative', !item.is_read ? 'bg-brand-soft/40' : 'bg-tile' ]"
        >
          <!-- Unread Dot Indicator -->
          <span 
            v-if="!item.is_read"
            class="absolute left-1.5 top-5 size-1.5 rounded-full bg-brand"
          />

          <!-- Category Icon -->
          <div 
            :class="[ 'size-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5', getIconColorForType(item.type, item.priority) ]"
          >
            <component :is="getIconForType(item.type)" class="size-4" />
          </div>

          <!-- Content Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <span class="text-xs font-semibold text-ink truncate group-hover:text-brand transition-colors">
                {{ item.title }}
              </span>
              <span class="text-xs text-ink-soft shrink-0 whitespace-nowrap">
                {{ formatRelativeTime(item.created_at) }}
              </span>
            </div>

            <p class="text-xs text-ink-soft line-clamp-2 leading-relaxed">
              {{ item.message }}
            </p>

            <!-- Metadata Badges -->
            <div class="flex items-center gap-2 mt-1.5">
              <span 
                v-if="item.priority === 'Emergency'"
                class="px-1.5 py-0.2 text-[9px] font-semibold bg-overdue-soft text-overdue rounded"
              >
                EMERGENCY
              </span>
              <span 
                v-else-if="item.priority === 'High'"
                class="px-1.5 py-0.2 text-[9px] font-semibold bg-verify-soft text-verify rounded"
              >
                HIGH
              </span>
              <span class="text-xs text-ink-soft font-medium">
                {{ item.type }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-2.5 bg-canvas border-t border-line flex items-center justify-between text-xs text-ink-soft">
        <span>Hivelet Real-time Alerts</span>
        <button
          @click="fetchNotifications"
          class="hover:text-brand font-semibold transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

    </div>
  </div>
</template>
