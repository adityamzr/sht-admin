export const TOUR_CUSTOMER_TYPE_LABELS: Record<string, string> = {
  B2C_JAMAAH: 'Jamaah Langsung',
  B2B_TRAVEL: 'Travel Partner',
  INSTITUTION: 'Institusi',
}

export const TOUR_CUSTOMER_SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  REFERRAL: 'Referral',
  INSTAGRAM: 'Instagram',
  AGENT: 'Agen',
  OFFLINE: 'Offline',
  OTHER: 'Lainnya',
}

export const TOUR_ORDER_TYPE_LABELS: Record<string, string> = {
  UMRAH_PACKAGE: 'Paket Umrah',
  CUSTOM_PRIVATE: 'Custom / Private',
  LAND_ARRANGEMENT: 'Land Arrangement',
  SERVICE_ONLY: 'Layanan Satuan',
}

export const TOUR_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Terkonfirmasi',
  IN_PROGRESS: 'Sedang Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export const TOUR_VISA_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai',
  PROCESSING: 'Proses',
  APPROVED: 'Disetujui',
  ISSUED: 'Terbit',
}

export const TOUR_SISKOPATUH_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  REGISTERED: 'Terdaftar',
  ACTIVE: 'Aktif',
}

export const TOUR_ROOM_TYPE_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  QUAD: 'Quad',
  QUINT: 'Quint',
  NA: 'Tidak Ada',
}

export const TOUR_TRIP_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Direncanakan',
  CONFIRMED: 'Terkonfirmasi',
  ACTIVE: 'Aktif / Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export const TOUR_VENDOR_TYPE_LABELS: Record<string, string> = {
  HOTEL: 'Hotel',
  TRANSPORT: 'Transport',
  VISA: 'Visa',
  FLIGHT: 'Penerbangan',
  SISKOPATUH: 'Siskopatuh',
  MUTHAWWIF: 'Muthawwif',
  HANDLING: 'Handling',
  OTHER: 'Lainnya',
}

export const TOUR_VENDOR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
}

export const TOUR_BOOKING_TYPE_LABELS: Record<string, string> = {
  HOTEL: 'Hotel',
  TRANSPORT: 'Transport',
  VISA: 'Visa',
  FLIGHT: 'Penerbangan',
  SISKOPATUH: 'Siskopatuh',
  MUTHAWWIF: 'Muthawwif',
  HANDLING: 'Handling',
  OTHER: 'Lainnya',
}

export const TOUR_BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Terkonfirmasi',
  PAID: 'Dibayar',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export const TOUR_GENDER_LABELS: Record<string, string> = {
  MALE: 'Laki-laki',
  FEMALE: 'Perempuan',
}

export function labelOrRaw(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '—'
  return map[key] ?? key
}
