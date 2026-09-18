import { useDb } from '~/server/db'
import { updateLead } from '~/server/services/leads'
import { z } from 'zod'

const patchInput = z.object({
  name: z.string().min(2).max(150).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  source: z.string().max(50).optional(),
  paxEstimate: z.number().int().min(1).max(1000).nullable().optional(),
  serviceId: z.number().int().positive().nullable().optional(),
  status: z.enum(['NEW','CONTACTED','FOLLOW_UP','WON','LOST']).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, patchInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const row = await updateLead(db, id, body.data)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Lead tidak ditemukan' })
  return { data: row }
})
