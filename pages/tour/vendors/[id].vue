<script setup lang="ts">
import type { TourVendor, TourBooking } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { vendorTypeLabel, vendorStatusLabel, bookingTypeLabel, bookingStatusLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/vendors/${id}`);
const vendor = computed(() => data.value?.data ?? null);
</script>
<template>
  <div>
    <PageHead :title="vendor ? vendor.name : 'Vendor Detail'" :subtitle="vendor ? `${vendor.vendorCode} · ${vendorTypeLabel(vendor.vendorType)} · ${vendorStatusLabel(vendor.status)}` : ''">
      <template #actions>
        <div class="flex gap-2">
          <span v-if="vendor?.isArchived" class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Arsip</span>
          <NuxtLink to="/tour/vendors" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink>
        </div>
      </template>
    </PageHead>
    <div v-if="vendor" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-6 lg:col-span-1">
        <h3 class="font-heading font-semibold">Profil <span v-if="vendor.isArchived" class="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Arsip — tetap readable di histori Booking</span></h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ vendor.vendorCode }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Nama</dt><dd class="font-medium">{{ vendor.name }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tipe</dt><dd>{{ vendorTypeLabel(vendor.vendorType) }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Kontak</dt><dd>{{ vendor.contactName || "—" }} · {{ vendor.whatsapp || "" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Email</dt><dd>{{ vendor.email || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Lokasi</dt><dd>{{ vendor.city || "" }} {{ vendor.country || "" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Currency</dt><dd>{{ vendor.defaultCurrency }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Payment</dt><dd class="text-neutral-charcoal/70">{{ vendor.paymentInfo || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd>{{ vendor.notes || "—" }}</dd></div>
        </dl>
      </div>
      <div class="rounded-2xl border bg-white p-6 lg:col-span-2">
        <h3 class="font-heading font-semibold">Related Bookings ({{ vendor.bookings?.length || 0 }})</h3>
        <div v-if="!vendor.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada booking.</div>
        <div v-else class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode</th><th class="py-2">Tanggal</th><th class="py-2">Tipe</th><th class="py-2">Amount</th><th class="py-2">Status</th></tr></thead>
          <tbody class="divide-y"><tr v-for="b in vendor.bookings" :key="b.id"><td class="py-2 font-mono text-xs"><NuxtLink :to="`/tour/bookings/${b.id}`" class="text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink></td><td class="py-2">{{ b.bookingDate }}</td><td class="py-2">{{ bookingTypeLabel(b.bookingType) }}</td><td class="py-2">{{ b.amount }} {{ b.currency }}</td><td class="py-2">{{ bookingStatusLabel(b.status) }}</td></tr></tbody></table>
        </div>
      </div>
    </div>
  </div>
</template>
