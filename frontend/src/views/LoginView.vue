<script setup lang="ts">
/**
 * @component LoginView
 * @description Two distinct login flows (Admin & Staff vs Tenant), matching the System Bible's
 *              user-role split. Whichever tab is active determines the expected role; the DB's
 *              actual profiles.role is still the authority (stores/auth.ts rejects a mismatch).
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ShieldCheck, UserCheck, LogIn, Loader2 } from 'lucide-vue-next';
import PublicNavbar from '../components/layout/PublicNavbar.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref<'admin' | 'tenant'>('admin');
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const submitting = ref(false);

const switchTab = (tab: 'admin' | 'tenant') => {
  activeTab.value = tab;
  errorMessage.value = '';
};

const submitLogin = async () => {
  errorMessage.value = '';
  submitting.value = true;
  try {
    const profile = await authStore.login(email.value.trim(), password.value, activeTab.value);
    router.push(profile.role === 'admin' ? '/admin/overview' : '/tenant');
  } catch (err: any) {
    errorMessage.value = err.message || 'Login failed. Please try again.';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7]">
    <PublicNavbar />

    <main class="max-w-md mx-auto p-4 md:p-10">
      <div class="jira-card p-6 space-y-5">
        <div class="text-center border-b border-[#dfe1e6] pb-4">
          <h1 class="text-lg font-bold text-[#172b4d]">System Entry Portal</h1>
          <p class="text-xs text-[#6b778c] mt-1">Fe Galang Da Silva Boarding House</p>
        </div>

        <!-- Tabs -->
        <div class="flex items-center bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-xs text-xs">
          <button
            @click="switchTab('admin')"
            :class="['flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-2xs font-medium transition-all', activeTab === 'admin' ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs border border-[#dfe1e6]' : 'text-[#42526e]']"
          >
            <ShieldCheck class="w-3.5 h-3.5" />
            Admin &amp; Staff
          </button>
          <button
            @click="switchTab('tenant')"
            :class="['flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-2xs font-medium transition-all', activeTab === 'tenant' ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs border border-[#dfe1e6]' : 'text-[#42526e]']"
          >
            <UserCheck class="w-3.5 h-3.5" />
            Tenant
          </button>
        </div>

        <form @submit.prevent="submitLogin" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Email Address</label>
            <input v-model="email" type="email" required placeholder="you@example.com" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none" />
          </div>
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Password</label>
            <input v-model="password" type="password" required placeholder="••••••••" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none" />
          </div>

          <div v-if="errorMessage" class="p-2.5 bg-[#ffebe6] border border-[#ffbdad] rounded-xs text-[#bf2600]">
            {{ errorMessage }}
          </div>

          <button type="submit" :disabled="submitting" class="jira-btn-primary w-full justify-center py-2 text-xs disabled:opacity-60">
            <Loader2 v-if="submitting" class="w-3.5 h-3.5 animate-spin" />
            <LogIn v-else class="w-3.5 h-3.5" />
            <span>{{ submitting ? 'Signing in...' : `Login to ${activeTab === 'admin' ? 'Admin Dashboard' : 'Tenant Portal'}` }}</span>
          </button>
        </form>

        <p class="text-[11px] text-[#8993a4] text-center border-t border-[#dfe1e6] pt-3">
          Tenant accounts are created by the administrator during onboarding.
          Prospective tenants should <router-link to="/rooms" class="text-[#0c66e4] font-medium">submit an inquiry</router-link> instead.
        </p>
      </div>
    </main>
  </div>
</template>
