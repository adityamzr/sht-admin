import { listLocalizedArticles } from '~/server/services/articles'
import { publicArticle } from '~/server/utils/serializers'
import { parseLocale } from '~/server/utils/locales'
import { useDb } from '~/server/db'
export default defineEventHandler(async (event) => { const q=getQuery(event),locale=parseLocale(q.locale); const raw=Number(q.limit),limit=Number.isFinite(raw)&&raw>0?Math.min(Math.floor(raw),100):20; const rows=await listLocalizedArticles(useDb(),{locale,status:'PUBLISHED',city:typeof q.city==='string'?q.city:undefined,category:typeof q.category==='string'?q.category:undefined,search:typeof q.search==='string'?q.search.trim():undefined}); return {data:rows.slice(0,limit).map(publicArticle)} })
