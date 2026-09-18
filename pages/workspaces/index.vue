<script setup lang="ts">
import { LayoutGrid, ArrowRight, ShieldCheck } from 'lucide-vue-next'
import { WORKSPACE_HUB_META, WORKSPACE_ORDER } from '~/shared/workspace-config'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data: workspaceResponse, pending } = await useAdminFetch<{ data: Array<{ id: number; key: string; name: string; description: string | null; role: string }> }>('/api/admin/workspaces')
const { data: userResponse } = await useAdminFetch<{ user: { id: number; name: string; email: string } }>('/api/admin/auth/me')

const workspaces = computed(() => workspaceResponse.value?.data ?? [])
const user = computed(() => userResponse.value?.user)

const orderedWorkspaces = computed(() => {
  const map = new Map(workspaces.value.map(w => [w.key, w]))
  const ordered: typeof workspaces.value = []
  for (const key of WORKSPACE_ORDER) {
    const ws = map.get(key)
    if (ws) ordered.push(ws)
  }
  // Add any extra workspaces not in predefined order
  for (const ws of workspaces.value) {
    if (!WORKSPACE_ORDER.includes(ws.key)) ordered.push(ws)
  }
  return ordered
})

function getMeta(key: string) {
  return WORKSPACE_HUB_META[key] ?? {
    key,
    name: key,
    shortName: key.toUpperCase(),
    description: 'Workspace',
    longDescription: '',
    icon: LayoutGrid,
    accent: 'bg-neutral-charcoal text-white',
    route: `/${key}`,
    features: [],
  }
}

function enterWorkspace(key: string) {
  const activeWorkspaceCookie = useCookie<'media' | 'tour'>('admin-active-workspace', { default: () => 'media' })
  if (key === 'media' || key === 'tour') {
    activeWorkspaceCookie.value = key as any
  }
  const meta = getMeta(key)
  navigateTo(meta.route)
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)]">
    <!-- Header -->
    <div class="mx-auto max-w-5xl">
      <div class="mb-8">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sht-olive text-white">
            <LayoutGrid class="h-5 w-5" />
          </div>
          <div>
            <h1 class="font-heading text-xl font-semibold leading-tight">Sudut Haramain Admin</h1>
            <p class="text-xs text-neutral-charcoal/60">Platform workspace hub</p>
          </div>
        </div>
        <div class="mt-6">
          <h2 class="text-2xl font-semibold tracking-tight">Welcome, {{ user?.name || 'Admin' }}</h2>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-charcoal/70">
            Choose a workspace to continue. You only see workspaces you are authorized to access.
          </p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="grid gap-4 sm:grid-cols-2">
        <div v-for="i in 2" :key="i" class="animate-pulse rounded-2xl border border-neutral-line bg-white p-6">
          <div class="h-10 w-10 rounded-xl bg-neutral-soft" />
          <div class="mt-4 h-4 w-32 rounded bg-neutral-soft" />
          <div class="mt-2 h-3 w-full rounded bg-neutral-soft" />
          <div class="mt-6 h-10 w-full rounded-xl bg-neutral-soft" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!orderedWorkspaces.length" class="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <ShieldCheck class="mx-auto h-8 w-8 text-amber-600" />
        <p class="mt-3 text-sm font-semibold">Tidak ada workspace yang tersedia</p>
        <p class="mt-1 text-xs text-neutral-charcoal/60">Hubungi administrator untuk mendapatkan akses workspace.</p>
      </div>

      <!-- Cards -->
      <div v-else class="grid gap-5 sm:grid-cols-2">
        <div
          v-for="ws in orderedWorkspaces"
          :key="ws.key"
          class="group relative flex flex-col rounded-2xl border border-neutral-line bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-sht-olive/20"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl" :class="getMeta(ws.key).accent">
              <component :is="getMeta(ws.key).icon" class="h-6 w-6" />
            </div>
            <span class="rounded-full border border-neutral-line bg-neutral-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-charcoal/70">
              {{ ws.role }}
            </span>
          </div>
          <h3 class="mt-5 font-semibold leading-tight">{{ getMeta(ws.key).name }}</h3>
          <p class="mt-1 text-xs uppercase tracking-wide text-neutral-charcoal/50">{{ getMeta(ws.key).shortName }}</p>
          <p class="mt-3 text-sm leading-relaxed text-neutral-charcoal/70">
            {{ getMeta(ws.key).description }}
          </p>
          <p class="mt-2 text-xs leading-relaxed text-neutral-charcoal/50">
            {{ getMeta(ws.key).longDescription }}
          </p>
          <div class="mt-4 flex flex-wrap gap-1.5">
            <span
              v-for="feat in getMeta(ws.key).features"
              :key="feat"
              class="rounded-full bg-neutral-warm px-2.5 py-1 text-[11px] font-medium text-neutral-charcoal/70"
            >
              {{ feat }}
            </span>
          </div>
          <div class="mt-6">
            <button
              type="button"
              class="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-sht-olive px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b3230] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sht-olive"
              @click="enterWorkspace(ws.key)"
            >
              Enter Workspace
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Help -->
      <div class="mt-10 rounded-xl bg-neutral-warm/60 px-4 py-3 text-xs text-neutral-charcoal/60">
        <p><strong class="font-semibold">Tips:</strong> Gunakan switcher di topbar untuk berpindah workspace kapan saja. Pilih "All Workspaces" untuk kembali ke halaman ini.</p>
      </div>
    </div>
  </div>
</template>
