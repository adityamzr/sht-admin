<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{
  variant?: 'primary'|'secondary'|'ghost'|'destructive'|'accent'
  type?: 'button'|'submit'
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  iconOnly?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
  loadingLabel: '',
  iconOnly: false,
})

defineEmits<{ (e: 'click', event: MouseEvent): void }>()
</script>
<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    :aria-label="iconOnly ? (loadingLabel || 'Loading') : undefined"
    class="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sht-gold disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      variant==='primary' ? 'bg-sht-olive-dark text-white hover:bg-sht-olive' : variant==='secondary' ? 'border border-sht-olive/30 bg-white text-sht-olive-dark hover:bg-sht-olive/5' : variant==='destructive' ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : variant==='accent' ? 'bg-sht-gold text-sht-olive-dark hover:bg-sht-gold/80' : 'text-sht-olive-dark hover:bg-sht-olive/5',
      loading ? 'cursor-wait' : ''
    ]"
    @click="$emit('click', $event)"
  >
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
    <span v-if="loading && loadingLabel" class="truncate">{{ loadingLabel }}</span>
    <template v-else>
      <slot />
    </template>
    <span v-if="loading && !loadingLabel" class="sr-only">Memuat...</span>
  </button>
</template>
