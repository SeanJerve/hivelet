<script setup lang="ts">
/**
 * @component LandingView
 * @description Public entry page. Property summary pulled directly from docs/01_SYSTEM_BIBLE.md
 *              Sections 1 and 5 -- no invented marketing copy or features beyond what's documented.
 * @rationale Full-bleed interior-photo hero + serif wordmark, matching the luxury real-estate
 *            reference brief. Hero photo is a curated Unsplash placeholder -- swap for real
 *            Fe Galang Da Silva Boarding House photography before production deployment.
 */
import { useRouter } from 'vue-router';
import { Building2, Car, Zap, Droplet, ArrowRight } from 'lucide-vue-next';
import PublicNavbar from '../components/layout/PublicNavbar.vue';

const router = useRouter();

// Placeholder hero photo pending real property photography.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80';
</script>

<template>
  <div class="lux-canvas min-h-screen">
    <!-- Hero -->
    <section class="relative min-h-[92vh] flex items-end overflow-hidden">
      <img :src="HERO_IMAGE" alt="Interior of Fe Galang Da Silva Boarding House" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/40"></div>

      <PublicNavbar variant="overlay" />

      <div class="relative z-10 w-full px-5 md:px-10 pb-16 md:pb-24">
        <div class="max-w-6xl mx-auto">
          <span class="lux-eyebrow text-white/85 tracking-[0.22em]">Fe Galang Da Silva Boarding House</span>
          <h1 class="lux-serif text-white text-4xl md:text-6xl leading-[1.08] mt-4 max-w-2xl">
            Selling Comfort,<br />Simplifying Apartment Living
          </h1>
          <p class="text-white/85 text-sm md:text-base mt-5 max-w-lg leading-relaxed">
            Centralized room availability, inquiries, billing, and maintenance for the boarding house's tenants and prospective renters.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <button @click="router.push('/rooms')" class="lux-btn-on-photo">
              <Building2 class="w-3.5 h-3.5" />
              <span>View Available Rooms</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
            <button @click="router.push('/login')" class="lux-btn-outline-on-photo">
              Tenant / Admin Login
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Property Facts -->
    <section class="max-w-6xl mx-auto px-5 md:px-10 py-16 md:py-24">
      <span class="lux-eyebrow">The Property</span>
      <h2 class="lux-serif text-2xl md:text-3xl mt-2 mb-10 text-[var(--lux-text)]">32 Units Across Three Floors</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div class="lux-card p-5">
          <Building2 class="w-4 h-4 text-[var(--lux-accent)] mb-3" />
          <div class="lux-serif text-lg text-[var(--lux-text)]">3 Floors</div>
          <p class="text-xs text-[var(--lux-text-muted)] mt-1 leading-relaxed">32 rentable units in Studio, One, and Two-bedroom layouts</p>
        </div>
        <div class="lux-card p-5">
          <Car class="w-4 h-4 text-[var(--lux-accent)] mb-3" />
          <div class="lux-serif text-lg text-[var(--lux-text)]">Parking</div>
          <p class="text-xs text-[var(--lux-text-muted)] mt-1 leading-relaxed">Onsite parking and shared common areas</p>
        </div>
        <div class="lux-card p-5">
          <Zap class="w-4 h-4 text-[var(--lux-accent)] mb-3" />
          <div class="lux-serif text-lg text-[var(--lux-text)]">Separate Metering</div>
          <p class="text-xs text-[var(--lux-text-muted)] mt-1 leading-relaxed">Electricity billed via the private electric company</p>
        </div>
        <div class="lux-card p-5">
          <Droplet class="w-4 h-4 text-[var(--lux-accent)] mb-3" />
          <div class="lux-serif text-lg text-[var(--lux-text)]">₱200 / head</div>
          <p class="text-xs text-[var(--lux-text-muted)] mt-1 leading-relaxed">Water charged per registered occupant</p>
        </div>
      </div>
    </section>

    <!-- How Inquiries Work -->
    <section class="border-t border-[var(--lux-border)]">
      <div class="max-w-6xl mx-auto px-5 md:px-10 py-16 md:py-24">
        <span class="lux-eyebrow">Getting Started</span>
        <h2 class="lux-serif text-2xl md:text-3xl mt-2 mb-10 text-[var(--lux-text)]">How Inquiries Work</h2>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div v-for="(step, i) in [
            'Browse available room units and their published status.',
            'Submit an inquiry for a specific room with your contact details.',
            'The administrator reviews your inquiry and reaches out directly.',
            'If it moves forward, your inquiry becomes the basis of onboarding — no retyping.',
          ]" :key="i" class="space-y-3">
            <div class="lux-serif text-2xl text-[var(--lux-accent)]">{{ String(i + 1).padStart(2, '0') }}</div>
            <p class="text-sm text-[var(--lux-text)] leading-relaxed">{{ step }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-[var(--lux-border)] px-5 md:px-10 py-8">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--lux-text-muted)]">
        <span class="lux-serif text-sm text-[var(--lux-text)]">Hivelet</span>
        <span>Fe Galang Da Silva Boarding House</span>
      </div>
    </footer>
  </div>
</template>
