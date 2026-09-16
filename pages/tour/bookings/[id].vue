<script setup lang="ts">
import type { TourBooking } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: TourBooking }>(`/api/admin/tour/bookings/${id}`);
const booking = computed(() => data.value?.data ?? null);
</script>
<template>
  <div>
    <PageHead :title="booking ? booking.bookingCode : 'Booking Detail'" :subtitle="booking ? `${booking.bookingType} · ${booking.currency} ${booking.amount} → IDR ${Number(booking.amountIdr).toLocaleString('id-ID')} · snapshot ${booking.exchangeRateSnapshot || '—'}` : ''">
      <template #actions><NuxtLink to="/tour/bookings" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>
    <div v-if="booking" class="mt-6 rounded-2xl border bg-white p-6">
      <dl class="grid gap-4 sm:grid-cols-2 text-sm">
        <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ booking.bookingCode }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ booking.bookingDate }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Vendor</dt><dd><NuxtLink :to="`/tour/vendors/${booking.vendorId}`" class="text-brand-teal hover:underline">#{{ booking.vendorId }}</NuxtLink></dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Tipe</dt><dd>{{ booking.bookingType }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Trip</dt><dd>{{ booking.tripId ? "#"+booking.tripId : "—" }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Order</dt><dd>{{ booking.orderId ? "#"+booking.orderId : "—" }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Amount</dt><dd>{{ booking.amount }} {{ booking.currency }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Rate Snapshot</dt><dd>{{ booking.exchangeRateSnapshot || "—" }} (tidak recalc saat global rate berubah)</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Amount IDR</dt><dd class="font-semibold">Rp {{ Number(booking.amountIdr).toLocaleString('id-ID') }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd>{{ booking.status }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Due</dt><dd>{{ booking.dueDate || "—" }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs text-neutral-charcoal/50">Deskripsi</dt><dd>{{ booking.description || "—" }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd>{{ booking.notes || "—" }}</dd></div>
      </dl>
    </div>
  </div>
</template>
