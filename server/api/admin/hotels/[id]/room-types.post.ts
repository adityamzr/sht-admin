import { useDb } from '~/server/db'
import { createRoomType, getHotel } from '~/server/services/catalog'
import { roomTypeInput } from '~/server/utils/validators'
import { adminRoomType } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const hotelId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, roomTypeInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getHotel(db, hotelId))) throw createError({ statusCode: 404, statusMessage: 'Hotel tidak ditemukan' })
  const row = await createRoomType(db, { ...body.data, hotelId })
  return { data: adminRoomType(row) }
})
