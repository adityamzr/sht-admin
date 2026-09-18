export type AdminToastType = 'success' | 'error' | 'warning' | 'info'
export type AdminToastItem = {
  id: number
  message: string
  type: AdminToastType
  duration: number
  createdAt: number
  remaining: number
  timer?: ReturnType<typeof setTimeout>
  pausedAt?: number
}

const DEFAULT_DURATIONS: Record<AdminToastType, number> = {
  success: 3500,
  info: 3500,
  warning: 6000,
  error: 8000,
}

function sanitizeMessage(msg: string): string {
  // Surface sanitized business errors, strip overly technical details
  if (!msg) return 'Terjadi kesalahan'
  // Limit length
  let s = String(msg).trim()
  if (s.length > 300) s = s.slice(0, 297) + '...'
  return s
}

export function useAdminToast() {
  const items = useState<AdminToastItem[]>('admin-toasts', () => [])

  function clearTimer(item: AdminToastItem) {
    if (item.timer) {
      clearTimeout(item.timer)
      item.timer = undefined
    }
  }

  function startTimer(item: AdminToastItem) {
    clearTimer(item)
    if (item.remaining <= 0) {
      dismiss(item.id)
      return
    }
    item.timer = setTimeout(() => dismiss(item.id), item.remaining)
  }

  function dismiss(id: number) {
    const idx = items.value.findIndex(x => x.id === id)
    if (idx >= 0) {
      clearTimer(items.value[idx])
      items.value.splice(idx, 1)
    }
  }

  function show(message: string, type: AdminToastType = 'info', duration?: number) {
    const sanitized = sanitizeMessage(message)
    // Prevent duplicate toasts: same message + type within 1s
    const now = Date.now()
    const duplicate = items.value.find(x => x.message === sanitized && x.type === type && now - x.createdAt < 1500)
    if (duplicate) return duplicate.id

    const dur = duration ?? DEFAULT_DURATIONS[type] ?? 4000
    const id = now + Math.floor(Math.random() * 1000)
    const item: AdminToastItem = {
      id,
      message: sanitized,
      type,
      duration: dur,
      createdAt: now,
      remaining: dur,
    }
    items.value = [...items.value, item]
    // Start timer next tick to allow UI to render
    setTimeout(() => startTimer(item), 50)
    return id
  }

  function pause(id: number) {
    const item = items.value.find(x => x.id === id)
    if (!item || item.pausedAt) return
    clearTimer(item)
    item.pausedAt = Date.now()
    const elapsed = item.pausedAt - item.createdAt
    // For resumed timers, remaining already tracked
    // Recalculate remaining if not paused before
    if (item.remaining === item.duration) {
      item.remaining = Math.max(0, item.duration - elapsed)
    } else {
      // If already paused/resumed before, adjust remaining based on elapsed since last resume
      // Simplification: remaining already correct, just pause
    }
  }

  function resume(id: number) {
    const item = items.value.find(x => x.id === id)
    if (!item || !item.pausedAt) return
    // Adjust remaining by time paused? Actually we paused timer, so remaining stays same
    item.pausedAt = undefined
    item.createdAt = Date.now() - (item.duration - item.remaining)
    startTimer(item)
  }

  // Convenience helpers
  function success(msg: string, duration?: number) { return show(msg, 'success', duration) }
  function error(msg: string, duration?: number) { return show(msg, 'error', duration) }
  function warning(msg: string, duration?: number) { return show(msg, 'warning', duration) }
  function info(msg: string, duration?: number) { return show(msg, 'info', duration) }

  function clearAll() {
    for (const it of items.value) clearTimer(it)
    items.value = []
  }

  return { items, show, dismiss, pause, resume, success, error, warning, info, clearAll }
}
