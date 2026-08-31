import { parseReadiness } from '~/server/utils/media-localization'
import { getGalleryTranslations } from '~/server/services/gallery'
import { listGallery, countGallery } from '~/server/services/gallery'
import { adminGallery } from '~/server/utils/serializers'
import { useDb } from '~/server/db'
export default defineEventHandler(async (event) => { const q=getQuery(event); const n=(v:any,d:number,max:number)=>Number.isFinite(Number(v))&&Number(v)>0?Math.min(Math.floor(Number(v)),max):d; const page=n(q.page,1,100000), pageSize=n(q.pageSize,12,50); const f={translation:parseReadiness(q.translation),search:typeof q.search==='string'?q.search.trim():undefined,city:typeof q.city==='string'?q.city:undefined,category:typeof q.category==='string'?q.category:undefined,status:typeof q.status==='string'?q.status:undefined}; const db=useDb(); const [rows,total]=await Promise.all([listGallery(db,{...f,limit:pageSize,offset:(page-1)*pageSize}),countGallery(db,f)]); return {data:await Promise.all(rows.map(async (row) => adminGallery(row, await getGalleryTranslations(db, row.id)))),meta:{page,pageSize,total,pageCount:Math.ceil(total/pageSize)}} })
