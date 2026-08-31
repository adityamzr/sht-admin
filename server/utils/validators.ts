import { z } from 'zod'
import {
  CURRENCIES,
  FLIGHT_TYPES,
  HOTEL_CITIES,
  LEAD_ORIGINS,
  LEAD_STATUSES,
  MARKUP_TYPES,
  PRICING_ENTITY_TYPES,
  PRICING_STRATEGIES,
  PRICING_UNITS,
  SERVICE_CATEGORIES,
  ARTICLE_CITIES,
  ARTICLE_CONTENT_TYPES,
  ARTICLE_STATUSES,
  ARTICLE_CATEGORIES,
  GUIDE_GROUPS,
  GALLERY_CITIES, GALLERY_CATEGORIES, GALLERY_STATUSES, LOCATION_CITIES, LOCATION_CATEGORIES, CONTRIBUTION_TYPES, CONTRIBUTION_STATUSES, ARTICLE_FEEDBACK_VALUES,
} from '../db/schema'

/** Validasi server untuk SEMUA write — client validation tidak dipercaya. */

const currency = z.enum(CURRENCIES)
const isoDate = z.coerce.date().transform((d) => d.toISOString().slice(0, 10))
const int = (min: number, max: number) => z.number().int().min(min).max(max)
const numStr = z.coerce.number()

// ─── Auth ───────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Email tidak valid').max(255),
  password: z.string().min(1, 'Password wajib diisi'),
})

// ─── Departure City ─────────────────────────────────────────────────────────
const departureCityBase = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(100),
  feePerPax: numStr.nonnegative().nullable(),
  feeCurrency: currency,
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const departureCityInput = departureCityBase
export const departureCityPatch = departureCityBase.partial()

