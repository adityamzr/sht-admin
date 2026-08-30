import { eq } from 'drizzle-orm'
import { flights, hotelRoomTypes, pricingRecords, services, transportRouteVehicles } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { getPeriod, calculateSellingPrice, type PricingStrategy, type MarkupType } from '~/server/services/pricing'
import { pricingRecordInput } from '~/server/utils/validators'
import { adminPricingRecord } from '~/server/utils/serializers'

/** Validasi entitas yang direferensikan benar-benar ada & aktif. */
async function entityExists(db: ReturnType<typeof useDb>, entityType: string, entityId: number): Promise<boolean> {
  const table =
    entityType === 'hotel_room_type'
      ? hotelRoomTypes
      : entityType === 'flight'
        ? flights
        : entityType === 'route_vehicle'
          ? transportRouteVehicles
          : services
  const rows = await db.select({ id: table.id }).from(table).where(eq(table.id, entityId)).limit(1)
  return rows.length > 0
}

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, pricingRecordInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await entityExists(db, body.data.entityType, body.data.entityId))) {
    throw createError({ statusCode: 404, statusMessage: `Entitas ${body.data.entityType}#${body.data.entityId} tidak ditemukan` })
  }
  if (!(await getPeriod(db, body.data.periodId))) {
    throw createError({ statusCode: 404, statusMessage: 'Periode harga tidak ditemukan' })
  }
  let rows
  try {
    rows = await db
      .insert(pricingRecords)
      .values({
        entityType: body.data.entityType,
        entityId: body.data.entityId,
        periodId: body.data.periodId,
        currency: body.data.currency,
        pricingUnit: body.data.pricingUnit,
        strategy: body.data.strategy,
        supplierCost: body.data.supplierCost === null ? null : String(body.data.supplierCost),
        markupType: body.data.markupType,
        markupValue: body.data.markupValue === null ? null : String(body.data.markupValue),
        sellingPrice: body.data.sellingPrice === null ? null : String(body.data.sellingPrice),
        internalNotes: body.data.internalNotes,
        isActive: body.data.isActive,
      })
      .returning()
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('unique')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Sudah ada harga untuk kombinasi entitas + periode + mata uang ini.',
      })
    }
    throw err
  }
  const r = rows[0]
  const selling = calculateSellingPrice({
    strategy: r.strategy as PricingStrategy,
    supplierCost: r.supplierCost === null ? null : Number(r.supplierCost),
    markupType: r.markupType as MarkupType | null,
    markupValue: r.markupValue === null ? null : Number(r.markupValue),
    sellingPrice: r.sellingPrice === null ? null : Number(r.sellingPrice),
  })
  return { data: adminPricingRecord(r, selling) }
})
