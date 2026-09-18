<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminToast } from '~/composables/useAdminToast'
import { Upload, FileText, Eye, Trash2, Replace, X, Loader2, Image as ImageIcon } from 'lucide-vue-next'

type Attachment = {
  id: number
  originalName: string
  fileName: string
  mimeType: string
  fileSize: number
  createdAt: string
  storageKey: string
}

const props = withDefaults(defineProps<{
  entityType: 'PAYMENT'|'EXPENSE'
  entityId: number
  workspaceId: number
  label?: string
  description?: string
  legacyProofUrl?: string | null
  maxSizeMb?: number
}>(), {
  label: 'Bukti / Lampiran',
  description: 'Format: JPG, PNG, PDF. Maks 10 MB.',
  legacyProofUrl: null,
  maxSizeMb: 10,
})

const emit = defineEmits<{ (e: 'uploaded', att: Attachment): void; (e: 'deleted', id: number): void }>()

const { success, error: toastError, warning } = useAdminToast()

const attachments = ref<Attachment[]>([])
const loadingList = ref(false)
const uploading = ref(false)
const deletingId = ref<number | null>(null)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const allowedMime = ['image/jpeg','image/png','application/pdf']
const allowedExt = ['.jpg','.jpeg','.png','.pdf']

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(2)} MB`
}

function isImage(mime: string) { return mime.startsWith('image/') }

async function fetchAttachments() {
  if (!props.entityId || !props.workspaceId) return
  loadingList.value = true
  try {
    const res: any = await $fetch('/api/admin/attachments', {
      query: {
        entityType: props.entityType,
        entityId: props.entityId,
        workspaceId: props.workspaceId,
      }
    })
    attachments.value = res.data || []
  } catch (e: any) {
    // silent for empty
    attachments.value = []
  } finally {
    loadingList.value = false
  }
}

onMounted(fetchAttachments)

function validateFile(file: File): string | null {
  if (!allowedMime.includes(file.type)) return 'Format tidak didukung. Gunakan JPG, PNG, atau PDF.'
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
  if (ext && !allowedExt.includes(ext) && !allowedExt.includes(ext.replace('.', ''))) {
    // allow .jpg .jpeg etc
    if (!['.jpg','.jpeg','.png','.pdf'].includes(ext)) return 'Ekstensi file tidak didukung.'
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) return `Ukuran file terlalu besar. Maks ${props.maxSizeMb} MB.`
  if (file.size === 0) return 'File kosong tidak diperbolehkan.'
  return null
}

async function uploadFile(file: File) {
  const errMsg = validateFile(file)
  if (errMsg) {
    toastError(errMsg)
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('entityType', props.entityType)
    fd.append('entityId', String(props.entityId))
    fd.append('workspaceId', String(props.workspaceId))

    const res: any = await $fetch('/api/admin/attachments/upload', {
      method: 'POST',
      body: fd,
    })
    const att = res.data as Attachment
    attachments.value.push(att)
    success(`File ${file.name} berhasil diunggah`)
    emit('uploaded', att)
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Gagal mengunggah file'
    toastError(msg)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  if (input.files && input.files[0]) {
    uploadFile(input.files[0])
  }
}

function onDrop(ev: DragEvent) {
  dragOver.value = false
  if (ev.dataTransfer?.files && ev.dataTransfer.files[0]) {
    uploadFile(ev.dataTransfer.files[0])
  }
}

async function viewAttachment(att: Attachment) {
  try {
    const url = `/api/admin/attachments/${att.id}/download?workspaceId=${props.workspaceId}`
    window.open(url, '_blank')
  } catch (e: any) {
    toastError('Gagal membuka file')
  }
}

async function deleteAttachment(att: Attachment) {
  if (!confirm(`Hapus lampiran ${att.originalName}?`)) return
  deletingId.value = att.id
  try {
    await $fetch(`/api/admin/attachments/${att.id}`, {
      method: 'DELETE',
      query: { workspaceId: props.workspaceId }
    })
    attachments.value = attachments.value.filter(a => a.id !== att.id)
    success('Lampiran dihapus')
    emit('deleted', att.id)
  } catch (e: any) {
    toastError(e?.data?.statusMessage || 'Gagal menghapus lampiran')
  } finally {
    deletingId.value = null
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

const hasAttachments = computed(() => attachments.value.length > 0)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <label class="block text-sm font-medium text-sht-olive-dark">{{ label }}</label>
        <p v-if="description" class="mt-0.5 text-xs text-gray-500">{{ description }}</p>
      </div>
      <span v-if="loadingList" class="inline-flex items-center gap-1 text-xs text-gray-500">
        <Loader2 class="h-3 w-3 animate-spin" /> Memuat...
      </span>
    </div>

    <!-- Dropzone / Upload area -->
    <div
      class="relative rounded-xl border-2 border-dashed p-4 transition-colors"
      :class="dragOver ? 'border-sht-gold bg-sht-gold/10' : 'border-sht-olive/20 bg-white hover:border-sht-olive/40'"
      @dragover.prevent="dragOver=true"
      @dragleave.prevent="dragOver=false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" class="hidden" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" @change="onFileChange" />
      <div class="flex flex-col items-center gap-2 text-center">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-sht-olive/5">
          <Upload class="h-5 w-5 text-sht-olive-dark" />
        </div>
        <div class="text-sm">
          <button type="button" class="font-semibold text-sht-olive-dark underline-offset-2 hover:underline" :disabled="uploading" @click="openFilePicker">
            {{ uploading ? 'Mengunggah...' : 'Klik untuk unggah' }}
          </button>
          <span class="text-gray-500"> atau drag & drop</span>
        </div>
        <p class="text-[11px] text-gray-500">JPG, PNG, PDF • Maks {{ maxSizeMb }} MB</p>
        <div v-if="uploading" class="mt-1 flex items-center gap-2 text-xs text-sht-olive-dark">
          <Loader2 class="h-4 w-4 animate-spin" /> Mengunggah file...
        </div>
      </div>
    </div>

    <!-- Attachment list -->
    <div v-if="hasAttachments" class="space-y-2">
      <div v-for="att in attachments" :key="att.id" class="flex items-center gap-3 rounded-xl border border-sht-olive/10 bg-white p-3 shadow-sm">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sht-olive/5">
          <ImageIcon v-if="isImage(att.mimeType)" class="h-5 w-5 text-sht-olive-dark" />
          <FileText v-else class="h-5 w-5 text-sht-olive-dark" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-sht-olive-dark" :title="att.originalName">{{ att.originalName }}</p>
          <p class="text-[11px] text-gray-500">{{ att.mimeType }} • {{ formatSize(att.fileSize) }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sht-olive-dark shadow-sm ring-1 ring-sht-olive/10 hover:bg-sht-olive/5" title="Lihat" @click="viewAttachment(att)">
            <Eye class="h-4 w-4" />
          </button>
          <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow-sm ring-1 ring-red-100 hover:bg-red-50 disabled:opacity-50" :disabled="deletingId===att.id" title="Hapus" @click="deleteAttachment(att)">
            <Loader2 v-if="deletingId===att.id" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!loadingList" class="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-500">
      Belum ada lampiran. Unggah bukti pembayaran / pengeluaran.
    </div>

    <!-- Legacy proofUrl compatibility -->
    <div v-if="legacyProofUrl" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
      <p class="font-medium text-amber-800">Legacy proof URL terdeteksi:</p>
      <a :href="legacyProofUrl" target="_blank" class="mt-1 inline-flex items-center gap-1 break-all text-amber-700 underline hover:text-amber-900">
        {{ legacyProofUrl }} <Eye class="h-3 w-3" />
      </a>
      <p class="mt-1 text-[11px] text-amber-700/80">Disarankan unggah ulang menggunakan attachment private di atas untuk keamanan.</p>
    </div>
  </div>
</template>
