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
export const ARTICLE_CONTENT_TYPES = ['article', 'explainer', 'guide', 'how_to', 'analysis', 'news', 'editorial', 'faq', 'comparison', 'story_feature'] as const
export const ARTICLE_CATEGORIES = ['Ibadah', 'Panduan', 'Kehidupan', 'Sosial', 'Ekonomi', 'Bisnis', 'Kuliner', 'Transportasi', 'Akomodasi', 'Makkah', 'Madinah', 'Budaya', 'Sejarah', 'Berita / Update', 'Sains & Teknologi', 'Hiburan & Permainan', 'Gaya Hidup', 'Komunitas', 'Lainnya'] as const
export const GUIDE_GROUPS = ['MULAI DI SINI', 'KEHIDUPAN DI HARAMAIN', 'TRANSPORTASI', 'HOTEL', 'MAKKAH', 'MADINAH', 'PERJALANAN', 'IBADAH'] as const
export const GALLERY_CITIES = ['MAKKAH', 'MADINAH'] as const
export const GALLERY_CATEGORIES = ['MASJID', 'LANDSCAPE', 'ARSITEKTUR', 'JALAN', 'TRANSPORTASI', 'KULINER'] as const
export const GALLERY_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const LOCATION_CITIES = ['MAKKAH', 'MADINAH'] as const
export const LOCATION_CATEGORIES = ['HARAM', 'TRANSPORTASI', 'MIQAT', 'KULINER', 'FASILITAS', 'ZIARAH', 'NABAWI', 'RAWDHAH'] as const
export const CONTRIBUTION_TYPES = ['INFORMATION_CORRECTION', 'PLACE_RECOMMENDATION', 'TIP_EXPERIENCE'] as const
export const CONTRIBUTION_STATUSES = ['NEW', 'READ', 'FOLLOWED_UP', 'ARCHIVED'] as const
export const ARTICLE_FEEDBACK_VALUES = ['HELPFUL', 'NOT_HELPFUL'] as const
export const MEDIA_ANALYTICS_EVENT_TYPES = ['page_view','article_view','guide_view','gallery_open','map_location_view','map_direction_click','search','instagram_click','whatsapp_click','contribution_submit','article_feedback_helpful','article_feedback_not_helpful'] as const

