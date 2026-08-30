import { useDb } from '~/server/db'
import { getHotel, listRoomTypes } from '~/server/services/catalog'
import { resolvePricesForEntities } from '~/server/services/pricing'
import { publicHotel } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const hotel = await getHotel(db, id)
  if (!hotel || !hotel.isActive) throw createError({ statusCode: 404, statusMessage: 'Hotel tidak ditemukan' })
  const rooms = (await listRoomTypes(db, id)).filter((r) => r.isActive)
  const prices = await resolvePricesForEntities(db, 'hotel_room_type', rooms.map((r) => r.id), new Date())
  return {
    data: publicHotel(
      hotel,
      rooms.map((r) => {
        const p = prices.get(r.id) ?? null
        return {
          roomType: r,
          price: p ? { sellingPrice: p.sellingPrice, currency: p.currency, sellingPriceIdr: p.sellingPriceIdr } : null,
        }
      }),
    ),
  }
})
