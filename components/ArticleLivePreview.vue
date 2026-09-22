<script setup lang="ts">
import type { ArticleBlock } from '~/shared/article-localization'
defineProps<{ title?: string; excerpt?: string; heroImage?: string; heroAlt?: string; body: ArticleBlock[]; localeLabel: string; city: string; category: string }>()
</script>
<template>
  <section class="rounded-2xl border border-neutral-line bg-white p-5" aria-label="Preview artikel">
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Live Preview {{ localeLabel }} · {{ city }} · {{ category }}</p>
    <h2 class="mt-3 font-heading text-3xl font-semibold text-neutral-charcoal">{{ title || 'Judul artikel' }}</h2>
    <p class="mt-3 text-base leading-relaxed text-neutral-charcoal/65">{{ excerpt || 'Excerpt artikel...' }}</p>
    <img v-if="heroImage" :src="heroImage" :alt="heroAlt" class="mt-6 max-h-[420px] w-full rounded-xl object-cover" />
    <div class="mt-8 text-neutral-charcoal/80"><MediaContentBlocks :body="body" /></div>
  </section>
</template>
