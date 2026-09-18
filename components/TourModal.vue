<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  subtitle?: string
  maxWidth?: string
  persistent?: boolean // if true, don't close on backdrop click when form dirty
}>(), {
  maxWidth: 'max-w-2xl',
  persistent: false,
})

const emit = defineEmits<{ (e: 'close'): void }>()

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

watch(() => props.open, (v) => {
  if (typeof document !== 'undefined') {
    if (v) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-charcoal/40 p-0 sm:items-center sm:p-4" @click.self="onBackdrop">
      <div class="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" :class="maxWidth">
        <div class="flex items-start justify-between gap-4 border-b border-neutral-line px-6 py-4">
          <div class="min-w-0">
            <h3 class="font-heading text-base font-semibold leading-tight">{{ title }}</h3>
            <p v-if="subtitle" class="mt-1 text-xs text-neutral-charcoal/60">{{ subtitle }}</p>
          </div>
          <button type="button" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-neutral-charcoal" aria-label="Tutup" @click="emit('close')">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="overflow-y-auto px-6 py-5">
          <slot />
        </div>
        <div v-if="$slots.footer" class="border-t border-neutral-line px-6 py-4">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
