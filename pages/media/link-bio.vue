<script setup lang="ts">
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Link2, Star, Eye, EyeOff } from 'lucide-vue-next'
const { show: showGlobalToast } = useAdminToast()
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

type LinkBioType = 'website'|'whatsapp'|'instagram'|'youtube'|'tiktok'|'telegram'|'form'|'article'|'guide'|'community'|'external'|'custom'
type LinkBioLink = {
  id: string
  label: string
  description: string | null
  url: string
  type: LinkBioType
  featured: boolean
  isActive: boolean
  sortOrder: number
  group: string | null
}

const LINK_TYPES: Array<{ value: LinkBioType; label: string }> = [
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'form', label: 'Form' },
  { value: 'article', label: 'Artikel' },
  { value: 'guide', label: 'Panduan' },
  { value: 'community', label: 'Komunitas' },
  { value: 'external', label: 'Eksternal' },
  { value: 'custom', label: 'Custom' },
]

const pending = ref(true)
const saving = ref(false)
const error = ref('')
const draggingIndex = ref<number | null>(null)
const deleteConfirm = ref<{ index: number; link: LinkBioLink } | null>(null)

const form = reactive({
  title: 'Sudut Haramain',
  description: 'Informasi, panduan, dan cerita dari Makkah & Madinah.',
  links: [] as LinkBioLink[],
})

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `link_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
}

function createEmptyLink(): LinkBioLink {
  return {
    id: generateId(),
    label: '',
    description: null,
    url: 'https://',
    type: 'website' as LinkBioType,
    featured: false,
    isActive: true,
    sortOrder: form.links.length * 10,
    group: null,
  }
}

function normalizeLinks(links: any[]): LinkBioLink[] {
  if (!Array.isArray(links)) return []
  return links.map((l, idx) => ({
    id: typeof l.id === 'string' && l.id ? l.id : generateId(),
    label: typeof l.label === 'string' ? l.label : '',
    description: typeof l.description === 'string' ? l.description : (l.description ?? null),
    url: typeof l.url === 'string' ? l.url : 'https://',
    type: LINK_TYPES.some(t => t.value === l.type) ? l.type : 'website',
    featured: Boolean(l.featured),
    isActive: l.isActive !== false,
    sortOrder: typeof l.sortOrder === 'number' ? l.sortOrder : idx * 10,
    group: typeof l.group === 'string' ? l.group : (l.group ?? null),
  })).sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

async function load() {
  pending.value = true
  error.value = ''
  try {
    const res = await $fetch<any>('/api/admin/media/page-settings/link-bio')
    const data = res.data
    if (data) {
      form.title = data.title ?? 'Sudut Haramain'
      form.description = data.description ?? 'Informasi, panduan, dan cerita dari Makkah & Madinah.'
      form.links = normalizeLinks(data.links ?? [])
    }
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Gagal memuat pengaturan Link Bio.'
  } finally {
    pending.value = false
  }
}

function validateUrl(url: string): boolean {
  const lower = url.toLowerCase().trim()
  if (!lower) return false
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return false
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try { new URL(url); return true } catch { return false }
  }
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return url.length >= 7
  return false
}

function validateForm(): boolean {
  if (!form.title.trim()) {
    showGlobalToast('Judul wajib diisi.', 'error')
    return false
  }
  for (let i = 0; i < form.links.length; i++) {
    const link = form.links[i]
    if (!link.label.trim()) {
      showGlobalToast(`Label tautan #${i+1} wajib diisi.`, 'error')
      return false
    }
    if (!validateUrl(link.url)) {
      showGlobalToast(`URL tautan "${link.label || '#' + (i+1)}" tidak valid atau tidak aman.`, 'error')
      return false
    }
  }
  return true
}

async function save() {
  if (!validateForm()) return
  saving.value = true
  error.value = ''
  try {
    // Ensure sortOrder reflects current order
    form.links.forEach((l, idx) => { l.sortOrder = idx * 10 })
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      links: form.links.map(l => ({
        id: l.id,
        label: l.label.trim(),
        description: l.description?.trim() || null,
        url: l.url.trim(),
        type: l.type,
        featured: Boolean(l.featured),
        isActive: Boolean(l.isActive),
        sortOrder: l.sortOrder,
        group: l.group?.trim() || null,
      })),
    }
    await $fetch('/api/admin/media/page-settings/link-bio', { method: 'PATCH', body: payload })
    showGlobalToast('Pengaturan Link Bio berhasil disimpan.', 'success')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Gagal menyimpan pengaturan.'
    showGlobalToast(error.value, 'error')
  } finally {
    saving.value = false
  }
}

function addLink() {
  form.links.push(createEmptyLink())
}

function removeLink(index: number) {
  form.links.splice(index, 1)
}

