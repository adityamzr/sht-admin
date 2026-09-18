/**
 * Tour Invoice PDF Generator – Approved Design Match (page-1.png)
 * Uses pdfkit, A4 portrait, clean premium, matches Sudut Haramain Tour reference
 * Colors: Dark Olive #2F3822, Gold #D3C168, Beige #FAF6E8
 */

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

function formatIndonesianDateShort(dateKey: string | null | Date): string {
  // Reference design uses short: "17 Sep 2026"
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
    // Use en-GB for short month like "17 Sep 2026" but with Indonesian locale short month is similar
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date)
  } catch {
    return iso
  }
}

function formatIdr(amount: number | null | undefined): string {
  const n = Number(amount || 0)
  if (n === 0) return 'Rp0'
  return `Rp${n.toLocaleString('id-ID')}`
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
    case 'ISSUED': return 'ISSUED'
    case 'CANCELLED': return 'CANCELLED'
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
  businessSettings?: {
    bankName?: string | null
    accountNumber?: string | null
    accountName?: string | null
    whatsapp?: string | null
    email?: string | null
    website?: string | null
  } | null
}

export function getInvoicePdfFilename(invoiceCode: string): string {
  const safe = sanitizeFilename(invoiceCode)
  return `Invoice-${safe}.pdf`
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default
  const fs = await import('fs')
  const path = await import('path')

  const { invoice, order, customer, totalPaid, outstanding, paymentStatus } = data
  const brand = invoiceBrandConfig
  const c = brand.colors

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0, // we handle margins manually for top bar
        info: {
          Title: `Invoice ${invoice.invoiceCode}`,
          Author: 'Sudut Haramain Tour',
          Subject: `Invoice ${invoice.invoiceCode}`,
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // === TOP BAR ===
      const topBarHeight = 32
      doc.rect(0, 0, 595, topBarHeight).fill(c.darkOlive)
      doc.rect(0, topBarHeight, 595, 2).fill(c.gold)

      // === HEADER ===
      // Logo square 85x85 at 50,50
      let logoPath: string | null = null
      try {
        const possible = [
          path.resolve(process.cwd(), brand.logoPath),
          path.resolve(process.cwd(), brand.fallbackLogoPath),
          path.resolve(process.cwd(), 'assets/images/logo-invoice.png'),
          path.resolve(process.cwd(), 'assets/images/logo_sh.png'),
        ]
        for (const p of possible) {
          if (fs.existsSync(p)) {
            logoPath = p
            break
          }
        }
      } catch {}

      const logoX = 50
      const logoY = 50
      const logoSize = 85

      if (logoPath) {
        try {
          // Draw image – pdfkit will handle
          doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize })
        } catch {
          // Fallback: dark square with text
          doc.rect(logoX, logoY, logoSize, logoSize).fill(c.darkOlive)
          doc.fillColor(c.gold).fontSize(10).font('Helvetica-Bold').text('SUDUT\nHARAMAIN', logoX, logoY + 30, { width: logoSize, align: 'center' })
        }
      } else {
        doc.rect(logoX, logoY, logoSize, logoSize).fill(c.darkOlive)
      }

      // Company name next to logo
      const companyX = logoX + logoSize + 15
      doc.fillColor(c.darkOlive).fontSize(14).font('Helvetica-Bold').text(brand.company.name, companyX, logoY + 8)
      doc.fillColor(c.grayText).fontSize(9).font('Helvetica').text(brand.company.tagline, companyX, logoY + 28)
      doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(brand.company.website, companyX, logoY + 42)

      // Right side INVOICE
      doc.fillColor(c.darkOlive).fontSize(28).font('Helvetica-Bold').text('INVOICE', 0, logoY + 5, { align: 'right', width: 545 })
      doc.fillColor(c.grayLight).fontSize(10).font('Helvetica').text('Tagihan Customer', 0, logoY + 38, { align: 'right', width: 545 })

      // === INFO BOX (NO. INVOICE, TANGGAL, JATUH TEMPO) ===
      const infoBoxY = 160
      const infoBoxX = 50
      const infoBoxW = 495
      const infoBoxH = 62
      doc.roundedRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH, 12).fill(c.beigeAlt)

      // Vertical separators
      const sep1X = infoBoxX + 165
      const sep2X = infoBoxX + 330
      doc.moveTo(sep1X, infoBoxY + 12).lineTo(sep1X, infoBoxY + infoBoxH - 12).strokeColor(c.borderLight).lineWidth(0.8).stroke()
      doc.moveTo(sep2X, infoBoxY + 12).lineTo(sep2X, infoBoxY + infoBoxH - 12).strokeColor(c.borderLight).lineWidth(0.8).stroke()

      // Column 1: NO. INVOICE
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('NO. INVOICE', infoBoxX + 18, infoBoxY + 14)
      doc.fillColor(c.darkOlive).fontSize(11).font('Helvetica-Bold').text(invoice.invoiceCode, infoBoxX + 18, infoBoxY + 28, { width: 130 })

      // Column 2: TANGGAL
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('TANGGAL', sep1X + 18, infoBoxY + 14)
      doc.fillColor(c.darkOlive).fontSize(11).font('Helvetica-Bold').text(formatIndonesianDateShort(invoice.issueDate), sep1X + 18, infoBoxY + 28)

      // Column 3: JATUH TEMPO
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('JATUH TEMPO', sep2X + 18, infoBoxY + 14)
      const dueDateStr = invoice.dueDate ? formatIndonesianDateShort(invoice.dueDate) : '—'
      doc.fillColor(c.darkOlive).fontSize(11).font('Helvetica-Bold').text(dueDateStr, sep2X + 18, infoBoxY + 28)

      // === STATUS BADGES ===
      const badgeY = infoBoxY + infoBoxH + 16
      let badgeX = 50

      // ISSUED badge
      const stateLabel = getInvoiceStateLabel(invoice.state)
      const stateBadgeWidth = stateLabel.length * 6 + 20
      doc.roundedRect(badgeX, badgeY, stateBadgeWidth, 22, 11).fill(c.blueBadgeBg)
      doc.fillColor(c.blueBadgeText).fontSize(8).font('Helvetica-Bold').text(stateLabel, badgeX, badgeY + 7, { width: stateBadgeWidth, align: 'center' })
      badgeX += stateBadgeWidth + 10

      // Payment status badge
      const payStatusMap: Record<string, { bg: string; text: string; label: string }> = {
        UNPAID: { bg: c.yellowBadgeBg, text: c.yellowBadgeText, label: 'UNPAID' },
        PARTIAL: { bg: c.yellowBadgeBg, text: c.yellowBadgeText, label: 'PARTIAL' },
        PAID: { bg: '#E8F5E9', text: '#2E7D32', label: 'PAID' },
        OVERDUE: { bg: '#FFEBEE', text: '#C62828', label: 'OVERDUE' },
        DRAFT: { bg: '#FFF3E0', text: '#EF6C00', label: 'DRAFT' },
        CANCELLED: { bg: '#FFEBEE', text: '#C62828', label: 'CANCELLED' },
      }
      const payBadgeInfo = payStatusMap[paymentStatus] || payStatusMap.UNPAID
      const payBadgeLabel = paymentStatus
      const payBadgeWidth = payBadgeLabel.length * 6 + 20
      doc.roundedRect(badgeX, badgeY, payBadgeWidth, 22, 11).fill(payBadgeInfo.bg)
      doc.fillColor(payBadgeInfo.text).fontSize(8).font('Helvetica-Bold').text(payBadgeLabel, badgeX, badgeY + 7, { width: payBadgeWidth, align: 'center' })

      // === TWO CARDS ===
      const cardY = badgeY + 38
      const cardW = 238
      const cardH = 105
      const cardLeftX = 50
      const cardRightX = 50 + cardW + 19

      // Left card: DITAGIHKAN KEPADA
      doc.roundedRect(cardLeftX, cardY, cardW, cardH, 12).fill(c.white)
      doc.roundedRect(cardLeftX, cardY, cardW, cardH, 12).strokeColor(c.border).lineWidth(0.8).stroke()
      doc.fillColor(c.darkOlive).fontSize(9).font('Helvetica-Bold').text('DITAGIHKAN KEPADA', cardLeftX + 16, cardY + 14)
      if (customer) {
        doc.fillColor(c.charcoal).fontSize(13).font('Helvetica-Bold').text(customer.name || '—', cardLeftX + 16, cardY + 32, { width: cardW - 32 })
        let custY = cardY + 52
        if (customer.customerCode || invoice.customer?.customerCode) {
          const custCode = customer.customerCode || (invoice as any).customer?.customerCode || customer?.id ? `CUS-${customer?.id}` : ''
          if (custCode) {
            doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(`Customer: ${customer.customerCode || custCode}`, cardLeftX + 16, custY, { width: cardW - 32 })
            custY += 14
          }
        }
        const contact = customer.whatsapp || customer.phone || customer.email
        if (contact) {
          const contactLabel = customer.whatsapp ? `Kontak: ${customer.whatsapp}` : `Kontak: ${contact}`
          // Mask like 08xx-xxxx-xxxx if needed, but show as is
          doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(contactLabel, cardLeftX + 16, custY, { width: cardW - 32 })
        }
      } else {
        doc.fillColor(c.grayLight).fontSize(10).font('Helvetica').text('Data pelanggan tidak tersedia', cardLeftX + 16, cardY + 35)
      }

      // Right card: REFERENSI ORDER
      doc.roundedRect(cardRightX, cardY, cardW, cardH, 12).fill(c.white)
      doc.roundedRect(cardRightX, cardY, cardW, cardH, 12).strokeColor(c.border).lineWidth(0.8).stroke()
      doc.fillColor(c.darkOlive).fontSize(9).font('Helvetica-Bold').text('REFERENSI ORDER', cardRightX + 16, cardY + 14)
      if (order) {
        doc.fillColor(c.charcoal).fontSize(12).font('Helvetica-Bold').text(order.orderCode || `Order #${order.id}`, cardRightX + 16, cardY + 32, { width: cardW - 32 })
        let orderY = cardY + 52
        const pkg = order.packageName || order.serviceSummary || ''
        if (pkg) {
          doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(pkg, cardRightX + 16, orderY, { width: cardW - 32 })
          orderY += 14
        }
        const paxInfo = `${order.paxCount || 0} Pax${order.orderType ? ` - ${order.orderType}` : ''}${order.departureYear ? ` - ${order.departureYear}` : ' - 2026'}`
        // Reference shows "3 Pax - 2026"
        doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(paxInfo, cardRightX + 16, orderY)
      } else {
        doc.fillColor(c.charcoal).fontSize(11).font('Helvetica-Bold').text(`Order #${invoice.orderId}`, cardRightX + 16, cardY + 32)
        doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(`Ref. ${invoice.invoiceCode}`, cardRightX + 16, cardY + 52)
      }

      // === DETAIL TAGIHAN ===
      const detailTitleY = cardY + cardH + 28
      doc.fillColor(c.charcoal).fontSize(13).font('Helvetica-Bold').text('Detail Tagihan', 50, detailTitleY)
      // Gold underline
      doc.rect(50, detailTitleY + 18, 110, 2).fill(c.gold)

      // Table header
      const tableHeaderY = detailTitleY + 32
      const tableX = 50
      const tableW = 495
      const tableHeaderH = 32
      doc.roundedRect(tableX, tableHeaderY, tableW, tableHeaderH, 6).fill(c.beigeAlt)

      // Header texts
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('DESKRIPSI', tableX + 16, tableHeaderY + 12)
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('QTY', tableX + 280, tableHeaderY + 12, { width: 40, align: 'center' })
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('NOMINAL', tableX + 340, tableHeaderY + 12, { width: 70, align: 'right' })
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica-Bold').text('TOTAL', tableX + 425, tableHeaderY + 12, { width: 55, align: 'right' })

      // Table row
      const rowY = tableHeaderY + tableHeaderH + 14
      const desc = invoice.description || 'Tagihan'
      // Title line bold
      const firstLine = desc.split('\n')[0] || 'Tagihan DP Umrah'
      doc.fillColor(c.charcoal).fontSize(10).font('Helvetica-Bold').text(firstLine, tableX + 16, rowY, { width: 250 })

      // Subtitle: order package or second line
      let subY = rowY + 16
      if (order) {
        const sub = `${order.packageName || order.serviceSummary || ''} - ${order.paxCount || 0} Pax ${order.orderType ? order.orderType : ''}`.trim()
        if (sub) {
          doc.fillColor(c.grayLight).fontSize(9).font('Helvetica').text(sub, tableX + 16, subY, { width: 250 })
          subY += 12
        }
      }
      // Ref line
      doc.fillColor(c.grayLight).fontSize(8).font('Helvetica').text(`Ref. ${order?.orderCode || `Order #${invoice.orderId}`}`, tableX + 16, subY)

      // QTY, NOMINAL, TOTAL
      doc.fillColor(c.charcoal).fontSize(9).font('Helvetica').text('1', tableX + 280, rowY + 4, { width: 40, align: 'center' })
      doc.fillColor(c.charcoal).fontSize(9).font('Helvetica').text(formatIdr(Number(invoice.amountIdr)), tableX + 340, rowY + 4, { width: 70, align: 'right' })
      doc.fillColor(c.charcoal).fontSize(9).font('Helvetica-Bold').text(formatIdr(Number(invoice.amountIdr)), tableX + 425, rowY + 4, { width: 55, align: 'right' })

      // Horizontal line after row
      const afterRowY = rowY + 55
      doc.moveTo(tableX, afterRowY).lineTo(tableX + tableW, afterRowY).strokeColor(c.borderLight).lineWidth(0.8).stroke()

      // === BOTTOM SECTION ===
      const bottomY = afterRowY + 28

      // Left: Informasi Pembayaran box
      const payBoxX = 50
      const payBoxW = 210
      const payBoxH = 125
      doc.roundedRect(payBoxX, bottomY, payBoxW, payBoxH, 12).fill(c.beigeAlt)

      doc.fillColor(c.charcoal).fontSize(10).font('Helvetica-Bold').text('Informasi Pembayaran', payBoxX + 14, bottomY + 14)
      doc.fillColor(c.grayText).fontSize(8).font('Helvetica').text('Silakan lakukan pembayaran melalui rekening resmi yang diinformasikan oleh admin Sudut Haramain.', payBoxX + 14, bottomY + 32, { width: payBoxW - 28, lineGap: 2 })

      doc.fillColor(c.grayText).fontSize(8).font('Helvetica').text('Cantumkan kode invoice saat konfirmasi pembayaran:', payBoxX + 14, bottomY + 72, { width: payBoxW - 28 })
      doc.fillColor(c.darkOlive).fontSize(8).font('Helvetica-Bold').text(invoice.invoiceCode, payBoxX + 14, bottomY + 98, { width: payBoxW - 28 })

      // Right: Summary
      const sumX = 300
      const sumW = 245
      let sumY = bottomY + 8

      // TOTAL TAGIHAN
      doc.fillColor(c.charcoal).fontSize(9).font('Helvetica-Bold').text('TOTAL TAGIHAN', sumX, sumY)
      doc.fillColor(c.charcoal).fontSize(10).font('Helvetica').text(formatIdr(Number(invoice.amountIdr)), sumX, sumY, { width: sumW, align: 'right' })
      sumY += 28

      // SUDAH DIBAYAR
      doc.fillColor(c.charcoal).fontSize(9).font('Helvetica-Bold').text('SUDAH DIBAYAR', sumX, sumY)
      doc.fillColor(c.charcoal).fontSize(10).font('Helvetica').text(formatIdr(totalPaid), sumX, sumY, { width: sumW, align: 'right' })
      sumY += 32

      // SISA TAGIHAN – dark box
      doc.roundedRect(sumX, sumY, sumW, 36, 8).fill(c.darkOlive)
      doc.fillColor(c.white).fontSize(9).font('Helvetica-Bold').text('SISA TAGIHAN', sumX + 14, sumY + 13)
      doc.fillColor(c.white).fontSize(11).font('Helvetica-Bold').text(formatIdr(outstanding), sumX, sumY + 12, { width: sumW - 14, align: 'right' })

      sumY += 50

      // === CATATAN ===
      const catatanY = bottomY + payBoxH + 18
      doc.fillColor(c.charcoal).fontSize(10).font('Helvetica-Bold').text('Catatan', 50, catatanY)

      const catatanTexts = [
        '1. Invoice ini merupakan dokumen tagihan dan bukan bukti pembayaran.',
        '2. Status pembayaran diperbarui setelah pembayaran diterima dan diverifikasi oleh admin.',
        '3. Untuk pertanyaan mengenai tagihan, silakan hubungi admin Sudut Haramain Tour.',
      ]
      let ctY = catatanY + 16
      for (const ct of catatanTexts) {
        doc.fillColor(c.grayLight).fontSize(8).font('Helvetica').text(ct, 50, ctY, { width: 495, lineGap: 2 })
        ctY += 14
      }

      // === FOOTER ===
      const footerLineY = 790
      doc.moveTo(50, footerLineY).lineTo(545, footerLineY).strokeColor(c.borderLight).lineWidth(0.6).stroke()

      const footerY = footerLineY + 10
      doc.fillColor(c.charcoal).fontSize(9).font('Helvetica-Bold').text(brand.footer.company, 50, footerY)
      doc.fillColor(c.grayLight).fontSize(8).font('Helvetica').text(`${brand.footer.website} | ${brand.footer.note}`, 50, footerY + 12, { width: 460 })

      // Gold dot bottom right
      doc.circle(535, footerY + 14, 6).fill(c.gold)

      // === WATERMARKS FOR DRAFT/CANCELLED ===
      if (invoice.state === 'DRAFT') {
        doc.save()
        doc.rotate(-35, { origin: [300, 400] })
        doc.fillColor('#000').opacity(0.04).fontSize(70).font('Helvetica-Bold').text('DRAFT', 50, 350, { width: 500, align: 'center' })
        doc.opacity(1).restore()
        doc.fillColor('#C62828').fontSize(9).font('Helvetica-Bold').text('DRAFT — BELUM DITERBITKAN', 0, 140, { width: 595, align: 'center' })
      } else if (invoice.state === 'CANCELLED') {
        doc.save()
        doc.rotate(-35, { origin: [300, 400] })
        doc.fillColor('#C62828').opacity(0.06).fontSize(65).font('Helvetica-Bold').text('DIBATALKAN', 50, 350, { width: 500, align: 'center' })
        doc.opacity(1).restore()
        doc.fillColor('#C62828').fontSize(9).font('Helvetica-Bold').text('DIBATALKAN / CANCELLED', 0, 140, { width: 595, align: 'center' })
      } else {
        // Subtle watermark like reference "CONTOH" -> use company name very light
        doc.save()
        doc.rotate(-30, { origin: [300, 400] })
        doc.fillColor(c.darkOlive).opacity(0.03).fontSize(60).font('Helvetica-Bold').text('SUDUT HARAMAIN TOUR', 0, 360, { width: 595, align: 'center' })
        doc.opacity(1).restore()
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