// ─── Tour Operations Phase 1 ────────────────────────────────────────────────
export const TOUR_CUSTOMER_TYPES = ['B2C_JAMAAH', 'B2B_TRAVEL', 'INSTITUTION'] as const
export const TOUR_CUSTOMER_SOURCES = ['WHATSAPP', 'REFERRAL', 'INSTAGRAM', 'AGENT', 'OFFLINE', 'OTHER'] as const
export const TOUR_ORDER_TYPES = ['UMRAH_PACKAGE', 'CUSTOM_PRIVATE', 'LAND_ARRANGEMENT', 'SERVICE_ONLY'] as const
export const TOUR_ORDER_STATUSES = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
export const TOUR_VISA_STATUSES = ['NOT_STARTED', 'PROCESSING', 'APPROVED', 'ISSUED'] as const
export const TOUR_SISKOPATUH_STATUSES = ['PENDING', 'REGISTERED', 'ACTIVE'] as const
export const TOUR_ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'QUINT', 'NA'] as const
export const TOUR_TRIP_STATUSES = ['PLANNED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const
export const TOUR_VENDOR_TYPES = ['HOTEL', 'TRANSPORT', 'VISA', 'FLIGHT', 'SISKOPATUH', 'MUTHAWWIF', 'HANDLING', 'OTHER'] as const
export const TOUR_VENDOR_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export const TOUR_BOOKING_TYPES = ['HOTEL', 'TRANSPORT', 'VISA', 'FLIGHT', 'SISKOPATUH', 'MUTHAWWIF', 'HANDLING', 'OTHER'] as const
export const TOUR_BOOKING_STATUSES = ['DRAFT', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED'] as const
export const TOUR_GENDERS = ['MALE', 'FEMALE'] as const

// ─── Admin User ─────────────────────────────────────────────────────────────
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  avatarUrl: text('avatar_url'), avatarFileId: text('avatar_file_id'),
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

export const notifications = pgTable('notifications', { id: serial('id').primaryKey(), recipientUserId: integer('recipient_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }), workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }), type: text('type').notNull(), title: text('title').notNull(), message: text('message').notNull(), href: text('href'), readAt: timestamp('read_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), }, (t) => [index('notifications_recipient_workspace_idx').on(t.recipientUserId, t.workspaceId, t.createdAt)])

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

// ─── Media Article Translations ───────────────────────────────────────────
export const articleTranslations = pgTable('article_translations', {
  id: serial('id').primaryKey(), articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }), locale: text('locale').notNull(), title: text('title').notNull().default(''), slug: text('slug'), excerpt: text('excerpt').notNull().default(''), heroAlt: text('hero_alt').notNull().default(''), body: jsonb('body').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`), seoTitle: text('seo_title'), seoDescription: text('seo_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('article_translations_article_locale_unique').on(t.articleId, t.locale), uniqueIndex('article_translations_locale_slug_unique').on(t.locale, t.slug).where(sql`${t.slug} IS NOT NULL`)])

// ─── Media Contribution Inbox ──────────────────────────────────────────────
export const contributions = pgTable('contributions', {
  id: serial('id').primaryKey(), type: text('type').notNull(), city: text('city'), subject: text('subject'), message: text('message').notNull(), name: text('name'), contact: text('contact'), sourcePage: text('source_page'), sourceUrl: text('source_url'), mapsUrl: text('maps_url'), status: text('status').notNull().default('NEW'), internalNote: text('internal_note'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), readAt: timestamp('read_at', { withTimezone: true }), followedUpAt: timestamp('followed_up_at', { withTimezone: true }), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [index('contributions_status_created_idx').on(t.status, t.createdAt), index('contributions_type_idx').on(t.type)])

// ─── Article Feedback ───────────────────────────────────────────────────────
export const articleFeedback = pgTable('article_feedback', {
  id: serial('id').primaryKey(), articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }), value: text('value').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('article_feedback_article_idx').on(t.articleId), index('article_feedback_created_idx').on(t.createdAt)])

// Anonymous, first-party Media analytics. IDs are opaque UUIDs generated by
// sh-web; no IP address, fingerprint, or personal form data is persisted.
export const mediaAnalyticsEvents = pgTable('media_analytics_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  visitorId: text('visitor_id').notNull(),
  sessionId: text('session_id').notNull(),
  path: text('path').notNull(),
  locale: text('locale').notNull(),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  city: text('city'),
  category: text('category'),
  referrerHost: text('referrer_host'),
  deviceType: text('device_type'),
  countryCode: text('country_code'),
  metadata: jsonb('metadata').$type<Record<string, string | number | boolean>>(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('media_analytics_occurred_idx').on(t.occurredAt),
  index('media_analytics_type_occurred_idx').on(t.eventType, t.occurredAt),
  index('media_analytics_visitor_occurred_idx').on(t.visitorId, t.occurredAt),
  index('media_analytics_session_occurred_idx').on(t.sessionId, t.occurredAt),
  index('media_analytics_entity_occurred_idx').on(t.entityType, t.entityId, t.occurredAt),
  index('media_analytics_locale_occurred_idx').on(t.locale, t.occurredAt),
  index('media_analytics_city_occurred_idx').on(t.city, t.occurredAt),
])

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
    source: text('source'), // kanal: 'trip-builder' | 'services' | 'hotels' | 'whatsapp' | 'instagram' | ...
    serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
    estimationId: integer('estimation_id').references(() => estimations.id, { onDelete: 'set null' }),
    paxEstimate: integer('pax_estimate'),
    notes: text('notes'),
    status: text('status').notNull().default('NEW'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leads_status_idx').on(t.status), unique('leads_estimation_unique').on(t.estimationId), index('leads_whatsapp_idx').on(t.whatsapp)],
)

// ─── Media localization (ID canonical, optional EN) ────────────────────────
export const guideTranslations = pgTable('guide_translations', {
  id: serial('id').primaryKey(),
  guideId: integer('guide_id').notNull().references(() => guides.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  title: text('title').notNull().default(''),
  slug: text('slug'),
  summary: text('summary'),
  body: jsonb('body').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('guide_translations_entity_locale_unique').on(t.guideId, t.locale),
  uniqueIndex('guide_translations_locale_slug_unique').on(t.locale, t.slug).where(sql`${t.slug} IS NOT NULL`),
])

export const galleryTranslations = pgTable('gallery_translations', {
  id: serial('id').primaryKey(),
  galleryId: integer('gallery_id').notNull().references(() => galleryItems.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  altText: text('alt_text').notNull().default(''),
  title: text('title'),
  description: text('description'),
  locationName: text('location_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('gallery_translations_entity_locale_unique').on(t.galleryId, t.locale),
])

export const mapLocationTranslations = pgTable('map_location_translations', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').notNull().references(() => mapLocations.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  name: text('name').notNull().default(''),
  shortDescription: text('short_description').notNull().default(''),
  altText: text('alt_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('map_location_translations_entity_locale_unique').on(t.locationId, t.locale),
])

export const mediaPageSettingsTranslations = pgTable('media_page_settings_translations', {
  id: serial('id').primaryKey(),
  pageSettingsId: integer('page_settings_id').notNull().references(() => mediaPageSettings.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  heroHeadline: text('hero_headline'),
  heroSubheadline: text('hero_subheadline'),
  heroTopicLabels: jsonb('hero_topic_labels').$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('media_page_settings_translations_entity_locale_unique').on(t.pageSettingsId, t.locale),
])

// ─── Tour Operations Phase 1 Sequences ─────────────────────────────────────
export const tourCustomersSeq = pgSequence('tour_customers_seq', { startWith: 1 })
export const tourOrdersSeq = pgSequence('tour_orders_seq', { startWith: 1 })
export const tourJamaahSeq = pgSequence('tour_jamaah_seq', { startWith: 1 })
export const tourTripsSeq = pgSequence('tour_trips_seq', { startWith: 1 })
export const tourVendorsSeq = pgSequence('tour_vendors_seq', { startWith: 1 })
export const tourBookingsSeq = pgSequence('tour_bookings_seq', { startWith: 1 })

// ─── Tour Customers ─────────────────────────────────────────────────────────
export const tourCustomers = pgTable('tour_customers', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  customerCode: text('customer_code').notNull().default(sql`'CUS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_customers_seq')::text, 4, '0')`),
  name: text('name').notNull(),
  whatsapp: text('whatsapp').notNull(),
  email: text('email'),
  city: text('city'),
  customerType: text('customer_type').notNull().default('B2C_JAMAAH'),
  source: text('source').notNull().default('WHATSAPP'),
  picUserId: integer('pic_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('tour_customers_workspace_code_unique').on(t.workspaceId, t.customerCode),
  index('tour_customers_workspace_idx').on(t.workspaceId),
  index('tour_customers_type_idx').on(t.customerType),
  index('tour_customers_source_idx').on(t.source),
  index('tour_customers_name_idx').on(t.name),
  index('tour_customers_whatsapp_idx').on(t.whatsapp),
  index('tour_customers_deleted_idx').on(t.deletedAt),
])

// ─── Tour Orders ────────────────────────────────────────────────────────────
export const tourOrders = pgTable('tour_orders', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  orderCode: text('order_code').notNull().default(sql`'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_orders_seq')::text, 4, '0')`),
  orderDate: date('order_date', { mode: 'date' }).notNull(),
  customerId: integer('customer_id').notNull().references(() => tourCustomers.id, { onDelete: 'restrict' }),
  leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  estimationId: integer('estimation_id').references(() => estimations.id, { onDelete: 'set null' }),
  orderType: text('order_type').notNull().default('UMRAH_PACKAGE'),
  packageName: text('package_name'),
  serviceSummary: text('service_summary').notNull().default(''),
  paxCount: integer('pax_count').notNull(),
  status: text('status').notNull().default('DRAFT'),
  sellingPriceIdr: numeric('selling_price_idr', { precision: 18, scale: 2 }).notNull().default('0'),
  picUserId: integer('pic_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  source: text('source'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('tour_orders_workspace_code_unique').on(t.workspaceId, t.orderCode),
  index('tour_orders_workspace_idx').on(t.workspaceId),
  index('tour_orders_customer_idx').on(t.customerId),
  index('tour_orders_lead_idx').on(t.leadId),
  index('tour_orders_estimation_idx').on(t.estimationId),
  index('tour_orders_status_idx').on(t.status),
  index('tour_orders_type_idx').on(t.orderType),
  index('tour_orders_date_idx').on(t.orderDate),
  index('tour_orders_deleted_idx').on(t.deletedAt),
])

// ─── Tour Jamaah ────────────────────────────────────────────────────────────
export const tourJamaah = pgTable('tour_jamaah', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  jamaahCode: text('jamaah_code').notNull().default(sql`'JMH-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_jamaah_seq')::text, 4, '0')`),
  orderId: integer('order_id').notNull().references(() => tourOrders.id, { onDelete: 'restrict' }),
  fullName: text('full_name').notNull(),
  gender: text('gender'),
  birthDate: date('birth_date', { mode: 'date' }),
  passportNumber: text('passport_number'),
  passportExpiry: date('passport_expiry', { mode: 'date' }),
  visaStatus: text('visa_status').notNull().default('NOT_STARTED'),
  siskopatuhStatus: text('siskopatuh_status').notNull().default('PENDING'),
  roomType: text('room_type').notNull().default('NA'),
  whatsapp: text('whatsapp'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('tour_jamaah_workspace_code_unique').on(t.workspaceId, t.jamaahCode),
  index('tour_jamaah_workspace_idx').on(t.workspaceId),
  index('tour_jamaah_order_idx').on(t.orderId),
  index('tour_jamaah_visa_idx').on(t.visaStatus),
  index('tour_jamaah_sisko_idx').on(t.siskopatuhStatus),
  index('tour_jamaah_name_idx').on(t.fullName),
  index('tour_jamaah_deleted_idx').on(t.deletedAt),
])

// ─── Tour Trips ─────────────────────────────────────────────────────────────
export const tourTrips = pgTable('tour_trips', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  tripCode: text('trip_code').notNull().default(sql`'TRIP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_trips_seq')::text, 4, '0')`),
  name: text('name').notNull(),
  departureDate: date('departure_date', { mode: 'date' }).notNull(),
  returnDate: date('return_date', { mode: 'date' }).notNull(),
  routeSummary: text('route_summary').notNull().default(''),
  capacity: integer('capacity').notNull(),
  status: text('status').notNull().default('PLANNED'),
  picUserId: integer('pic_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('tour_trips_workspace_code_unique').on(t.workspaceId, t.tripCode),
  index('tour_trips_workspace_idx').on(t.workspaceId),
  index('tour_trips_status_idx').on(t.status),
  index('tour_trips_departure_idx').on(t.departureDate),
  index('tour_trips_deleted_idx').on(t.deletedAt),
])

// ─── Tour Trip Orders (many-to-many) ────────────────────────────────────────
export const tourTripOrders = pgTable('tour_trip_orders', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  tripId: integer('trip_id').notNull().references(() => tourTrips.id, { onDelete: 'cascade' }),
  orderId: integer('order_id').notNull().references(() => tourOrders.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tour_trip_orders_trip_order_unique').on(t.tripId, t.orderId),
  index('tour_trip_orders_workspace_idx').on(t.workspaceId),
  index('tour_trip_orders_trip_idx').on(t.tripId),
  index('tour_trip_orders_order_idx').on(t.orderId),
])

// ─── Tour Vendors ───────────────────────────────────────────────────────────
export const tourVendors = pgTable('tour_vendors', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  vendorCode: text('vendor_code').notNull().default(sql`'VND-' || lpad(nextval('tour_vendors_seq')::text, 4, '0')`),
  name: text('name').notNull(),
  vendorType: text('vendor_type').notNull(),
  contactName: text('contact_name'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  city: text('city'),
  country: text('country'),
  defaultCurrency: text('default_currency').notNull().default('IDR'),
  paymentInfo: text('payment_info'),
  status: text('status').notNull().default('ACTIVE'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('tour_vendors_workspace_code_unique').on(t.workspaceId, t.vendorCode),
  index('tour_vendors_workspace_idx').on(t.workspaceId),
  index('tour_vendors_type_idx').on(t.vendorType),
  index('tour_vendors_status_idx').on(t.status),
  index('tour_vendors_name_idx').on(t.name),
  index('tour_vendors_deleted_idx').on(t.deletedAt),
])

// ─── Tour Bookings ──────────────────────────────────────────────────────────
export const tourBookings = pgTable('tour_bookings', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  bookingCode: text('booking_code').notNull().default(sql`'BKG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_bookings_seq')::text, 4, '0')`),
  bookingDate: date('booking_date', { mode: 'date' }).notNull(),
  tripId: integer('trip_id').references(() => tourTrips.id, { onDelete: 'set null' }),
  orderId: integer('order_id').references(() => tourOrders.id, { onDelete: 'set null' }),
  vendorId: integer('vendor_id').notNull().references(() => tourVendors.id, { onDelete: 'restrict' }),
  bookingType: text('booking_type').notNull(),
  description: text('description').notNull().default(''),
  currency: text('currency').notNull().default('IDR'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  exchangeRateSnapshot: numeric('exchange_rate_snapshot', { precision: 18, scale: 6 }),
  amountIdr: numeric('amount_idr', { precision: 18, scale: 2 }).notNull(),
  status: text('status').notNull().default('DRAFT'),
  dueDate: date('due_date', { mode: 'date' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('tour_bookings_workspace_code_unique').on(t.workspaceId, t.bookingCode),
  index('tour_bookings_workspace_idx').on(t.workspaceId),
  index('tour_bookings_trip_idx').on(t.tripId),
  index('tour_bookings_order_idx').on(t.orderId),
  index('tour_bookings_vendor_idx').on(t.vendorId),
  index('tour_bookings_status_idx').on(t.status),
  index('tour_bookings_type_idx').on(t.bookingType),
  index('tour_bookings_date_idx').on(t.bookingDate),
  index('tour_bookings_deleted_idx').on(t.deletedAt),
])
