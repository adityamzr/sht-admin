<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <label class="block text-xs font-semibold text-neutral-charcoal/60">English
    <select :value="modelValue" class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option value="">Semua</option><option value="complete">Lengkap</option><option value="incomplete">Belum Lengkap</option>
    </select>
  </label>
</template>
