<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Link2, Link2Off, List, ListOrdered, Quote, Redo2, RotateCcw,
} from 'lucide-vue-next'
import type { RichTextDocument } from '~/shared/rich-text'
import { createEmptyRichTextDocument, normalizeRichTextDocument, sanitizeRichTextLink } from '~/shared/rich-text'

const props = withDefaults(defineProps<{
  modelValue?: RichTextDocument
  disabled?: boolean
  invalid?: boolean
  label?: string
}>(), { disabled: false, invalid: false, label: 'Editor teks' })
const emit = defineEmits<{ 'update:modelValue': [RichTextDocument] }>()

const editor = shallowRef<Editor | null>(null)
const editorVersion = ref(0)
const linkOpen = ref(false)
const linkValue = ref('')
const linkError = ref('')

function json(value: unknown) {
  return JSON.stringify(normalizeRichTextDocument(value))
}

onMounted(() => {
  try {
    editor.value = new Editor({
      content: normalizeRichTextDocument(props.modelValue ?? createEmptyRichTextDocument()),
      editable: !props.disabled,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] }, link: false, code: false, codeBlock: false, horizontalRule: false }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          protocols: ['http', 'https', 'mailto', 'tel'],
          isAllowedUri: value => Boolean(sanitizeRichTextLink(value)),
          HTMLAttributes: { rel: 'noopener noreferrer' },
        }),
        Placeholder.configure({ placeholder: 'Mulai tulis konten di sini…' }),
      ],
      editorProps: {
        attributes: {
          class: 'media-rich-text-prose min-h-[220px] px-4 py-4 text-sm leading-7 outline-none',
          role: 'textbox',
          'aria-label': props.label,
        },
      },
      onUpdate: ({ editor: current }) => emit('update:modelValue', normalizeRichTextDocument(current.getJSON())),
      onTransaction: () => { editorVersion.value += 1 },
      onSelectionUpdate: () => { editorVersion.value += 1 },
    })
  } catch {
    editor.value = null
  }
})

watch(() => props.modelValue, (value) => {
  const current = editor.value
  if (!current || json(current.getJSON()) === json(value)) return
  current.commands.setContent(normalizeRichTextDocument(value), { emitUpdate: false })
}, { deep: true })

watch(() => props.disabled, value => editor.value?.setEditable(!value))
onBeforeUnmount(() => editor.value?.destroy())

function action(run: (instance: Editor) => void) {
  if (editor.value && !props.disabled) run(editor.value)
}

function openLink() {
  const current = editor.value
  if (!current) return
  linkValue.value = current.getAttributes('link').href ?? ''
  linkError.value = ''
  linkOpen.value = true
}

function applyLink() {
  const href = sanitizeRichTextLink(linkValue.value)
  if (!href) {
    linkError.value = 'Gunakan URL http(s), mailto, tel, atau tautan internal.'
    return
  }
  action(current => current.chain().focus().extendMarkRange('link').setLink({ href }).run())
  linkOpen.value = false
}

function unlink() {
  action(current => current.chain().focus().extendMarkRange('link').unsetLink().run())
  linkOpen.value = false
}

