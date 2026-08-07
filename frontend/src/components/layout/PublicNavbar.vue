<script setup lang="ts">
/**
 * @component PublicNavbar
 * @description Minimal luxury real-estate style nav for the public Landing, Rooms Catalog, and
 *              Login pages. Logo | Home / Available Rooms | Login -- matching the public-visitor
 *              capabilities in docs/01_SYSTEM_BIBLE.md Section 4 (browse, no self-service login).
 * @systemBibleRef Section 4 - Public Visitor Role
 * @rationale Two visual variants: "overlay" (transparent, white text, sits directly on the Landing
 *            hero photo) and "solid" (ivory background, used on every other public page) so the
 *            same component works both over a full-bleed photo and on a plain page.
 */
import { useRouter, useRoute } from 'vue-router';
import { Menu, X } from 'lucide-vue-next';
import { ref } from 'vue';

withDefaults(defineProps<{ variant?: 'overlay' | 'solid' }>(), { variant: 'solid' });

const router = useRouter();
const route = useRoute();
const mobileOpen = ref(false);

const go = (path: string) => {
  mobileOpen.value = false;
  router.push(path);
};
</script>

<template>
  <header
    :class="[
      'top-0 left-0 right-0 z-40 px-5 md:px-10',
      variant === 'overlay' ? 'absolute bg-transparent' : 'sticky bg-[var(--lux-canvas)] border-b border-[var(--lux-border)]',
    ]"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between py-5">
      <!-- Logo / Wordmark -->
      <button @click="go('/')" class="flex items-center gap-2.5 group">
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center lux-serif text-sm shrink-0',
            variant === 'overlay' ? 'border border-white/70 text-white' : 'border border-[var(--lux-text)] text-[var(--lux-text)]',
          ]"
        >
          H
        </div>
        <div class="text-left leading-tight">
          <div :class="['lux-serif text-base tracking-[0.12em] uppercase', variant === 'overlay' ? 'text-white' : 'text-[var(--lux-text)]']">
            Hivelet
          </div>
          <p :class="['text-[10px] tracking-[0.08em] uppercase', variant === 'overlay' ? 'text-white/75' : 'text-[var(--lux-text-muted)]']">
            Fe Galang Da Silva Boarding House
          </p>
        </div>
      </button>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-8">
        <button
          @click="go('/')"
          :class="[
            'text-xs font-medium tracking-[0.04em] uppercase transition-colors',
            variant === 'overlay' ? 'text-white/90 hover:text-white' : 'text-[var(--lux-text)] hover:text-[var(--lux-accent)]',
            route.path === '/' ? (variant === 'overlay' ? 'text-white' : 'text-[var(--lux-accent)]') : '',
          ]"
        >
          Home
        </button>
        <button
          @click="go('/rooms')"
          :class="[
            'text-xs font-medium tracking-[0.04em] uppercase transition-colors',
            variant === 'overlay' ? 'text-white/90 hover:text-white' : 'text-[var(--lux-text)] hover:text-[var(--lux-accent)]',
            route.path === '/rooms' ? (variant === 'overlay' ? 'text-white' : 'text-[var(--lux-accent)]') : '',
          ]"
        >
          Available Rooms
        </button>
        <button
          @click="go('/login')"
          :class="variant === 'overlay' ? 'lux-btn-outline-on-photo' : 'lux-btn-primary'"
        >
          Login
        </button>
      </nav>

      <!-- Mobile Toggle -->
      <button
        @click="mobileOpen = !mobileOpen"
        :class="['md:hidden p-1.5', variant === 'overlay' ? 'text-white' : 'text-[var(--lux-text)]']"
        aria-label="Toggle navigation menu"
      >
        <X v-if="mobileOpen" class="w-5 h-5" />
        <Menu v-else class="w-5 h-5" />
      </button>
    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileOpen" class="md:hidden bg-[var(--lux-surface)] border-t border-[var(--lux-border)] px-5 py-4 space-y-3">
      <button @click="go('/')" class="block w-full text-left text-sm font-medium text-[var(--lux-text)] py-1">Home</button>
      <button @click="go('/rooms')" class="block w-full text-left text-sm font-medium text-[var(--lux-text)] py-1">Available Rooms</button>
      <button @click="go('/login')" class="lux-btn-primary w-full justify-center mt-2">Login</button>
    </div>
  </header>
</template>