// ─── Hotel & Room Type ──────────────────────────────────────────────────────
const hotelBase = z.object({
  name: z.string().min(2).max(150),
  city: z.enum(HOTEL_CITIES),
  starRating: int(1, 5),
  distanceLabel: z.string().max(150),
  description: z.string().max(2000),
  coverImage: z.string().max(500),
  gallery: z.array(z.string().max(500)).max(20),
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const hotelInput = hotelBase
export const hotelPatch = hotelBase.partial()

const roomTypeBase = z.object({
  hotelId: int(1, 999999999),
  name: z.string().min(2).max(60),
  capacity: int(1, 12), // > 0 wajib
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const roomTypeInput = roomTypeBase
export const roomTypePatch = roomTypeBase.omit({ hotelId: true }).partial()
/**
 * M3.2 — input untuk nested route POST /api/admin/hotels/:id/room-types:
 * hotelId berasal dari route param, BUKAN dari body (UI admin tidak
 * mengirim hotelId; dulu gagal 400 "Required").
 */
export const roomTypeCreateInput = roomTypeBase.omit({ hotelId: true })

// ─── Flight ─────────────────────────────────────────────────────────────────
const flightBase = z.object({
  airline: z.string().min(2).max(100),
  routeLabel: z.string().min(3).max(100),
  origin: z.string().min(3).max(10),
  destination: z.string().min(3).max(10),
  flightType: z.enum(FLIGHT_TYPES),
  baggage: z.string().max(100),
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const flightInput = flightBase
export const flightPatch = flightBase.partial()

// ─── Transport ──────────────────────────────────────────────────────────────
const vehicleBase = z.object({
  name: z.string().min(2).max(100),
  capacity: int(1, 100), // > 0 wajib
  luggageLabel: z.string().max(150),
  description: z.string().max(1000),
  image: z.string().max(500),
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const vehicleInput = vehicleBase
export const vehiclePatch = vehicleBase.partial()

const routeBase = z.object({
  name: z.string().min(3).max(150),
  pickup: z.string().min(2).max(100),
  destination: z.string().min(2).max(100),
  description: z.string().max(1000),
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const routeInput = routeBase
export const routePatch = routeBase.partial()

export const routeVehicleInput = z.object({
  routeId: int(1, 999999999),
  vehicleId: int(1, 999999999),
})
export const routeVehiclePatch = z.object({
  isActive: z.boolean(),
})

// ─── Service ────────────────────────────────────────────────────────────────
const serviceBase = z.object({
  code: z.string().min(2).max(40).nullable(),
  name: z.string().min(2).max(150),
  description: z.string().max(2000),
  category: z.enum(SERVICE_CATEGORIES),
  pricingUnit: z.enum(PRICING_UNITS),
  inTripBuilder: z.boolean(),
  standalone: z.boolean(),
  image: z.string().max(500),
  isActive: z.boolean(),
  sortOrder: int(0, 9999),
})
export const serviceInput = serviceBase
export const servicePatch = serviceBase.partial()

// ─── Pricing Period ─────────────────────────────────────────────────────────
const pricingPeriodBase = z.object({
  name: z.string().min(2).max(100),
  startDate: isoDate,
  endDate: isoDate,
  priority: int(-9999, 9999),
  isActive: z.boolean(),
})
export const pricingPeriodInput = pricingPeriodBase.refine((v) => v.endDate >= v.startDate, {
  message: 'endDate harus >= startDate',
  path: ['endDate'],
})
export const pricingPeriodPatch = pricingPeriodBase
  .partial()
  .refine((v) => v.startDate === undefined || v.endDate === undefined || v.endDate >= v.startDate, {
    message: 'endDate harus >= startDate',
    path: ['endDate'],
  })

// ─── Exchange Rate ──────────────────────────────────────────────────────────
export const exchangeRateInput = z
  .object({
    sourceCurrency: currency,
    targetCurrency: currency,
    rate: numStr.positive('Kurs harus > 0'),
  })
  .refine((v) => v.sourceCurrency !== v.targetCurrency, {
    message: 'sourceCurrency tidak boleh sama dengan targetCurrency',
  })
export const exchangeRatePatch = z.object({
  rate: numStr.positive('Kurs harus > 0'),
  isActive: z.boolean().optional(),
})

// ─── Pricing Record ─────────────────────────────────────────────────────────
/** Unit yang sah per tipe entitas (flight=pax, dst.). */
const ENTITY_UNIT: Record<string, readonly string[]> = {
  hotel_room_type: ['room_night'],
  flight: ['pax'],
  route_vehicle: ['vehicle_trip'],
  service: PRICING_UNITS,
}

export const pricingRecordBase = z.object({
  entityType: z.enum(PRICING_ENTITY_TYPES),
  entityId: int(1, 999999999),
  periodId: int(1, 999999999),
  currency,
  pricingUnit: z.enum(PRICING_UNITS),
  strategy: z.enum(PRICING_STRATEGIES),
  supplierCost: numStr.nonnegative().nullable(),
  markupType: z.enum(MARKUP_TYPES).nullable(),
  markupValue: numStr.nonnegative().nullable(),
  sellingPrice: numStr.nonnegative().nullable(),
  internalNotes: z.string().max(1000).nullable(),
  isActive: z.boolean(),
})

export const pricingRecordInput = pricingRecordBase.superRefine((v, ctx) => {
    const allowed = ENTITY_UNIT[v.entityType]
    if (allowed && !allowed.includes(v.pricingUnit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pricingUnit untuk ${v.entityType} harus salah satu dari: ${allowed.join(', ')}`,
        path: ['pricingUnit'],
      })
    }
    if (v.strategy === 'manual') {
      if (v.sellingPrice === null || v.sellingPrice === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Strategi manual membutuhkan sellingPrice',
          path: ['sellingPrice'],
        })
      }
    } else {
      if (v.supplierCost === null || v.supplierCost === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Strategi ${v.strategy} membutuhkan supplierCost`,
          path: ['supplierCost'],
        })
      }
      if (!v.markupType || v.markupValue === null || v.markupValue === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Strategi ${v.strategy} membutuhkan markupType & markupValue`,
          path: ['markupValue'],
        })
      }
    }
  })

export const pricingRecordPatch = pricingRecordBase.partial()

// ─── Lead ───────────────────────────────────────────────────────────────────
export const leadStatusPatch = z.object({
  status: z.enum(LEAD_STATUSES),
  notes: z.string().max(2000).optional(),
})
export const leadOriginEnum = z.enum(LEAD_ORIGINS)

// ─── Estimasi (snapshot) — dipakai seed & M3 submit ─────────────────────────
export const estimationItemInput = z.object({
  category: z.string().min(1).max(40),
  label: z.string().min(1).max(250),
  detail: z.string().max(500).nullable().optional(),
  unit: z.enum(PRICING_UNITS).nullable().optional(),
  unitPrice: numStr.nonnegative().nullable().optional(),
  currency,
  quantity: numStr.nonnegative().nullable().optional(),
  amount: numStr.nonnegative(),
  meta: z.record(z.unknown()).optional(),
  sortOrder: int(0, 9999).optional(),
})
export const estimationRateInput = z.object({
  sourceCurrency: currency,
  targetCurrency: currency,
  rate: numStr.positive(),
})
export const estimationInput = z.object({
  pilgrims: int(1, 30),
  departureCity: z.string().min(2).max(50),
  departureDate: isoDate,
  returnDate: isoDate,
  durationDays: int(3, 45),
  makkahNights: int(0, 45),
  madinahNights: int(0, 45),
  items: z.array(estimationItemInput).min(1).max(100),
  rates: z.array(estimationRateInput).max(10),
  totalAmount: numStr.nonnegative(),
  currency,
  perPersonAmount: numStr.nonnegative().nullable().optional(),
})

// ─── M3: Submit estimasi customer (PUBLIK — strict; TIDAK ada harga dari client) ──
const roomSelection = z.object({
  roomTypeId: int(1, 999999999),
  quantity: int(1, 20),
})
const transportSelection = z.object({
  routeId: int(1, 999999999),
  vehicleId: int(1, 999999999),
})
const serviceSelection = z.object({
  serviceId: int(1, 999999999),
  quantity: int(1, 10),
})

export const estimationSubmitInput = z.object({
  contact: z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    whatsapp: z
      .string()
      .regex(/^[0-9]{8,18}$/, 'Nomor WhatsApp tidak valid (angka saja, tanpa + atau spasi)'),
    email: z.string().email('Email tidak valid').max(255).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  }),
  trip: z.object({
    pilgrims: int(1, 30),
    departureCity: z.string().min(2).max(20),
    departureDate: isoDate,
    durationDays: int(3, 45),
    makkahNights: int(1, 45),
    madinahNights: int(1, 45),
    flightId: int(1, 999999999),
    makkahHotelId: int(1, 999999999),
    makkahRooms: z.array(roomSelection).min(1).max(10),
    madinahHotelId: int(1, 999999999),
    madinahRooms: z.array(roomSelection).min(1).max(10),
    transport: z.array(transportSelection).max(20),
    visa: z.enum(['needed', 'owned']),
    services: z.array(serviceSelection).max(20),
  }),
})

// ─── M3: Service inquiry (Service Buyer, tanpa estimasi) ────────────────────
export const serviceInquiryInput = z.object({
  serviceId: int(1, 999999999).nullable().optional(),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  whatsapp: z
    .string()
    .regex(/^[0-9]{8,18}$/, 'Nomor WhatsApp tidak valid (angka saja, tanpa + atau spasi)'),
  email: z.string().email('Email tidak valid').max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

// ─── Media Article ──────────────────────────────────────────────────────────
const articleSlug = z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.')
const articleText = z.object({
  title: z.string().trim().min(3).max(240),
  slug: articleSlug,
  excerpt: z.string().trim().max(600),
  heroAlt: z.string().trim().max(300),
  body: z.array(z.record(z.unknown())).max(100),
  seoTitle: z.string().trim().max(240).nullable().optional().transform((v) => v || null),
  seoDescription: z.string().trim().max(600).nullable().optional().transform((v) => v || null),
})
const partialArticleText = articleText.extend({
  title: z.string().trim().max(240).default(''),
  slug: z.preprocess((v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) ? null : v, articleSlug.nullable()),
  excerpt: articleText.shape.excerpt.default(''),
  heroAlt: articleText.shape.heroAlt.default(''),
  body: articleText.shape.body.default([]),
})
const articleBase = z.object({
  heroImage: z.string().max(500),
  heroImageFileId: z.string().max(255).nullable().optional(),
  city: z.enum(ARTICLE_CITIES),
  contentType: z.enum(ARTICLE_CONTENT_TYPES),
  category: z.enum(ARTICLE_CATEGORIES),
  tags: z.array(z.string().min(1).max(40)).max(30),
  status: z.enum(ARTICLE_STATUSES),
  priority: int(-9999, 9999),
  publishedAt: z.string().datetime().nullable().optional(),
  ogImage: z.string().max(500).nullable().optional(),
  translations: z.object({ id: articleText, en: partialArticleText.optional() }).strict(),
})

// Backward-compatible transport only: downstream services receive ONE canonical
// contract. Once translations.id exists, no field falls back to a legacy value.
export const articleInput = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const input = value as Record<string, unknown>
  if (input.translations !== undefined && (!input.translations || typeof input.translations !== 'object' || Array.isArray(input.translations))) return value
  const translations = (input.translations ?? {}) as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(translations, 'id')) return input
  return {
    ...input,
    translations: {
      ...translations,
      id: {
        title: input.title, slug: input.slug, excerpt: input.excerpt,
        heroAlt: input.heroImageAlt, body: input.body,
        seoTitle: input.seoTitle, seoDescription: input.seoDescription,
      },
    },
  }
}, articleBase)
export const articlePatch = articleBase.partial()

// ─── Media localization: legacy payloads normalize into canonical ID ───────
function legacyMediaTranslation(fields: string[]) {
  return (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value
    const input = value as Record<string, unknown>
    if (input.translations !== undefined && (!input.translations || typeof input.translations !== 'object' || Array.isArray(input.translations))) return value
    const translations = (input.translations ?? {}) as Record<string, unknown>
    if (Object.prototype.hasOwnProperty.call(translations, 'id')) return value
    return { ...input, translations: { ...translations, id: Object.fromEntries(fields.map((field) => [field, input[field]])) } }
  }
}
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => v || null)
const optionalLocalizedSlug = z.preprocess((v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) ? null : v, articleSlug.nullable())

// ─── Media Guide ──────────────────────────────────────────────────────────
const guideText = z.object({ title: z.string().trim().min(3).max(240), slug: articleSlug, summary: nullableText(600), body: z.array(z.record(z.unknown())).max(100) })
const guideBase = z.object({
  group: z.enum(GUIDE_GROUPS), sortOrder: int(0, 9999), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  publishedAt: z.string().datetime().nullable().optional(),
  translations: z.object({ id: guideText, en: guideText.extend({ title: z.string().trim().max(240).default(''), slug: optionalLocalizedSlug, body: guideText.shape.body.default([]) }).optional() }).strict(),
})
export const guideInput = z.preprocess(legacyMediaTranslation(['title', 'slug', 'summary', 'body']), guideBase)

// ─── Media Gallery ────────────────────────────────────────────────────────
const galleryText = z.object({ altText: z.string().trim().min(3).max(300), title: nullableText(240), description: nullableText(2000), locationName: nullableText(200) })
const galleryBase = z.object({
  imageUrl: z.string().url('URL image tidak valid').max(1000), imageFileId: z.string().max(255).nullable().optional(),
  city: z.enum(GALLERY_CITIES), category: z.enum(GALLERY_CATEGORIES),
  latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30), priority: z.number().int().min(-9999).max(9999),
  status: z.enum(GALLERY_STATUSES), takenAt: z.string().datetime().nullable().optional(), publishedAt: z.string().datetime().nullable().optional(),
  translations: z.object({ id: galleryText, en: galleryText.extend({ altText: z.string().trim().max(300).default('') }).optional() }).strict(),
}).refine((v) => (v.latitude == null) === (v.longitude == null), { message: 'Latitude dan longitude harus diisi berpasangan.', path: ['latitude'] })
export const galleryInput = z.preprocess(legacyMediaTranslation(['altText', 'title', 'description', 'locationName']), galleryBase)

// ─── Media Map Locations ──────────────────────────────────────────────────
const locationText = z.object({ name: z.string().trim().min(2).max(200), shortDescription: z.string().trim().max(1000), altText: nullableText(300) })
const locationBase = z.object({
  city: z.enum(LOCATION_CITIES), category: z.enum(LOCATION_CATEGORIES), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  googleMapsUrl: z.string().url().max(1000).nullable().optional(), imageUrl: z.string().url().max(1000).nullable().optional(), imageFileId: z.string().max(255).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30), sortOrder: z.number().int().min(0).max(99999), isActive: z.boolean(),
  translations: z.object({ id: locationText, en: locationText.extend({ name: z.string().trim().max(200).default(''), shortDescription: locationText.shape.shortDescription.default('') }).optional() }).strict(),
})
export const locationInput = z.preprocess(legacyMediaTranslation(['name', 'shortDescription', 'altText']), locationBase)

export const publicContributionInput=z.object({type:z.enum(CONTRIBUTION_TYPES),city:z.string().trim().max(80).nullable().optional(),subject:z.string().trim().max(240).nullable().optional(),message:z.string().trim().min(10).max(5000),name:z.string().trim().max(120).nullable().optional(),contact:z.string().trim().max(160).nullable().optional(),sourcePage:z.string().trim().max(240).nullable().optional(),sourceUrl:z.string().url().max(1000).nullable().optional(),mapsUrl:z.string().url().max(1000).nullable().optional()})
export const contributionAdminPatch=z.object({status:z.enum(CONTRIBUTION_STATUSES).optional(),internalNote:z.string().max(3000).nullable().optional()})

export const articleFeedbackInput=z.object({value:z.enum(ARTICLE_FEEDBACK_VALUES)})

export const pageSettingsKeys=['home','makkah','madinah'] as const
export const pageSettingsInput=z.object({heroImageUrl:z.string().url().max(1000).nullable().optional(),heroImageFileId:z.string().max(255).nullable().optional(),heroHeadline:z.string().max(240).nullable().optional(),heroSubheadline:z.string().max(600).nullable().optional(),heroTopicOverride:z.array(z.object({id:z.string().min(1).max(80),label:z.string().trim().min(1).max(80),isActive:z.boolean(),sortOrder:z.number().int().min(0).max(9999)})).max(40).nullable().optional(),featuredArticleId:z.number().int().positive().nullable().optional(),supportingArticleIds:z.array(z.number().int().positive()).max(3),editorialArticleIds:z.array(z.number().int().positive()).max(6)})
// Home alone is localized in this phase; Makkah/Madinah settings keep their contract.
const homeText = z.object({ heroHeadline: nullableText(240), heroSubheadline: nullableText(600), heroTopicLabels: z.record(z.string().min(1).max(80), z.string().trim().max(80)).default({}) })
const homeBase = pageSettingsInput.omit({ heroHeadline: true, heroSubheadline: true, heroTopicOverride: true }).extend({
  heroTopicOverride: z.array(z.object({ id: z.string().min(1).max(80), isActive: z.boolean(), sortOrder: z.number().int().min(0).max(9999) })).max(40).nullable().default(null),
  translations: z.object({ id: homeText, en: homeText.optional() }).strict(),
}).superRefine((value, ctx) => {
  const topics = value.heroTopicOverride ?? []
  if (new Set(topics.map((t) => t.id)).size !== topics.length) ctx.addIssue({ code: 'custom', path: ['heroTopicOverride'], message: 'ID topik harus unik.' })
  for (const topic of topics) if (typeof value.translations.id.heroTopicLabels[topic.id] !== 'string' || !value.translations.id.heroTopicLabels[topic.id].trim()) ctx.addIssue({ code: 'custom', path: ['translations', 'id', 'heroTopicLabels', topic.id], message: 'Label Indonesia wajib diisi untuk setiap topik.' })
})
export const homePageSettingsInput = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const input = value as Record<string, unknown>
  const topics = Array.isArray(input.heroTopicOverride) ? input.heroTopicOverride : []
  const legacyLabels = Object.fromEntries(topics.filter((t) => t && typeof t === 'object').map((t) => [t.id, t.label]))
  return legacyMediaTranslation(['heroHeadline', 'heroSubheadline', 'heroTopicLabels'])({ ...input, heroTopicLabels: legacyLabels })
}, homeBase)
export const profileInput=z.object({name:z.string().trim().min(2).max(100),avatarUrl:z.string().url().max(1000).nullable().optional(),avatarFileId:z.string().max(255).nullable().optional()})
