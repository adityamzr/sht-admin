import { useDb } from '~/server/db'
import { getTourInvoiceEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { generateInvoicePdf, getInvoicePdfFilename } from '~/server/services/tour-invoice-pdf'

/**
 * GET /api/admin/tour/invoices/:id/pdf
 * Server-side PDF generation – authenticated, workspace-authorized
 */

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID Invoice tidak valid' })

  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)

  // Fetch enriched invoice with finance calculations (server-side, VERIFIED only)
  const row = await getTourInvoiceEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Invoice tidak ditemukan' })

  // Workspace authorization already enforced by getTourInvoiceEnriched (workspaceId filter)
  // Additional check: ensure invoice belongs to workspace (already)
  if (row.workspaceId !== workspaceId) {
    throw createError({ statusCode: 403, statusMessage: 'Invoice bukan milik workspace ini' })
  }

  // Prepare PDF data – reuse hardened finance calculations
  const pdfData = {
    invoice: row,
    order: (row as any).order || null,
    customer: (row as any).customer || null,
    totalPaid: Number((row as any).totalPaid || 0),
    outstanding: Number((row as any).outstanding || 0),
    paymentStatus: String((row as any).paymentStatus || 'UNPAID'),
    businessSettings: null, // TODO: fetch from Tour Settings if exists, omit if not configured
  }

  try {
    const pdfBuffer = await generateInvoicePdf(pdfData)
    const filename = getInvoicePdfFilename(row.invoiceCode)

    // Set headers for PDF download
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    setHeader(event, 'Content-Length', pdfBuffer.length)

    return pdfBuffer
  } catch (e: any) {
    console.error('[invoice/pdf] generation failed:', e?.message, e?.stack)
    throw createError({
      statusCode: 500,
      statusMessage: 'Gagal membuat PDF Invoice',
      data: { error: e?.message },
    })
  }
})
