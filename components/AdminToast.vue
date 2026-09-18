<script setup lang="ts">
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-vue-next'

const { items, dismiss, pause, resume } = useAdminToast()

const iconMap = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
}

const toneMap: Record<string, string> = {
  success: 'border-emerald-200 bg-[#eef7f2] text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sht-olive/20 bg-white text-sht-olive-dark shadow-sm',
}

function onEnter(el: Element) {
  const e = el as HTMLElement
  e.style.setProperty('--motion-fast', '150ms')
}
</script>

<template>
  <Teleport to="body">
    <!-- Live region for screen readers -->
    <div aria-live="polite" aria-atomic="false" class="sr-only">
      <div v-for="item in items" :key="'sr-'+item.id">{{ item.type }}: {{ item.message }}</div>
    </div>

    <div
      class="pointer-events-none fixed right-4 top-20 z-[9999] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:right-6"
      aria-label="Notifikasi"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="flex flex-col gap-2"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="pointer-events-auto group flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition-all duration-200 ease-out"
          :class="[toneMap[item.type], 'animate-[toastIn_200ms_ease-out]']"
          role="status"
          :aria-label="item.type"
          @mouseenter="pause(item.id)"
          @mouseleave="resume(item.id)"
          @focusin="pause(item.id)"
          @focusout="resume(item.id)"
        >
          <component :is="iconMap[item.type]" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span class="min-w-0 flex-1 leading-snug">{{ item.message }}</span>
          <button
            class="shrink-0 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sht-gold"
            aria-label="Tutup notifikasi"
            @click="dismiss(item.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 180ms cubic-bezier(0.4, 0, 1, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px) scale(0.98);
}
.toast-move {
  transition: transform 200ms ease-out;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none !important;
  }
}
</style>