function move(from: number, to: number) {
  if (to < 0 || to >= form.links.length || from === to) return
  const next = [...form.links]
  const [item] = next.splice(from, 1)
  if (item) next.splice(to, 0, item)
  form.links = next
}

function onDrop(target: number) {
  if (draggingIndex.value !== null) move(draggingIndex.value, target)
  draggingIndex.value = null
}

function confirmDelete(index: number) {
  const link = form.links[index]
  if (!link) return
  if (link.label || link.url !== 'https://') {
    deleteConfirm.value = { index, link }
  } else {
    removeLink(index)
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHead title="Link Bio" subtitle="Media · Page Settings">
      <template #actions>
        <a href="/links" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold hover:border-brand-green/40">
          <ExternalLink class="h-4 w-4" />Lihat /links
        </a>
      </template>
    </PageHead>

    <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</p>

    <div v-if="pending" class="mt-8 rounded-2xl border bg-white p-8 text-sm text-neutral-charcoal/60">Memuat pengaturan Link Bio...</div>

    <div v-else class="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <!-- Main Editor -->
      <div class="space-y-6">
        <section class="rounded-2xl border border-neutral-line bg-white p-5">
          <h2 class="font-heading text-lg font-semibold">Header Halaman</h2>
          <p class="mt-1 text-sm text-neutral-charcoal/55">Judul dan deskripsi yang tampil di atas daftar tautan.</p>
          <div class="mt-4 space-y-4">
            <label class="block text-sm font-semibold">Judul<input v-model="form.title" type="text" maxlength="120" class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm" placeholder="Sudut Haramain" /></label>
            <label class="block text-sm font-semibold">Deskripsi<textarea v-model="form.description" rows="2" maxlength="600" class="mt-1.5 w-full rounded-xl border border-neutral-line px-3 py-2 text-sm" placeholder="Informasi, panduan, dan cerita dari Makkah & Madinah." /></label>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-line bg-white p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-heading text-lg font-semibold">Tautan</h2>
              <p class="mt-1 text-sm text-neutral-charcoal/55">Kelola tautan yang tampil di /links. Seret untuk mengurutkan.</p>
            </div>
            <button type="button" class="inline-flex items-center gap-1.5 rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="addLink"><Plus class="h-4 w-4" />Tambah Tautan</button>
          </div>

          <div v-if="!form.links.length" class="mt-6 rounded-xl border border-dashed border-neutral-line bg-neutral-soft/30 p-8 text-center text-sm text-neutral-charcoal/55">
            Belum ada tautan. Klik "Tambah Tautan" untuk menambahkan.
          </div>

          <div class="mt-6 space-y-3">
            <article v-for="(link, index) in form.links" :key="link.id" class="group rounded-xl border border-neutral-line bg-white p-4" :class="draggingIndex === index ? 'opacity-50' : ''" @dragover.prevent @drop="onDrop(index)">
              <header class="flex items-center gap-2 border-b border-neutral-line pb-3">
                <span class="w-6 text-center text-xs font-bold tabular-nums text-neutral-charcoal/45">{{ String(index+1).padStart(2,'0') }}</span>
                <button type="button" draggable="true" class="cursor-grab rounded p-1 text-neutral-charcoal/45 hover:bg-neutral-soft" title="Seret untuk mengurutkan" @dragstart="draggingIndex = index" @dragend="draggingIndex = null"><GripVertical class="h-4 w-4" /></button>
                <span class="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gold"><Link2 class="h-3.5 w-3.5" />{{ link.type }}</span>
                <span v-if="link.featured" class="inline-flex items-center gap-1 rounded-full bg-sht-olive px-2 py-0.5 text-[10px] font-semibold uppercase text-white"><Star class="h-3 w-3" />Featured</span>
                <span v-if="!link.isActive" class="inline-flex items-center gap-1 rounded-full bg-neutral-line px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-charcoal/60"><EyeOff class="h-3 w-3" />Inactive</span>
                <button type="button" class="rounded p-1 disabled:opacity-30" :disabled="index===0" title="Pindah ke atas" @click="move(index, index-1)"><ArrowUp class="h-4 w-4" /></button>
                <button type="button" class="rounded p-1 disabled:opacity-30" :disabled="index===form.links.length-1" title="Pindah ke bawah" @click="move(index, index+1)"><ArrowDown class="h-4 w-4" /></button>
                <button type="button" class="rounded p-1 text-red-700" title="Hapus tautan" @click="confirmDelete(index)"><Trash2 class="h-4 w-4" /></button>
              </header>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <label class="block text-xs font-semibold">Label *<input v-model="link.label" type="text" maxlength="120" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" placeholder="Channel WhatsApp" /></label>
                <label class="block text-xs font-semibold">URL *<input v-model="link.url" type="url" maxlength="1000" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" placeholder="https://..." /></label>
                <label class="block text-xs font-semibold sm:col-span-2">Deskripsi (opsional)<input v-model="link.description" type="text" maxlength="300" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" placeholder="Ikuti informasi terbaru" /></label>
                <label class="block text-xs font-semibold">Tipe / Icon<select v-model="link.type" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm"><option v-for="opt in LINK_TYPES" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select></label>
                <label class="block text-xs font-semibold">Group (opsional)<input v-model="link.group" type="text" maxlength="80" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" placeholder="Komunitas / Media Sosial" /></label>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-4">
                <label class="inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" v-model="link.featured" /> Featured</label>
                <label class="inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" v-model="link.isActive" /> Active</label>
                <a v-if="link.url && link.url !== 'https://'" :href="link.url" target="_blank" rel="noopener noreferrer" class="ml-auto inline-flex items-center gap-1 text-xs text-sht-olive hover:underline"><ExternalLink class="h-3 w-3" />Preview</a>
              </div>
            </article>
          </div>
        </section>

        <div class="flex gap-3">
          <button type="button" class="rounded-full bg-sht-olive px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}</button>
          <button type="button" class="rounded-full border border-neutral-line px-5 py-2.5 text-sm font-semibold" @click="load">Muat Ulang</button>
        </div>
      </div>

      <!-- Preview Side -->
      <aside class="rounded-2xl border border-neutral-line bg-white p-5 max-h-fit">
        <h3 class="font-heading text-base font-semibold">Preview /links</h3>
        <p class="mt-1 text-xs text-neutral-charcoal/55">Tampilan ringkas mobile-first.</p>
        <div class="mt-5 rounded-[20px] border border-neutral-line bg-[#F6F4ED] p-4">
          <div class="mx-auto max-w-[320px] space-y-3">
            <div class="text-center">
              <div class="mx-auto h-10 w-10 rounded-full bg-sht-olive/10 flex items-center justify-center text-sht-olive font-bold">SH</div>
              <p class="mt-2 text-sm font-semibold">{{ form.title || 'Sudut Haramain' }}</p>
              <p v-if="form.description" class="mt-1 text-[11px] leading-relaxed text-neutral-charcoal/60">{{ form.description }}</p>
            </div>
            <div class="space-y-2">
              <div v-for="link in form.links.filter(l=>l.isActive).slice(0,5)" :key="link.id" class="rounded-xl border px-3 py-2.5 text-xs" :class="link.featured ? 'bg-sht-olive text-white border-sht-olive' : 'bg-white border-neutral-line'">
                <div class="flex items-center justify-between"><span class="font-semibold truncate">{{ link.label || 'Label' }}</span><ExternalLink class="h-3 w-3 shrink-0 opacity-60" /></div>
                <div v-if="link.description" class="mt-0.5 truncate text-[10px] opacity-70">{{ link.description }}</div>
              </div>
              <div v-if="!form.links.filter(l=>l.isActive).length" class="rounded-xl border border-dashed bg-white/50 px-3 py-6 text-center text-[11px] text-neutral-charcoal/50">Belum ada tautan aktif</div>
            </div>
            <div v-if="form.links.filter(l=>l.isActive).length>5" class="text-center text-[10px] text-neutral-charcoal/45">+ {{ form.links.filter(l=>l.isActive).length -5 }} tautan lainnya</div>
          </div>
        </div>

        <div class="mt-6 space-y-2 text-xs text-neutral-charcoal/60">
          <p><strong>Tips:</strong></p>
          <ul class="list-disc pl-4 space-y-1">
            <li>Gunakan Featured untuk tautan utama (mis. Channel WhatsApp).</li>
            <li>Non-aktifkan tautan untuk kampanye sementara tanpa menghapus.</li>
            <li>Group membantu mengelompokkan di public jika banyak tautan.</li>
            <li>URL aman: https://, http://, mailto:, tel: – javascript:/data: ditolak.</li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteConfirm" class="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-charcoal/40 p-5" role="dialog" aria-modal="true">
      <div class="w-full max-w-md rounded-2xl border border-neutral-line bg-white p-6 shadow-xl">
        <h2 class="font-heading text-lg font-semibold">Hapus tautan?</h2>
        <p class="mt-2 text-sm text-neutral-charcoal/70">Tautan <strong>{{ deleteConfirm.link.label || 'tanpa label' }}</strong> akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold" @click="deleteConfirm=null">Batal</button>
          <button type="button" class="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white" @click="removeLink(deleteConfirm.index); deleteConfirm=null">Hapus</button>
        </div>
      </div>
    </div>
  </div>
</template>
