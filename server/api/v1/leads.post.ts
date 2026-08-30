import { useDb } from '~/server/db'
import { getService } from '~/server/services/catalog'
import { createLead } from '~/server/services/leads'
import { serviceInquiryInput } from '~/server/utils/validators'

/**
 * M3 — SERVICE INQUIRY (PUBLIK, minimal Service Buyer).
 * Membuat lead origin=service_inquiry TANPA estimasi.
 * serviceId opsional; bila diisi harus layanan aktif & standalone.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, serviceInquiryInput.safeParse)
  if (!body.success) {
    throw createError({ statusCode: 422, statusMessage: body.error.issues[0]?.message ?? 'Data tidak valid. Periksa kembali isian Anda.' })
  }

  const db = useDb()
  const { serviceId, name, whatsapp, email, notes } = body.data

  if (serviceId !== null && serviceId !== undefined) {
    const service = await getService(db, serviceId)
    if (!service || !service.isActive || !service.standalone) {
      throw createError({ statusCode: 422, statusMessage: 'Layanan yang dipilih tidak tersedia. Silakan pilih layanan lain.' })
    }
  }

  const lead = await createLead(db, {
    name: name.trim(),
    whatsapp,
    email: email ?? null,
    origin: 'service_inquiry',
    source: 'website-services',
    serviceId: serviceId ?? null,
    notes: notes ?? null,
  })

  return { data: { id: lead.id, status: lead.status } }
})
