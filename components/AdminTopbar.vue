<script setup lang="ts">
type WorkspaceOption = { id: number; key: string; name: string; description: string | null; role: string }
type AdminUser = { id: number; email: string; name: string; isActive: boolean }

const route = useRoute()
const { data: workspaceResponse } = await useAdminFetch<{ data: WorkspaceOption[] }>('/api/admin/workspaces')
const { data: userResponse } = await useAdminFetch<{ user: AdminUser }>('/api/admin/auth/me')
const workspaceOpen = ref(false)
const notificationOpen = ref(false)
const accountOpen = ref(false)

const workspaces = computed(() => workspaceResponse.value?.data ?? [])
const currentKey = computed(() => route.path === '/media' || route.path.startsWith('/media/') ? 'media' : 'tour')
const currentWorkspace = computed(() => workspaces.value.find((workspace) => workspace.key === currentKey.value) ?? { key: currentKey.value, name: currentKey.value === 'media' ? 'Sudut Haramain Media' : 'Sudut Haramain Tour' })
const user = computed(() => userResponse.value?.user)
const workspaceAccent = computed(() => currentKey.value === 'media' ? 'border-brand-green/25 bg-brand-green/5 text-brand-green' : 'border-gold-soft bg-gold-sand/60 text-neutral-charcoal')

function workspacePath(key: string) { return key === 'media' ? '/media' : '/tour' }
function closeMenus() { workspaceOpen.value = false; notificationOpen.value = false; accountOpen.value = false }
async function logout() { await $fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {}); navigateTo('/login') }
watch(() => route.fullPath, closeMenus)
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50 h-16 border-b border-neutral-line bg-white/95 backdrop-blur lg:left-64">
    <div class="flex h-full items-center justify-between gap-3 px-4 pl-[4.5rem] sm:px-6 sm:pl-[4.5rem] lg:px-8 lg:pl-6">
      <div class="relative min-w-0">
        <button type="button" class="flex max-w-[15rem] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors hover:border-brand-green/40" :class="workspaceAccent" :aria-expanded="workspaceOpen" @click="workspaceOpen = !workspaceOpen; notificationOpen = false; accountOpen = false"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-current/10 text-[10px] font-bold">{{ currentKey === 'media' ? 'M' : 'T' }}</span><span class="truncate">{{ currentWorkspace.name }}</span><svg class="h-4 w-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></button>
        <div v-if="workspaceOpen" class="absolute left-0 top-full mt-2 w-64 rounded-xl border border-neutral-line bg-white p-1 shadow-lg"><NuxtLink v-for="workspace in workspaces" :key="workspace.key" :to="workspacePath(workspace.key)" class="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-neutral-soft" :class="workspace.key === currentKey ? 'font-semibold text-brand-green' : 'text-neutral-charcoal/70'" @click="workspaceOpen = false"><span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-current/10 text-[9px] font-bold">{{ workspace.key === 'media' ? 'M' : 'T' }}</span><span><span class="block">{{ workspace.name }}</span><span class="mt-0.5 block text-[11px] font-normal text-neutral-charcoal/50">{{ workspace.role }}</span></span></NuxtLink></div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <div class="relative"><button type="button" class="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-charcoal/65 hover:bg-neutral-soft hover:text-brand-green" aria-label="Notifikasi" :aria-expanded="notificationOpen" @click="notificationOpen = !notificationOpen; workspaceOpen = false; accountOpen = false"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8.5 12h7"/></svg></button><div v-if="notificationOpen" class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-line bg-white p-4 text-sm shadow-lg"><p class="font-semibold">Notifikasi</p><p class="mt-2 text-xs text-neutral-charcoal/55">Belum ada notifikasi.</p></div></div>
        <span class="hidden rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] sm:inline-flex" :class="workspaceAccent">{{ currentKey }}</span>
        <div class="relative"><button type="button" class="flex max-w-[13rem] items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-neutral-soft" :aria-expanded="accountOpen" aria-label="Menu akun" @click="accountOpen = !accountOpen; workspaceOpen = false; notificationOpen = false"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white">{{ user?.name?.charAt(0)?.toUpperCase() || 'A' }}</span><span class="hidden min-w-0 md:block"><span class="block truncate text-sm font-semibold text-neutral-charcoal">{{ user?.name || 'Admin' }}</span><span class="block truncate text-[11px] text-neutral-charcoal/50">{{ user?.email || '' }}</span></span><svg class="hidden h-4 w-4 shrink-0 text-neutral-charcoal/50 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></button><div v-if="accountOpen" class="absolute right-0 top-full mt-2 w-52 rounded-xl border border-neutral-line bg-white p-1 shadow-lg"><button type="button" disabled class="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-neutral-charcoal/40">Profil <span class="ml-auto text-[10px]">Segera</span></button><button type="button" class="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50" @click="logout">Logout</button></div></div>
      </div>
    </div>
  </header>
</template>
