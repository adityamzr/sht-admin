<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue?: string; folder?: string; label?: string }>(), { modelValue: '', folder: 'articles', label: 'Image' })
const emit = defineEmits<{ 'update:modelValue': [string]; 'update:fileId': [string]; 'update:dimensions': [{ width: number; height: number }] }>()
const input = ref<HTMLInputElement | null>(null)
const { status, error, upload, reset } = useMediaImageUpload()

function chooseFile() { input.value?.click() }
async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const image = new Image()
      const objectUrl = URL.createObjectURL(file)
      image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(objectUrl) }
      image.onerror = () => { resolve(null); URL.revokeObjectURL(objectUrl) }
      image.src = objectUrl
    })
    const result = await upload(file, props.folder)
    emit('update:modelValue', result.url)
    if (result.fileId) emit('update:fileId', result.fileId)
    if (dimensions) emit('update:dimensions', dimensions)
  } catch {
    // Error is surfaced by the component; preserve the existing value.
  } finally {
    target.value = ''
  }
}
function removeImage() { emit('update:modelValue', ''); emit('update:fileId', ''); reset() }
</script>

<template>
  <div class="rounded-xl border border-neutral-line p-3">
    <div class="flex items-center justify-between gap-3"><span class="text-sm font-semibold">{{ label }}</span><span v-if="status === 'uploading'" class="text-xs text-neutral-charcoal/55">Mengunggah...</span><span v-else-if="status === 'success'" class="text-xs font-semibold text-brand-green">Upload berhasil</span></div>
    <img v-if="modelValue" :src="modelValue" :alt="label" class="mt-3 aspect-[3/2] max-h-48 w-full rounded-lg object-cover" />
    <p v-if="error" class="mt-2 text-xs text-red-700" role="alert">{{ error }}</p>
    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onFileChange" />
    <div class="mt-3 flex flex-wrap gap-2"><button type="button" :disabled="status === 'uploading'" class="rounded-full border border-neutral-line px-3 py-1.5 text-xs font-semibold hover:border-brand-green/40 disabled:cursor-wait disabled:opacity-50" @click="chooseFile">{{ modelValue ? 'Replace' : 'Choose image' }}</button><button v-if="modelValue" type="button" class="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700" @click="removeImage">Remove</button></div>
    <p class="mt-2 text-[11px] text-neutral-charcoal/50">JPEG, PNG, atau WEBP · maksimal 8 MB</p>
  </div>
</template>
