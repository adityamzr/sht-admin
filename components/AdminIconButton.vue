<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean; variant?: 'default'|'destructive' }>()
</script>
<template><button type="button" :disabled="disabled" :aria-label="label" :title="label" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sht-gold disabled:cursor-not-allowed disabled:opacity-30" :class="variant==='destructive'?'text-red-700 hover:bg-red-50':'text-sht-olive-dark hover:bg-sht-olive/10'"><slot /></button></template>
