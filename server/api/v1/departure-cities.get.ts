import { useDb } from '~/server/db'
import { listDepartureCities } from '~/server/services/catalog'
import { getActiveRate } from '~/server/services/pricing'
import { publicDepartureCity } from '~/server/utils/serializers'

/** PUBLIK — kota keberangkatan aktif + fee (dikonversi ke IDR). */
export default defineEventHandler(async () => {
  const db = useDb()
  const rows = (await listDepartureCities(db)).filter((c) => c.isActive)
  const rates = await getActiveRate(db, 'USD', 'IDR') // dipakai untuk fee non-IDR
  const rate = rates ? Number(rates.rate) : null
  return {
    data: rows.map((c) => {
      const fee = c.feePerPax === null ? null : Number(c.feePerPax)
      const feeIdr = fee === null ? null : c.feeCurrency === 'IDR' ? fee : rate ? Math.round(fee * rate) : null
      return publicDepartureCity(c, feeIdr)
    }),
  }
})
