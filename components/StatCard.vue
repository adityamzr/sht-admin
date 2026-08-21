<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="rounded-2xl border border-neutral-line bg-white p-5">
    <p class="text-xs font-semibold uppercase tracking-wider text-neutral-charcoal/50">{{ label }}</p>
    <p class="mt-2 font-heading text-3xl font-semibold text-brand-green">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-xs text-neutral-charcoal/50">{{ hint }}</p>
  </div>
</template>
