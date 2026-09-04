<script setup lang="ts">
import type { ArticleBlock } from '~/shared/article-localization'
import { articleImageFigureStyle, articleImageObjectStyle, articleImageRatioStyle } from '~/shared/article-block-presentation'
defineProps<{ title?: string; excerpt?: string; heroImage?: string; heroAlt?: string; body: ArticleBlock[]; localeLabel: string; city: string; category: string }>()
</script>
<template>
  <section class="rounded-2xl border border-neutral-line bg-white p-5" aria-label="Preview artikel">
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Live Preview {{ localeLabel }} · {{ city }} · {{ category }}</p>
    <h2 class="mt-3 font-heading text-3xl font-semibold text-neutral-charcoal">{{ title || 'Judul artikel' }}</h2>
    <p class="mt-3 text-base leading-relaxed text-neutral-charcoal/65">{{ excerpt || 'Excerpt artikel...' }}</p>
    <img v-if="heroImage" :src="heroImage" :alt="heroAlt" class="mt-6 max-h-[420px] w-full rounded-xl object-cover" />
    <div class="mt-8 text-neutral-charcoal/80">
      <template v-for="(block,index) in body" :key="index">
        <p v-if="block.type === 'paragraph'" class="mb-5 text-sm leading-7">{{ block.text }}</p>
        <h2 v-else-if="block.type === 'heading' && block.level === 2" class="mb-4 mt-9 text-2xl font-bold leading-tight">{{ block.text }}</h2>
        <h3 v-else-if="block.type === 'heading'" class="mb-3 mt-7 text-xl font-semibold leading-tight">{{ block.text }}</h3>
        <blockquote v-else-if="block.type === 'blockquote'" class="mb-6 border-l-2 border-gold pl-4 text-base italic leading-7">{{ block.text }}</blockquote>
        <ul v-else-if="block.type === 'list' && !block.ordered" class="mb-6 list-disc space-y-2 pl-6 text-sm leading-7"><li v-for="(item,itemIndex) in block.items" :key="itemIndex">{{ item }}</li></ul>
        <ol v-else-if="block.type === 'list'" class="mb-6 list-decimal space-y-2 pl-6 text-sm leading-7"><li v-for="(item,itemIndex) in block.items" :key="itemIndex">{{ item }}</li></ol>
        <aside v-else-if="block.type === 'callout'" class="mb-6 border-l-2 border-gold bg-gold-sand/50 px-4 py-3 text-sm leading-6">{{ block.text }}</aside>
        <figure v-else-if="block.type === 'image'" class="mx-auto mb-6 w-full" :style="articleImageFigureStyle(block)"><div class="overflow-hidden rounded-xl" :style="articleImageRatioStyle(block)"><img :src="block.src" :alt="block.alt" class="w-full" :style="articleImageObjectStyle(block)" /></div><figcaption v-if="block.caption" class="mt-2 text-xs leading-5 text-neutral-charcoal/50">{{ block.caption }}</figcaption></figure>
      </template>
    </div>
  </section>
</template>
