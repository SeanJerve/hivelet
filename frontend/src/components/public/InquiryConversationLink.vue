<script setup lang="ts">
/**
 * @file components/public/InquiryConversationLink.vue
 * @description Shown once an enquiry is saved: the visitor's way back in to read
 * Michelle's reply and answer it (065, Sean 2026-09-30).
 *
 * Both enquiry forms use it (InquireView, and the unit dialog in
 * CategoryRoomsView), so the two say the same thing. The link is the easy way
 * back; the reference code with their phone number is the way back when the
 * link is lost, which is why the code is shown large enough to write down.
 */
import { ref } from 'vue';
import { Copy, Check, MessageSquare } from 'lucide-vue-next';
import { copyText } from '@/lib/copyText';
import { conversationUrl } from '@/lib/myInquiries';

const props = defineProps<{ token: string; referenceCode: string }>();

const copied = ref(false);
const copyFailed = ref(false);

async function copyLink() {
  copyFailed.value = false;
  const ok = await copyText(conversationUrl(props.token));
  copied.value = ok;
  copyFailed.value = !ok;
  if (ok) setTimeout(() => (copied.value = false), 2500);
}
</script>

<template>
  <div class="mt-6 max-w-xl border-l-2 border-brand pl-4">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink :to="`/inquiry#t=${encodeURIComponent(token)}`" class="pill-btn-brand">
        <MessageSquare class="size-4" aria-hidden="true" />
        Open your conversation
      </RouterLink>
      <button type="button" class="pill-btn" @click="copyLink">
        <Check v-if="copied" class="size-4" aria-hidden="true" />
        <Copy v-else class="size-4" aria-hidden="true" />
        {{ copied ? 'Link copied' : 'Copy the link' }}
      </button>
    </div>
    <p v-if="copyFailed" class="mt-3 text-xs leading-relaxed text-ink-soft break-all">
      Copying did not work here. Keep this address instead: {{ conversationUrl(token) }}
    </p>
    <p class="mt-4 text-xs leading-relaxed text-ink-soft">
      Your reference code is
      <strong class="font-medium text-ink tracking-[0.08em] text-sm">{{ referenceCode }}</strong>.
      If you lose the link, enter it with your phone number at
      <RouterLink to="/inquiry" class="hover:text-ink font-semibold">hivelet.vercel.app/inquiry</RouterLink>.
    </p>
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Link copied' : '' }}</span>
  </div>
</template>
