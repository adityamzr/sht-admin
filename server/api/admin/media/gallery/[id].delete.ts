import { deleteGallery } from '~/server/services/gallery'; import { useDb } from '~/server/db'
export default defineEventHandler(async(event)=>{const id=Number(getRouterParam(event,'id'));const row=await deleteGallery(useDb(),id);if(!row)throw createError({statusCode:404,statusMessage:'Gallery item tidak ditemukan.'});return {ok:true,id:row.id,remoteAssetRetained:true}})
