<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { bookingTypeLabel, bookingStatusLabel, vendorTypeLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/bookings/${id}`);
const booking = computed(() => data.value?.data ?? null);
</script>
<template>
  <div>
    <PageHead :title="booking ? booking.bookingCode : 'Booking Detail'" :subtitle="booking ? `${bookingTypeLabel(booking.bookingType)} · ${booking.currency} ${booking.amount} → IDR ${Number(booking.amountIdr).toLocaleString('id-ID')} · snapshot ${booking.exchangeRateSnapshot || '—'} (server-authoritative)` : ''">
      <template #actions><NuxtLink to="/tour/bookings" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>
    <div v-if="booking" class="mt-6 rounded-2xl border bg-white p-6">
      <dl class="grid gap-4 sm:grid-cols-2 text-sm">
        <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ booking.bookingCode }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ booking.bookingDate }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Vendor</dt><dd><NuxtLink :to="`/tour/vendors/${booking.vendorId}`" class="text-brand-teal hover:underline font-medium">{{ booking.vendor?.name || `#${booking.vendorId}` }}</NuxtLink> <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ booking.vendor?.vendorCode || "" }}</span> <span v-if="booking.vendor?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700">Arsip</span> — {{ booking.vendor ? vendorTypeLabel(booking.vendor.vendorType) : "" }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Tipe</dt><dd>{{ bookingTypeLabel(booking.bookingType) }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Trip</dt><dd><NuxtLink v-if="booking.trip" :to="`/tour/trips/${booking.tripId}`" class="text-brand-teal hover:underline">{{ booking.trip.tripCode }} · {{ booking.trip.name }}</NuxtLink><span v-else>{{ booking.tripId ? "#"+booking.tripId : "—" }}</span></dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Order / Customer</dt><dd><NuxtLink v-if="booking.order" :to="`/tour/orders/${booking.orderId}`" class="text-brand-teal hover:underline">{{ booking.order.orderCode }}</NuxtLink><span v-else>{{ booking.orderId ? "#"+booking.orderId : "—" }}</span> <span v-if="booking.customer" class="text-neutral-charcoal/60">· {{ booking.customer.name }} <span class="font-mono text-[11px]">{{ booking.customer.customerCode }}</span> <span v-if="booking.customer.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700">Arsip</span></span></dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Amount</dt><dd>{{ booking.amount }} {{ booking.currency }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Rate Snapshot</dt><dd>{{ booking.exchangeRateSnapshot || "—" }} (server computes IDR, tidak recalc saat global rate berubah)</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Amount IDR (server)</dt><dd class="font-semibold">Rp {{ Number(booking.amountIdr).toLocaleString('id-ID') }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd>{{ bookingStatusLabel(booking.status) }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Due</dt><dd>{{ booking.dueDate || "—" }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs text-neutral-charcoal/50">Deskripsi</dt><dd>{{ booking.description || "—" }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd>{{ booking.notes || "—" }}</dd></div>
      </dl>
    </div>
  </div>
</template>
