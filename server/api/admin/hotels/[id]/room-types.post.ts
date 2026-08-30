import { useDb } from '~/server/db'
import { createRoomType, getHotel } from '~/server/services/catalog'
import { roomTypeCreateInput } from '~/server/utils/validators'
import { adminRoomType } from '~/server/utils/serializers'

/**
 * M3.2 — sumber kebenaran hotel = route param :id.
 * Body HANYA berisi field tipe kamar (name, capacity, isActive, sortOrder);
 * hotelId tidak boleh/ tidak diperlukan dari client — di-inject dari route.
 */
export default defineEventHandler(async (event) => {
  const hotelId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(hotelId) || hotelId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID hotel tidak valid.' })
  }
  const body = await readValidatedBody(event, roomTypeCreateInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getHotel(db, hotelId))) throw createError({ statusCode: 404, statusMessage: 'Hotel tidak ditemukan' })
  const row = await createRoomType(db, { ...body.data, hotelId })
  return { data: adminRoomType(row) }
})
