<script setup lang="ts">
import type { Lead } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data, refresh } = await useAdminFetch<{ data: Lead[] }>('/api/admin/leads')
const rows = computed(() => data.value?.data ?? [])

const STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'WON', 'LOST']
const statusColor: Record<string, string> = {
  NEW: 'bg-brand-sky/50 text-brand-green',
  CONTACTED: 'bg-gold-sand text-neutral-charcoal',
  FOLLOW_UP: 'bg-brand-teal/20 text-brand-green',
  WON: 'bg-brand-green/15 text-brand-green',
  LOST: 'bg-neutral-warm text-neutral-charcoal/50',
}
const originLabel: Record<string, string> = { estimation: 'Estimasi', service_inquiry: 'Layanan Tunggal' }

async function setStatus(lead: Lead, status: string) {
  await adminPatch(`/api/admin/leads/${lead.id}`, { status }).catch(() => {})
  await refresh()
}

function waLink(lead: Lead) {
  return `https://wa.me/${lead.whatsapp}`
}
</script>

<template>
  <div>
    <PageHead title="Leads" subtitle="Pipeline konsultasi — ubah status follow-up di sini. Lead estimasi terhubung ke snapshot EST-…; lead layanan bisa tanpa estimasi." />

    <div class="mt-6 space-y-3">
      <div v-for="lead in rows" :key="lead.id" class="rounded-2xl border border-neutral-line bg-white p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-heading text-base font-semibold">{{ lead.name }}</p>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusColor[lead.status]">{{ lead.status }}</span>
              <span class="rounded-full border border-neutral-line px-2.5 py-1 text-xs font-semibold text-neutral-charcoal/60">{{ originLabel[lead.origin] ?? lead.origin }}</span>
            </div>
            <p class="mt-1 text-sm text-neutral-charcoal/70">
              <a :href="waLink(lead)" target="_blank" rel="noopener noreferrer" class="font-medium text-brand-teal hover:underline">+{{ lead.whatsapp }}</a>
              <span v-if="lead.email" class="text-neutral-charcoal/50"> · {{ lead.email }}</span>
              <span v-if="lead.source" class="text-neutral-charcoal/50"> · sumber: {{ lead.source }}</span>
            </p>
            <p v-if="lead.estimationNumber" class="mt-1 text-sm">
              <NuxtLink :to="`/estimations`" class="font-semibold text-brand-green hover:underline">{{ lead.estimationNumber }}</NuxtLink>
            </p>
            <p v-else-if="lead.serviceName" class="mt-1 text-sm text-neutral-charcoal/60">Layanan: {{ lead.serviceName }}</p>
            <p v-if="lead.notes" class="mt-1.5 text-sm text-neutral-charcoal/60">📝 {{ lead.notes }}</p>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-neutral-charcoal/50">Status:</label>
            <select :value="lead.status" class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm" @change="setStatus(lead, ($event.target as HTMLSelectElement).value)">
              <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <p class="mt-3 border-t border-neutral-line pt-2 text-xs text-neutral-charcoal/50">Diterima {{ new Date(lead.createdAt).toLocaleString('id-ID') }}</p>
      </div>
      <p v-if="rows.length === 0" class="rounded-2xl border border-neutral-line bg-white p-10 text-center text-neutral-charcoal/50">Belum ada lead.</p>
    </div>
  </div>
</template>
