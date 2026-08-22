// SHT Admin — Nuxt full-stack (UI + REST API via Nitro server routes)
// Deploy target: Vercel (auto-detected). Database: PostgreSQL via Neon.
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  components: [{ path: '~/components', pathPrefix: false }],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  // Port 3001 agar tidak bentrok dengan sht-web (dev server customer = 3000).
  devServer: {
    port: 3001,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'SHT Admin — Sudut Haramain Tour',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },

  runtimeConfig: {
    // Private (server-only) — jangan pernah expose ke client.
    // NUXT_DATABASE_URL = variabel resmi (CLI + runtime + Vercel);
    // DATABASE_URL diterima sebagai fallback build-time.
    databaseUrl: process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },

  typescript: {
    strict: true,
    typeCheck: true, // diaktifkan M0 — baseline typecheck bersih
  },
})
