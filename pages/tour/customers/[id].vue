<script setup lang="ts">
import type { TourCustomer, TourOrder } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { customerTypeLabel, customerSourceLabel, orderTypeLabel, orderStatusLabel } = useTourLabels();

const route = useRoute();
const id = Number(route.params.id);

const { data: customerData, error } = await useAdminFetch<{ data: any }>(`/api/admin/tour/customers/${id}`);
const customer = computed(() => customerData.value?.data ?? null);

const { data: ordersData } = await useAdminFetch<{ data: TourOrder[]; meta: any }>(`/api/admin/tour/orders`, { query: { customerId: id, pageSize: 50 } });
const orders = computed(() => ordersData.value?.data ?? []);
</script>

<template>
  <div>
    <PageHead :title="customer ? customer.name : 'Customer Detail'" :subtitle="customer ? `${customer.customerCode} · ${customerTypeLabel(customer.customerType)} · ${customerSourceLabel(customer.source)}` : 'Memuat...'">
      <template #actions>
        <div class="flex gap-2">
          <span v-if="customer?.isArchived" class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Arsip</span>
          <NuxtLink to="/tour/customers" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink>
        </div>
      </template>
    </PageHead>

    <div v-if="error" class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Customer tidak ditemukan.</div>

    <div v-if="customer" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-1 rounded-2xl border border-neutral-line bg-white p-6">
        <h3 class="font-heading text-base font-semibold">Identitas <span v-if="customer.isArchived" class="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Arsip — tetap readable di histori Order</span></h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ customer.customerCode }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Nama</dt><dd class="font-medium">{{ customer.name }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">WhatsApp</dt><dd><a :href="`https://wa.me/${customer.whatsapp}`" target="_blank" class="text-brand-teal hover:underline">{{ customer.whatsapp }}</a></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Email</dt><dd>{{ customer.email || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Kota</dt><dd>{{ customer.city || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tipe</dt><dd><span class="rounded-full bg-neutral-warm px-2.5 py-1 text-xs font-semibold">{{ customerTypeLabel(customer.customerType) }}</span></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Source</dt><dd>{{ customerSourceLabel(customer.source) }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd class="text-neutral-charcoal/70">{{ customer.notes || "—" }}</dd></div>
        </dl>
      </div>

      <div class="lg:col-span-2 space-y-6">
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <h3 class="font-heading text-base font-semibold">Related Orders ({{ orders.length }})</h3>
          <div v-if="orders.length === 0" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada order untuk customer ini.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode / Paket</th><th class="py-2">Tanggal</th><th class="py-2">Tipe</th><th class="py-2">Pax</th><th class="py-2">Status</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="o in orders as any[]" :key="o.id">
                  <td class="py-2"><p class="font-mono text-xs"><NuxtLink :to="`/tour/orders/${o.id}`" class="text-brand-teal hover:underline">{{ o.orderCode }}</NuxtLink></p><p class="text-[11px] text-neutral-charcoal/50">{{ o.packageName || o.serviceSummary?.slice(0,30) }}</p></td>
                  <td class="py-2">{{ o.orderDate }}</td>
                  <td class="py-2">{{ orderTypeLabel(o.orderType) }}</td>
                  <td class="py-2">{{ o.paxCount }} pax</td>
                  <td class="py-2"><span class="rounded-full bg-neutral-warm px-2 py-1 text-xs">{{ orderStatusLabel(o.status) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
