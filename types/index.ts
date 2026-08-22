/** Tipe payload UI admin (mencerminkan serializer server). */

export interface AdminUser {
  id: number
  email: string
  name: string
  isActive: boolean
}

export interface DepartureCity {
  id: number
  code: string
  name: string
  feePerPax: number | null
  feeCurrency: string
  isActive: boolean
  sortOrder: number
}

export interface RoomType {
  id: number
  hotelId: number
  name: string
  capacity: number
  isActive: boolean
  sortOrder: number
}

export interface Hotel {
  id: number
  name: string
  city: string
  starRating: number
  distanceLabel: string
  description: string
  coverImage: string
  gallery: string[]
  isActive: boolean
  sortOrder: number
  roomTypes: RoomType[]
}

export interface Flight {
  id: number
  airline: string
  routeLabel: string
  origin: string
  destination: string
  flightType: string
  baggage: string
  isActive: boolean
  sortOrder: number
}

export interface Vehicle {
  id: number
  name: string
  capacity: number
  luggageLabel: string
  description: string
  image: string
  isActive: boolean
  sortOrder: number
}

export interface TransportRoute {
  id: number
  name: string
  pickup: string
  destination: string
  description: string
  isActive: boolean
  sortOrder: number
  vehicleOptions: Array<{ id: number; vehicleId: number; isActive: boolean; vehicle: Vehicle | null }>
}

export interface Service {
  id: number
  code: string | null
  name: string
  description: string
  category: string
  pricingUnit: string
  inTripBuilder: boolean
  standalone: boolean
  image: string
  isActive: boolean
  sortOrder: number
}

export interface PricingPeriod {
  id: number
  name: string
  startDate: string
  endDate: string
  priority: number
  isActive: boolean
}

export interface ExchangeRate {
  id: number
  sourceCurrency: string
  targetCurrency: string
  rate: number
  isActive: boolean
  effectiveAt: string
}

export interface PricingRecord {
  id: number
  entityType: string
  entityId: number
  periodId: number
  currency: string
  pricingUnit: string
  strategy: string
  supplierCost: number | null
  markupType: string | null
  markupValue: number | null
  sellingPrice: number | null
  internalNotes: string | null
  isActive: boolean
  computedSellingPrice: number
}

export interface Lead {
  id: number
  name: string
  whatsapp: string
  email: string | null
  origin: string
  source: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  serviceId: number | null
  serviceName: string | null
  estimationId: number | null
  estimationNumber: string | null
}

export interface EstimationListItem {
  id: number
  estimationNumber: string
  status: string
  pilgrims: number
  departureCity: string
  departureDate: string
  returnDate: string
  durationDays: number
  makkahNights: number
  madinahNights: number
  totalAmount: number
  currency: string
  perPersonAmount: number | null
  submittedAt: string
}

export interface EstimationItem {
  id: number
  category: string
  label: string
  detail: string | null
  unit: string | null
  unitPrice: number | null
  currency: string
  quantity: number | null
  amount: number
  meta: Record<string, unknown>
}

export interface EstimationDetail extends EstimationListItem {
  items: EstimationItem[]
  rates: Array<{ sourceCurrency: string; targetCurrency: string; rate: number; capturedAt: string }>
}

export interface AdminSummary {
  newLeads: number
  totalLeads: number
  totalEstimations: number
  activeProducts: number
}
