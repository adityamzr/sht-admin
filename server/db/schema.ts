import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * SHT Domain Model — Core MVP (M2).
 * Prinsip:
 * - Harga TIDAK disimpan langsung di entitas katalog; semua harga lewat
 *   pricing_records (per periode + mata uang + strategi).
 * - Data internal (supplier cost, markup, catatan) HANYA di pricing_records
 *   dan tidak pernah diserialisasi ke API publik.
 * - Soft delete (deleted_at) untuk entitas bisnis yang bisa direferensikan
 *   estimasi historis — tidak ada hard delete.
 * - Estimasi = snapshot immutabel (parent + item + kurs tersimpan).
 */

// ─── Konstanta enum (validasi app-level; DB memakai text) ──────────────────
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'WON', 'LOST'] as const
export const LEAD_ORIGINS = ['estimation', 'service_inquiry'] as const
export const CURRENCIES = ['IDR', 'SAR', 'USD'] as const
export const PRICING_UNITS = ['pax', 'room_night', 'vehicle_trip', 'group_session'] as const
export const PRICING_STRATEGIES = ['cost_plus_fixed', 'cost_plus_percentage', 'manual'] as const
export const MARKUP_TYPES = ['fixed', 'percentage'] as const
export const PRICING_ENTITY_TYPES = ['hotel_room_type', 'flight', 'route_vehicle', 'service'] as const
export const SERVICE_CATEGORIES = ['core_journey', 'assisted', 'additional'] as const
export const HOTEL_CITIES = ['Makkah', 'Madinah'] as const
export const FLIGHT_TYPES = ['Direct', 'Transit'] as const
export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'STAFF', 'VIEWER'] as const
export const ARTICLE_CITIES = ['GENERAL', 'MAKKAH', 'MADINAH'] as const
export const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const ARTICLE_CONTENT_TYPES = ['article', 'update', 'practical'] as const
export const ARTICLE_CATEGORIES = ['Ibadah', 'Panduan', 'Kehidupan', 'Sosial', 'Ekonomi', 'Bisnis', 'Kuliner', 'Transportasi', 'Akomodasi', 'Makkah', 'Madinah', 'Budaya', 'Sejarah', 'Berita / Update'] as const
export const GUIDE_GROUPS = ['MULAI DI SINI', 'KEHIDUPAN DI HARAMAIN', 'TRANSPORTASI', 'HOTEL', 'MAKKAH', 'MADINAH', 'PERJALANAN', 'IBADAH'] as const
export const GALLERY_CITIES = ['MAKKAH', 'MADINAH'] as const
export const GALLERY_CATEGORIES = ['MASJID', 'LANDSCAPE', 'ARSITEKTUR', 'JALAN', 'TRANSPORTASI', 'KULINER'] as const
export const GALLERY_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const LOCATION_CITIES = ['MAKKAH', 'MADINAH'] as const
export const LOCATION_CATEGORIES = ['HARAM', 'TRANSPORTASI', 'MIQAT', 'KULINER', 'FASILITAS', 'ZIARAH', 'NABAWI', 'RAWDHAH'] as const
export const CONTRIBUTION_TYPES = ['INFORMATION_CORRECTION', 'PLACE_RECOMMENDATION', 'TIP_EXPERIENCE'] as const
export const CONTRIBUTION_STATUSES = ['NEW', 'READ', 'FOLLOWED_UP', 'ARCHIVED'] as const
export const ARTICLE_FEEDBACK_VALUES = ['HELPFUL', 'NOT_HELPFUL'] as const

