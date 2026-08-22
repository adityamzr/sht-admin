import { useDb } from '~/server/db'
import { listHotels, listRoomTypes } from '~/server/services/catalog'
import { resolvePricesForEntities } from '~/server/services/pricing'
import { publicHotel } from '~/server/utils/serializers'

/** PUBLIK — katalog hotel aktif + tipe kamar + harga jual (periode berlaku hari ini). */
export default defineEventHandler(async () => {
  const db = useDb()
  const [hotelRows, roomRows] = await Promise.all([listHotels(db), listRoomTypes(db)])
  const activeHotels = hotelRows.filter((h) => h.isActive)
  const activeRooms = roomRows.filter((r) => r.isActive)
  const prices = await resolvePricesForEntities(
    db,
    'hotel_room_type',
    activeRooms.map((r) => r.id),
    new Date(),
  )
  return {
    data: activeHotels.map((h) =>
      publicHotel(
        h,
        activeRooms
          .filter((r) => r.hotelId === h.id)
          .map((r) => {
            const p = prices.get(r.id) ?? null
            return {
              roomType: r,
              price: p ? { sellingPrice: p.sellingPrice, currency: p.currency, sellingPriceIdr: p.sellingPriceIdr } : null,
            }
          }),
      ),
    ),
  }
})
