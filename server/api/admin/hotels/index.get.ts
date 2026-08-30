import { useDb } from '~/server/db'
import { listHotels, listRoomTypes } from '~/server/services/catalog'
import { adminHotel } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const db = useDb()
  const [hotelRows, roomRows] = await Promise.all([listHotels(db), listRoomTypes(db)])
  return { data: hotelRows.map((h) => adminHotel(h, roomRows.filter((r) => r.hotelId === h.id))) }
})
