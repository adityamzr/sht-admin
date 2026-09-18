<script setup lang="ts">
const nuxtApp = useNuxtApp()
const loading = ref(false)
function start() {
  loading.value = true
}
function stop() {
  loading.value = false
}

onMounted(() => {
  nuxtApp.hook('page:start', start)
  nuxtApp.hook('page:finish', stop)
})
</script>

<template>
  <div v-if="loading" class="pointer-events-none fixed left-0 top-0 z-[10000] h-0.5 w-full overflow-hidden" aria-hidden="true">
    <div class="h-full w-full origin-left animate-[routeProgress_1.2s_ease-in-out_infinite] bg-sht-gold" />
  </div>
</template>

<style scoped>
@keyframes routeProgress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  div { animation: none !important; }
}
</style>
