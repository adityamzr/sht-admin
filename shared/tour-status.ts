/**
 * Centralized status tone mapping for Tour Operations.
 * Used by AdminStatusBadge and TourStatusBadge.
 */

export type StatusTone = 'neutral' | 'info' | 'positive' | 'warning' | 'success' | 'danger' | 'muted'

export const TOUR_STATUS_TONE: Record<string, StatusTone> = {
  // Draft / neutral
  DRAFT: 'neutral',

  // New / Planned / informational (blue)
  NEW: 'info',
  PLANNED: 'info',
  ISSUED: 'info',

  // Confirmed / Active / positive (olive)
  CONFIRMED: 'positive',
  ACTIVE: 'positive',

  // In progress / processing / follow up / amber
  IN_PROGRESS: 'warning',
  PROCESSING: 'warning',
  FOLLOW_UP: 'warning',
  CONTACTED: 'warning',
  REGISTERED: 'warning',
  PARTIAL: 'warning',

  // Approved / Issued / Paid / Completed / Won / Verified / success (green)
  APPROVED: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  WON: 'success',
  VERIFIED: 'success',

  // Cancelled / Lost / Overdue / danger (red)
  CANCELLED: 'danger',
  LOST: 'danger',
  OVERDUE: 'danger',

  // Inactive / Archived / muted (gray)
  INACTIVE: 'muted',
  ARCHIVED: 'muted',
  PENDING: 'muted',
  NOT_STARTED: 'muted',
  NA: 'muted',
  UNPAID: 'muted',
  VOID: 'muted',
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-neutral-line bg-neutral-warm text-neutral-charcoal/70',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  positive: 'border-brand-green/20 bg-sht-olive/10 text-brand-green',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  muted: 'border-neutral-line bg-neutral-soft text-neutral-charcoal/50',
}

export function getStatusTone(status: string): StatusTone {
  return TOUR_STATUS_TONE[status] ?? 'neutral'
}

export function getStatusToneClass(status: string): string {
  return TONE_CLASSES[getStatusTone(status)]
}
