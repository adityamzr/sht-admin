<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { orderTypeLabel, orderStatusLabel, visaStatusLabel, siskopatuhStatusLabel, roomTypeLabel, bookingTypeLabel, bookingStatusLabel, tripStatusLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/orders/${id}`);
const order = computed(() => data.value?.data ?? null);
</script>

<template>
  <div>
    <PageHead :title="order ? order.orderCode : 'Order Detail'" :subtitle="order ? `${orderTypeLabel(order.orderType)} · ${order.paxCount} pax · Rp ${Number(order.sellingPriceIdr).toLocaleString('id-ID')}` : ''">
      <template #actions><NuxtLink to="/tour/orders" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="order" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-6 lg:col-span-1">
        <h3 class="font-heading font-semibold">Ringkasan Pesanan</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode Pesanan</dt><dd class="font-mono font-semibold">{{ order.orderCode }}</dd><dd class="text-xs text-neutral-charcoal/60">{{ order.packageName || order.serviceSummary?.slice(0,80) }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ order.orderDate }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Customer</dt><dd><NuxtLink v-if="order.customer" :to="`/tour/customers/${order.customerId}`" class="text-brand-teal hover:underline font-medium">{{ order.customer.name }}</NuxtLink><span v-else>Customer #{{ order.customerId }}</span> <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ order.customer?.customerCode || "" }}</span> <span v-if="order.customer?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700 text-[11px]">Arsip</span></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Sumber Lead</dt><dd>{{ order.leadId ? `Lead #${order.leadId}` : "Pesanan manual" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Estimasi</dt><dd>{{ order.estimationId ? `Estimasi #${order.estimationId}` : "Tanpa estimasi" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Jenis</dt><dd>{{ orderTypeLabel(order.orderType) }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Jumlah Pax</dt><dd>{{ order.paxCount }} pax</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Harga Jual</dt><dd class="font-semibold">Rp {{ Number(order.sellingPriceIdr).toLocaleString('id-ID') }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd><TourStatusBadge :status="order.status" type="order" /></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Catatan</dt><dd class="text-neutral-charcoal/70">{{ order.notes || "—" }}</dd></div>
        </dl>
      </div>

      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-2xl border bg-white p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading font-semibold">Jamaah ({{ order.jamaah?.length || 0 }})</h3>
            <span class="text-xs text-neutral-charcoal/50">Kelola lengkap di Booking Detail</span>
          </div>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Ringkasan jamaah untuk pesanan ini. Untuk tambah/edit, buka Booking yang terhubung.</p>
          <div v-if="!order.jamaah?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada jamaah.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode</th><th class="py-2">Nama</th><th class="py-2">Visa</th><th class="py-2">Kamar</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="j in order.jamaah" :key="j.id">
                  <td class="py-2 font-mono text-xs">{{ j.jamaahCode }}</td>
                  <td class="py-2 font-medium">{{ j.fullName }}</td>
                  <td class="py-2 text-xs"><TourStatusBadge :status="j.visaStatus" type="visa" /></td>
                  <td class="py-2 text-xs">{{ roomTypeLabel(j.roomType) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="order.jamaah?.length" class="mt-3 text-xs"><NuxtLink :to="`/tour/bookings?orderId=${order.id}`" class="text-brand-teal hover:underline">Lihat Bookings untuk kelola jamaah →</NuxtLink></div>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Perjalanan Terkait ({{ order.tripOrders?.length || 0 }})</h3>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Pesanan ini terhubung ke beberapa trip. Atur di detail Trip.</p>
          <div v-if="!order.tripOrders?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum terhubung ke perjalanan.</div>
          <ul v-else class="mt-4 divide-y text-sm">
            <li v-for="to in order.tripOrders" :key="to.id" class="py-2 flex justify-between">
              <span class="font-medium">{{ to.trip?.tripCode || `Trip #${to.tripId}` }} · {{ to.trip?.name || "" }}</span>
              <span class="flex items-center gap-2"><TourStatusBadge v-if="to.trip" :status="to.trip.status" type="trip" /><NuxtLink :to="`/tour/trips/${to.tripId}`" class="text-brand-teal hover:underline text-xs inline-flex items-center gap-1"><Eye class="h-3 w-3" /> Detail</NuxtLink></span>
            </li>
          </ul>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Pemesanan Vendor ({{ order.bookings?.length || 0 }})</h3>
          <div v-if="!order.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pemesanan vendor untuk pesanan ini.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode</th><th class="py-2">Layanan</th><th class="py-2">Vendor</th><th class="py-2">Biaya</th><th class="py-2">Status</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="b in order.bookings" :key="b.id">
                  <td class="py-2 font-mono text-xs"><NuxtLink :to="`/tour/bookings/${b.id}`" class="text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink></td>
                  <td class="py-2 text-xs">{{ bookingTypeLabel(b.bookingType) }}</td>
                  <td class="py-2 text-xs">{{ b.vendor?.name || `Vendor #${b.vendorId}` }}</td>
                  <td class="py-2 text-xs">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}</td>
                  <td class="py-2 text-xs"><TourStatusBadge :status="b.status" type="booking" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
