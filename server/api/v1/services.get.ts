import { useDb } from '~/server/db'
import { listServices } from '~/server/services/catalog'
import { resolvePricesForEntities } from '~/server/services/pricing'
import { publicService } from '~/server/utils/serializers'

/** PUBLIK — layanan aktif (standalone / trip builder) + harga jual. */
export default defineEventHandler(async () => {
  const db = useDb()
  const rows = (await listServices(db)).filter((s) => s.isActive)
  const prices = await resolvePricesForEntities(db, 'service', rows.map((s) => s.id), new Date())
  return {
    data: rows.map((s) => {
      const p = prices.get(s.id) ?? null
      return publicService(s, p ? { sellingPrice: p.sellingPrice, currency: p.currency, sellingPriceIdr: p.sellingPriceIdr } : null)
    }),
  }
})
