import { generateInvoicePdf } from '../server/services/tour-invoice-pdf'
import fs from 'fs'
import path from 'path'

async function main() {
  const outDir = path.resolve(process.cwd(), 'tmp/invoice-pdfs')
  fs.mkdirSync(outDir, { recursive: true })

  const invoice = {
    id: 2,
    invoiceCode: 'INV-2026-0002',
    amountIdr: 30000000,
    state: 'ISSUED',
    issueDate: '2026-09-17',
    dueDate: '2026-09-24',
    description: 'Tagihan DP Umrah\nUmrah Des Keluarga Ahmad - 3 Pax 2026\nRef. ORD-2026-0002',
    notes: null,
  }

  const pdfData = {
    invoice,
    order: {
      id: 2,
      orderCode: 'ORD-2026-0002',
      packageName: 'Umrah Des Keluarga Ahmad',
      serviceSummary: 'Umrah Des Keluarga Ahmad',
      orderType: 'UMROH',
      paxCount: 3,
      departureYear: '2026',
    },
    customer: {
      name: 'Ahmad Baru',
      customerCode: 'CUS-2026-0002',
      whatsapp: '08xx-xxxx-xxxx',
      phone: '08xx-xxxx-xxxx',
    },
    totalPaid: 0,
    outstanding: 30000000,
    paymentStatus: 'UNPAID',
    businessSettings: null,
  }

  const buffer = await generateInvoicePdf(pdfData)
  const outPath = path.join(outDir, `Invoice-INV-2026-0002-REFERENCE.pdf`)
  fs.writeFileSync(outPath, buffer)
  console.log(`Generated reference: ${outPath} (${buffer.length} bytes)`)
}

main().catch(console.error)
