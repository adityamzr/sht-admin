<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  subtitle?: string
  maxWidth?: string
  persistent?: boolean
}>(), {
  maxWidth: 'max-w-2xl',
  persistent: false,
})

const emit = defineEmits<{ (e: 'close'): void }>()

const modalRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onBackdrop() {
  if (!props.persistent) emit('close')
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && !props.persistent) emit('close')
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEsc)
})

watch(() => props.open, async (v) => {
  if (typeof document !== 'undefined') {
    if (v) {
      document.body.style.overflow = 'hidden'
      await nextTick()
      // Focus close button for accessibility
      closeBtnRef.value?.focus()
    } else {
      document.body.style.overflow = ''
    }
  }
})

// Focus trap simple: keep focus inside modal when open
function onKeydownTab(e: KeyboardEvent) {
  if (!props.open || e.key !== 'Tab') return
  const modal = modalRef.value
  if (!modal) return
  const focusable = modal.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-charcoal/40 p-3 sm:items-center sm:p-4 md:p-6"
        @click.self="onBackdrop"
        @keydown="onKeydownTab"
      >
        <div
          ref="modalRef"
          class="flex max-h-[92vh] w-full flex-col rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]"
          :class="[maxWidth, 'sm:rounded-2xl']"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <div class="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-line px-5 py-4 sm:px-6">
            <div class="min-w-0 flex-1">
              <h3 class="font-heading text-base font-semibold leading-tight sm:text-lg">{{ title }}</h3>
              <p v-if="subtitle" class="mt-1 text-xs text-neutral-charcoal/60 sm:text-[13px]">{{ subtitle }}</p>
            </div>
            <button
              ref="closeBtnRef"
              type="button"
              class="shrink-0 rounded-xl p-2 text-neutral-charcoal/50 transition-colors hover:bg-neutral-warm hover:text-neutral-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sht-gold"
              aria-label="Tutup modal"
              @click="emit('close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <slot />
          </div>
          <div v-if="$slots.footer" class="shrink-0 border-t border-neutral-line bg-neutral-warm/30 px-5 py-4 sm:px-6">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active {
  transition: opacity 200ms ease-out;
}
.modal-leave-active {
  transition: opacity 150ms ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out;
}
.modal-enter-from > div {
  transform: translateY(16px) scale(0.98);
  opacity: 0;
}
.modal-leave-to > div {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
@media (min-width: 640px) {
  .modal-enter-from > div {
    transform: translateY(8px) scale(0.97);
  }
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active > div,
  .modal-leave-active > div {
    transition: none !important;
  }
}
</style>