// ─── Admin User ─────────────────────────────────────────────────────────────
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Unified Admin Workspaces ───────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workspaceMemberships = pgTable(
  'workspace_memberships',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
    workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('VIEWER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('workspace_memberships_user_workspace_unique').on(t.userId, t.workspaceId)],
)

// ─── Media Article ──────────────────────────────────────────────────────────
export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull().default(''),
  heroImage: text('hero_image').notNull().default(''),
  heroImageFileId: text('hero_image_file_id'),
  heroImageAlt: text('hero_image_alt').notNull().default(''),
  body: jsonb('body').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  city: text('city').notNull().default('GENERAL'),
  contentType: text('content_type').notNull().default('article'),
  category: text('category').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  status: text('status').notNull().default('DRAFT'),
  priority: integer('priority').notNull().default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImage: text('og_image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('articles_status_priority_idx').on(t.status, t.priority), index('articles_city_idx').on(t.city)])

// ─── Media Contribution Inbox ──────────────────────────────────────────────
export const contributions = pgTable('contributions', {
  id: serial('id').primaryKey(), type: text('type').notNull(), city: text('city'), subject: text('subject'), message: text('message').notNull(), name: text('name'), contact: text('contact'), sourcePage: text('source_page'), sourceUrl: text('source_url'), mapsUrl: text('maps_url'), status: text('status').notNull().default('NEW'), internalNote: text('internal_note'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), readAt: timestamp('read_at', { withTimezone: true }), followedUpAt: timestamp('followed_up_at', { withTimezone: true }), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [index('contributions_status_created_idx').on(t.status, t.createdAt), index('contributions_type_idx').on(t.type)])

// ─── Article Feedback ───────────────────────────────────────────────────────
export const articleFeedback = pgTable('article_feedback', {
  id: serial('id').primaryKey(), articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }), value: text('value').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('article_feedback_article_idx').on(t.articleId), index('article_feedback_created_idx').on(t.createdAt)])

// ─── Media Page Settings ───────────────────────────────────────────────────
export const mediaPageSettings = pgTable('media_page_settings', {
  id: serial('id').primaryKey(), pageKey: text('page_key').notNull().unique(), heroImageUrl: text('hero_image_url'), heroImageFileId: text('hero_image_file_id'), heroHeadline: text('hero_headline'), heroSubheadline: text('hero_subheadline'), heroTopicOverride: jsonb('hero_topic_override').$type<Array<{ id: string; label: string; isActive: boolean; sortOrder: number }> | null>(), featuredArticleId: integer('featured_article_id').references(() => articles.id, { onDelete: 'set null' }),
  supportingArticleIds: jsonb('supporting_article_ids').$type<number[]>().notNull().default(sql`'[]'::jsonb`), editorialArticleIds: jsonb('editorial_article_ids').$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Media Map Location ─────────────────────────────────────────────────────
export const mapLocations = pgTable('map_locations', {
  id: serial('id').primaryKey(), sourceKey: text('source_key').unique(), name: text('name').notNull(), city: text('city').notNull(), category: text('category').notNull(),
  shortDescription: text('short_description').notNull().default(''), latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(), longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  googleMapsUrl: text('google_maps_url'), imageUrl: text('image_url'), imageFileId: text('image_file_id'), altText: text('alt_text'), tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  sortOrder: integer('sort_order').notNull().default(0), isActive: boolean('is_active').notNull().default(true), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('map_locations_city_category_idx').on(t.city, t.category), index('map_locations_active_sort_idx').on(t.isActive, t.sortOrder)])

// ─── Media Gallery ───────────────────────────────────────────────────────────
export const galleryItems = pgTable('gallery_items', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(), imageFileId: text('image_file_id'), altText: text('alt_text').notNull(),
  title: text('title'), description: text('description'), city: text('city').notNull(), category: text('category').notNull(),
  locationName: text('location_name'), latitude: numeric('latitude', { precision: 10, scale: 7 }), longitude: numeric('longitude', { precision: 10, scale: 7 }),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`), priority: integer('priority').notNull().default(0), status: text('status').notNull().default('DRAFT'),
  takenAt: timestamp('taken_at', { withTimezone: true }), publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('gallery_items_city_category_idx').on(t.city, t.category), index('gallery_items_status_priority_idx').on(t.status, t.priority)])

// ─── Media Guide ─────────────────────────────────────────────────────────────
export const guides = pgTable('guides', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  group: text('group').notNull(),
  summary: text('summary'),
  body: jsonb('body').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status').notNull().default('DRAFT'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('guides_group_sort_idx').on(t.group, t.sortOrder), index('guides_status_idx').on(t.status)])

// ─── Departure City ─────────────────────────────────────────────────────────
export const departureCities = pgTable('departure_cities', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  feePerPax: numeric('fee_per_pax', { precision: 18, scale: 2 }),
  feeCurrency: text('fee_currency').notNull().default('IDR'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Hotel & Room Types ─────────────────────────────────────────────────────
export const hotels = pgTable(
  'hotels',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    city: text('city').notNull(), // 'Makkah' | 'Madinah'
    starRating: integer('star_rating').notNull().default(4),
    distanceLabel: text('distance_label').notNull().default(''),
    description: text('description').notNull().default(''),
    coverImage: text('cover_image').notNull().default(''),
    gallery: jsonb('gallery').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('hotels_city_idx').on(t.city)],
)

export const hotelRoomTypes = pgTable(
  'hotel_room_types',
  {
    id: serial('id').primaryKey(),
    hotelId: integer('hotel_id')
      .notNull()
      .references(() => hotels.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    capacity: integer('capacity').notNull(), // > 0 — validasi server
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('room_types_hotel_name_idx').on(t.hotelId, t.name)],
)

// ─── Flight Option (admin-managed, MVP: CGK → JED) ──────────────────────────
export const flights = pgTable('flights', {
  id: serial('id').primaryKey(),
  airline: text('airline').notNull(),
  routeLabel: text('route_label').notNull().default('CGK → JED'),
  origin: text('origin').notNull().default('CGK'),
  destination: text('destination').notNull().default('JED'),
  flightType: text('flight_type').notNull().default('Direct'), // 'Direct' | 'Transit'
  baggage: text('baggage').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Transportation ─────────────────────────────────────────────────────────
export const transportVehicles = pgTable('transport_vehicles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull(), // > 0
  luggageLabel: text('luggage_label').notNull().default(''),
  description: text('description').notNull().default(''),
  image: text('image').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transportRoutes = pgTable('transport_routes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // ex: "Bandara Jeddah → Makkah"
  pickup: text('pickup').notNull(),
  destination: text('destination').notNull(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transportRouteVehicles = pgTable(
  'transport_route_vehicles',
  {
    id: serial('id').primaryKey(),
    routeId: integer('route_id')
      .notNull()
      .references(() => transportRoutes.id, { onDelete: 'restrict' }),
    vehicleId: integer('vehicle_id')
      .notNull()
      .references(() => transportVehicles.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('route_vehicles_route_vehicle_idx').on(t.routeId, t.vehicleId)],
)

// ─── Service (generik; visa dimodelkan sebagai service) ─────────────────────
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  code: text('code').unique(), // slug opsional: 'visa', 'muthawwif', ...
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('additional'), // core_journey | assisted | additional
  pricingUnit: text('pricing_unit').notNull().default('pax'),
  inTripBuilder: boolean('in_trip_builder').notNull().default(false),
  standalone: boolean('standalone').notNull().default(false),
  image: text('image').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Pricing Periods ────────────────────────────────────────────────────────
export const pricingPeriods = pgTable('pricing_periods', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // 'Normal', 'High Season', 'Ramadan', ...
  startDate: date('start_date', { mode: 'date' }).notNull(),
  endDate: date('end_date', { mode: 'date' }).notNull(),
  priority: integer('priority').notNull().unique(), // tertinggi menang saat overlap
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Exchange Rates (admin-managed; snapshot ke estimasi) ───────────────────
export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: serial('id').primaryKey(),
    sourceCurrency: text('source_currency').notNull(), // SAR / USD
    targetCurrency: text('target_currency').notNull().default('IDR'),
    rate: numeric('rate', { precision: 18, scale: 6 }).notNull(), // > 0
    isActive: boolean('is_active').notNull().default(true),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('exchange_rates_pair_idx').on(t.sourceCurrency, t.targetCurrency)],
)

// ─── Pricing Records (satu arsitektur harga untuk semua entitas terjual) ────
export const pricingRecords = pgTable(
  'pricing_records',
  {
    id: serial('id').primaryKey(),
    entityType: text('entity_type').notNull(), // hotel_room_type | flight | route_vehicle | service
    entityId: integer('entity_id').notNull(),
    periodId: integer('period_id')
      .notNull()
      .references(() => pricingPeriods.id, { onDelete: 'restrict' }),
    currency: text('currency').notNull().default('IDR'),
    pricingUnit: text('pricing_unit').notNull(), // pax | room_night | vehicle_trip | group_session
    strategy: text('strategy').notNull().default('manual'), // cost_plus_fixed | cost_plus_percentage | manual
    // INTERNAL — dilarang muncul di API publik:
    supplierCost: numeric('supplier_cost', { precision: 18, scale: 2 }),
    markupType: text('markup_type'), // fixed | percentage
    markupValue: numeric('markup_value', { precision: 18, scale: 2 }),
    internalNotes: text('internal_notes'),
    // Harga jual (untuk strategi manual):
    sellingPrice: numeric('selling_price', { precision: 18, scale: 2 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('pricing_entity_period_currency_idx').on(t.entityType, t.entityId, t.periodId, t.currency)],
)

// ─── Estimation (snapshot immutabel) ────────────────────────────────────────
// Sequence untuk nomor estimasi EST-000123 — unik, server-side, tanpa infrastruktur ID kompleks.
export const estimationSeq = pgSequence('estimation_seq', { startWith: 1 })

export const estimations = pgTable('estimations', {
  id: serial('id').primaryKey(),
  estimationNumber: text('estimation_number')
    .notNull()
    .unique()
    .default(sql`'EST-' || lpad(nextval('estimation_seq')::text, 6, '0')`),
  status: text('status').notNull().default('submitted'),
  // Snapshot konfigurasi trip:
  pilgrims: integer('pilgrims').notNull(),
  departureCity: text('departure_city').notNull(),
  departureDate: date('departure_date', { mode: 'date' }).notNull(),
  returnDate: date('return_date', { mode: 'date' }).notNull(),
  durationDays: integer('duration_days').notNull(),
  makkahNights: integer('makkah_nights').notNull(),
  madinahNights: integer('madinah_nights').notNull(),
  // Snapshot total:
  totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  perPersonAmount: numeric('per_person_amount', { precision: 18, scale: 2 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const estimationItems = pgTable(
  'estimation_items',
  {
    id: serial('id').primaryKey(),
    estimationId: integer('estimation_id')
      .notNull()
      .references(() => estimations.id, { onDelete: 'cascade' }),
    category: text('category').notNull(), // departure | flight | hotel_makkah | hotel_madinah | transport | visa | services
    label: text('label').notNull(), // human-readable, ex: "Penerbangan", "Hotel Makkah — Swissôtel"
    detail: text('detail'),
    unit: text('unit'), // pax | room_night | vehicle_trip | group_session
    unitPrice: numeric('unit_price', { precision: 18, scale: 2 }),
    currency: text('currency').notNull().default('IDR'),
    quantity: numeric('quantity', { precision: 12, scale: 2 }),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('estimation_items_estimation_idx').on(t.estimationId)],
)

export const estimationRates = pgTable(
  'estimation_rates',
  {
    id: serial('id').primaryKey(),
    estimationId: integer('estimation_id')
      .notNull()
      .references(() => estimations.id, { onDelete: 'cascade' }),
    sourceCurrency: text('source_currency').notNull(),
    targetCurrency: text('target_currency').notNull().default('IDR'),
    rate: numeric('rate', { precision: 18, scale: 6 }).notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('estimation_rates_estimation_idx').on(t.estimationId)],
)

// ─── Lead ───────────────────────────────────────────────────────────────────
export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    whatsapp: text('whatsapp').notNull(),
    email: text('email'),
    origin: text('origin').notNull().default('service_inquiry'), // estimation | service_inquiry
    source: text('source'), // kanal: 'trip-builder' | 'services' | 'hotels' | ...
    serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
    estimationId: integer('estimation_id').references(() => estimations.id, { onDelete: 'set null' }),
    notes: text('notes'),
    status: text('status').notNull().default('NEW'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leads_status_idx').on(t.status), unique('leads_estimation_unique').on(t.estimationId)],
)
