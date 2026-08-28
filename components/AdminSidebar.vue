<script setup lang="ts">
const route = useRoute()
const isOpen = ref(false)
type SidebarItem = { label: string; to?: string; icon: string; disabled?: boolean; status?: string; section?: string }

const tourMenu: SidebarItem[] = [
  { label: 'Dashboard', to: '/', icon: 'grid' },
  { label: 'Leads', to: '/leads', icon: 'users' },
  { label: 'Estimations', to: '/estimations', icon: 'calc' },
  { label: 'Hotels', to: '/hotels', icon: 'building' },
  { label: 'Flights', to: '/flights', icon: 'plane' },
  { label: 'Transport', to: '/transport', icon: 'car' },
  { label: 'Services', to: '/services', icon: 'sparkle' },
  { label: 'Pricing', to: '/pricing', icon: 'tag' },
  { label: 'Pricing Periods', to: '/pricing-periods', icon: 'calendar' },
  { label: 'Exchange Rates', to: '/exchange-rates', icon: 'currency' },
  { label: 'Departure Cities', to: '/departure-cities', icon: 'map' },
  { label: 'Settings', to: '/settings', icon: 'cog' },
]
const mediaMenu: SidebarItem[] = [
  { label: 'Dashboard', to: '/media', icon: 'grid' },
  { label: 'Home', icon: 'grid', disabled: true, status: 'Segera', section: 'PAGE SETTINGS' },
  { label: 'Makkah', icon: 'map', disabled: true, status: 'Segera' },
  { label: 'Madinah', icon: 'map', disabled: true, status: 'Segera' },
  { label: 'Moderasi Kontribusi', icon: 'users', disabled: true, status: 'Segera', section: 'INTERAKSI' },
  { label: 'Feedback Artikel', icon: 'chat', disabled: true, status: 'Segera' },
  { label: 'Artikel', to: '/media/articles', icon: 'doc', section: 'CONTENT LIBRARY' },
  { label: 'Panduan', to: '/media/guides', icon: 'doc' },
  { label: 'Gallery', to: '/media/gallery', icon: 'sparkle' },
  { label: 'Map Locations', to: '/media/locations', icon: 'map' },
]
const currentWorkspaceKey = computed(() => route.path === '/media' || route.path.startsWith('/media/') ? 'media' : 'tour')
const menu = computed(() => currentWorkspaceKey.value === 'media' ? mediaMenu : tourMenu)
function workspaceActive(to?: string) { return Boolean(to && (route.path === to || (to !== '/' && route.path.startsWith(`${to}/`)))) }
watch(() => route.fullPath, () => { isOpen.value = false })
</script>

<template>
  <!-- Toggle mobile -->
  <button
    type="button"
    class="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green text-white shadow-lg lg:hidden"
    aria-label="Buka menu admin"
    :aria-expanded="isOpen"
    @click="isOpen = !isOpen"
  >
    <svg v-if="!isOpen" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
  </button>

  <!-- Overlay mobile -->
  <div v-if="isOpen" class="fixed inset-0 z-30 bg-neutral-charcoal/40 lg:hidden" @click="isOpen = false" />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-neutral-line bg-white transition-transform lg:translate-x-0"
    :class="{ 'translate-x-0': isOpen }"
  >
    <div class="flex h-16 items-center gap-2.5 border-b border-neutral-line px-5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-kabah-gradient text-sm font-bold text-gold-soft">S</div>
      <div class="leading-tight">
        <p class="font-heading text-sm font-semibold text-brand-green">Sudut Haramain</p>
        <p class="text-[10px] font-medium uppercase tracking-[0.22em] text-gold">Admin</p>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto p-3" aria-label="Menu admin">
      <template v-for="(item, index) in menu" :key="item.label">
      <p v-if="item.section && (index === 0 || menu[index - 1]?.section !== item.section)" class="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-charcoal/45 first:mt-0">{{ item.section }}</p>
      <NuxtLink
        :to="item.to || route.path"
        :aria-disabled="item.disabled ? 'true' : undefined"
        class="mb-0.5 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-charcoal/70 transition-colors hover:bg-brand-green/5 hover:text-brand-green"
        :class="{ 'bg-brand-green text-white hover:bg-brand-green hover:text-white': workspaceActive(item.to), 'pointer-events-none opacity-50': item.disabled }"
        @click="item.disabled ? $event.preventDefault() : undefined"
      >
        <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path v-if="item.icon === 'grid'" stroke-linecap="round" stroke-linejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
          <path v-else-if="item.icon === 'users'" stroke-linecap="round" stroke-linejoin="round" d="M16 19a4 4 0 0 0-8 0m8 0H8m8 0h3a7 7 0 0 0-2-4.9M8 19H5a7 7 0 0 1 2-4.9M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
          <path v-else-if="item.icon === 'calc'" stroke-linecap="round" stroke-linejoin="round" d="M5 4h14v16H5zM8 8h8M8 12h2m4 0h2m-8 4h2m4 0h2"/>
          <path v-else-if="item.icon === 'building'" stroke-linecap="round" stroke-linejoin="round" d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16m-12 0h16m-16 0v-4m12 4v-8h4a2 2 0 0 1 2 2v8M8.5 7h1m3 0h1m-5 4h1m3 0h1"/>
          <path v-else-if="item.icon === 'plane'" stroke-linecap="round" stroke-linejoin="round" d="M10.5 13.5 3 11l1.5-1.5L11 10l4.5-4.5a2.1 2.1 0 0 1 3 3L14 13l.5 6.5L13 21l-2.5-7.5Z"/>
          <path v-else-if="item.icon === 'car'" stroke-linecap="round" stroke-linejoin="round" d="M5 17h14M6.5 17l1.3-5.2A2 2 0 0 1 9.74 10.3h4.52a2 2 0 0 1 1.94 1.5L17.5 17m-10 0a2 2 0 1 0 4 0m2 0a2 2 0 1 0 4 0M7 13.5h10"/>
          <path v-else-if="item.icon === 'sparkle'" stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2"/>
          <path v-else-if="item.icon === 'tag'" stroke-linecap="round" stroke-linejoin="round" d="M20 13 13 20a2 2 0 0 1-2.83 0L4 13.83V4h9.83L20 10.17A2 2 0 0 1 20 13ZM7.5 8.5h.01"/>
          <path v-else-if="item.icon === 'currency'" stroke-linecap="round" stroke-linejoin="round" d="M7 21V10m10 4V3M4 7l3-4 3 4m10 14 3-4m-6 4-3-4"/>
          <path v-else-if="item.icon === 'map'" stroke-linecap="round" stroke-linejoin="round" d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"/>
          <path v-else-if="item.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" d="M6.5 3v3m11-3v3M4 6.5h16V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5Zm3 4h.01M12 10.5h.01m5 0h.01M7 15h.01m5 0h.01m5 0h.01"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z"/>
        </svg>
        <span class="min-w-0 flex-1">{{ item.label }}</span>
        <span v-if="item.status" class="text-[10px] font-medium text-neutral-charcoal/45">{{ item.status }}</span>
      </NuxtLink>
      </template>
    </nav>

    <div class="border-t border-neutral-line p-4"><p class="text-xs text-neutral-charcoal/50">v0.2.0 — M2 backend foundation</p></div>
  </aside>
</template>
