<script setup lang="ts">
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
  } catch (e: any) { assignError.value = e?.data?.statusMessage || "Gagal assign"; }
}
async function unassign(orderId: number) {
  if (!confirm("Lepas order dari trip?")) return;
  await $fetch("/api/admin/tour/trip-orders", { method: "DELETE", body: { tripId: id, orderId } }).catch(()=>{});
  await refreshNuxtData();
}
</script>

<template>
  <div>
    <PageHead :title="trip ? trip.name : 'Trip Detail'" :subtitle="trip ? `${trip.tripCode} · ${trip.departureDate} → ${trip.returnDate} · ${tripStatusLabel(trip.status)} · Kapasitas ${trip.capacity} · Total Pax ${trip.totalPax ?? 0} (exclude CANCELLED)` : ''">
      <template #actions><NuxtLink to="/tour/trips" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="trip" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-6 lg:col-span-1">
        <h3 class="font-heading font-semibold">Ringkasan</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ trip.tripCode }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Nama</dt><dd class="font-medium">{{ trip.name }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ trip.departureDate }} → {{ trip.returnDate }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Rute</dt><dd>{{ trip.routeSummary || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Kapasitas</dt><dd>{{ trip.capacity }} (terisi {{ trip.totalPax ?? 0 }} pax derived)</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd><span class="rounded-full bg-neutral-warm px-2.5 py-1 text-xs font-semibold">{{ tripStatusLabel(trip.status) }}</span></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd>{{ trip.notes || "—" }}</dd></div>
        </dl>
      </div>

      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Linked Orders ({{ trip.tripOrders?.length || 0 }}) — many-to-many · Total Pax {{ trip.totalPax ?? 0 }}</h3>
          <div class="mt-4 flex gap-2">
            <select v-model="assignForm.orderId" class="min-h-[44px] flex-1 rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih Order untuk di-assign...</option>
              <option v-for="o in allOrders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `#${o.customerId}` }} · {{ o.paxCount }} pax · {{ orderStatusLabel(o.status) }}</option>
            </select>
            <button type="button" class="min-h-[44px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="assign" :disabled="!assignForm.orderId">Assign</button>
          </div>
          <p v-if="assignError" class="mt-2 text-sm text-red-600">{{ assignError }}</p>
          <div v-if="!trip.tripOrders?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada order ter-assign.</div>
          <ul v-else class="mt-4 divide-y">
            <li v-for="to in trip.tripOrders" :key="to.id" class="flex items-center justify-between py-2 text-sm">
              <span><span class="font-mono text-xs">{{ to.trip?.tripCode || `Trip #${to.tripId}` }}</span> ↔ <NuxtLink :to="`/tour/orders/${to.orderId}`" class="text-brand-teal hover:underline">{{ to.order?.orderCode || `Order #${to.orderId}` }}</NuxtLink> · {{ to.order?.customer?.name || "" }} · {{ to.order?.paxCount || "?" }} pax · {{ to.order ? orderTypeLabel(to.order.orderType) : "" }} <span v-if="to.order?.customer?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700 text-[11px]">Arsip</span></span>
              <button class="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" @click="unassign(to.orderId)">Lepas</button>
            </li>
          </ul>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Bookings ({{ trip.bookings?.length || 0 }})</h3>
          <div v-if="!trip.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada booking untuk trip ini.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode / Vendor</th><th class="py-2">Tipe</th><th class="py-2">Amount</th><th class="py-2">Status</th></tr></thead>
            <tbody class="divide-y"><tr v-for="b in trip.bookings" :key="b.id"><td class="py-2"><p class="font-mono text-xs"><NuxtLink :to="`/tour/bookings/${b.id}`" class="text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink></p><p class="text-xs">{{ b.vendor?.name || b.vendorId }} <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ b.vendor?.vendorCode || "" }}</span> <span v-if="b.vendor?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700">Arsip</span></p></td><td class="py-2 text-xs">{{ bookingTypeLabel(b.bookingType) }}</td><td class="py-2 text-xs">{{ b.amount }} {{ b.currency }} → Rp {{ Number(b.amountIdr).toLocaleString('id-ID') }}</td><td class="py-2 text-xs">{{ bookingStatusLabel(b.status) }}</td></tr></tbody></table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
