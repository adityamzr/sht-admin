<script setup lang="ts">
import type { TourOrder, TourJamaah, TourBooking, TourTripOrder } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: TourOrder & { jamaah: TourJamaah[]; bookings: TourBooking[]; tripOrders: TourTripOrder[] } }>(`/api/admin/tour/orders/${id}`);
const order = computed(() => data.value?.data ?? null);

const { data: customersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/customers", { query: { pageSize: 100 } });
const customer = computed(() => {
  if (!order.value) return null;
  return (customersData.value?.data ?? []).find((c: any) => c.id === order.value?.customerId) ?? null;
});

const showJamaahForm = ref(false);
const jamaahForm = reactive({ fullName: "", gender: "", birthDate: "", passportNumber: "", visaStatus: "NOT_STARTED", siskopatuhStatus: "PENDING", roomType: "NA", whatsapp: "", notes: "" });
const jamaahError = ref<string | null>(null);
async function addJamaah() {
  jamaahError.value = null;
  try {
    await adminPost("/api/admin/tour/jamaah", {
      orderId: id,
      fullName: jamaahForm.fullName,
      gender: jamaahForm.gender || null,
      birthDate: jamaahForm.birthDate || null,
      passportNumber: jamaahForm.passportNumber || null,
      visaStatus: jamaahForm.visaStatus,
      siskopatuhStatus: jamaahForm.siskopatuhStatus,
      roomType: jamaahForm.roomType,
      whatsapp: jamaahForm.whatsapp || null,
      notes: jamaahForm.notes || null,
    });
    showJamaahForm.value = false;
    Object.assign(jamaahForm, { fullName: "", gender: "", birthDate: "", passportNumber: "", visaStatus: "NOT_STARTED", siskopatuhStatus: "PENDING", roomType: "NA", whatsapp: "", notes: "" });
    await refreshNuxtData();
  } catch (e: any) {
    jamaahError.value = e?.data?.statusMessage || "Gagal tambah jamaah";
  }
}
</script>

<template>
  <div>
    <PageHead :title="order ? order.orderCode : 'Order Detail'" :subtitle="order ? `${order.orderType} · ${order.paxCount} pax · Rp ${Number(order.sellingPriceIdr).toLocaleString('id-ID')}` : ''">
      <template #actions><NuxtLink to="/tour/orders" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="order" class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-6 lg:col-span-1">
        <h3 class="font-heading font-semibold">Summary</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ order.orderCode }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ order.orderDate }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Customer</dt><dd>#{{ order.customerId }} {{ customer ? "· "+customer.name : "" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Lead</dt><dd>{{ order.leadId || "— (manual)" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Estimation</dt><dd>{{ order.estimationId || "— (manual)" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Tipe</dt><dd>{{ order.orderType }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Paket</dt><dd>{{ order.packageName || "—" }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Pax</dt><dd>{{ order.paxCount }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Harga</dt><dd class="font-semibold">Rp {{ Number(order.sellingPriceIdr).toLocaleString('id-ID') }}</dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd><span class="rounded-full bg-neutral-warm px-2.5 py-1 text-xs font-semibold">{{ order.status }}</span></dd></div>
          <div><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd class="text-neutral-charcoal/70">{{ order.notes || "—" }}</dd></div>
        </dl>
      </div>

      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-2xl border bg-white p-6">
          <div class="flex items-center justify-between"><h3 class="font-heading font-semibold">Jamaah ({{ order.jamaah?.length || 0 }})</h3><button class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white" @click="showJamaahForm=!showJamaahForm">+ Tambah Jamaah</button></div>
          <div v-if="showJamaahForm" class="mt-4 rounded-xl border bg-neutral-warm/50 p-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="text-sm">Nama Lengkap<input v-model="jamaahForm.fullName" class="mt-1 min-h-[40px] w-full rounded-xl border px-3" /></label>
              <label class="text-sm">Gender<select v-model="jamaahForm.gender" class="mt-1 min-h-[40px] w-full rounded-xl border px-3"><option value="">—</option><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></label>
              <label class="text-sm">Passport<input v-model="jamaahForm.passportNumber" class="mt-1 min-h-[40px] w-full rounded-xl border px-3" /></label>
              <label class="text-sm">Visa<select v-model="jamaahForm.visaStatus" class="mt-1 min-h-[40px] w-full rounded-xl border px-3"><option>NOT_STARTED</option><option>PROCESSING</option><option>APPROVED</option><option>ISSUED</option></select></label>
              <label class="text-sm">Siskopatuh<select v-model="jamaahForm.siskopatuhStatus" class="mt-1 min-h-[40px] w-full rounded-xl border px-3"><option>PENDING</option><option>REGISTERED</option><option>ACTIVE</option></select></label>
              <label class="text-sm">Room<select v-model="jamaahForm.roomType" class="mt-1 min-h-[40px] w-full rounded-xl border px-3"><option>SINGLE</option><option>DOUBLE</option><option>TRIPLE</option><option>QUAD</option><option>QUINT</option><option>NA</option></select></label>
            </div>
            <p v-if="jamaahError" class="mt-2 text-sm text-red-600">{{ jamaahError }}</p>
            <div class="mt-3 flex gap-2"><button class="rounded-xl bg-sht-olive px-4 py-2 text-xs font-semibold text-white" @click="addJamaah">Simpan</button><button class="rounded-xl border px-4 py-2 text-xs" @click="showJamaahForm=false">Batal</button></div>
          </div>
          <div v-if="!order.jamaah?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada jamaah — customer ≠ jamaah, tambahkan per order.</div>
          <div v-else class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode</th><th class="py-2">Nama</th><th class="py-2">Visa</th><th class="py-2">Sisko</th><th class="py-2">Room</th></tr></thead><tbody class="divide-y"><tr v-for="j in order.jamaah" :key="j.id"><td class="py-2 font-mono text-xs">{{ j.jamaahCode }}</td><td class="py-2"><NuxtLink :to="`/tour/jamaah/${j.id}`" class="text-brand-teal hover:underline">{{ j.fullName }}</NuxtLink></td><td class="py-2 text-xs">{{ j.visaStatus }}</td><td class="py-2 text-xs">{{ j.siskopatuhStatus }}</td><td class="py-2 text-xs">{{ j.roomType }}</td></tr></tbody></table></div>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Trips ({{ order.tripOrders?.length || 0 }}) — many-to-many via tour_trip_orders</h3>
          <div v-if="!order.tripOrders?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum di-assign ke trip. Assign di halaman Trip detail.</div>
          <ul v-else class="mt-4 divide-y text-sm"><li v-for="to in order.tripOrders" :key="to.id" class="py-2">Trip #{{ to.tripId }} ↔ Order #{{ to.orderId }}</li></ul>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading font-semibold">Bookings ({{ order.bookings?.length || 0 }})</h3>
          <div v-if="!order.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada booking untuk order ini.</div>
          <div v-else class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode</th><th class="py-2">Tipe</th><th class="py-2">Vendor</th><th class="py-2">Amount</th><th class="py-2">Status</th></tr></thead><tbody class="divide-y"><tr v-for="b in order.bookings" :key="b.id"><td class="py-2 font-mono text-xs"><NuxtLink :to="`/tour/bookings/${b.id}`" class="text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink></td><td class="py-2 text-xs">{{ b.bookingType }}</td><td class="py-2 text-xs">{{ b.vendorId }}</td><td class="py-2 text-xs">{{ b.amount }} {{ b.currency }}</td><td class="py-2 text-xs">{{ b.status }}</td></tr></tbody></table></div>
          <div class="mt-4"><NuxtLink :to="`/tour/bookings?orderId=${order.id}`" class="text-xs font-semibold text-brand-teal hover:underline">Lihat semua bookings untuk order ini →</NuxtLink></div>
        </div>
      </div>
    </div>
  </div>
</template>
