/**
 * Centralized Invoice Brand Config
 * Logo source is centralized so future replacement updates all PDFs
 */

export const invoiceBrandConfig = {
  // Logo path – centralized, easy to replace
  // Uses assets/images/logo.png or logo_sh.png
  logoPath: 'assets/images/logo_sh.png',
  // Fallback logo if primary not found
  fallbackLogoPath: 'assets/images/logo.png',

  // Brand colors
  colors: {
    darkOlive: '#3A4428',
    gold: '#D3C168',
    white: '#FFFFFF',
    offWhite: '#FDFCF8',
    charcoal: '#2D2D2D',
    lightGray: '#F5F5F0',
    border: '#E8E5DD',
  },

  // Company info – should be configurable via Tour Settings if exists
  // For now, use sensible defaults, but allow override via runtime config or DB
  company: {
    name: 'Sudut Haramain',
    tagline: 'Perjalanan Ibadah Premium',
    // These will be overridden if Tour Settings provides real data
    address: null as string | null,
    whatsapp: null as string | null,
    email: null as string | null,
    website: null as string | null,
  },

  // Footer
  footer: {
    thankYou: 'Terima kasih telah mempercayakan kebutuhan perjalanan Anda kepada Sudut Haramain.',
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

  // Try multiple possible locations
  const possiblePaths = [
    path.resolve(process.cwd(), logoPath),
    path.resolve(process.cwd(), fallbackLogoPath),
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
