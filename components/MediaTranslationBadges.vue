<script setup lang="ts">
defineProps<{ idComplete: boolean; enComplete: boolean }>()
</script>
<template>
  <span class="mt-2 flex flex-wrap gap-1" aria-label="Kelengkapan terjemahan">
    <AdminStatusBadge :status="idComplete ? 'ACTIVE' : 'INACTIVE'" :label="idComplete ? 'ID ✓' : 'ID —'" />
    <AdminStatusBadge :status="enComplete ? 'ACTIVE' : 'INACTIVE'" :label="enComplete ? 'EN ✓' : 'EN —'" />
  </span>
</template>
