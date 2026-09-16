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
  activeOrders?: number
  totalOrders?: number
  totalPax?: number
  upcomingTrips?: number
  confirmedBookings?: number
  totalCustomers?: number
  totalTrips?: number
}

export interface TourCustomer {
  id: number
  workspaceId: number
  customerCode: string
  name: string
  whatsapp: string
  email: string | null
  city: string | null
  customerType: string
  source: string
  picUserId: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TourOrder {
  id: number
  workspaceId: number
  orderCode: string
  orderDate: string
  customerId: number
  leadId: number | null
  estimationId: number | null
  orderType: string
  packageName: string | null
  serviceSummary: string
  paxCount: number
  status: string
  sellingPriceIdr: number
  picUserId: number | null
  source: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TourJamaah {
  id: number
  workspaceId: number
  jamaahCode: string
  orderId: number
  fullName: string
  gender: string | null
  birthDate: string | null
  passportNumber: string | null
  passportExpiry: string | null
  visaStatus: string
  siskopatuhStatus: string
  roomType: string
  whatsapp: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TourTrip {
  id: number
  workspaceId: number
  tripCode: string
  name: string
  departureDate: string
  returnDate: string
  routeSummary: string
  capacity: number
  status: string
  picUserId: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TourVendor {
  id: number
  workspaceId: number
  vendorCode: string
  name: string
  vendorType: string
  contactName: string | null
  whatsapp: string | null
  email: string | null
  city: string | null
  country: string | null
  defaultCurrency: string
  paymentInfo: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TourBooking {
  id: number
  workspaceId: number
  bookingCode: string
  bookingDate: string
  tripId: number | null
  orderId: number | null
  vendorId: number
  bookingType: string
  description: string
  currency: string
  amount: number
  exchangeRateSnapshot: number | null
  amountIdr: number
  status: string
  dueDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TourTripOrder {
  id: number
  workspaceId: number
  tripId: number
  orderId: number
  createdAt: string
}
