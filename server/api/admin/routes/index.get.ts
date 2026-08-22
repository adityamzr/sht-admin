import { transportRouteVehicles } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { listRoutes, listVehicles } from '~/server/services/catalog'
import { adminRoute, adminVehicle } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const db = useDb()
  const [routeRows, vehicleRows, optionRows] = await Promise.all([
    listRoutes(db),
    listVehicles(db),
    db.select().from(transportRouteVehicles),
  ])
  return {
    data: routeRows.map((r) => ({
      ...adminRoute(r),
      vehicleOptions: optionRows
        .filter((o) => o.routeId === r.id)
        .map((o) => {
          const v = vehicleRows.find((x) => x.id === o.vehicleId)
          return { id: o.id, vehicleId: o.vehicleId, isActive: o.isActive, vehicle: v ? adminVehicle(v) : null }
        }),
    })),
  }
})
