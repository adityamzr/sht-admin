import { useDb } from '~/server/db'
import { updateLeadStatus } from '~/server/services/leads'
import { leadStatusPatch } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, leadStatusPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Status lead tidak valid' })
  const row = await updateLeadStatus(useDb(), id, body.data.status, body.data.notes)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Lead tidak ditemukan' })
  return { data: { id: row.id, status: row.status, updatedAt: row.updatedAt } }
})
