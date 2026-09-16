<script setup lang="ts">
import { getStatusToneClass } from '~/shared/tour-status'
import { labelOrRaw } from '~/shared/tour-labels'
import {
  TOUR_ORDER_STATUS_LABELS,
  TOUR_TRIP_STATUS_LABELS,
  TOUR_VENDOR_STATUS_LABELS,
  TOUR_BOOKING_STATUS_LABELS,
  TOUR_VISA_STATUS_LABELS,
  TOUR_SISKOPATUH_STATUS_LABELS,
  TOUR_CUSTOMER_TYPE_LABELS,
  TOUR_VENDOR_TYPE_LABELS,
  TOUR_BOOKING_TYPE_LABELS,
} from '~/shared/tour-labels'

const props = withDefaults(defineProps<{
  status: string
  label?: string
  type?: 'order' | 'trip' | 'vendor' | 'booking' | 'visa' | 'siskopatuh' | 'lead' | 'customerType' | 'vendorType' | 'bookingType' | 'generic'
}>(), {
  type: 'generic',
})

const displayLabel = computed(() => {
  if (props.label) return props.label
  // Try to map via known label maps
  const maps: Record<string, Record<string,string>> = {
    order: TOUR_ORDER_STATUS_LABELS,
    trip: TOUR_TRIP_STATUS_LABELS,
    vendor: TOUR_VENDOR_STATUS_LABELS,
    booking: TOUR_BOOKING_STATUS_LABELS,
    visa: TOUR_VISA_STATUS_LABELS,
    siskopatuh: TOUR_SISKOPATUH_STATUS_LABELS,
    customerType: TOUR_CUSTOMER_TYPE_LABELS,
    vendorType: TOUR_VENDOR_TYPE_LABELS,
    bookingType: TOUR_BOOKING_TYPE_LABELS,
  }
  const map = maps[props.type]
  if (map) return labelOrRaw(map, props.status)
  // Lead statuses custom
  const leadMap: Record<string,string> = {
    NEW: 'Baru',
    CONTACTED: 'Dihubungi',
    FOLLOW_UP: 'Follow Up',
    WON: 'Menang',
    LOST: 'Hilang',
  }
  if (props.type === 'lead' && leadMap[props.status]) return leadMap[props.status]
  return props.status
})

const toneClass = computed(() => getStatusToneClass(props.status))
</script>

<template>
  <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none" :class="toneClass">
    {{ displayLabel }}
  </span>
</template>
