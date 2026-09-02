import { listLocalizedGallery } from '~/server/services/gallery'
import { publicGallery } from '~/server/utils/serializers'
import { useDb } from '~/server/db'
import { parseLocale } from '~/server/utils/locales'
export default defineEventHandler(async (event) => {
  const q = getQuery(event), locale = parseLocale(q.locale)
  const raw = Number(q.limit), pageRaw = Number(q.page)
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 100) : 20
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const rows = await listLocalizedGallery(useDb(), { locale, limit, offset: (page - 1) * limit,
    city: typeof q.city === 'string' ? q.city : undefined, category: typeof q.category === 'string' ? q.category : undefined,
    tag: typeof q.tag === 'string' ? q.tag : undefined, search: typeof q.search === 'string' ? q.search.trim() : undefined,
  })
  return { data: rows.map(publicGallery), meta: { page, limit } }
})
