/**
 * Tipe baris DB yang dipakai serializer — hanya untuk keterbacaan.
 * (Tipe asli drizzle bisa dipakai langsung; ini menghindari impor berat
 * di test murni serializer.)
 */
export interface DepartureCityRow {
  id: number
  code: string
  name: string
  feePerPax: string | number | null
  feeCurrency: string
  isActive: boolean
  sortOrder: number
}
export interface HotelRow {
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
}
export interface RoomTypeRow {
  id: number
  hotelId: number
  name: string
  capacity: number
  isActive: boolean
  sortOrder: number
}
export interface FlightRow {
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
export interface VehicleRow {
  id: number
  name: string
  capacity: number
  luggageLabel: string
  description: string
  image: string
  isActive: boolean
  sortOrder: number
}
export interface RouteRow {
  id: number
  name: string
  pickup: string
  destination: string
  description: string
  isActive: boolean
  sortOrder: number
}
export interface RouteVehicleRow {
  id: number
  routeId: number
  vehicleId: number
  isActive: boolean
}
export interface ServiceRow {
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
export interface PricingPeriodRow {
  id: number
  name: string
  startDate: Date | string
  endDate: Date | string
  priority: number
  isActive: boolean
}
export interface ExchangeRateRow {
  id: number
  sourceCurrency: string
  targetCurrency: string
  rate: string | number
  isActive: boolean
  effectiveAt: Date
}
export interface PricingRecordRow {
  id: number
  entityType: string
  entityId: number
  periodId: number
  currency: string
  pricingUnit: string
  strategy: string
  supplierCost: string | number | null
  markupType: string | null
  markupValue: string | number | null
  sellingPrice: string | number | null
  internalNotes: string | null
  isActive: boolean
}
