export function toCsv(rows: Record<string, any>[], headers: { key: string; label: string }[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const head = headers.map(h => escape(h.label)).join(',')
  const lines = rows.map(r => headers.map(h => escape(r[h.key])).join(','))
  return [head, ...lines].join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