const buttons = computed(() => {
  void editorVersion.value
  return [
    { label: 'Paragraf', text: 'P', active: editor.value?.isActive('paragraph'), run: (e: Editor) => e.chain().focus().setParagraph().run() },
    { label: 'Judul H2', text: 'H2', active: editor.value?.isActive('heading', { level: 2 }), run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Judul H3', text: 'H3', active: editor.value?.isActive('heading', { level: 3 }), run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  ]
})

function isActive(name: string) {
  void editorVersion.value
  return editor.value?.isActive(name) ?? false
}

function canRun(name: 'undo' | 'redo') {
  void editorVersion.value
  return name === 'undo' ? editor.value?.can().undo() : editor.value?.can().redo()
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-white transition focus-within:ring-2 focus-within:ring-sht-olive/20" :class="invalid ? 'border-red-400' : 'border-neutral-line'">
    <div v-if="editor" class="flex flex-wrap items-center gap-1 border-b border-neutral-line bg-neutral-soft/55 p-2" role="toolbar" :aria-label="`Toolbar ${label}`">
      <button v-for="button in buttons" :key="button.label" type="button" class="editor-tool" :class="button.active ? 'editor-tool-active' : ''" :aria-label="button.label" :title="button.label" :disabled="disabled" @click="action(button.run)">{{ button.text }}</button>
      <span class="mx-1 h-6 w-px bg-neutral-line" aria-hidden="true" />
      <button type="button" class="editor-tool" :class="isActive('bold') ? 'editor-tool-active' : ''" aria-label="Tebal" title="Tebal" :disabled="disabled" @click="action(e => e.chain().focus().toggleBold().run())"><Bold class="h-4 w-4" /></button>
      <button type="button" class="editor-tool" :class="isActive('italic') ? 'editor-tool-active' : ''" aria-label="Miring" title="Miring" :disabled="disabled" @click="action(e => e.chain().focus().toggleItalic().run())"><Italic class="h-4 w-4" /></button>
      <button type="button" class="editor-tool" :class="isActive('link') ? 'editor-tool-active' : ''" aria-label="Tautan" title="Tautan" :disabled="disabled" @click="openLink"><Link2 class="h-4 w-4" /></button>
      <button type="button" class="editor-tool" aria-label="Hapus tautan" title="Hapus tautan" :disabled="disabled || !isActive('link')" @click="unlink"><Link2Off class="h-4 w-4" /></button>
      <span class="mx-1 h-6 w-px bg-neutral-line" aria-hidden="true" />
      <button type="button" class="editor-tool" :class="isActive('bulletList') ? 'editor-tool-active' : ''" aria-label="Daftar bullet" title="Daftar bullet" :disabled="disabled" @click="action(e => e.chain().focus().toggleBulletList().run())"><List class="h-4 w-4" /></button>
      <button type="button" class="editor-tool" :class="isActive('orderedList') ? 'editor-tool-active' : ''" aria-label="Daftar bernomor" title="Daftar bernomor" :disabled="disabled" @click="action(e => e.chain().focus().toggleOrderedList().run())"><ListOrdered class="h-4 w-4" /></button>
      <button type="button" class="editor-tool" :class="isActive('blockquote') ? 'editor-tool-active' : ''" aria-label="Kutipan" title="Kutipan" :disabled="disabled" @click="action(e => e.chain().focus().toggleBlockquote().run())"><Quote class="h-4 w-4" /></button>
      <span class="mx-1 h-6 w-px bg-neutral-line" aria-hidden="true" />
      <button type="button" class="editor-tool" aria-label="Urungkan" title="Urungkan" :disabled="disabled || !canRun('undo')" @click="action(e => e.chain().focus().undo().run())"><RotateCcw class="h-4 w-4" /></button>
      <button type="button" class="editor-tool" aria-label="Ulangi" title="Ulangi" :disabled="disabled || !canRun('redo')" @click="action(e => e.chain().focus().redo().run())"><Redo2 class="h-4 w-4" /></button>
    </div>
    <div v-if="linkOpen" class="flex flex-wrap items-start gap-2 border-b border-neutral-line bg-white p-3">
      <label class="min-w-0 flex-1 text-xs font-semibold">URL tautan<input v-model="linkValue" type="url" class="mt-1 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm font-normal" placeholder="https://… atau /panduan" @keydown.enter.prevent="applyLink" /></label>
      <button type="button" class="mt-5 rounded-lg bg-sht-olive px-3 py-2 text-xs font-semibold text-white" @click="applyLink">Terapkan</button>
      <button type="button" class="mt-5 rounded-lg border border-neutral-line px-3 py-2 text-xs font-semibold" @click="linkOpen = false">Batal</button>
      <p v-if="linkError" class="w-full text-xs text-red-700">{{ linkError }}</p>
    </div>
    <EditorContent v-if="editor" :editor="editor" />
    <div v-else class="min-h-[220px] p-4 text-sm text-red-700">Editor teks gagal dimuat. Konten tersimpan tidak diubah.</div>
  </div>
</template>

<style scoped>
.editor-tool { @apply inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2 text-xs font-semibold text-neutral-charcoal/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sht-olive/30 disabled:cursor-not-allowed disabled:opacity-35; }
.editor-tool-active { @apply border-sht-olive/20 bg-sht-olive text-white hover:bg-sht-olive; }
:deep(.media-rich-text-prose p) { @apply mb-4 last:mb-0; }
:deep(.media-rich-text-prose h2) { @apply mb-3 mt-7 font-heading text-2xl font-bold leading-tight first:mt-0; }
:deep(.media-rich-text-prose h3) { @apply mb-2 mt-6 font-heading text-xl font-semibold leading-tight first:mt-0; }
:deep(.media-rich-text-prose ul) { @apply mb-4 list-disc space-y-1 pl-6; }
:deep(.media-rich-text-prose ol) { @apply mb-4 list-decimal space-y-1 pl-6; }
:deep(.media-rich-text-prose blockquote) { @apply my-5 border-l-2 border-gold pl-4 italic; }
:deep(.media-rich-text-prose a) { @apply text-brand-green underline underline-offset-2; }
:deep(.media-rich-text-prose p.is-editor-empty:first-child::before) { content: attr(data-placeholder); @apply pointer-events-none float-left h-0 text-neutral-charcoal/35; }
</style>
