<script setup lang="ts">
import { Trash2, Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { tripStatusLabel, orderStatusLabel, orderTypeLabel, bookingTypeLabel, bookingStatusLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/trips/${id}`);
const trip = computed(() => data.value?.data ?? null);

const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const allOrders = computed(() => ordersData.value?.data ?? []);

const assignForm = reactive({ orderId: "" });
const assignError = ref<string | null>(null);

async function assign() {
  assignError.value = null;
  try {
    await adminPost("/api/admin/tour/trip-orders", { tripId: id, orderId: Number(assignForm.orderId) });
    assignForm.orderId = "";
    await refreshNuxtData();
  } catch (e: any) { assignError.value = e?.data?.statusMessage || "Gagal menghubungkan"; }
}
async function unassign(orderId: number) {
  if (!confirm("Lepas pesanan dari perjalanan ini?")) return;
  await $fetch("/api/admin/tour/trip-orders", { method: "DELETE", body: { tripId: id, orderId } }).catch(()=>{});
  await refreshNuxtData();
}
</script>

<template>
  <div>
    <PageHead :title="trip ? trip.name : 'Trip Detail'" :subtitle="trip ? `${trip.tripCode} · ${trip.departureDate} → ${trip.returnDate} · ${tripStatusLabel(trip.status)} · ${trip.totalPax ?? 0} / ${trip.capacity} pax` : ''">
      <template #actions><NuxtLink to="/tour/trips" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="trip" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-6 lg:col-span-1">
        <h3 class="font-heading font-semibold">Ringkasan Perjalanan</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ trip.tripCode }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Nama</dt><dd class="font-medium">{{ trip.name }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ trip.departureDate }} → {{ trip.returnDate }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Rute</dt><dd>{{ trip.routeSummary || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Kapasitas</dt><dd class="font-semibold">{{ trip.totalPax ?? 0 }} / {{ trip.capacity }} pax terisi</dd><dd class="text-xs text-neutral-charcoal/50">Dihitung dari pesanan yang terhubung (tanpa yang dibatalkan)</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd><TourStatusBadge :status="trip.status" type="trip" /></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Catatan</dt><dd>{{ trip.notes || "—" }}</dd></div>
        </dl>
      </div>

      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Pesanan Terhubung ({{ trip.tripOrders?.length || 0 }})</h3>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Satu perjalanan bisa memiliki banyak pesanan. Hubungkan pesanan yang akan berangkat bersama.</p>
          <div class="mt-4 flex gap-2">
            <select v-model="assignForm.orderId" class="min-h-[44px] flex-1 rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih pesanan untuk dihubungkan...</option>
              <option v-for="o in allOrders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · {{ o.paxCount }} pax · {{ orderStatusLabel(o.status) }}</option>
            </select>
            <button type="button" class="min-h-[44px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="assign" :disabled="!assignForm.orderId">Hubungkan</button>
          </div>
          <p v-if="assignError" class="mt-2 text-sm text-red-600">{{ assignError }}</p>
          <div v-if="!trip.tripOrders?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pesanan terhubung.</div>
          <ul v-else class="mt-4 divide-y">
            <li v-for="to in trip.tripOrders" :key="to.id" class="flex items-center justify-between py-2.5 text-sm">
              <span><NuxtLink :to="`/tour/orders/${to.orderId}`" class="font-mono text-xs font-semibold text-brand-teal hover:underline">{{ to.order?.orderCode || `ORD-${to.orderId}` }}</NuxtLink> · {{ to.order?.customer?.name || "" }} · {{ to.order?.paxCount || "?" }} pax · {{ to.order ? orderTypeLabel(to.order.orderType) : "" }}</span>
              <span class="flex items-center gap-2"><TourStatusBadge v-if="to.order" :status="to.order.status" type="order" /><button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Lepas" @click="unassign(to.orderId)"><Trash2 class="h-4 w-4" /></button></span>
            </li>
          </ul>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Pemesanan Vendor ({{ trip.bookings?.length || 0 }})</h3>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Kebutuhan pemenuhan perjalanan seperti hotel, transport, visa, dll.</p>
          <div v-if="!trip.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pemesanan vendor untuk perjalanan ini.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode / Vendor</th><th class="py-2">Layanan</th><th class="py-2">Biaya</th><th class="py-2">Status</th></tr></thead>
            <tbody class="divide-y"><tr v-for="b in trip.bookings" :key="b.id"><td class="py-2"><NuxtLink :to="`/tour/bookings/${b.id}`" class="font-mono text-xs font-semibold text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink><br/><span class="text-xs">{{ b.vendor?.name || `Vendor #${b.vendorId}` }}</span></td><td class="py-2 text-xs"><TourStatusBadge :status="b.bookingType" type="bookingType" /></td><td class="py-2 text-xs">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}<br/><span class="text-neutral-charcoal/50">Rp {{ Number(b.amountIdr).toLocaleString('id-ID') }}</span></td><td class="py-2"><TourStatusBadge :status="b.status" type="booking" /></td></tr></tbody></table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
