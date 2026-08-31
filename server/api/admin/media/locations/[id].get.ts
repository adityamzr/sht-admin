import { getLocationTranslations } from '~/server/services/map-locations'
import {getLocation} from '~/server/services/map-locations';import {useDb} from '~/server/db';import {adminMapLocation} from '~/server/utils/serializers'
export default defineEventHandler(async(e)=>{const r=await getLocation(useDb(),Number(getRouterParam(e,'id')));if(!r)throw createError({statusCode:404,statusMessage:'Lokasi tidak ditemukan.'});return {data:adminMapLocation(r, await getLocationTranslations(useDb(), r.id))}})
