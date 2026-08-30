import type { Config } from 'tailwindcss'

/** Token warna selaras brand SHT (locked di sht-web) — admin memakai palet yang sama. */
export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        sht: { olive: '#3A4428', 'olive-dark': '#2D351F', gold: '#D3C168', sage: '#7F8968', 'off-white': '#F6F4ED', stone: '#E4E3DE', charcoal: '#242822' },
        brand: {
          sky: '#BFE6F2',
          'sky-deep': '#7CC7DA',
          teal: '#3DA7B7',
          green: '#0F3D3A',
        },
        neutral: {
          white: '#FFFFFF',
          soft: '#F8FAFB',
          warm: '#F1F4F6',
          line: '#E3E7EB',
          charcoal: '#1B1F23',
        },
        gold: {
          DEFAULT: '#D4AF37',
          soft: '#EAD8A6',
          sand: '#F3EBD7',
        },
      },
      fontFamily: {
        heading: ['Montserrat', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
}
