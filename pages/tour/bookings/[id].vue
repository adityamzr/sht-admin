<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { bookingTypeLabel, vendorTypeLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/bookings/${id}`);
const booking = computed(() => data.value?.data ?? null);
</script>

<template>
  <div>
    <PageHead :title="booking ? booking.bookingCode : 'Detail Booking'" :subtitle="booking ? `${bookingTypeLabel(booking.bookingType)} · ${booking.currency} ${Number(booking.amount).toLocaleString('id-ID')} · Setara Rp ${Number(booking.amountIdr).toLocaleString('id-ID')}` : 'Pemesanan vendor'">
      <template #actions><NuxtLink to="/tour/bookings" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="booking" class="mt-6 grid gap-6 lg:grid-cols-2">
      <!-- Left: Transaksi Vendor -->
      <div class="rounded-2xl border border-neutral-line bg-white p-6">
        <h3 class="font-heading text-sm font-semibold">Transaksi Vendor</h3>
        <dl class="mt-5 space-y-4 text-sm">
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kode Booking</dt>
            <dd class="mt-1 font-mono text-sm font-semibold">{{ booking.bookingCode }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Tanggal Booking</dt>
            <dd class="mt-1">{{ booking.bookingDate }}</dd>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jenis Layanan</dt>
              <dd class="mt-1"><TourStatusBadge :status="booking.bookingType" type="bookingType" /></dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Status</dt>
              <dd class="mt-1"><TourStatusBadge :status="booking.status" type="booking" /></dd>
            </div>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Vendor</dt>
            <dd class="mt-1">
              <NuxtLink :to="`/tour/vendors/${booking.vendorId}`" class="font-medium text-brand-teal hover:underline">
                {{ booking.vendor?.vendorCode ? `${booking.vendor.vendorCode} · ${booking.vendor.name}` : (booking.vendor?.name || `Vendor #${booking.vendorId}`) }}
              </NuxtLink>
              <p v-if="booking.vendor" class="mt-0.5 text-xs text-neutral-charcoal/60">{{ vendorTypeLabel((booking.vendor as any).vendorType || booking.bookingType) }}</p>
              <span v-if="booking.vendor?.deletedAt" class="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">Arsip</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Trip</dt>
            <dd class="mt-1">
              <NuxtLink v-if="booking.trip" :to="`/tour/trips/${booking.tripId}`" class="font-medium text-brand-teal hover:underline">
                {{ booking.trip.tripCode }} · {{ booking.trip.name }}
              </NuxtLink>
              <span v-else class="text-neutral-charcoal/50">Tanpa Trip</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Order & Pelanggan</dt>
            <dd class="mt-1">
              <NuxtLink v-if="booking.order" :to="`/tour/orders/${booking.orderId}`" class="font-medium text-brand-teal hover:underline">
                {{ booking.order.orderCode }} · {{ booking.customer?.name || `Customer #${booking.order.customerId || ''}` }}
              </NuxtLink>
              <span v-else class="text-neutral-charcoal/50">{{ booking.orderId ? `Order #${booking.orderId}` : "Tanpa Order" }}</span>
              <p v-if="booking.customer" class="mt-0.5 text-xs text-neutral-charcoal/60">{{ booking.customer.customerCode }} · {{ booking.customer.name }}</p>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Right: Biaya & Administrasi -->
      <div class="rounded-2xl border border-neutral-line bg-white p-6">
        <h3 class="font-heading text-sm font-semibold">Biaya & Administrasi</h3>
        <dl class="mt-5 space-y-4 text-sm">
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Deskripsi Layanan</dt>
            <dd class="mt-1 text-neutral-charcoal/80">{{ booking.description || "—" }}</dd>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Mata Uang</dt>
              <dd class="mt-1 font-medium">{{ booking.currency }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jumlah</dt>
              <dd class="mt-1 font-semibold">{{ booking.currency }} {{ Number(booking.amount).toLocaleString('id-ID') }}</dd>
            </div>
          </div>
          <div v-if="booking.currency !== 'IDR'">
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kurs saat booking</dt>
            <dd class="mt-1">{{ booking.exchangeRateSnapshot ? Number(booking.exchangeRateSnapshot).toLocaleString('id-ID') : "—" }} <span class="text-xs text-neutral-charcoal/50">disimpan agar riwayat tetap konsisten</span></dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Setara IDR</dt>
            <dd class="mt-1 font-semibold text-brand-green">Rp {{ Number(booking.amountIdr).toLocaleString('id-ID') }}</dd>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jatuh Tempo</dt>
              <dd class="mt-1">{{ booking.dueDate || "—" }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kode</dt>
              <dd class="mt-1 font-mono text-xs">{{ booking.bookingCode }}</dd>
            </div>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Catatan</dt>
            <dd class="mt-1 text-neutral-charcoal/70">{{ booking.notes || "—" }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
