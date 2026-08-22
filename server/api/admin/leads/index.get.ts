import { useDb } from '~/server/db'
import { listLeads } from '~/server/services/leads'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : undefined
  const origin = typeof query.origin === 'string' ? query.origin : undefined
  const rows = await listLeads(useDb(), { status, origin })
  return {
    data: rows.map((r) => ({
      id: r.lead.id,
      name: r.lead.name,
      whatsapp: r.lead.whatsapp,
      email: r.lead.email,
      origin: r.lead.origin,
      source: r.lead.source,
      status: r.lead.status,
      notes: r.lead.notes,
      createdAt: r.lead.createdAt,
      updatedAt: r.lead.updatedAt,
      serviceId: r.lead.serviceId,
      serviceName: r.serviceName,
      estimationId: r.lead.estimationId,
      estimationNumber: r.estimationNumber,
    })),
  }
})
