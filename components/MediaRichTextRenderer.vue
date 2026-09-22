<script lang="ts">
import { defineComponent, h, type PropType, type VNodeChild } from 'vue'
import type { RichTextDocument, RichTextNode } from '~/shared/rich-text'
import { normalizeRichTextDocument, sanitizeRichTextLink } from '~/shared/rich-text'

const classes = {
  paragraph: 'mb-5 text-sm leading-7',
  h2: 'mb-4 mt-9 text-2xl font-bold leading-tight',
  h3: 'mb-3 mt-7 text-xl font-semibold leading-tight',
  bulletList: 'mb-6 list-disc space-y-2 pl-6 text-sm leading-7',
  orderedList: 'mb-6 list-decimal space-y-2 pl-6 text-sm leading-7',
  blockquote: 'mb-6 border-l-2 border-gold pl-4 text-base italic leading-7',
}

export default defineComponent({
  name: 'MediaRichTextRenderer',
  props: { document: { type: Object as PropType<RichTextDocument>, required: true } },
  setup(props) {
    function marks(node: RichTextNode, child: VNodeChild): VNodeChild {
      return (node.marks ?? []).reduce<VNodeChild>((current, mark) => {
        if (mark.type === 'bold') return h('strong', {}, [current] as any)
        if (mark.type === 'italic') return h('em', {}, [current] as any)
        if (mark.type === 'link') {
          const href = sanitizeRichTextLink(mark.attrs?.href)
          return href ? h('a', { href, rel: href.startsWith('/') || href.startsWith('#') ? undefined : 'noopener noreferrer', class: 'text-brand-green underline underline-offset-2' }, [current] as any) : current
        }
        return current
      }, child)
    }
    function render(node: RichTextNode, key: string): VNodeChild {
      if (node.type === 'text') return marks(node, node.text ?? '')
      if (node.type === 'hardBreak') return h('br', { key })
      const children = (node.content ?? []).map((child, index) => render(child, `${key}-${index}`))
      if (node.type === 'paragraph') return h('p', { key, class: classes.paragraph }, children)
      if (node.type === 'heading') return h(node.attrs?.level === 3 ? 'h3' : 'h2', { key, class: node.attrs?.level === 3 ? classes.h3 : classes.h2 }, children)
      if (node.type === 'bulletList') return h('ul', { key, class: classes.bulletList }, children)
      if (node.type === 'orderedList') return h('ol', { key, class: classes.orderedList }, children)
      if (node.type === 'listItem') return h('li', { key }, children)
      if (node.type === 'blockquote') return h('blockquote', { key, class: classes.blockquote }, children)
      return children
    }
    return () => h('div', { class: 'media-rich-text-renderer' }, normalizeRichTextDocument(props.document).content.map((node, index) => render(node, String(index))))
  },
})
</script>
