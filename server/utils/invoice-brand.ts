/**
 * Centralized Invoice Brand Config
 * Logo source is centralized so future replacement updates all PDFs
 * Updated to match approved Sudut Haramain Tour design (page-1.png reference)
 */

export const invoiceBrandConfig = {
  // Logo path – centralized, easy to replace
  // New approved logo: LOGO BG OLIV.png (dark olive square)
  logoPath: 'assets/images/logo-invoice.png',
  fallbackLogoPath: 'assets/images/logo_sh.png',

  // Brand colors – exact from approved design
  colors: {
    darkOlive: '#2F3822', // main dark olive (top bar, sisa tagihan bg, text)
    darkOliveAlt: '#3A4428', // alternative
    gold: '#D3C168', // gold accent (line, underline, dot)
    goldLight: '#E8D98A',
    white: '#FFFFFF',
    offWhite: '#FDFCF8',
    beige: '#FAF6E8', // light beige for info boxes
    beigeAlt: '#F9F6EC',
    charcoal: '#2D2D2D',
    lightGray: '#F5F5F0',
    border: '#E8E5DD',
    borderLight: '#EAE6DA',
    grayText: '#6B6B6B',
    grayLight: '#9A9A9A',
    blueBadgeBg: '#E8EEF5',
    blueBadgeText: '#4A5A6A',
    yellowBadgeBg: '#FFF8DC',
    yellowBadgeText: '#8A6D00',
  },

  // Company info – matches reference design
  company: {
    name: 'SUDUT HARAMAIN TOUR',
    tagline: 'Umrah Mandiri & Land Arrangement',
    website: 'tour.sudutharamain.id',
    // These will be overridden if Tour Settings provides real data
    address: null as string | null,
    whatsapp: null as string | null,
    email: null as string | null,
  },

  // Footer
  footer: {
    company: 'SUDUT HARAMAIN TOUR',
    website: 'tour.sudutharamain.id',
    note: 'Dokumen dibuat secara elektronik melalui Sudut Haramain Admin',
  },
}

/**
 * Get logo file path resolved for server-side
 * Returns absolute path or null if not found
 */
export function getInvoiceLogoPath(): string | null {
  const { logoPath, fallbackLogoPath } = invoiceBrandConfig
  const fs = require('fs')
  const path = require('path')

  const possiblePaths = [
    path.resolve(process.cwd(), logoPath),
    path.resolve(process.cwd(), fallbackLogoPath),
    path.resolve(process.cwd(), 'assets/images/logo-invoice.png'),
    path.resolve(process.cwd(), 'assets/images/logo_sh.png'),
    path.resolve(process.cwd(), 'assets/images/logo.png'),
    path.resolve(process.cwd(), 'public/favicon.png'),
  ]

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {}
  }
  return null
}
