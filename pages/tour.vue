<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

// Compatibility entry: existing Tour modules remain on their current root routes.
await navigateTo('/', { replace: true })
</script>

<template>
  <div />
</template>
