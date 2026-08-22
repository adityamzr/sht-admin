import { useDb } from '~/server/db'
import { getHotel, listRoomTypes, updateHotel } from '~/server/services/catalog'
import { hotelPatch } from '~/server/utils/validators'
import { adminHotel } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, hotelPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getHotel(db, id))) throw createError({ statusCode: 404, statusMessage: 'Hotel tidak ditemukan' })
  const row = await updateHotel(db, id, body.data)
  const rooms = await listRoomTypes(db, id)
  return { data: row ? adminHotel(row, rooms) : null }
})
