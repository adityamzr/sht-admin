<script setup lang="ts">
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, Table, AlignLeft, AlignCenter, AlignRight } from 'lucide-vue-next'
import type { ArticleBlock } from '~/shared/article-localization'
import { createEmptyRichTextDocument } from '~/shared/rich-text'
import {
  applyArticleImageUpload,
  insertArticleBlock,
  moveArticleBlock,
  addTableColumn,
  deleteTableColumn,
  addTableRow,
  deleteTableRow,
  updateTableHeader,
  updateTableCell,
  updateTableAlignment,
  updateTableCaption,
  normalizeTableBlock,
} from '~/shared/article-block-editor'

const props = withDefaults(defineProps<{ modelValue: ArticleBlock[]; folder?: string; errors?: Record<string, string> }>(), { folder: 'articles', errors: () => ({}) })
const emit = defineEmits<{ 'update:modelValue': [ArticleBlock[]] }>()
const draggingIndex = ref<number | null>(null)
const blockOptions: Array<{ type: ArticleBlock['type']; label: string }> = [
  { type: 'richText', label: 'Teks' },
  { type: 'image', label: 'Gambar' },
  { type: 'table', label: 'Tabel' },
  { type: 'callout', label: 'Callout' },
]
function update(next: ArticleBlock[]) { emit('update:modelValue', next) }
function set(index: number, block: ArticleBlock) { const next = [...props.modelValue]; next[index] = block; update(next) }
function insert(type: ArticleBlock['type'], index = props.modelValue.length) { update(insertArticleBlock(props.modelValue, type, index)) }
function remove(index: number) { const next = [...props.modelValue]; next.splice(index, 1); update(next) }
function move(from: number, to: number) { update(moveArticleBlock(props.modelValue, from, to)) }
function onDrop(target: number) { if (draggingIndex.value !== null) move(draggingIndex.value, target); draggingIndex.value = null }
function autoGrow(event: Event) { const el = event.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = `${Math.min(Math.max(el.scrollHeight, 96), 640)}px` }
function autoGrowCell(event: Event) { const el = event.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = `${Math.min(Math.max(el.scrollHeight, 56), 200)}px` }
function applyImageUpload(index: number, upload: { url: string; fileId: string; dimensions: { width: number; height: number } | null }) { const block = props.modelValue[index]; if (block?.type === 'image') set(index, applyArticleImageUpload(block, upload)) }
function label(block: ArticleBlock) { return block.type === 'richText' ? 'Teks' : block.type === 'heading' ? `H${block.level ?? 2}` : block.type }

function handleAddColumn(index: number) {
  const block = props.modelValue[index]
  if (!block) return
  set(index, addTableColumn(block))
}
function handleDeleteColumn(index: number, colIdx: number) {
  const block = props.modelValue[index]
  if (!block || block.type !== 'table') return
  const headers = block.headers ?? []
  const rows = block.rows ?? []
  // Check if column has data
  const hasData = (headers[colIdx]?.trim() ?? '') !== '' || rows.some(r => (r[colIdx]?.trim() ?? '') !== '')
  if (hasData) {
    if (!confirm('Hapus kolom ini beserta seluruh isinya?')) return
  }
  set(index, deleteTableColumn(block, colIdx))
}
function handleAddRow(index: number) {
  const block = props.modelValue[index]
  if (!block) return
  set(index, addTableRow(block))
}
function handleDeleteRow(index: number, rowIdx: number) {
  const block = props.modelValue[index]
  if (!block || block.type !== 'table') return
  const rows = block.rows ?? []
  if (rows.length <= 1) return
  const hasData = (rows[rowIdx] ?? []).some(cell => (cell?.trim() ?? '') !== '')
  if (hasData) {
    if (!confirm('Hapus baris ini?')) return
  }
  set(index, deleteTableRow(block, rowIdx))
}
function handleHeaderInput(index: number, colIdx: number, value: string) {
  const block = props.modelValue[index]
  if (!block) return
  set(index, updateTableHeader(block, colIdx, value))
}
function handleCellInput(index: number, rowIdx: number, colIdx: number, value: string) {
  const block = props.modelValue[index]
  if (!block) return
  set(index, updateTableCell(block, rowIdx, colIdx, value))
}
function handleAlignment(index: number, colIdx: number, align: 'left' | 'center' | 'right') {
  const block = props.modelValue[index]
  if (!block) return
  set(index, updateTableAlignment(block, colIdx, align))
}
function handleCaption(index: number, value: string) {
  const block = props.modelValue[index]
  if (!block) return
  set(index, updateTableCaption(block, value))
}
function normalizedTable(block: ArticleBlock): ArticleBlock {
  if (block.type !== 'table') return block
  return normalizeTableBlock(block)
}
</script>

