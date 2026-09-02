<script setup lang="ts">
import { SUPPORTED_LOCALES, type SupportedLocale } from '~/shared/locales'
defineProps<{ modelValue: SupportedLocale }>()
const emit = defineEmits<{ 'update:modelValue': [SupportedLocale] }>()
</script>
<template>
  <div class="my-4 flex flex-wrap items-center gap-2 border-b border-neutral-line pb-3" aria-label="Bahasa konten">
    <button v-for="locale in SUPPORTED_LOCALES" :key="locale" type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="modelValue === locale ? 'bg-sht-olive text-white' : 'border border-neutral-line'" :aria-pressed="modelValue === locale" @click="emit('update:modelValue', locale)">{{ locale === 'id' ? 'Indonesia' : 'English' }}</button>
    <span v-if="modelValue === 'en'" class="text-xs text-neutral-charcoal/55">Opsional · dapat disimpan belum lengkap</span>
  </div>
</template>
