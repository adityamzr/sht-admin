import { eq } from 'drizzle-orm'
import { transportRouteVehicles } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { listRoutes, listVehicles } from '~/server/services/catalog'
import { resolvePricesForEntities } from '~/server/services/pricing'
import { publicTransportation } from '~/server/utils/serializers'

/** PUBLIK — rute transportasi aktif + opsi kendaraan + harga per trip. */
export default defineEventHandler(async () => {
  const db = useDb()
  const [routeRows, vehicleRows] = await Promise.all([listRoutes(db), listVehicles(db)])
  const activeRoutes = routeRows.filter((r) => r.isActive)
  const vehiclesById = new Map(vehicleRows.map((v) => [v.id, v]))
  const optionRows = await db.select().from(transportRouteVehicles).where(eq(transportRouteVehicles.isActive, true))
  const prices = await resolvePricesForEntities(db, 'route_vehicle', optionRows.map((o) => o.id), new Date())
  return {
    data: activeRoutes.map((r) =>
      publicTransportation(
        r,
        optionRows
          .filter((o) => o.routeId === r.id)
          .filter((o) => {
            const v = vehiclesById.get(o.vehicleId)
            return Boolean(v && v.isActive)
          })
          .map((o) => {
            const p = prices.get(o.id) ?? null
            return {
              option: o,
              vehicle: vehiclesById.get(o.vehicleId)!,
              price: p ? { sellingPrice: p.sellingPrice, currency: p.currency, sellingPriceIdr: p.sellingPriceIdr } : null,
            }
          }),
      ),
    ),
  }
})
