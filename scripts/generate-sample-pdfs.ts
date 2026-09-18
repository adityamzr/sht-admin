import { generateInvoicePdf } from '../server/services/tour-invoice-pdf'
import fs from 'fs'
import path from 'path'

async function main() {
  const outDir = path.resolve(process.cwd(), 'tmp/invoice-pdfs')
  fs.mkdirSync(outDir, { recursive: true })

  const samples = [
    {
      name: 'UNPAID',
      invoice: {
        id: 1,
        invoiceCode: 'INV2609181847',
        amountIdr: 100000000,
        state: 'ISSUED',
        issueDate: '2026-09-18',
        dueDate: '2026-09-30',
        description: 'DP 30% - Paket Umroh Premium 12 Hari\nMakkah: Sofwah Tower, Madinah: Anwar Al Madinah\nInclude: Tiket, Visa, Hotel, Makan 3x',
        notes: 'Harap melakukan pembayaran sebelum jatuh tempo. Konfirmasi pembayaran via WhatsApp.',
      },
      totalPaid: 0,
      outstanding: 100000000,
      paymentStatus: 'UNPAID',
    },
    {
      name: 'PARTIAL',
      invoice: {
        id: 2,
        invoiceCode: 'INV2609181848',
        amountIdr: 100000000,
        state: 'ISSUED',
        issueDate: '2026-09-18',
        dueDate: '2026-09-25',
        description: 'Pelunasan 70% - Paket Umroh Premium',
        notes: null,
      },
      totalPaid: 30000000,
      outstanding: 70000000,
      paymentStatus: 'PARTIAL',
    },
    {
      name: 'PAID',
      invoice: {
        id: 3,
        invoiceCode: 'INV2609181849',
        amountIdr: 100000000,
        state: 'ISSUED',
        issueDate: '2026-09-10',
        dueDate: '2026-09-18',
        description: 'Pelunasan penuh - Paket Umroh Premium 12 Hari',
        notes: 'Terima kasih, pembayaran lunas.',
      },
      totalPaid: 100000000,
      outstanding: 0,
      paymentStatus: 'PAID',
    },
    {
      name: 'DRAFT',
      invoice: {
        id: 4,
        invoiceCode: 'INV2609181850',
        amountIdr: 50000000,
        state: 'DRAFT',
        issueDate: '2026-09-18',
        dueDate: null,
        description: 'Draft - Estimasi biaya tambahan',
        notes: null,
      },
      totalPaid: 0,
      outstanding: 50000000,
      paymentStatus: 'DRAFT',
    },
    {
      name: 'CANCELLED',
      invoice: {
        id: 5,
        invoiceCode: 'INV2609181851',
        amountIdr: 75000000,
        state: 'CANCELLED',
        issueDate: '2026-09-15',
        dueDate: '2026-09-20',
        description: 'Invoice dibatalkan - duplikat',
        notes: 'Dibatalkan karena duplikat dengan INV2609181847',
      },
      totalPaid: 0,
      outstanding: 75000000,
      paymentStatus: 'CANCELLED',
    },
    {
      name: 'OVERDUE',
      invoice: {
        id: 6,
        invoiceCode: 'INV2609181852',
        amountIdr: 100000000,
        state: 'ISSUED',
        issueDate: '2026-08-18',
        dueDate: '2026-09-01',
        description: 'Jatuh tempo - Pelunasan akhir',
        notes: null,
      },
      totalPaid: 20000000,
      outstanding: 80000000,
      paymentStatus: 'OVERDUE',
    },
    {
      name: 'LEGACY',
      invoice: {
        id: 7,
        invoiceCode: 'INV-2026-0001',
        amountIdr: 120000000,
        state: 'ISSUED',
        issueDate: '2026-09-01',
        dueDate: '2026-09-15',
        description: 'Legacy invoice format test',
        notes: 'Legacy code should still be displayable and downloadable',
      },
      totalPaid: 60000000,
      outstanding: 60000000,
      paymentStatus: 'PARTIAL',
    },
  ]

  for (const sample of samples) {
    const pdfData = {
      invoice: sample.invoice,
      order: {
        orderCode: 'ORD2609181846',
        packageName: 'Umroh Premium 12 Hari - September 2026',
        orderType: 'UMROH',
        paxCount: 2,
      },
      customer: {
        name: 'Ahmad Fauzi & Keluarga',
        whatsapp: '0812-3456-7890',
        email: 'ahmad.fauzi@example.com',
        city: 'Jakarta Selatan',
      },
      totalPaid: sample.totalPaid,
      outstanding: sample.outstanding,
      paymentStatus: sample.paymentStatus,
      businessSettings: null,
    }

    const buffer = await generateInvoicePdf(pdfData)
    const filename = `Invoice-${sample.invoice.invoiceCode}-${sample.name}.pdf`
    const outPath = path.join(outDir, filename)
    fs.writeFileSync(outPath, buffer)
    console.log(`Generated: ${outPath} (${buffer.length} bytes)`)
  }

  console.log(`\nAll sample PDFs generated in ${outDir}`)
}

main().catch(console.error)
