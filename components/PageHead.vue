<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="font-heading text-2xl font-semibold">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-neutral-charcoal/60">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
