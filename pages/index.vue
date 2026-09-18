<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
// Root now goes to Workspace Hub (handled in middleware), but keep fallback
navigateTo('/workspaces', { replace: true })
</script>
<template><div /></template>
