import { useDb } from '~/server/db'
import { listFlights } from '~/server/services/catalog'
import { resolvePricesForEntities } from '~/server/services/pricing'
import { publicFlight } from '~/server/utils/serializers'

/** PUBLIK — opsi penerbangan aktif (MVP CGK→JED, admin-managed). */
export default defineEventHandler(async () => {
  const db = useDb()
  const rows = (await listFlights(db)).filter((f) => f.isActive)
  const prices = await resolvePricesForEntities(db, 'flight', rows.map((f) => f.id), new Date())
  return {
    data: rows.map((f) => {
      const p = prices.get(f.id) ?? null
      return publicFlight(f, p ? { sellingPrice: p.sellingPrice, currency: p.currency, sellingPriceIdr: p.sellingPriceIdr } : null)
    }),
  }
})
