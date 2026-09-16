import {
  TOUR_CUSTOMER_TYPE_LABELS,
  TOUR_CUSTOMER_SOURCE_LABELS,
  TOUR_ORDER_TYPE_LABELS,
  TOUR_ORDER_STATUS_LABELS,
  TOUR_VISA_STATUS_LABELS,
  TOUR_SISKOPATUH_STATUS_LABELS,
  TOUR_ROOM_TYPE_LABELS,
  TOUR_TRIP_STATUS_LABELS,
  TOUR_VENDOR_TYPE_LABELS,
  TOUR_VENDOR_STATUS_LABELS,
  TOUR_BOOKING_TYPE_LABELS,
  TOUR_BOOKING_STATUS_LABELS,
  TOUR_GENDER_LABELS,
  labelOrRaw,
} from '~/shared/tour-labels'

export function useTourLabels() {
  return {
    customerTypeLabel: (k: string) => labelOrRaw(TOUR_CUSTOMER_TYPE_LABELS, k),
    customerSourceLabel: (k: string) => labelOrRaw(TOUR_CUSTOMER_SOURCE_LABELS, k),
    orderTypeLabel: (k: string) => labelOrRaw(TOUR_ORDER_TYPE_LABELS, k),
    orderStatusLabel: (k: string) => labelOrRaw(TOUR_ORDER_STATUS_LABELS, k),
    visaStatusLabel: (k: string) => labelOrRaw(TOUR_VISA_STATUS_LABELS, k),
    siskoStatusLabel: (k: string) => labelOrRaw(TOUR_SISKOPATUH_STATUS_LABELS, k),
    siskopatuhStatusLabel: (k: string) => labelOrRaw(TOUR_SISKOPATUH_STATUS_LABELS, k),
    roomTypeLabel: (k: string) => labelOrRaw(TOUR_ROOM_TYPE_LABELS, k),
    tripStatusLabel: (k: string) => labelOrRaw(TOUR_TRIP_STATUS_LABELS, k),
    vendorTypeLabel: (k: string) => labelOrRaw(TOUR_VENDOR_TYPE_LABELS, k),
    vendorStatusLabel: (k: string) => labelOrRaw(TOUR_VENDOR_STATUS_LABELS, k),
    bookingTypeLabel: (k: string) => labelOrRaw(TOUR_BOOKING_TYPE_LABELS, k),
    bookingStatusLabel: (k: string) => labelOrRaw(TOUR_BOOKING_STATUS_LABELS, k),
    genderLabel: (k: string) => labelOrRaw(TOUR_GENDER_LABELS, k),
  }
}
