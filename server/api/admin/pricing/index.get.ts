import { useDb } from '~/server/db'
import { calculateSellingPrice, listPricingRecords, type PricingStrategy, type MarkupType } from '~/server/services/pricing'
import { adminPricingRecord } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityType = typeof query.entityType === 'string' ? query.entityType : undefined
  const entityId = typeof query.entityId === 'string' ? Number(query.entityId) : undefined
  const rows = await listPricingRecords(useDb(), entityType, entityId)
  return {
    data: rows.map((r) => {
      let selling = 0
      try {
        selling = calculateSellingPrice({
          strategy: r.strategy as PricingStrategy,
          supplierCost: r.supplierCost === null ? null : Number(r.supplierCost),
          markupType: r.markupType as MarkupType | null,
          markupValue: r.markupValue === null ? null : Number(r.markupValue),
          sellingPrice: r.sellingPrice === null ? null : Number(r.sellingPrice),
        })
      } catch {
        selling = 0
      }
      return adminPricingRecord(r, selling)
    }),
  }
})
