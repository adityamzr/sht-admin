import { getGalleryTranslations } from '~/server/services/gallery'
import { getGallery } from '~/server/services/gallery'; import { useDb } from '~/server/db'; import { adminGallery } from '~/server/utils/serializers'
export default defineEventHandler(async (event)=>{const row=await getGallery(useDb(),Number(getRouterParam(event,'id')));if(!row)throw createError({statusCode:404,statusMessage:'Gallery item tidak ditemukan.'});return {data:adminGallery(row, await getGalleryTranslations(useDb(), row.id))}})
