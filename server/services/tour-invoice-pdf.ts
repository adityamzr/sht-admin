/**
 * Tour Invoice PDF Generator – Server-side, deterministic
 * Uses pdfkit for A4 portrait, clean premium design
 * Brand colors: Dark Olive #3A4428, Gold #D3C168
 */

import { getFinanceOverview } from './tour-finance'
import { invoiceBrandConfig } from '../utils/invoice-brand'

function toIsoDateString(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') {
    const s = d.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s
  }
  if (d instanceof Date) {
    try { return d.toISOString().slice(0, 10) } catch { return null }
  }
  return String(d).slice(0, 10)
}

function formatIndonesianDate(dateKey: string | null | Date): string {
  if (!dateKey) return '—'
  let iso: string | null = null
  if (dateKey instanceof Date) {
    try { iso = dateKey.toISOString().slice(0, 10) } catch { return '—' }
  } else if (typeof dateKey === 'string') {
    iso = dateKey.slice(0, 10)
  } else {
    iso = toIsoDateString(dateKey)
  }
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—'
  try {
    const date = new Date(`${iso}T00:00:00.000Z`)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date)
  } catch {
    return iso
  }
}

function formatIdr(amount: number | null | undefined): string {
  const n = Number(amount || 0)
  const sign = n < 0 ? '-' : ''
  return `${sign}Rp ${Math.abs(n).toLocaleString('id-ID')}`
}

function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'UNPAID': return 'BELUM DIBAYAR'
    case 'PARTIAL': return 'DIBAYAR SEBAGIAN'
    case 'PAID': return 'LUNAS'
    case 'OVERDUE': return 'JATUH TEMPO'
    case 'DRAFT': return 'DRAFT'
    case 'CANCELLED': return 'DIBATALKAN'
    default: return status
  }
}

function getInvoiceStateLabel(state: string): string {
  switch (state) {
    case 'DRAFT': return 'DRAFT'
    case 'ISSUED': return 'DITERBITKAN'
    case 'CANCELLED': return 'DIBATALKAN'
    default: return state
  }
}

function sanitizeFilename(name: string): string {
  return String(name || '').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 100)
}

export interface InvoicePdfData {
  invoice: any
  order: any | null
  customer: any | null
  totalPaid: number
  outstanding: number
  paymentStatus: string
  // Optional business settings
  businessSettings?: {
    bankName?: string | null
    accountNumber?: string | null
    accountName?: string | null
    whatsapp?: string | null
    email?: string | null
    website?: string | null
  } | null
}

