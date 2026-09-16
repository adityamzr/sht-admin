import { useDb } from '~/server/db'
import { createLead } from '~/server/services/leads'
import { z } from 'zod'

const leadManualInput = z.object({
  name: z.string().min(2).max(150),
  whatsapp: z.string().min(8).max(20),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  source: z.string().min(2).max(50),
  paxEstimate: z.number().int().min(1).max(1000).nullable().optional(),
  serviceId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, leadManualInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const row = await createLead(db, {
    name: body.data.name,
    whatsapp: body.data.whatsapp,
    email: body.data.email || null,
    origin: 'service_inquiry',
    source: body.data.source,
    serviceId: body.data.serviceId ?? null,
    paxEstimate: body.data.paxEstimate ?? null,
    notes: body.data.notes ?? null,
  })
  return { data: row }
})