<template>
  <section class="space-y-3" aria-label="Body blocks editor">
    <div class="sticky top-3 z-20 rounded-xl border border-neutral-line bg-white/95 p-3 shadow-sm backdrop-blur"><div class="flex flex-wrap items-center gap-2"><span class="mr-auto text-sm font-semibold">Konten</span><button v-for="option in blockOptions" :key="option.type" type="button" class="inline-flex min-h-9 items-center gap-1 rounded-full border border-neutral-line px-3 text-xs font-semibold hover:border-brand-green/40" @click="insert(option.type)"><Plus v-if="option.type !== 'table'" class="h-3.5 w-3.5" aria-hidden="true" /><Table v-else class="h-3.5 w-3.5" aria-hidden="true" />{{ option.label }}</button></div></div>
    <div v-for="(block, index) in modelValue" :key="index" class="group relative">
      <div v-if="index > 0" class="relative flex h-5 items-center justify-center"><details class="absolute z-10"><summary class="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-neutral-line bg-white text-brand-green opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100" :aria-label="`Sisipkan block sebelum nomor ${index + 1}`"><Plus class="h-4 w-4" /></summary><div class="absolute left-1/2 top-8 flex -translate-x-1/2 gap-1 rounded-xl border border-neutral-line bg-white p-2 shadow-lg"><button v-for="option in blockOptions" :key="option.type" type="button" class="whitespace-nowrap rounded-full px-2 py-1 text-xs hover:bg-neutral-soft" @click="insert(option.type, index)">{{ option.label }}</button></div></details></div>
      <article class="rounded-xl border border-neutral-line bg-white p-3" :class="draggingIndex === index ? 'opacity-50' : ''" @dragover.prevent @drop="onDrop(index)">
        <header class="flex flex-wrap items-center gap-2 border-b border-neutral-line pb-2"><span class="w-7 text-xs font-bold tabular-nums text-neutral-charcoal/45">{{ String(index + 1).padStart(2, '0') }}</span><button type="button" draggable="true" class="cursor-grab rounded p-1 text-neutral-charcoal/45 hover:bg-neutral-soft" :aria-label="`Seret block ${index + 1}`" title="Seret untuk mengurutkan" @dragstart="draggingIndex = index" @dragend="draggingIndex = null"><GripVertical class="h-4 w-4" /></button><span class="mr-auto text-xs font-semibold uppercase tracking-[0.12em] text-gold">{{ label(block) }}</span><button type="button" class="rounded p-1 disabled:opacity-30" :disabled="index === 0" :aria-label="`Pindahkan block ${index + 1} ke atas`" title="Pindah ke atas" @click="move(index, index - 1)"><ArrowUp class="h-4 w-4" /></button><button type="button" class="rounded p-1 disabled:opacity-30" :disabled="index === modelValue.length - 1" :aria-label="`Pindahkan block ${index + 1} ke bawah`" title="Pindah ke bawah" @click="move(index, index + 1)"><ArrowDown class="h-4 w-4" /></button><button type="button" class="rounded p-1 text-red-700" :aria-label="`Hapus block ${index + 1}`" title="Hapus block" @click="remove(index)"><Trash2 class="h-4 w-4" /></button></header>
        <div v-if="block.type === 'richText'" :data-field="`body-${index}`" class="mt-3"><MediaRichTextEditor :model-value="block.content ?? createEmptyRichTextDocument()" :invalid="Boolean(errors[`body-${index}`])" :label="`Isi teks block ${index + 1}`" @update:model-value="set(index, { ...block, content: $event })" /></div>
        <textarea v-else-if="['paragraph','blockquote','callout'].includes(block.type)" :data-field="`body-${index}`" :value="block.text" rows="3" class="mt-3 min-h-24 w-full resize-y overflow-y-auto rounded-lg border px-3 py-2 text-sm" :class="errors[`body-${index}`] ? 'border-red-400' : 'border-neutral-line'" @input="autoGrow($event); set(index, { ...block, text: ($event.target as HTMLTextAreaElement).value })" />
        <div v-else-if="block.type === 'heading'" class="mt-3 grid gap-2 sm:grid-cols-[80px_1fr]"><select :value="block.level" class="rounded-lg border border-neutral-line px-2" @change="set(index, { ...block, level: Number(($event.target as HTMLSelectElement).value) as 2|3 })"><option :value="2">H2</option><option :value="3">H3</option></select><input :data-field="`body-${index}`" :value="block.text" class="rounded-lg border border-neutral-line px-3" @input="set(index, { ...block, text: ($event.target as HTMLInputElement).value })" /></div>
        <div v-else-if="block.type === 'list'" class="mt-3"><select :value="String(block.ordered)" class="rounded-lg border border-neutral-line px-2 py-1 text-xs" @change="set(index, { ...block, ordered: ($event.target as HTMLSelectElement).value === 'true' })"><option value="false">Bullet</option><option value="true">Numbered</option></select><textarea :value="(block.items ?? []).join('\n')" rows="3" class="mt-2 min-h-24 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" @input="autoGrow($event); set(index, { ...block, items: ($event.target as HTMLTextAreaElement).value.split('\n') })" /></div>
        <div v-else-if="block.type === 'image'" class="mt-3 space-y-3"><MediaImageUploader :model-value="block.src" :folder="folder" label="Body image" @uploaded="applyImageUpload(index, $event)" /><div class="grid gap-3 sm:grid-cols-2"><label class="text-xs font-semibold">Ukuran Tampilan<select :value="block.displaySize ?? 'full'" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" @change="set(index, { ...block, displaySize: ($event.target as HTMLSelectElement).value as ArticleBlock['displaySize'] })"><option value="small">Kecil</option><option value="medium">Sedang</option><option value="wide">Lebar</option><option value="full">Penuh</option></select></label><label class="text-xs font-semibold">Proporsi<select :value="block.aspectRatio ?? 'auto'" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" @change="set(index, { ...block, aspectRatio: ($event.target as HTMLSelectElement).value as ArticleBlock['aspectRatio'] })"><option value="auto">Otomatis</option><option value="16:9">Landscape 16:9</option><option value="4:5">Portrait 4:5</option><option value="1:1">Square 1:1</option></select></label></div><input :value="block.alt" placeholder="Alt text" class="w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" @input="set(index, { ...block, alt: ($event.target as HTMLInputElement).value })" /><input :value="block.caption" placeholder="Caption (opsional)" class="w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" @input="set(index, { ...block, caption: ($event.target as HTMLInputElement).value })" /></div>

        <!-- TABLE BLOCK EDITOR -->
        <div v-else-if="block.type === 'table'" class="mt-3 space-y-3">
          <label class="block text-xs font-semibold">Caption (opsional)<input :value="block.caption ?? ''" placeholder="Judul atau keterangan tabel" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm" @input="handleCaption(index, ($event.target as HTMLInputElement).value)" /></label>

          <!-- Headers + alignment + delete column -->
          <div class="overflow-x-auto rounded-lg border border-neutral-line">
            <div class="min-w-[480px]">
              <div class="flex gap-2 bg-neutral-soft/50 p-2">
                <div v-for="(header, colIdx) in (normalizedTable(block).headers ?? [])" :key="colIdx" class="min-w-[150px] flex-1">
                  <div class="flex items-center gap-1">
                    <input :value="header" placeholder="Header" class="min-h-[36px] w-full rounded-md border border-neutral-line bg-white px-2 text-xs font-semibold" @input="handleHeaderInput(index, colIdx, ($event.target as HTMLInputElement).value)" />
                    <button type="button" class="rounded p-1 text-neutral-charcoal/50 hover:bg-white disabled:opacity-30" :disabled="(normalizedTable(block).headers?.length ?? 0) <= 2" :aria-label="`Hapus kolom ${colIdx + 1}`" title="Hapus kolom" @click="handleDeleteColumn(index, colIdx)"><Trash2 class="h-3.5 w-3.5" /></button>
                  </div>
                  <div class="mt-1 flex gap-1">
                    <button type="button" class="rounded p-1" :class="(normalizedTable(block).alignments?.[colIdx] ?? 'left') === 'left' ? 'bg-sht-olive text-white' : 'bg-white border border-neutral-line'" aria-label="Align left" title="Rata kiri" @click="handleAlignment(index, colIdx, 'left')"><AlignLeft class="h-3 w-3" /></button>
                    <button type="button" class="rounded p-1" :class="(normalizedTable(block).alignments?.[colIdx] ?? 'left') === 'center' ? 'bg-sht-olive text-white' : 'bg-white border border-neutral-line'" aria-label="Align center" title="Rata tengah" @click="handleAlignment(index, colIdx, 'center')"><AlignCenter class="h-3 w-3" /></button>
                    <button type="button" class="rounded p-1" :class="(normalizedTable(block).alignments?.[colIdx] ?? 'left') === 'right' ? 'bg-sht-olive text-white' : 'bg-white border border-neutral-line'" aria-label="Align right" title="Rata kanan" @click="handleAlignment(index, colIdx, 'right')"><AlignRight class="h-3 w-3" /></button>
                  </div>
                </div>
              </div>

              <!-- Rows -->
              <div class="divide-y divide-neutral-line">
                <div v-for="(row, rowIdx) in (normalizedTable(block).rows ?? [])" :key="rowIdx" class="flex gap-2 p-2">
                  <div v-for="(cell, colIdx) in row" :key="colIdx" class="min-w-[150px] flex-1">
                    <textarea :value="cell" rows="1" placeholder="Isi sel" class="min-h-[44px] w-full resize-y rounded-md border border-neutral-line px-2 py-1.5 text-xs" @input="autoGrowCell($event); handleCellInput(index, rowIdx, colIdx, ($event.target as HTMLTextAreaElement).value)" />
                  </div>
                  <button type="button" class="self-start rounded p-1 text-red-700 disabled:opacity-30" :disabled="(normalizedTable(block).rows?.length ?? 0) <= 1" :aria-label="`Hapus baris ${rowIdx + 1}`" title="Hapus baris" @click="handleDeleteRow(index, rowIdx)"><Trash2 class="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="inline-flex items-center gap-1 rounded-full border border-neutral-line px-3 py-1.5 text-xs font-semibold hover:bg-neutral-soft" @click="handleAddRow(index)"><Plus class="h-3.5 w-3.5" />Tambah Baris</button>
            <button type="button" class="inline-flex items-center gap-1 rounded-full border border-neutral-line px-3 py-1.5 text-xs font-semibold hover:bg-neutral-soft" @click="handleAddColumn(index)"><Plus class="h-3.5 w-3.5" />Tambah Kolom</button>
          </div>
        </div>

        <p v-if="errors[`body-${index}`]" class="mt-1 text-xs text-red-700">{{ errors[`body-${index}`] }}</p>
      </article>
    </div>
  </section>
</template>
