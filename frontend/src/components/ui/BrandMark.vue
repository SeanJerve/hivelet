<!--
  The Hivelet mark: a green hexagon, the same cell the hive in the product film
  is built from, with a minimal H under a roof. The same drawing as
  `public/favicon.svg` (the tab icon) and every installed-app icon rendered from
  it by `video/capture/render-app-icons.mjs`; change one and change the others.

  Decorative beside the "Hivelet" wordmark, which already names the brand, so it
  is hidden from assistive technology. Size it with a `size-*` class. `inverse`
  swaps the colours (white hexagon, green glyph) for a dark background, where
  the green hexagon alone all but disappears: the landing page's photograph and
  the night footer.
-->
<script setup lang="ts">
defineProps<{ inverse?: boolean }>();
</script>

<template>
  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" class="shrink-0">
    <path
      :class="inverse ? 'fill-on-brand' : 'fill-brand'"
      d="M217.89 34 Q256 12 294.11 34 L429.21 112 Q467.31 134 467.31 178 L467.31 334 Q467.31 378 429.21 400 L294.11 478 Q256 500 217.89 478 L82.79 400 Q44.69 378 44.69 334 L44.69 178 Q44.69 134 82.79 112 Z"
    />
    <g :class="inverse ? 'stroke-brand' : 'stroke-on-brand'" fill="none" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
      <path d="M146 226 L256 136 L366 226" />
      <path d="M186 254 V376 M326 254 V376 M186 314 H326" />
    </g>
  </svg>
</template>
