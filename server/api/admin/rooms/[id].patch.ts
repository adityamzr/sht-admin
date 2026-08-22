import { useDb } from '~/server/db'
import { getRoomType, updateRoomType } from '~/server/services/catalog'
import { roomTypePatch } from '~/server/utils/validators'
import { adminRoomType } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, roomTypePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getRoomType(db, id))) throw createError({ statusCode: 404, statusMessage: 'Tipe kamar tidak ditemukan' })
  const row = await updateRoomType(db, id, body.data)
  return { data: row ? adminRoomType(row) : null }
})
