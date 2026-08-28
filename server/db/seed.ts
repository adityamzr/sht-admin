/**
 * SEED DATA DEVELOPMENT (idempotent — aman dijalankan ulang; tiap section
 * hanya diisi bila tabel terkait masih kosong).
 * ⚠️ Harga di sini BUKAN harga bisnis resmi — data pengembangan agar M3
 * bisa langsung mulai. Nomor WhatsApp/nama lead = contoh fiktif.
 *
 * Jalankan: npm run db:seed
 * Admin dev:  admin@sudutharamain.id / password dari env ADMIN_DEV_PASSWORD
 *             (fallback dev-only bila env kosong).
 */
import { and, count, eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { hashPassword } from '../services/auth'
import { createEstimation } from '../services/estimation'
import { getDbUrl } from './env'

const DATABASE_URL = getDbUrl()

const client = postgres(DATABASE_URL, { ssl: /neon\.tech|sslmode=require/.test(DATABASE_URL) ? 'require' : false, max: 5, prepare: false })
const db = drizzle(client, { schema })

async function tableCount(table: any): Promise<number> {
  const rows = await db.select({ v: count() }).from(table)
  return rows[0]?.v ?? 0
}

async function main() {
  console.log('🌱 Seed SHT development data…')

  // ─── Admin (dev only) ─────────────────────────────────────────────────────
  if ((await tableCount(schema.adminUsers)) === 0) {
    const devPassword = process.env.ADMIN_DEV_PASSWORD || 'dev-admin-2026!'
    if (!process.env.ADMIN_DEV_PASSWORD) {
      console.warn('⚠️  ADMIN_DEV_PASSWORD tidak di-set — memakai password dev fallback (HANYA untuk development).')
    }
    await db.insert(schema.adminUsers).values({
      email: 'admin@sudutharamain.id',
      name: 'Admin SHT',
      passwordHash: await hashPassword(devPassword),
      isActive: true,
    })
    console.log('  ✔ admin dev: admin@sudutharamain.id')
  }

  // ─── Unified Workspaces & Memberships ─────────────────────────────────────
  const workspaceSeed = [
    { key: 'media', name: 'Sudut Haramain Media', description: 'Mengelola sudutharamain.id' },
    { key: 'tour', name: 'Sudut Haramain Tour', description: 'Mengelola tour.sudutharamain.id' },
  ] as const
  for (const workspace of workspaceSeed) {
    const existing = await db.select().from(schema.workspaces).where(eq(schema.workspaces.key, workspace.key)).limit(1)
    if (!existing[0]) {
      await db.insert(schema.workspaces).values({ ...workspace, isActive: true })
    }
  }
  const workspaceRows = await db.select().from(schema.workspaces)
  const userRows = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers)
  for (const user of userRows) {
    for (const workspace of workspaceRows.filter((row) => row.key === 'media' || row.key === 'tour')) {
      const membership = await db.select({ id: schema.workspaceMemberships.id }).from(schema.workspaceMemberships).where(and(eq(schema.workspaceMemberships.userId, user.id), eq(schema.workspaceMemberships.workspaceId, workspace.id))).limit(1)
      if (!membership[0]) {
        await db.insert(schema.workspaceMemberships).values({ userId: user.id, workspaceId: workspace.id, role: 'OWNER' })
      }
    }
  }
  console.log('  ✔ workspaces: Media, Tour + memberships for existing admins')

  // ─── Media Guide taxonomy (idempotent; existing edited content is preserved) ─
  const guideSeed = [
    ['MULAI DI SINI', [['tentang-panduan', 'Tentang Panduan'], ['informasi-penting', 'Informasi Penting'], ['persiapan-dasar', 'Persiapan Dasar']]],
    ['KEHIDUPAN DI HARAMAIN', [['kultur-lokal', 'Kultur Lokal'], ['bahasa-sehari-hari', 'Bahasa Sehari-hari'], ['cuaca', 'Cuaca'], ['belanja', 'Belanja'], ['kuliner', 'Kuliner']]],
    ['TRANSPORTASI', [['dari-bandara', 'Dari Bandara'], ['taksi', 'Taksi'], ['bus', 'Bus'], ['kereta-haramain', 'Kereta Haramain']]],
    ['HOTEL', [['memilih-area-hotel', 'Memilih Area Hotel'], ['check-in', 'Check-in'], ['fasilitas-hotel', 'Fasilitas Hotel']]],
    ['MAKKAH', [['sekitar-masjidil-haram', 'Sekitar Masjidil Haram'], ['area-hotel-makkah', 'Area Hotel'], ['transportasi-lokal-makkah', 'Transportasi Lokal'], ['tempat-makan-makkah', 'Tempat Makan']]],
    ['MADINAH', [['sekitar-masjid-nabawi', 'Sekitar Masjid Nabawi'], ['rawdhah', 'Rawdhah'], ['transportasi-lokal-madinah', 'Transportasi Lokal'], ['tempat-makan-madinah', 'Tempat Makan']]],
    ['PERJALANAN', [['paspor', 'Paspor'], ['visa', 'Visa'], ['nusuk', 'Nusuk'], ['internet', 'Internet'], ['pembayaran', 'Pembayaran']]],
    ['IBADAH', [['gambaran-umrah', 'Gambaran Umrah'], ['ihram', 'Ihram'], ['miqat', 'Miqat'], ['tawaf', 'Tawaf'], ['sai', 'Sa’i'], ['tahallul', 'Tahallul']]],
  ] as const
  for (const [group, topics] of guideSeed) {
    for (const [index, [slug, title]] of topics.entries()) {
      const existing = await db.select({ id: schema.guides.id }).from(schema.guides).where(eq(schema.guides.slug, slug)).limit(1)
      const legacy = existing[0] ?? (await db.select({ id: schema.guides.id }).from(schema.guides).where(and(eq(schema.guides.group, group), eq(schema.guides.title, title))).limit(1))[0]
      if (!legacy) {
        await db.insert(schema.guides).values({ title, slug, group, summary: null, body: [], sortOrder: (index + 1) * 10, status: 'DRAFT' })
      }
    }
  }
  console.log('  ✔ guide taxonomy: 8 groups, approved topics seeded without overwriting existing content')

  // ─── Media Map Locations (source: sh-web data/makkah.ts + data/madinah.ts; create-only)
  const locationSeed = [
    ['MAKKAH','HARAM','masjidil-haram','Masjidil Haram',21.4245589,39.8248709,'Titik utama ibadah dan orientasi kawasan pusat Makkah','Pusat Makkah'],
    ['MAKKAH','ZIARAH','masjid-al-jinn','Masjid Al-Jinn',21.4334542,39.8289656,'Masjid bersejarah di sekitar kawasan Haram.','Sulaimaniyah'],
    ['MAKKAH','MIQAT','masjid-aisyah','Masjid Aisyah / Tan’im',21.4677052,39.8013681,'Salah satu titik miqat bagi jamaah yang hendak memulai Umrah.','At-Tan’im'],
    ['MAKKAH','TRANSPORTASI','makkah-station','Stasiun Kereta Cepat Makkah',21.417613,39.7893122,'Hub Haramain High Speed Railway di kawasan Ar Rusayfah.','Ar Rusayfah'],
    ['MAKKAH','TRANSPORTASI','al-shabeka','Al-Shabeka',21.422009,39.82124,'Titik transit bus yang berguna untuk memahami perjalanan sekitar pusat kota.','Sekitar Haram'],
    ['MAKKAH','FASILITAS','hira-cultural-district','Hira Cultural District',21.4568541,39.8684542,'Kawasan budaya di sekitar Jabal An-Nour.','Jabal An-Nour'],
    ['MAKKAH','ZIARAH','jabal-an-nour','Jabal An-Nour',21.4577836,39.8597322,'Kawasan bersejarah di sisi timur laut Makkah.','Jabal An-Nour'],
    ['MAKKAH','ZIARAH','jabal-thawr','Jabal Thawr',21.3770009,39.8498682,'Salah satu lokasi bersejarah di bagian selatan Makkah.','Jabal Thawr'],
    ['MAKKAH','KULINER','makkah-mall','Makkah Mall',21.3909367,39.8845719,'Pusat belanja dengan pilihan makan dan kebutuhan harian.','Al Jamiah'],
    ['MAKKAH','FASILITAS','mina','Mina',21.4153556,39.8925058,'Kawasan tenda yang menjadi bagian penting dari lanskap ibadah Makkah.','Mina'],
    ['MADINAH','NABAWI','masjid-nabawi','Masjid Nabawi',24.46721,39.611121,'Titik utama orientasi kawasan pusat Madinah dan tujuan ibadah jamaah.','Pusat Madinah'],
    ['MADINAH','RAWDHAH','rawdhah','Rawdhah',24.467106,39.610935,'Bagian dari area Masjid Nabawi yang menjadi tujuan penting bagi jamaah.','Masjid Nabawi'],
    ['MADINAH','ZIARAH','baqi-cemetery','Pemakaman Al-Baqi',24.466568,39.615604,'Pemakaman bersejarah yang berada di sisi timur Masjid Nabawi.','Sebelah timur Nabawi'],
    ['MADINAH','ZIARAH','masjid-quba','Masjid Quba',24.439446,39.617289,'Masjid bersejarah di selatan Madinah dan salah satu tujuan ziarah yang dikenal luas.','Quba'],
    ['MADINAH','ZIARAH','masjid-qiblatain','Masjid Qiblatain',24.485742,39.569232,'Masjid bersejarah di kawasan barat laut Madinah.','Al Qiblatayn'],
    ['MADINAH','ZIARAH','mount-uhud','Jabal Uhud',24.51028,39.61389,'Kawasan bersejarah di utara Madinah dengan konteks penting dalam sirah.','Utara Madinah'],
    ['MADINAH','TRANSPORTASI','madinah-station','Stasiun Kereta Cepat Madinah',24.4702,39.6994,'Hub Haramain High Speed Railway untuk perjalanan menuju dan dari Madinah.','Al Hadra'],
    ['MADINAH','TRANSPORTASI','madinah-bus-station','Madinah Bus Station',24.476512,39.603831,'Titik transportasi publik di sekitar kawasan pusat Madinah.','Anbariya'],
    ['MADINAH','KULINER','taiba-commercial-center','Taiba Commercial Center',24.473201,39.609504,'Pusat komersial dekat kawasan Nabawi dengan pilihan makan dan kebutuhan harian.','Sekitar Nabawi'],
    ['MADINAH','FASILITAS','qiblatain-health-center','Al Ansar Hospital',24.472989,39.606777,'Fasilitas kesehatan publik di sekitar kawasan pusat Madinah.','Sekitar Nabawi'],
  ] as const
  let locationsCreated = 0
  for (const [city, category, sourceKey, name, latitude, longitude, shortDescription, area] of locationSeed) {
    const existing = await db.select({ id: schema.mapLocations.id }).from(schema.mapLocations).where(eq(schema.mapLocations.sourceKey, `${city.toLowerCase()}-${sourceKey}`)).limit(1)
    if (!existing[0]) {
      await db.insert(schema.mapLocations).values({ sourceKey: `${city.toLowerCase()}-${sourceKey}`, name, city, category, shortDescription, latitude: String(latitude), longitude: String(longitude), googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, tags: [area.toLowerCase()], sortOrder: (locationSeed.filter((x) => x[0] === city).findIndex((x) => x[2] === sourceKey) + 1) * 10, isActive: true })
      locationsCreated++
    }
  }
  console.log(`  ✔ map locations: ${locationsCreated} created, ${locationSeed.length - locationsCreated} existing preserved (10 Makkah, 10 Madinah)`)

  // ─── Departure Cities ─────────────────────────────────────────────────────
  if ((await tableCount(schema.departureCities)) === 0) {
    await db.insert(schema.departureCities).values([
      { code: 'jakarta', name: 'Jakarta', feePerPax: '0', feeCurrency: 'IDR', isActive: true, sortOrder: 1 },
      { code: 'bandung', name: 'Bandung', feePerPax: '650000', feeCurrency: 'IDR', isActive: true, sortOrder: 2 },
    ])
    console.log('  ✔ departure cities: Jakarta, Bandung')
  }

  // ─── Pricing Periods ──────────────────────────────────────────────────────
  if ((await tableCount(schema.pricingPeriods)) === 0) {
    await db.insert(schema.pricingPeriods).values([
      { name: 'Normal', startDate: new Date('2024-01-01'), endDate: new Date('2030-12-31'), priority: 0, isActive: true },
      { name: 'High Season', startDate: new Date('2026-12-15'), endDate: new Date('2027-01-15'), priority: 10, isActive: true },
      { name: 'Ramadan', startDate: new Date('2027-02-08'), endDate: new Date('2027-03-10'), priority: 20, isActive: true },
    ])
    console.log('  ✔ pricing periods: Normal (0), High Season (10), Ramadan (20) — data dev')
  }
  const normalPeriod = (await db.select().from(schema.pricingPeriods).where(eq(schema.pricingPeriods.name, 'Normal')).limit(1))[0]
  const highSeason = (await db.select().from(schema.pricingPeriods).where(eq(schema.pricingPeriods.name, 'High Season')).limit(1))[0]
  const ramadan = (await db.select().from(schema.pricingPeriods).where(eq(schema.pricingPeriods.name, 'Ramadan')).limit(1))[0]
  if (!normalPeriod || !highSeason || !ramadan) throw new Error('Periode harga seed tidak ditemukan')

  // ─── Exchange Rates ───────────────────────────────────────────────────────
  if ((await tableCount(schema.exchangeRates)) === 0) {
    await db.insert(schema.exchangeRates).values([
      { sourceCurrency: 'USD', targetCurrency: 'IDR', rate: '16200', isActive: true },
      { sourceCurrency: 'SAR', targetCurrency: 'IDR', rate: '4350', isActive: true },
    ])
    console.log('  ✔ exchange rates: USD→IDR 16200, SAR→IDR 4350 — data dev')
  }

  // ─── Hotels & Room Types (mirror mock frontend) ───────────────────────────
  const hotelSeed = [
    {
      name: 'Swissôtel Makkah', city: 'Makkah', starRating: 5, distanceLabel: '±250 m dari Masjidil Haram',
      description: 'Bagian dari kompleks Abraj Al Bait — akses jalan kaki langsung ke pelataran Masjidil Haram dengan pilihan pemandangan Ka’bah.',
      coverImage: '/images/hotel-swissotel.jpg',
      rooms: [['Double', 2, 5300000], ['Triple', 3, 4700000], ['Quad', 4, 4500000]] as const,
    },
    {
      name: 'Pullman ZamZam Makkah', city: 'Makkah', starRating: 5, distanceLabel: '±300 m dari Masjidil Haram',
      description: 'Hotel favorit jamaah Indonesia dengan akses masjid yang sangat dekat, kamar luas, dan hidangan yang ramah lidah Nusantara.',
      coverImage: '/images/hotel-pullman.jpg',
      rooms: [['Double', 2, 4800000], ['Triple', 3, 4300000], ['Quad', 4, 4100000]] as const,
    },
    {
      name: 'Anjum Hotel Makkah', city: 'Makkah', starRating: 5, distanceLabel: '±350 m dari Masjidil Haram',
      description: 'Menara kembar di sisi Jabal Al Ka’bah — kamar modern, lift banyak dan cepat, cocok untuk keluarga besar.',
      coverImage: '/images/hotel-anjum.jpg',
      rooms: [['Double', 2, 4400000], ['Triple', 3, 4000000], ['Quad', 4, 3800000]] as const,
    },
    {
      name: 'Sofitel Shahd Al Madinah', city: 'Madinah', starRating: 5, distanceLabel: '±150 m dari Masjid Nabawi',
      description: 'Berada persis di kawasan central Madinah — suasana tenang khas kota Rasulullah, hanya beberapa langkah dari pelataran Nabawi.',
      coverImage: '/images/hotel-sofitel.jpg',
      rooms: [['Double', 2, 3400000], ['Triple', 3, 3100000], ['Quad', 4, 2900000]] as const,
    },
  ]
  const roomIds: Record<string, number> = {}
  if ((await tableCount(schema.hotels)) === 0) {
    for (const [i, h] of hotelSeed.entries()) {
      const [hotel] = await db
        .insert(schema.hotels)
        .values({ name: h.name, city: h.city, starRating: h.starRating, distanceLabel: h.distanceLabel, description: h.description, coverImage: h.coverImage, gallery: [h.coverImage], isActive: true, sortOrder: i + 1 })
        .returning()
      for (const [ri, [name, capacity, price]] of h.rooms.entries()) {
        const [rt] = await db
          .insert(schema.hotelRoomTypes)
          .values({ hotelId: hotel.id, name, capacity, isActive: true, sortOrder: ri + 1 })
          .returning()
        roomIds[`${hotel.id}-${name}`] = rt.id
        await db.insert(schema.pricingRecords).values({
          entityType: 'hotel_room_type', entityId: rt.id, periodId: normalPeriod.id, currency: 'IDR', pricingUnit: 'room_night',
          strategy: 'manual', supplierCost: null, markupType: null, markupValue: null, sellingPrice: String(price),
          internalNotes: 'Seed dev — bukan harga resmi', isActive: true,
        })
      }
      // Override contoh: Quad Swissôtel naik di High Season & Ramadan (data dev)
      const swissQuad = h.name === 'Swissôtel Makkah' ? roomIds[`${hotel.id}-Quad`] : undefined
      if (swissQuad) {
        await db.insert(schema.pricingRecords).values([
          { entityType: 'hotel_room_type', entityId: swissQuad, periodId: highSeason.id, currency: 'IDR', pricingUnit: 'room_night', strategy: 'manual', sellingPrice: '5200000', supplierCost: null, markupType: null, markupValue: null, internalNotes: 'Seed dev — override High Season', isActive: true },
          { entityType: 'hotel_room_type', entityId: swissQuad, periodId: ramadan.id, currency: 'IDR', pricingUnit: 'room_night', strategy: 'manual', sellingPrice: '6500000', supplierCost: null, markupType: null, markupValue: null, internalNotes: 'Seed dev — override Ramadan', isActive: true },
        ])
      }
    }
    console.log('  ✔ hotels (4) + room types (12) + harga Normal + override contoh')
  }

  // ─── Flights (mirror mock frontend; 3 strategi berbeda) ───────────────────
  const flightIds: Record<string, number> = {}
  if ((await tableCount(schema.flights)) === 0) {
    const flightSeed = [
      { key: 'saudia', airline: 'Saudia', routeLabel: 'CGK → JED', flightType: 'Direct', strategy: 'cost_plus_fixed', supplierCost: '15200000', markupType: 'fixed', markupValue: '1000000', sellingPrice: null },
      { key: 'garuda', airline: 'Garuda Indonesia', routeLabel: 'CGK → JED', flightType: 'Direct', strategy: 'manual', supplierCost: null, markupType: null, markupValue: null, sellingPrice: '17500000' },
      { key: 'qatar', airline: 'Qatar Airways', routeLabel: 'CGK → DOH → JED', flightType: 'Transit', strategy: 'cost_plus_percentage', supplierCost: '12500000', markupType: 'percentage', markupValue: '18.4', sellingPrice: null },
    ] as const
    for (const [i, f] of flightSeed.entries()) {
      const [flight] = await db
        .insert(schema.flights)
        .values({ airline: f.airline, routeLabel: f.routeLabel, origin: 'CGK', destination: 'JED', flightType: f.flightType, baggage: 'Bagasi 30 kg', isActive: true, sortOrder: i + 1 })
        .returning()
      flightIds[f.key] = flight.id
      await db.insert(schema.pricingRecords).values({
        entityType: 'flight', entityId: flight.id, periodId: normalPeriod.id, currency: 'IDR', pricingUnit: 'pax',
        strategy: f.strategy, supplierCost: f.supplierCost, markupType: f.markupType, markupValue: f.markupValue,
        sellingPrice: f.sellingPrice, internalNotes: 'Seed dev — bukan harga resmi', isActive: true,
      })
    }
    console.log('  ✔ flights (3): Saudia (cost+fixed), Garuda (manual), Qatar (cost+18.4%)')
  }

  // ─── Vehicles & Routes (mirror mock frontend) ─────────────────────────────
  const vehicleIds: Record<string, number> = {}
  const routeIds: Record<string, number> = {}
  if ((await tableCount(schema.transportVehicles)) === 0) {
    const vehicleSeed = [
      { key: 'sedan', name: 'Sedan', capacity: 3, luggageLabel: '2 Koper + 2 Tas Kecil', description: 'Nyaman untuk pasangan atau keluarga kecil hingga 3 jamaah.' },
      { key: 'staria', name: 'Hyundai Staria', capacity: 6, luggageLabel: '10 Koper', description: 'Lega dan premium untuk keluarga hingga 6 jamaah dengan bagasi.' },
      { key: 'hiace', name: 'Toyota HiAce', capacity: 12, luggageLabel: '15 Koper Besar', description: 'Andalan rombongan kecil hingga 12 jamaah antar-kota.' },
    ] as const
    for (const [i, v] of vehicleSeed.entries()) {
      const [vehicle] = await db
        .insert(schema.transportVehicles)
        .values({ name: v.name, capacity: v.capacity, luggageLabel: v.luggageLabel, description: v.description, image: '/images/transport-van.jpg', isActive: true, sortOrder: i + 1 })
        .returning()
      vehicleIds[v.key] = vehicle.id
    }
    console.log('  ✔ vehicles (3)')
  } else {
    for (const v of await db.select().from(schema.transportVehicles)) vehicleIds[v.name] = v.id
  }

  if ((await tableCount(schema.transportRoutes)) === 0) {
    const routeSeed = [
      { key: 'jed-makkah', name: 'Bandara Jeddah → Makkah', pickup: 'Jeddah Airport', destination: 'Makkah', description: 'Penjemputan saat tiba di Jeddah, langsung menuju hotel di Makkah.', prices: { sedan: 650000, staria: 900000, hiace: 1250000 } },
      { key: 'makkah-madinah', name: 'Makkah → Madinah', pickup: 'Makkah', destination: 'Madinah', description: 'Perjalanan darat antar dua kota suci (±4–5 jam).', prices: { sedan: 1100000, staria: 1500000, hiace: 1900000 } },
      { key: 'madinah-airport', name: 'Madinah → Bandara', pickup: 'Madinah', destination: 'Madinah Airport', description: 'Antar-jemput dari hotel Madinah menuju bandara kepulangan.', prices: { sedan: 550000, staria: 750000, hiace: 1050000 } },
      { key: 'makkah-ziarah', name: 'City tour Makkah & ziarah sekitar', pickup: 'Makkah', destination: 'Ziyarat Tours', description: 'Ziarah sekitar Makkah dengan driver berpengalaman.', prices: { sedan: 800000, staria: 1100000, hiace: 1500000 } },
    ] as const
    const keyToName: Record<string, string> = { sedan: 'Sedan', staria: 'Hyundai Staria', hiace: 'Toyota HiAce' }
    const allVehicles = await db.select().from(schema.transportVehicles)
    const nameToId: Record<string, number> = {}
    for (const v of allVehicles) nameToId[v.name] = v.id
    for (const [i, r] of routeSeed.entries()) {
      const [route] = await db
        .insert(schema.transportRoutes)
        .values({ name: r.name, pickup: r.pickup, destination: r.destination, description: r.description, isActive: true, sortOrder: i + 1 })
        .returning()
      routeIds[r.key] = route.id
      for (const [vk, price] of Object.entries(r.prices)) {
        const vehicleId = nameToId[keyToName[vk]]
        const [opt] = await db
          .insert(schema.transportRouteVehicles)
          .values({ routeId: route.id, vehicleId, isActive: true })
          .returning()
        await db.insert(schema.pricingRecords).values({
          entityType: 'route_vehicle', entityId: opt.id, periodId: normalPeriod.id, currency: 'IDR', pricingUnit: 'vehicle_trip',
          strategy: 'manual', supplierCost: null, markupType: null, markupValue: null, sellingPrice: String(price),
          internalNotes: 'Seed dev — bukan harga resmi', isActive: true,
        })
      }
    }
    console.log('  ✔ routes (4) + opsi rute-kendaraan + harga')
  }

  // ─── Services (mirror mock frontend; visa = service generik) ──────────────
  if ((await tableCount(schema.services)) === 0) {
    const serviceSeed = [
      { code: 'visa', name: 'Visa Umroh', category: 'core_journey', pricingUnit: 'pax', price: '3100000', description: 'Pengurusan visa umroh resmi sampai terbit, termasuk asuransi perjalanan selama di Saudi.', image: '/images/kaaba-tawaf.jpg' },
      { code: 'muthawwif', name: 'Muthawwif / Pendamping', category: 'assisted', pricingUnit: 'group_session', price: '1500000', description: 'Pendamping ibadah berbahasa Indonesia — menemani dari niat hingga tahallul dengan tenang.', image: '/images/kaaba-tawaf.jpg' },
      { code: 'perlengkapan', name: 'Perlengkapan Umroh', category: 'additional', pricingUnit: 'pax', price: '850000', description: 'Koper, kain ihram/mukena, buku doa, dan kebutuhan perjalanan ibadah lainnya.', image: '/images/madinah.jpg' },
      { code: 'handling', name: 'Handling Bandara', category: 'additional', pricingUnit: 'pax', price: '500000', description: 'Pendampingan check-in, bagasi, hingga proses kedatangan di Jeddah/Madinah.', image: '/images/flight-cgk-jed.jpg' },
    ] as const
    for (const [i, s] of serviceSeed.entries()) {
      const [service] = await db
        .insert(schema.services)
        .values({ code: s.code, name: s.name, description: s.description, category: s.category, pricingUnit: s.pricingUnit, inTripBuilder: true, standalone: true, image: s.image, isActive: true, sortOrder: i + 1 })
        .returning()
      await db.insert(schema.pricingRecords).values({
        entityType: 'service', entityId: service.id, periodId: normalPeriod.id, currency: 'IDR', pricingUnit: s.pricingUnit,
        strategy: 'manual', supplierCost: null, markupType: null, markupValue: null, sellingPrice: s.price,
        internalNotes: 'Seed dev — bukan harga resmi', isActive: true,
      })
    }
    console.log('  ✔ services (4): visa, muthawwif, perlengkapan, handling')
  }

  // ─── Contoh estimasi + lead (UI admin langsung terlihat; data dev) ────────
  if ((await tableCount(schema.estimations)) === 0) {
    const estimation = await createEstimation(db, {
      pilgrims: 6,
      departureCity: 'Bandung',
      departureDate: '2026-10-12',
      returnDate: '2026-10-23', // M3.1: pulang = berangkat + (durasi - 1)
      durationDays: 12,
      makkahNights: 6,
      madinahNights: 5,
      currency: 'IDR',
      totalAmount: 224300000,
      perPersonAmount: 37383333,
      rates: [
        { sourceCurrency: 'USD', targetCurrency: 'IDR', rate: 16200 },
        { sourceCurrency: 'SAR', targetCurrency: 'IDR', rate: 4350 },
      ],
      items: [
        { category: 'departure', label: 'Perjalanan Bandung → Bandara CGK', detail: 'Rp 650.000 × 6 jamaah', unit: 'pax', unitPrice: 650000, currency: 'IDR', quantity: 6, amount: 3900000, sortOrder: 1 },
        { category: 'flight', label: 'Penerbangan', detail: 'Garuda Indonesia · CGK → JED — Rp 17.500.000 × 6 jamaah', unit: 'pax', unitPrice: 17500000, currency: 'IDR', quantity: 6, amount: 105000000, sortOrder: 2 },
        { category: 'hotel_makkah', label: 'Hotel Makkah — Swissôtel Makkah', detail: 'Quad × 1, Double × 1 · 6 malam', unit: 'room_night', currency: 'IDR', amount: 58800000, meta: { rooms: [{ name: 'Quad', quantity: 1 }, { name: 'Double', quantity: 1 }] }, sortOrder: 3 },
        { category: 'hotel_madinah', label: 'Hotel Madinah — Sofitel Shahd Al Madinah', detail: 'Quad × 2 · 5 malam', unit: 'room_night', currency: 'IDR', amount: 29000000, meta: { rooms: [{ name: 'Quad', quantity: 2 }] }, sortOrder: 4 },
        { category: 'transport', label: 'Transportasi', detail: 'Bandara Jeddah → Makkah (HiAce) + Makkah → Madinah (HiAce)', unit: 'vehicle_trip', currency: 'IDR', amount: 2400000, sortOrder: 5 },
        { category: 'visa', label: 'Visa Umroh', detail: 'Rp 3.100.000 × 6 jamaah', unit: 'pax', unitPrice: 3100000, currency: 'IDR', quantity: 6, amount: 18600000, sortOrder: 6 },
        { category: 'services', label: 'Layanan Tambahan', detail: 'Muthawwif (1 sesi) + Perlengkapan (6 pax)', currency: 'IDR', amount: 6600000, sortOrder: 7 },
      ],
    })
    if (!estimation) throw new Error('Gagal membuat estimasi contoh')
    await db.insert(schema.leads).values({
      name: 'Keluarga H. Rahmat',
      whatsapp: '6281200000001',
      origin: 'estimation',
      source: 'trip-builder',
      estimationId: estimation.id,
      status: 'NEW',
      notes: 'Contoh lead estimasi (seed dev).',
    })
    console.log(`  ✔ contoh estimasi ${estimation.estimationNumber} + lead estimation`)
  }
  const leadCount = await tableCount(schema.leads)
  if (leadCount < 2) {
    const visaService = (await db.select().from(schema.services).where(eq(schema.services.code, 'visa')).limit(1))[0]
    await db.insert(schema.leads).values({
      name: 'Ibu Siti Maryam',
      whatsapp: '6281200000002',
      origin: 'service_inquiry',
      source: 'services',
      serviceId: visaService?.id ?? null,
      status: 'CONTACTED',
      notes: 'Contoh lead layanan tunggal tanpa estimasi (seed dev).',
    })
    console.log('  ✔ contoh lead service_inquiry (tanpa estimasi)')
  }

  console.log('✅ Seed selesai. (Idempotent — aman dijalankan ulang.)')
  await client.end()
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})
