<!--
  @file components/layout/AppFooter.vue
  @description 1:1 Horizon dark corporate footer with newsletter subscribe, quick links, social media badges, and legal notes.
-->
<template>
  <footer class="bg-[#0b132b] text-slate-300 pt-16 pb-10 border-t border-white/10 text-xs">
    <div class="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-10">
      <!-- Col 1: Brand & Mission -->
      <div class="space-y-4">
        <div class="flex items-center gap-2.5 text-white font-bold text-xl">
          <span class="w-8 h-8 rounded-xl bg-white text-[#0b132b] flex items-center justify-center font-mono font-extrabold text-base shadow-md">8</span>
          <span class="font-display tracking-wide font-extrabold">Horizon</span>
        </div>
        <p class="text-slate-400 leading-relaxed text-xs">
          Our mission is to equip modern boarding house systems with cutting-edge, functional, and stylish stays that elevate every adventure.
        </p>
      </div>

      <!-- Col 2: About Links -->
      <div class="space-y-3">
        <h4 class="font-bold text-white uppercase tracking-wider text-xs">About</h4>
        <ul class="space-y-2 text-slate-400">
          <li><a href="#" class="hover:text-white transition-colors">About Us</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Blog</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Career</a></li>
        </ul>
      </div>

      <!-- Col 3: Support Links -->
      <div class="space-y-3">
        <h4 class="font-bold text-white uppercase tracking-wider text-xs">Support</h4>
        <ul class="space-y-2 text-slate-400">
          <li><a href="#" class="hover:text-white transition-colors">Contact Us</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Return</a></li>
          <li><a href="#" class="hover:text-white transition-colors">FAQ</a></li>
        </ul>
      </div>

      <!-- Col 4: Get Updates Subscribe & Social Media Badges -->
      <div class="space-y-4">
        <h4 class="font-bold text-white uppercase tracking-wider text-xs">Get Updates</h4>
        <form @submit.prevent class="flex gap-2">
          <input 
            type="email" 
            placeholder="Enter your email" 
            class="bg-white/10 text-white text-xs px-3.5 py-2 rounded-lg border border-white/20 placeholder-slate-400 focus:outline-none focus:bg-white/20 w-full" 
          />
          <button type="submit" class="bg-white text-[#0b132b] font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
            Subscribe
          </button>
        </form>

        <!-- Social Media Circle Badges (Horizon Style) -->
        <div class="flex items-center gap-2 pt-2">
          <a href="#" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors text-xs font-bold font-mono">in</a>
          <a href="#" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors text-xs font-bold font-mono">X</a>
          <a href="#" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors text-xs font-bold font-mono">fb</a>
          <a href="#" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors text-xs font-bold font-mono">dc</a>
          <a href="#" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors text-xs font-bold font-mono">tk</a>
        </div>
      </div>
    </div>

    <!-- Bottom Copyright & Legal Links Bar -->
    <div class="max-w-7xl mx-auto px-4 md:px-12 pt-8 mt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
      <p>© 2026 Horizon. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
        <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
      </div>
    </div>
  </footer>
</template>
