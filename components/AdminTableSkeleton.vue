<script setup lang="ts">
withDefaults(defineProps<{
  rows?: number
  cols?: number
  showHeader?: boolean
}>(), {
  rows: 5,
  cols: 6,
  showHeader: true,
})
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-neutral-line bg-white" role="status" aria-label="Memuat data tabel">
    <div v-if="showHeader" class="border-b bg-neutral-warm px-5 py-3">
      <div class="flex gap-4">
        <div v-for="c in cols" :key="'h-'+c" class="h-3 flex-1 animate-pulse rounded-full bg-neutral-line/70" :style="{ maxWidth: c===1 ? '120px' : undefined }" />
      </div>
    </div>
    <div class="divide-y">
      <div v-for="r in rows" :key="r" class="flex items-center gap-4 px-5 py-4">
        <div v-for="c in cols" :key="`${r}-${c}`" class="flex flex-1 flex-col gap-2">
          <div class="h-3 w-full animate-pulse rounded-full bg-neutral-line/60" :class="c===1 ? 'max-w-[100px]' : ''" />
          <div v-if="c===1 || c===2" class="h-2 w-2/3 animate-pulse rounded-full bg-neutral-line/40" />
        </div>
        <div class="ml-auto h-8 w-20 animate-pulse rounded-xl bg-neutral-line/50" />
      </div>
    </div>
    <span class="sr-only">Memuat tabel...</span>
  </div>
</template>
