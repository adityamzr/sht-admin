import {getActiveLocation} from '~/server/services/map-locations';import {publicMapLocation} from '~/server/utils/serializers';import {useDb} from '~/server/db'
export default defineEventHandler(async(e)=>{const r=await getActiveLocation(useDb(),Number(getRouterParam(e,'id')));if(!r)throw createError({statusCode:404,statusMessage:'Lokasi tidak ditemukan.'});return {data:publicMapLocation(r)}})
