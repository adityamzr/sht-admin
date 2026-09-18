<script setup lang="ts">
/**
 * TourMoneyInput — formatted thousand separator while typing, but emits numeric value.
 * UI: "37.500.000" , API: 37500000
 * Supports IDR/SAR/USD, integer and decimal (preserve decimals if needed).
 * - type=text (not number) to allow separators
 * - handles paste, empty, keyboard naturally
 * - avoids cursor jumping by keeping simple formatting on blur/input
 */
const props = withDefaults(defineProps<{
  modelValue: number | null | undefined
  placeholder?: string
  currency?: string
  allowDecimal?: boolean
  min?: number
  disabled?: boolean
}>(), {
  placeholder: '0',
  currency: 'IDR',
  allowDecimal: false,
  min: 0,
  disabled: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()

const display = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n as any)) return ''
  if (props.allowDecimal) {
    // Keep decimals, format integer part with dot
    const parts = String(n).split('.')
    const intPart = Number(parts[0]).toLocaleString('id-ID')
    return parts[1] ? `${intPart},${parts[1]}` : intPart
  }
  return Number(n).toLocaleString('id-ID')
}

function parseFormatted(s: string): number | null {
  if (!s) return null
  // Remove dots (thousand sep), replace comma decimal with dot
  let cleaned = s.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const num = Number(cleaned)
  if (isNaN(num)) return null
  return num
}

watch(() => props.modelValue, (v) => {
  const formatted = formatNumber(v)
  // Avoid overriding while user is typing if same numeric value
  const currentParsed = parseFormatted(display.value)
  if (currentParsed === v) return
  if (display.value === '' && (v === null || v === undefined)) return
  // Only update display if not focused to avoid cursor jump, or if value changed externally
  if (document.activeElement !== inputRef.value) {
    display.value = formatted
  } else {
    // If focused but external change, update if numeric differs
    if (v !== currentParsed) display.value = formatted
  }
}, { immediate: true })

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  let raw = target.value
  // Allow only digits, dot, comma, minus
  // Keep cursor position simple: format on the fly with thousand separators
  const parsed = parseFormatted(raw)
  // Update display with formatted version, but preserve typing
  if (raw === '') {
    display.value = ''
    emit('update:modelValue', null)
    return
  }
  // Format: if allowDecimal, keep comma handling, else integer formatting
  if (parsed !== null) {
    // For live typing, we format integer part but keep decimal comma if user typed it
    if (props.allowDecimal) {
      // Split by comma for decimal
      const hasComma = raw.includes(',')
      if (hasComma) {
        const [intRaw, decRaw] = raw.split(',')
        const intFormatted = intRaw ? Number(intRaw.replace(/\./g, '').replace(/[^\d-]/g, '') || 0).toLocaleString('id-ID') : ''
        display.value = decRaw !== undefined ? `${intFormatted},${decRaw.replace(/[^\d]/g, '')}` : intFormatted
      } else {
        display.value = formatNumber(parsed)
      }
    } else {
      display.value = formatNumber(parsed)
    }
    if (props.min !== undefined && parsed < props.min) {
      // allow typing but emit anyway, validation will catch
    }
    emit('update:modelValue', parsed)
  } else {
    // If not parsable, keep raw but emit null
    display.value = raw
    emit('update:modelValue', null)
  }
}

function onBlur() {
  // On blur, reformat cleanly
  display.value = formatNumber(props.modelValue)
}

function onPaste(e: ClipboardEvent) {
  // Let default paste happen, then format on next tick via onInput
  // No special handling needed, but we prevent non-numeric paste corruption
  setTimeout(() => {
    const parsed = parseFormatted(display.value)
    if (parsed !== null) {
      display.value = formatNumber(parsed)
      emit('update:modelValue', parsed)
    }
  }, 0)
}
</script>

<template>
  <div class="relative">
    <span v-if="currency" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-charcoal/40">{{ currency }}</span>
    <input
      ref="inputRef"
      :value="display"
      :placeholder="placeholder"
      :disabled="disabled"
      type="text"
      inputmode="numeric"
      class="min-h-[44px] w-full rounded-xl border border-neutral-line bg-white px-4 py-2 text-sm font-medium tabular-nums placeholder:text-neutral-charcoal/30 focus:border-sht-olive focus:outline-none focus:ring-2 focus:ring-sht-olive/10"
      :class="currency ? 'pl-12' : ''"
      @input="onInput"
      @blur="onBlur"
      @paste="onPaste"
    />
  </div>
</template>
