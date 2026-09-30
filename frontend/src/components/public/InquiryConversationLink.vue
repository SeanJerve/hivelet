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
    <p class="text-sm leading-relaxed text-ink">
      Open your inquiry page any time to read her reply and write back.
    </p>
    <div class="mt-4 flex flex-wrap items-center gap-3">
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
      Write it down. If you lose the link, go to
      <RouterLink to="/inquiry" class="underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink">hivelet.vercel.app/inquiry</RouterLink>
      and enter this code with your phone number.
    </p>
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Link copied' : '' }}</span>
  </div>
</template>
