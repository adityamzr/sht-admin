<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
<template><div class="rounded-2xl border border-dashed border-neutral-line bg-white px-6 py-12 text-center"><div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-soft text-sht-olive"><slot name="icon" /></div><h3 class="mt-3 text-sm font-semibold text-sht-charcoal">{{title}}</h3><p v-if="description" class="mt-1 text-sm text-neutral-charcoal/55">{{description}}</p><div v-if="$slots.action" class="mt-4"><slot name="action" /></div></div></template>
