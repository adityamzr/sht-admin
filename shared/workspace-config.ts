import type { Component } from 'vue'
import { Newspaper, Plane, LayoutGrid, Settings, BarChart3 } from 'lucide-vue-next'

export interface WorkspaceHubMeta {
  key: string
  name: string
  shortName: string
  description: string
  longDescription: string
  icon: Component
  accent: string // tailwind classes for accent
  route: string
  features: string[]
}

export const WORKSPACE_HUB_META: Record<string, WorkspaceHubMeta> = {
  media: {
    key: 'media',
    name: 'Sudut Haramain Media',
    shortName: 'MEDIA',
    description: 'Content, articles, galleries, maps and media analytics.',
    longDescription: 'Kelola artikel, panduan, gallery, lokasi peta, kontribusi pengguna, feedback, dan analytics media.',
    icon: Newspaper,
    accent: 'bg-sht-olive text-white',
    route: '/media',
    features: ['Articles', 'Guides', 'Gallery', 'Maps', 'Analytics'],
  },
  tour: {
    key: 'tour',
    name: 'Sudut Haramain Tour',
    shortName: 'TOUR',
    description: 'Sales, operations, trips, finance and rooming.',
    longDescription: 'Kelola leads, customers, orders, jamaah, trips, vendors, bookings, finance, dan rooming.',
    icon: Plane,
    accent: 'bg-amber-600 text-white',
    route: '/tour',
    features: ['Leads', 'Orders', 'Trips', 'Finance', 'Rooming'],
  },
}

export const WORKSPACE_ORDER = ['media', 'tour']

export function getWorkspaceMeta(key: string): WorkspaceHubMeta | null {
  return WORKSPACE_HUB_META[key] ?? null
}
