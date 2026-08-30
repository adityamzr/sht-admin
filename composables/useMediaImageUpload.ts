export type ImageUploadResult = {
  url: string
  fileId?: string
  name?: string
}

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export function validateMediaImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return 'Format file harus JPEG, PNG, atau WEBP.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ukuran file maksimal 8 MB.'
  return ''
}

export function useMediaImageUpload() {
  const status = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const error = ref('')

  async function upload(file: File, folder = 'articles'): Promise<ImageUploadResult> {
    error.value = ''
    const validationError = validateMediaImage(file)
    if (validationError) {
      status.value = 'error'
      error.value = validationError
      throw new Error(validationError)
    }

    status.value = 'uploading'
    try {
      const auth = await $fetch<{ token: string; expire: number; signature: string; publicKey: string; urlEndpoint: string; folder: string }>(`/api/admin/media/uploads/auth?folder=${encodeURIComponent(folder)}`)
      const form = new FormData()
      form.append('file', file)
      form.append('fileName', `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`)
      form.append('publicKey', auth.publicKey)
      form.append('signature', auth.signature)
      form.append('expire', String(auth.expire))
      form.append('token', auth.token)
      form.append('folder', auth.folder)
      form.append('useUniqueFileName', 'true')
      const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({})) as { url?: string; fileId?: string; name?: string; message?: string }
      if (!response.ok || !data.url) throw new Error(data.message || 'Upload ImageKit gagal.')
      status.value = 'success'
      return { url: data.url, fileId: data.fileId, name: data.name }
    } catch (cause: unknown) {
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : 'ImageKit belum dikonfigurasi atau upload gagal.'
      throw cause
    }
  }

  function reset() { status.value = 'idle'; error.value = '' }
  return { status, error, upload, reset }
}
