import { useDb } from '~/server/db'
import { getLead } from '~/server/services/leads'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await getLead(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Lead tidak ditemukan' })
  return {
    data: {
      id: row.lead.id,
      name: row.lead.name,
      whatsapp: row.lead.whatsapp,
      email: row.lead.email,
      origin: row.lead.origin,
      source: row.lead.source,
      status: row.lead.status,
      notes: row.lead.notes,
      createdAt: row.lead.createdAt,
      updatedAt: row.lead.updatedAt,
      serviceId: row.lead.serviceId,
      serviceName: row.serviceName,
      estimationId: row.lead.estimationId,
      estimationNumber: row.estimationNumber,
    },
  }
})