/**
 * Generate Invoice PDF Buffer using pdfkit
 * Returns Buffer
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default
  const fs = await import('fs')

  const { invoice, order, customer, totalPaid, outstanding, paymentStatus, businessSettings } = data
  const brand = invoiceBrandConfig

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoiceCode}`,
          Author: 'Sudut Haramain',
          Subject: `Invoice ${invoice.invoiceCode}`,
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Colors
      const darkOlive = brand.colors.darkOlive
      const gold = brand.colors.gold
      const charcoal = brand.colors.charcoal

      // Try to load logo
      let logoPath: string | null = null
      try {
        const path = require('path')
        const possible = [
          path.resolve(process.cwd(), brand.logoPath),
          path.resolve(process.cwd(), brand.fallbackLogoPath),
          path.resolve(process.cwd(), 'assets/images/logo_sh.png'),
          path.resolve(process.cwd(), 'assets/images/logo.png'),
        ]
        for (const p of possible) {
          if (fs.existsSync(p)) {
            logoPath = p
            break
          }
        }
      } catch {}

      // === HEADER ===
      // Logo
      if (logoPath) {
        try {
          doc.image(logoPath, 50, 45, { width: 60, height: 60, fit: [60, 60] })
        } catch {
          // If image fails, draw placeholder
          doc.rect(50, 45, 60, 60).fill(brand.colors.lightGray)
          doc.fillColor(darkOlive).fontSize(8).text('LOGO', 50, 70, { width: 60, align: 'center' })
        }
      }

      // Company name
      doc.fillColor(darkOlive).fontSize(16).font('Helvetica-Bold').text(brand.company.name, 120, 50)
      doc.fillColor(charcoal).fontSize(9).font('Helvetica').text(brand.company.tagline, 120, 70)

      // INVOICE title
      doc.fillColor(darkOlive).fontSize(24).font('Helvetica-Bold').text('INVOICE', 0, 50, { align: 'right' })

      // Invoice code
      doc.fillColor(charcoal).fontSize(10).font('Helvetica').text(`Nomor: ${invoice.invoiceCode}`, 0, 80, { align: 'right' })

      // Line separator with gold
      doc.moveTo(50, 115).lineTo(545, 115).strokeColor(gold).lineWidth(2).stroke()

      // === DOCUMENT INFORMATION ===
      let y = 135
      doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('INFORMASI DOKUMEN', 50, y)
      y += 18

      const infoLeft = [
        { label: 'Tanggal Invoice', value: formatIndonesianDate(invoice.issueDate) },
        { label: 'Jatuh Tempo', value: invoice.dueDate ? formatIndonesianDate(invoice.dueDate) : '—' },
      ]
      const infoRight = [
        { label: 'Status Invoice', value: getInvoiceStateLabel(invoice.state) },
        { label: 'Status Pembayaran', value: getPaymentStatusLabel(paymentStatus) },
      ]

      // Left column
      for (const item of infoLeft) {
        doc.fillColor('#666').fontSize(8).font('Helvetica').text(item.label.toUpperCase(), 50, y)
        doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold').text(item.value, 50, y + 10)
        y += 28
      }

      // Right column (reset y)
      let yRight = 153
      for (const item of infoRight) {
        doc.fillColor('#666').fontSize(8).font('Helvetica').text(item.label.toUpperCase(), 300, yRight)
        doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold').text(item.value, 300, yRight + 10)
        yRight += 28
      }

      y = Math.max(y, yRight) + 10

      // === CUSTOMER INFORMATION ===
      doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('DITAGIHKAN KEPADA', 50, y)
      y += 18

      if (customer) {
        doc.fillColor(charcoal).fontSize(12).font('Helvetica-Bold').text(customer.name || '—', 50, y)
        y += 16
        if (customer.whatsapp) {
          doc.fillColor('#666').fontSize(9).font('Helvetica').text(`WhatsApp: ${customer.whatsapp}`, 50, y)
          y += 12
        }
        if (customer.email) {
          doc.fillColor('#666').fontSize(9).font('Helvetica').text(`Email: ${customer.email}`, 50, y)
          y += 12
        }
        if (customer.city) {
          doc.fillColor('#666').fontSize(9).font('Helvetica').text(`Kota: ${customer.city}`, 50, y)
          y += 12
        }
      } else {
        doc.fillColor('#666').fontSize(10).font('Helvetica').text('Data pelanggan tidak tersedia', 50, y)
        y += 12
      }

      y += 10

      // === ORDER REFERENCE ===
      doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('REFERENSI ORDER', 50, y)
      y += 18

      if (order) {
        doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold').text(order.orderCode || `Order #${order.id}`, 50, y)
        y += 14
        if (order.packageName || order.serviceSummary) {
          doc.fillColor('#444').fontSize(9).font('Helvetica').text(order.packageName || order.serviceSummary || '', 50, y, { width: 250 })
          y += 12
        }
        doc.fillColor('#666').fontSize(9).font('Helvetica').text(`Tipe: ${order.orderType || '—'} | Pax: ${order.paxCount || 0} Pax`, 50, y)
        y += 12
      } else {
        doc.fillColor('#666').fontSize(9).font('Helvetica').text(`Order #${invoice.orderId}`, 50, y)
        y += 12
      }

      y += 10

      // === INVOICE DESCRIPTION ===
      doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('DESKRIPSI TAGIHAN', 50, y)
      y += 18

      const description = invoice.description || '—'
      doc.fillColor(charcoal).fontSize(10).font('Helvetica').text(description, 50, y, { width: 495, lineGap: 2 })
      // Calculate height of description
      const descHeight = doc.heightOfString(description, { width: 495 })
      y += descHeight + 20

      // Check if we need new page
      if (y > 550) {
        doc.addPage()
        y = 50
      }

      // === FINANCIAL SUMMARY ===
      doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('RINGKASAN KEUANGAN', 50, y)
      y += 18

      // Box for financial summary
      const boxY = y
      const boxHeight = 90
      doc.rect(50, boxY, 495, boxHeight).fillColor(brand.colors.lightGray).fill()
      doc.rect(50, boxY, 495, boxHeight).strokeColor(brand.colors.border).lineWidth(0.5).stroke()

      // Total Tagihan
      doc.fillColor('#666').fontSize(8).font('Helvetica').text('TOTAL TAGIHAN', 65, boxY + 12)
      doc.fillColor(charcoal).fontSize(14).font('Helvetica-Bold').text(formatIdr(Number(invoice.amountIdr)), 65, boxY + 24)

      // Sudah Dibayar
      doc.fillColor('#666').fontSize(8).font('Helvetica').text('SUDAH DIBAYAR', 220, boxY + 12)
      doc.fillColor('#2E7D32').fontSize(14).font('Helvetica-Bold').text(formatIdr(totalPaid), 220, boxY + 24)

      // Sisa Tagihan
      doc.fillColor('#666').fontSize(8).font('Helvetica').text('SISA TAGIHAN', 375, boxY + 12)
      const outstandingColor = outstanding > 0 ? '#C62828' : '#2E7D32'
      doc.fillColor(outstandingColor).fontSize(14).font('Helvetica-Bold').text(formatIdr(outstanding), 375, boxY + 24)

      // Payment status badge
      doc.fillColor('#666').fontSize(8).font('Helvetica').text('STATUS', 65, boxY + 55)
      doc.fillColor(darkOlive).fontSize(11).font('Helvetica-Bold').text(getPaymentStatusLabel(paymentStatus), 65, boxY + 67)

      y = boxY + boxHeight + 25

      // Check page
      if (y > 550) {
        doc.addPage()
        y = 50
      }

      // === PAYMENT INFORMATION ===
      if (businessSettings && (businessSettings.bankName || businessSettings.accountNumber)) {
        doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('INFORMASI PEMBAYARAN', 50, y)
        y += 18

        if (businessSettings.bankName) {
          doc.fillColor('#666').fontSize(8).font('Helvetica').text('BANK', 50, y)
          doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold').text(businessSettings.bankName, 50, y + 10)
          y += 26
        }
        if (businessSettings.accountNumber) {
          doc.fillColor('#666').fontSize(8).font('Helvetica').text('NOMOR REKENING', 50, y)
          doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold').text(businessSettings.accountNumber, 50, y + 10)
          y += 26
        }
        if (businessSettings.accountName) {
          doc.fillColor('#666').fontSize(8).font('Helvetica').text('ATAS NAMA', 50, y)
          doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold').text(businessSettings.accountName, 50, y + 10)
          y += 26
        }

        y += 5
        doc.fillColor('#666').fontSize(9).font('Helvetica-Oblique').text(`Harap mencantumkan nomor Invoice ${invoice.invoiceCode} pada keterangan pembayaran.`, 50, y, { width: 495 })
        y += 20
      }

      // === NOTES ===
      if (invoice.notes) {
        if (y > 600) {
          doc.addPage()
          y = 50
        }
        doc.fillColor(darkOlive).fontSize(10).font('Helvetica-Bold').text('CATATAN', 50, y)
        y += 18
        doc.fillColor(charcoal).fontSize(9).font('Helvetica').text(invoice.notes, 50, y, { width: 495, lineGap: 2 })
        const notesHeight = doc.heightOfString(invoice.notes, { width: 495 })
        y += notesHeight + 20
      }

      // === FOOTER ===
      // Ensure footer at bottom
      const footerY = 750
      if (y < footerY - 50) {
        y = footerY - 50
      } else if (y > 700) {
        doc.addPage()
        y = footerY - 50
      }

      doc.moveTo(50, y).lineTo(545, y).strokeColor(brand.colors.border).lineWidth(0.5).stroke()
      y += 10

      doc.fillColor('#666').fontSize(9).font('Helvetica').text(brand.footer.thankYou, 50, y, { width: 495, align: 'center' })
      y += 20

      // Contact info
      const contacts: string[] = []
      if (businessSettings?.whatsapp) contacts.push(`WhatsApp: ${businessSettings.whatsapp}`)
      if (businessSettings?.email) contacts.push(`Email: ${businessSettings.email}`)
      if (businessSettings?.website) contacts.push(`Website: ${businessSettings.website}`)

      if (contacts.length) {
        doc.fillColor('#888').fontSize(8).font('Helvetica').text(contacts.join(' | '), 50, y, { width: 495, align: 'center' })
      }

      // === WATERMARKS FOR DRAFT/CANCELLED ===
      if (invoice.state === 'DRAFT') {
        doc.save()
        doc.rotate(-45, { origin: [300, 400] })
        doc.fillColor('#000').opacity(0.06).fontSize(80).font('Helvetica-Bold').text('DRAFT', 50, 350, { width: 500, align: 'center' })
        doc.opacity(1).restore()

        // Also add text
        doc.fillColor('#C62828').fontSize(12).font('Helvetica-Bold').text('DRAFT — BELUM DITERBITKAN', 0, 120, { align: 'center' })
      } else if (invoice.state === 'CANCELLED') {
        doc.save()
        doc.rotate(-45, { origin: [300, 400] })
        doc.fillColor('#C62828').opacity(0.08).fontSize(70).font('Helvetica-Bold').text('DIBATALKAN', 50, 350, { width: 500, align: 'center' })
        doc.opacity(1).restore()

        doc.fillColor('#C62828').fontSize(12).font('Helvetica-Bold').text('DIBATALKAN / CANCELLED', 0, 120, { align: 'center' })
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

export function getInvoicePdfFilename(invoiceCode: string): string {
  const safe = sanitizeFilename(invoiceCode)
  return `Invoice-${safe}.pdf`
}
