<script setup lang="ts">
/**
 * @component PublicNavbar
 * @description Simple public-facing nav bar for the Landing, Login, and Rooms Catalog pages --
 *              distinct from the internal AppHeader/AppSidebar dashboard shell used once signed in.
 * @systemBibleRef Section 4 - Public Visitor Role
 */
import { useRouter } from 'vue-router';
import { Building2, LogIn } from 'lucide-vue-next';

const router = useRouter();
</script>

<template>
  <header class="bg-white border-b border-[#dfe1e6] sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-2.5 cursor-pointer" @click="router.push('/')">
      <div class="w-7 h-7 bg-[#0c66e4] text-white rounded-sm flex items-center justify-center font-bold text-sm shadow-xs">
        H
      </div>
      <div>
        <div class="font-bold text-[#172b4d] text-sm tracking-tight">HIVELET</div>
        <p class="text-[11px] text-[#6b778c] leading-tight">Fe Galang Da Silva Boarding House</p>
      </div>
    </div>

    <nav class="flex items-center gap-1.5 sm:gap-3">
      <button @click="router.push('/')" class="hidden sm:inline text-xs font-medium text-[#42526e] hover:text-[#0c66e4] px-2 py-1.5">
        Home
      </button>
      <button @click="router.push('/rooms')" class="flex items-center gap-1.5 text-xs font-medium text-[#42526e] hover:text-[#0c66e4] px-2 py-1.5">
        <Building2 class="w-3.5 h-3.5" />
        <span>Available Rooms</span>
      </button>
      <button @click="router.push('/login')" class="jira-btn-primary text-xs">
        <LogIn class="w-3.5 h-3.5" />
        <span>Login</span>
      </button>
    </nav>
  </header>
</template>
