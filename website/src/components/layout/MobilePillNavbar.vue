<!--
  @file components/layout/MobilePillNavbar.vue
  @description Floating bottom pill navigation for mobile screens.
  @systemBibleRef Section 4 - User Roles
  @rationale Destinations are derived from the authenticated session rather than
             set by the tap. Previously each button assigned `activeRole`, which
             meant tapping the shield icon granted administrator navigation to
             anyone.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Home, Shield, User, MessageSquare, LogIn } from 'lucide-vue-next';
import { isAuthenticated, isAdmin, isTenant } from '@/lib/authStore';
import { isLiveChatheadOpen } from '@/lib/systemState';

const router = useRouter();
const route = useRoute();

interface PillItem {
  key: string;
  icon: typeof Home;
  path?: string;
  action?: () => void;
  isActive: () => boolean;
  label: string;
}

/** Only the destinations the current role can actually reach are rendered. */
const items = computed<PillItem[]>(() => {
  const list: PillItem[] = [
    {
      key: 'home',
      icon: Home,
      path: '/',
      isActive: () => route.path === '/',
      label: 'Public property page',
    },
  ];

  if (isAdmin.value) {
    list.push(
      {
        key: 'admin',
        icon: Shield,
        path: '/admin/overview',
        isActive: () => route.path.startsWith('/admin'),
        label: 'Landlady operations',
      },
      {
        key: 'inquiries',
        icon: MessageSquare,
        path: '/admin/inquiries',
        isActive: () => route.path.startsWith('/admin/inquiries'),
        label: 'Inquiry inbox',
      }
    );
  } else if (isTenant.value) {
    list.push(
      {
        key: 'tenant',
        icon: User,
        path: '/tenant',
        isActive: () => route.path.startsWith('/tenant'),
        label: 'My room and billing',
      },
      {
        key: 'chat',
        icon: MessageSquare,
        action: () => {
          isLiveChatheadOpen.value = !isLiveChatheadOpen.value;
        },
        isActive: () => isLiveChatheadOpen.value,
        label: 'Message the landlady',
      }
    );
  } else {
    list.push({
      key: 'login',
      icon: LogIn,
      path: '/login',
      isActive: () => route.path === '/login',
      label: 'Sign in',
    });
  }

  return list;
});

function handle(item: PillItem) {
  if (item.action) item.action();
  else if (item.path) router.push(item.path);
}
</script>

<template>
  <div class="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
    <div
      class="bg-[#091e42]/95 backdrop-blur-md text-white p-2 rounded-full shadow-2xl border border-slate-700 flex items-center justify-around"
    >
      <button
        v-for="item in items"
        :key="item.key"
        :aria-label="item.label"
        :title="item.label"
        :class="[
          'p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5 cursor-pointer min-w-[44px] min-h-[44px] justify-center',
          item.isActive() ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white'
        ]"
        @click="handle(item)"
      >
        <component :is="item.icon" class="w-4 h-4" />
      </button>

      <span
        v-if="isAuthenticated"
        class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400"
      >
        {{ isAdmin ? 'Admin' : 'Tenant' }}
      </span>
    </div>
  </div>
</template>
