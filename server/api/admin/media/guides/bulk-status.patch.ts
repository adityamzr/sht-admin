import { inArray, sql } from 'drizzle-orm'
import { guides } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { z } from 'zod'
const input=z.object({ids:z.array(z.number().int().positive()).min(1).max(100),status:z.enum(['DRAFT','PUBLISHED','ARCHIVED'])})
export default defineEventHandler(async(e)=>{const b=await readValidatedBody(e,input.safeParse);if(!b.success)throw createError({statusCode:400,statusMessage:'Bulk status tidak valid.'});const db=useDb();const rows=await db.update(guides).set({status:b.data.status,publishedAt:b.data.status==='PUBLISHED'?sql`coalesce(${guides.publishedAt}, now())`:null,updatedAt:new Date()}).where(inArray(guides.id,b.data.ids)).returning({id:guides.id});return {requested:b.data.ids.length,updated:rows.length,failed:b.data.ids.length-rows.length,ids:rows.map(r=>r.id)}})
