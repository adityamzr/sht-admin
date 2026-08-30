<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="admin-page-title font-heading text-2xl font-semibold leading-tight text-sht-olive-dark">{{ title }}</h1>
      <p v-if="subtitle" class="admin-page-subtitle mt-1 text-sm leading-5 text-neutral-charcoal/60">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
