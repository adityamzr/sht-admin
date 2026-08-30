<script setup lang="ts">
import type { AdminSummary } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const { data: summary } = await useAdminFetch<AdminSummary>('/api/admin/summary')
const stats = computed(() => [{ label:'Leads Baru', value:String(summary.value?.newLeads ?? '—'), hint:'status NEW' },{label:'Total Leads',value:String(summary.value?.totalLeads ?? '—'),hint:'semua status'},{label:'Estimasi Tersimpan',value:String(summary.value?.totalEstimations ?? '—'),hint:'snapshot historis'},{label:'Produk Aktif',value:String(summary.value?.activeProducts ?? '—'),hint:'hotel + flight + service + kendaraan'}])
</script>
<template><div><PageHead title="Dashboard" subtitle="Sudut Haramain Tour · Operasional"/><div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :hint="s.hint"/></div></div></template>
