<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { vendorTypeLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/vendors/${id}`);
const vendor = computed(() => data.value?.data ?? null);
</script>
<template>
  <div>
    <PageHead :title="vendor ? vendor.name : 'Vendor Detail'" :subtitle="vendor ? `${vendor.vendorCode} · ${vendorTypeLabel(vendor.vendorType)}` : ''">
      <template #actions>
        <div class="flex gap-2">
          <span v-if="vendor?.isArchived" class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Arsip</span>
          <NuxtLink to="/tour/vendors" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink>
        </div>
      </template>
    </PageHead>
    <div v-if="vendor" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-6 lg:col-span-1">
        <h3 class="font-heading font-semibold">Profil Penyedia</h3>
        <p class="mt-1 text-xs text-neutral-charcoal/60">Pihak yang dibayar untuk pemenuhan layanan perjalanan.</p>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ vendor.vendorCode }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Nama</dt><dd class="font-medium">{{ vendor.name }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Jenis</dt><dd><TourStatusBadge :status="vendor.vendorType" type="vendorType" /></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Kontak</dt><dd>{{ vendor.contactName || "—" }} · {{ vendor.whatsapp || "" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Email</dt><dd>{{ vendor.email || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Lokasi</dt><dd>{{ vendor.city || "" }} {{ vendor.country || "" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Mata Uang Default</dt><dd class="font-medium">{{ vendor.defaultCurrency }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Info Pembayaran</dt><dd class="text-neutral-charcoal/70">{{ vendor.paymentInfo || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd><TourStatusBadge :status="vendor.status" type="vendor" /></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Catatan</dt><dd>{{ vendor.notes || "—" }}</dd></div>
        </dl>
      </div>
      <div class="rounded-2xl border bg-white p-6 lg:col-span-2">
        <h3 class="font-heading font-semibold">Pemesanan Terkait ({{ vendor.bookings?.length || 0 }})</h3>
        <div v-if="!vendor.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pemesanan untuk vendor ini.</div>
        <div v-else class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode</th><th class="py-2">Tanggal</th><th class="py-2">Layanan</th><th class="py-2">Biaya</th><th class="py-2">Status</th></tr></thead>
          <tbody class="divide-y"><tr v-for="b in vendor.bookings" :key="b.id"><td class="py-2 font-mono text-xs"><NuxtLink :to="`/tour/bookings/${b.id}`" class="text-brand-teal hover:underline font-medium">{{ b.bookingCode }}</NuxtLink></td><td class="py-2 text-xs">{{ b.bookingDate }}</td><td class="py-2"><TourStatusBadge :status="b.bookingType" type="bookingType" /></td><td class="py-2 text-xs">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}</td><td class="py-2"><TourStatusBadge :status="b.status" type="booking" /></td></tr></tbody></table>
        </div>
      </div>
    </div>
  </div>
</template>
