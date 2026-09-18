<script setup lang="ts">
import { Trash2, Eye, Plus, Users, Bed, Building2, Check, X, Pencil, UserMinus, MoveRight } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { tripStatusLabel, orderStatusLabel, orderTypeLabel, bookingTypeLabel, bookingStatusLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data, refresh: refreshTrip } = await useAdminFetch<{ data: any }>(`/api/admin/tour/trips/${id}`);
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
    await refreshTrip();
    await refreshAccommodation();
  } catch (e: any) { assignError.value = e?.data?.statusMessage || "Gagal menghubungkan"; }
}
async function unassign(orderId: number) {
  if (!confirm("Lepas pesanan dari perjalanan ini?")) return;
  await $fetch("/api/admin/tour/trip-orders", { method: "DELETE", body: { tripId: id, orderId } }).catch(()=>{});
  await refreshTrip();
  await refreshAccommodation();
}

// ─── Accommodation / Rooming ───────────────────────────────────────────────
const { data: accommodationData, refresh: refreshAccommodation } = await useAdminFetch<{ data: any[]; meta: any }>(`/api/admin/tour/trips/${id}/accommodation`);
const stays = computed(() => accommodationData.value?.data ?? []);

const { data: bookingsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/bookings", { query: { tripId: id, pageSize: 100 } });
const tripBookings = computed(() => bookingsData.value?.data ?? []);
const hotelBookings = computed(() => tripBookings.value.filter((b: any) => b.bookingType === 'HOTEL'));

const showStayForm = ref(false);
const stayForm = reactive({
  id: null as number | null,
  bookingId: "" as any,
  hotelName: "",
  city: "Makkah",
  checkInDate: "",
  checkOutDate: "",
  notes: "",
  orderIds: [] as number[],
});
const stayError = ref<string | null>(null);
const stayPending = ref(false);

function openCreateStay() {
  const today = new Date().toISOString().slice(0,10);
  Object.assign(stayForm, { id: null, bookingId: "", hotelName: "", city: "Makkah", checkInDate: today, checkOutDate: today, notes: "", orderIds: [] });
  stayError.value = null;
  showStayForm.value = true;
}
function openEditStay(s: any) {
  Object.assign(stayForm, {
    id: s.id,
    bookingId: s.bookingId,
    hotelName: s.hotelName,
    city: s.city,
    checkInDate: formatDate(s.checkInDate),
    checkOutDate: formatDate(s.checkOutDate),
    notes: s.notes || "",
    orderIds: (s.orders || []).map((o: any) => o.id),
  });
  showStayForm.value = true;
}

function onBookingSelect() {
  const b: any = hotelBookings.value.find((x: any) => String(x.id) === String(stayForm.bookingId));
  if (!b) return;
  if (!stayForm.hotelName) {
    // Vendor may be provider, but we snapshot hotelName from description or vendor name as fallback
    stayForm.hotelName = b.description || b.vendor?.name || "";
  }
  if (b.orderId && !stayForm.orderIds.includes(b.orderId)) {
    // preselect that Order per spec
    stayForm.orderIds = [...stayForm.orderIds, b.orderId];
  }
}

async function submitStay() {
  stayPending.value = true; stayError.value = null;
  try {
    const body: any = {
      tripId: id,
      bookingId: Number(stayForm.bookingId),
      hotelName: stayForm.hotelName,
      city: stayForm.city,
      checkInDate: stayForm.checkInDate,
      checkOutDate: stayForm.checkOutDate,
      notes: stayForm.notes || null,
      orderIds: stayForm.orderIds.map((n: any) => Number(n)),
    };
    if (stayForm.id) await adminPatch(`/api/admin/tour/accommodation-stays/${stayForm.id}`, body);
    else await adminPost("/api/admin/tour/accommodation-stays", body);
    showStayForm.value = false;
    await refreshAccommodation();
  } catch (e: any) { stayError.value = e?.data?.statusMessage || e.message || "Gagal simpan stay"; } finally { stayPending.value = false; }
}

async function removeStay(s: any) {
  if (!confirm(`Hapus stay ${s.stayCode} · ${s.hotelName}?`)) return;
  await adminDelete(`/api/admin/tour/accommodation-stays/${s.id}`).catch((e: any)=>{ alert(e?.data?.statusMessage || "Gagal hapus"); throw e; });
  await refreshAccommodation();
}

// ─── Rooms ─────────────────────────────────────────────────────────────────
const showRoomForm = ref(false);
const roomForm = reactive({
  id: null as number | null,
  stayId: null as number | null,
  roomLabel: "",
  roomNumber: "",
  roomType: "DOUBLE" as any,
  capacity: null as number | null,
  roomingMode: "SAME_ORDER" as any,
  orderId: "" as any,
  notes: "",
});
const roomError = ref<string | null>(null);
const roomPending = ref(false);

const ROOM_TYPES = ["SINGLE","DOUBLE","TRIPLE","QUAD","QUINT","OTHER"];
const ROOMING_MODES = ["SAME_ORDER","SHARED_GROUP"];

function defaultCap(t: string) {
  switch(t){ case 'SINGLE': return 1; case 'DOUBLE': return 2; case 'TRIPLE': return 3; case 'QUAD': return 4; case 'QUINT': return 5; default: return 2; }
}
watch(() => roomForm.roomType, (nt) => {
  if (!roomForm.capacity) roomForm.capacity = defaultCap(nt);
});

function openCreateRoom(stayId: number) {
  Object.assign(roomForm, { id: null, stayId, roomLabel: "", roomNumber: "", roomType: "DOUBLE", capacity: 2, roomingMode: "SAME_ORDER", orderId: "", notes: "" });
  roomError.value = null;
  showRoomForm.value = true;
}
function openEditRoom(r: any) {
  Object.assign(roomForm, {
    id: r.id,
    stayId: r.stayId,
    roomLabel: r.roomLabel,
    roomNumber: r.roomNumber || "",
    roomType: r.roomType,
    capacity: r.capacity,
    roomingMode: r.roomingMode,
    orderId: r.orderId || "",
    notes: r.notes || "",
  });
  showRoomForm.value = true;
}

async function submitRoom() {
  roomPending.value = true; roomError.value = null;
  try {
    const body: any = {
      stayId: roomForm.stayId,
      roomLabel: roomForm.roomLabel,
      roomNumber: roomForm.roomNumber || null,
      roomType: roomForm.roomType,
      capacity: roomForm.capacity ? Number(roomForm.capacity) : undefined,
      roomingMode: roomForm.roomingMode,
      orderId: roomForm.orderId ? Number(roomForm.orderId) : null,
      notes: roomForm.notes || null,
    };
    if (roomForm.id) await adminPatch(`/api/admin/tour/accommodation-rooms/${roomForm.id}`, body);
    else await adminPost("/api/admin/tour/accommodation-rooms", body);
    showRoomForm.value = false;
    await refreshAccommodation();
  } catch (e: any) { roomError.value = e?.data?.statusMessage || e.message || "Gagal simpan room"; } finally { roomPending.value = false; }
}

async function removeRoom(r: any) {
  if (!confirm(`Hapus room ${r.roomLabel}?`)) return;
  await adminDelete(`/api/admin/tour/accommodation-rooms/${r.id}`).catch((e: any)=>{ alert(e?.data?.statusMessage || "Gagal hapus room"); throw e; });
  await refreshAccommodation();
}

// ─── Occupants ─────────────────────────────────────────────────────────────
const showOccupantForm = ref(false);
const occupantForm = reactive({
  stayId: null as number | null,
  roomId: null as number | null,
  selectedJamaahIds: [] as number[],
});
const occupantError = ref<string | null>(null);
const occupantPending = ref(false);

const currentStayDetail = ref<any>(null);
const currentStayDetailLoading = ref(false);

async function loadStayDetail(stayId: number) {
  currentStayDetailLoading.value = true;
  try {
    const res: any = await $fetch(`/api/admin/tour/accommodation-stays/${stayId}`, { headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined });
    currentStayDetail.value = res.data;
  } catch { currentStayDetail.value = null; }
  finally { currentStayDetailLoading.value = false; }
}

async function openAssign(room: any, stay: any) {
  await loadStayDetail(stay.id);
  Object.assign(occupantForm, { stayId: stay.id, roomId: room.id, selectedJamaahIds: [] });
  occupantError.value = null;
  showOccupantForm.value = true;
}

async function submitAssign() {
  occupantPending.value = true; occupantError.value = null;
  try {
    for (const jid of occupantForm.selectedJamaahIds) {
      await adminPost("/api/admin/tour/room-occupants", { stayId: occupantForm.stayId, roomId: occupantForm.roomId, jamaahId: jid });
    }
    showOccupantForm.value = false;
    await refreshAccommodation();
    if (occupantForm.stayId) await loadStayDetail(occupantForm.stayId);
  } catch (e: any) { occupantError.value = e?.data?.statusMessage || e.message || "Gagal assign"; } finally { occupantPending.value = false; }
}

async function removeOccupantById(occId: number, stayId: number) {
  if (!confirm("Keluarkan Jamaah dari kamar?")) return;
  await adminDelete(`/api/admin/tour/room-occupants/${occId}`).catch(()=>{});
  await refreshAccommodation();
  await loadStayDetail(stayId);
}

const showMoveForm = ref(false);
const moveForm = reactive({ stayId: null as number | null, jamaahId: null as number | null, toRoomId: "" as any });
async function openMove(jamaahId: number, stayId: number) {
  Object.assign(moveForm, { stayId, jamaahId, toRoomId: "" });
  await loadStayDetail(stayId);
  showMoveForm.value = true;
}
async function submitMove() {
  try {
    await adminPost("/api/admin/tour/room-occupants/move", { stayId: moveForm.stayId, jamaahId: moveForm.jamaahId, toRoomId: Number(moveForm.toRoomId) });
    showMoveForm.value = false;
    await refreshAccommodation();
    if (moveForm.stayId) await loadStayDetail(moveForm.stayId);
  } catch (e: any) { alert(e?.data?.statusMessage || e.message || "Gagal pindah"); }
}

function eligibleJamaahForRoom(room: any, stayDetail: any) {
  if (!stayDetail) return [];
  if (room.roomingMode === 'SAME_ORDER') {
    const orderId = room.orderId;
    const order = stayDetail.orders?.find((o: any) => o.id === orderId);
    return order?.jamaah || [];
  } else {
    // SHARED_GROUP: all jamaah from all orders in stay
    const all: any[] = [];
    for (const o of (stayDetail.orders || [])) {
      for (const j of (o.jamaah || [])) {
        all.push({ ...j, order: o });
      }
    }
    return all;
  }
}

function isJamaahAlreadyAssigned(jamaahId: number, stayDetail: any) {
  if (!stayDetail) return false;
  return (stayDetail.occupants || []).some((oc: any) => oc.jamaahId === jamaahId);
}

function formatDate(d: any): string {
  if (!d) return '—'
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

const overlappingPairs = computed(() => {
  const list = stays.value || []
  const pairs: any[] = []
  for (let i=0;i<list.length;i++){
    for (let j=i+1;j<list.length;j++){
      const a = list[i], b = list[j]
      const aIn = formatDate(a.checkInDate)
      const aOut = formatDate(a.checkOutDate)
      const bIn = formatDate(b.checkInDate)
      const bOut = formatDate(b.checkOutDate)
      if (aIn && bIn && aOut && bOut && aIn <= bOut && bIn <= aOut) {
        pairs.push({ a, b })
      }
    }
  }
  return pairs
})

async function clearRoom(room: any, stayId: number) {
  if (!room.occupants?.length) return
  if (!confirm(`Kosongkan ${room.roomLabel}? Keluarkan ${room.occupants.length} Jamaah dari kamar ini?`)) return
  for (const occ of room.occupants) {
    await adminDelete(`/api/admin/tour/room-occupants/${occ.id}`).catch(()=>{})
  }
  await refreshAccommodation()
  await loadStayDetail(stayId)
}

async function unassignJamaahFromRoom(jamaahId: number, stayId: number) {
  if (!confirm('Keluarkan Jamaah dari kamar ini?')) return
  // Find occupant id from stays (now enriched with occupants) or currentStayDetail
  let occId: number | null = null
  const stay = stays.value.find((s:any)=>s.id===stayId)
  if (stay) {
    const occ = stay.rooms?.flatMap((r:any)=>r.occupants||[]).find((o:any)=>o.jamaahId===jamaahId)
    if (occ) occId = occ.id
  }
  if (!occId && currentStayDetail.value?.id===stayId) {
    const occ = (currentStayDetail.value.occupants||[]).find((o:any)=>o.jamaahId===jamaahId)
    if (occ) occId = occ.id
  }
  if (occId) {
    await adminDelete(`/api/admin/tour/room-occupants/${occId}`).catch(()=>{})
  } else {
    // fallback direct delete by stay+jamaah via service helper (if API supports)
    await $fetch(`/api/admin/tour/room-occupants/by-jamaah`, { method: 'DELETE', body: { stayId, jamaahId } } as any).catch(()=>{})
  }
  await refreshAccommodation()
  await loadStayDetail(stayId)
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
          <p class="mt-1 text-xs text-neutral-charcoal/60">Kebutuhan pemenuhan perjalanan seperti hotel, transport, visa, dll. Untuk Rooming, gunakan Booking tipe HOTEL.</p>
          <div v-if="!trip.bookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pemesanan vendor untuk perjalanan ini.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm"><thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Kode / Vendor</th><th class="py-2">Layanan</th><th class="py-2">Biaya</th><th class="py-2">Status</th><th class="py-2"></th></tr></thead>
            <tbody class="divide-y"><tr v-for="b in trip.bookings" :key="b.id"><td class="py-2"><NuxtLink :to="`/tour/bookings/${b.id}`" class="font-mono text-xs font-semibold text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink><br/><span class="text-xs">{{ b.vendor?.name || `Vendor #${b.vendorId}` }}</span></td><td class="py-2 text-xs"><TourStatusBadge :status="b.bookingType" type="bookingType" /></td><td class="py-2 text-xs">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}<br/><span class="text-neutral-charcoal/50">Rp {{ Number(b.amountIdr).toLocaleString('id-ID') }}</span></td><td class="py-2"><TourStatusBadge :status="b.status" type="booking" /></td><td class="py-2"><span v-if="b.bookingType==='HOTEL'" class="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">Bisa untuk Rooming</span></td></tr></tbody></table>
          </div>
        </div>
      </div>
    </div>

    <!-- ACCOMMODATION / ROOMING -->
    <div class="mt-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-lg font-semibold flex items-center gap-2"><Building2 class="h-5 w-5" /> Accommodation / Rooming</h2>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Trip → HOTEL Booking → Accommodation Stay → Rooms → Jamaah Assignment. Actual room allocation di Trip, bukan permanen di Jamaah. Preferensi kamar di Jamaah hanya preferensi.</p>
        </div>
        <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white flex items-center gap-1.5" @click="openCreateStay"><Plus class="h-4 w-4" /> Tambah Stay</button>
      </div>

      <div v-if="overlappingPairs.length" class="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p class="font-semibold">⚠️ Overlapping Stays terdeteksi (warning, tidak hard-block)</p>
        <ul class="mt-1 list-disc pl-5 text-xs">
          <li v-for="(pair, idx) in overlappingPairs" :key="idx">{{ pair.a.stayCode }} {{ formatDate(pair.a.checkInDate) }}→{{ formatDate(pair.a.checkOutDate) }} overlap dengan {{ pair.b.stayCode }} {{ formatDate(pair.b.checkInDate) }}→{{ formatDate(pair.b.checkOutDate) }}</li>
        </ul>
        <p class="mt-1 text-[11px] text-amber-700/80">Per spec, overlapping diijinkan tapi diberi warning — misal transit Jeddah 1 malam overlap Makkah.</p>
      </div>

      <div v-if="!stays.length" class="mt-4 rounded-2xl border border-dashed border-neutral-line bg-white p-10 text-center text-sm text-neutral-charcoal/50">
        <p>Belum ada Accommodation Stay untuk Trip ini.</p>
        <p class="mt-1 text-xs">Buat Stay dari HOTEL Booking, pilih Orders yang dicakup, lalu kelola Rooms & Jamaah assignment.</p>
        <button class="mt-4 min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreateStay">+ Tambah Accommodation Stay</button>
      </div>

      <div v-else class="mt-6 grid gap-6">
        <div v-for="stay in stays" :key="stay.id" class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-mono text-xs font-semibold">{{ stay.stayCode }} · {{ stay.booking?.bookingCode || `BKG-${stay.bookingId}` }}</p>
              <h3 class="mt-1 font-heading text-base font-semibold flex items-center gap-2"><Building2 class="h-4 w-4" /> {{ stay.hotelName }} · {{ stay.city }}</h3>
              <p class="mt-1 text-xs text-neutral-charcoal/60">{{ formatDate(stay.checkInDate) }} → {{ formatDate(stay.checkOutDate) }} · {{ stay.hotelName }} · Vendor {{ stay.booking?.vendorId ? `#${stay.booking.vendorId}` : '' }} (snapshot hotel, Vendor mungkin provider/wholesaler)</p>
              <p v-if="stay.notes" class="mt-1 text-xs text-neutral-charcoal/70">{{ stay.notes }}</p>
            </div>
            <div class="flex gap-1">
              <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit Stay" @click="openEditStay(stay)"><Pencil class="h-4 w-4" /></button>
              <button class="rounded-xl p-2 text-red-500 hover:bg-red-50" title="Hapus Stay" @click="removeStay(stay)"><Trash2 class="h-4 w-4" /></button>
            </div>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-4">
            <div class="rounded-xl bg-neutral-warm/60 px-4 py-3">
              <p class="text-[11px] uppercase text-neutral-charcoal/50">Orders Covered</p>
              <p class="mt-1 text-sm font-semibold">{{ stay.ordersCount }} Orders</p>
              <p class="text-xs text-neutral-charcoal/60 truncate">{{ (stay.orders || []).map((o:any)=>o.orderCode).join(', ') || '—' }}</p>
            </div>
            <div class="rounded-xl bg-blue-50 px-4 py-3">
              <p class="text-[11px] uppercase text-blue-700/60">Eligible Jamaah</p>
              <p class="mt-1 text-sm font-semibold text-blue-700">{{ stay.eligibleJamaahCount }} Jamaah</p>
              <p class="text-xs text-blue-700/60">dari Orders terpilih</p>
            </div>
            <div class="rounded-xl" :class="stay.isComplete ? 'bg-emerald-50' : 'bg-amber-50'">
              <div class="px-4 py-3">
                <p class="text-[11px] uppercase" :class="stay.isComplete ? 'text-emerald-700/60' : 'text-amber-700/60'">Assigned</p>
                <p class="mt-1 text-sm font-semibold" :class="stay.isComplete ? 'text-emerald-700' : 'text-amber-700'">{{ stay.assignedCount }} / {{ stay.eligibleJamaahCount }} assigned</p>
                <p class="text-xs" :class="stay.isComplete ? 'text-emerald-700/60' : 'text-amber-700/60'">{{ stay.completeness }}% · {{ stay.isComplete ? 'Complete' : 'Incomplete' }}</p>
              </div>
            </div>
            <div class="rounded-xl bg-neutral-warm/60 px-4 py-3">
              <p class="text-[11px] uppercase text-neutral-charcoal/50">Rooms</p>
              <p class="mt-1 text-sm font-semibold">{{ stay.roomsCount }} Rooms</p>
              <button class="mt-2 min-h-[32px] rounded-xl bg-sht-olive px-3 py-1 text-xs font-semibold text-white flex items-center gap-1" @click="openCreateRoom(stay.id)"><Plus class="h-3 w-3" /> Add Room</button>
            </div>
          </div>

          <div class="mt-6">
            <h4 class="text-sm font-semibold flex items-center gap-1.5"><Bed class="h-4 w-4" /> Rooms</h4>
            <div v-if="!stay.rooms?.length" class="mt-3 text-xs text-neutral-charcoal/50">Belum ada Room. Tambah Room dengan label, tipe, capacity, mode SAME_ORDER/SHARED_GROUP.</div>
            <div v-else class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="room in stay.rooms" :key="room.id" class="rounded-xl border border-neutral-line p-4" :class="room.occupied >= room.capacity ? 'bg-emerald-50/30 border-emerald-200' : room.occupied>0 ? 'bg-amber-50/30 border-amber-200' : 'bg-white'">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="font-semibold text-sm">{{ room.roomLabel }} <span v-if="room.roomNumber" class="font-mono text-xs text-neutral-charcoal/50">#{{ room.roomNumber }}</span></p>
                    <p class="mt-0.5 text-xs text-neutral-charcoal/60">{{ room.roomType }} · {{ room.capacity }} capacity · {{ room.roomingMode === 'SAME_ORDER' ? 'Same Order' : 'Shared Group' }}</p>
                    <p v-if="room.roomingMode==='SAME_ORDER' && room.orderId" class="mt-0.5 text-[11px] text-neutral-charcoal/50">Order #{{ room.orderId }}</p>
                  </div>
                  <div class="flex gap-1">
                    <button class="rounded-lg p-1.5 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit Room" @click="openEditRoom(room)"><Pencil class="h-3.5 w-3.5" /></button>
                    <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Hapus Room" @click="removeRoom(room)"><Trash2 class="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded bg-neutral-warm px-2 py-0.5 font-medium">{{ room.occupied }} / {{ room.capacity }}</span>
                  <span v-if="room.occupied >= room.capacity" class="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">Full</span>
                  <span v-else class="rounded bg-amber-100 px-2 py-0.5 text-amber-700">{{ room.capacity - room.occupied }} slot left</span>
                  <button v-if="room.occupied>0" class="ml-auto rounded-lg border border-red-200 bg-white px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50" title="Keluarkan semua dari room ini" @click="clearRoom(room, stay.id)">Kosongkan</button>
                </div>
                <div class="mt-3">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] uppercase text-neutral-charcoal/50">Occupants ({{ room.occupants?.length || 0 }})</p>
                    <button class="min-h-[28px] rounded-lg border px-2 py-1 text-[11px] font-medium hover:bg-neutral-warm flex items-center gap-1" :class="room.occupied >= room.capacity ? 'opacity-50 cursor-not-allowed' : ''" :disabled="room.occupied >= room.capacity" :title="room.occupied >= room.capacity ? 'Room penuh, keluarkan dulu untuk tambah' : 'Tambah Jamaah'" @click="openAssign(room, stay)"><Users class="h-3 w-3" /> {{ room.occupied >= room.capacity ? 'Full' : 'Assign' }}</button>
                  </div>
                  <div class="mt-2 space-y-1.5">
                    <div v-if="!room.occupants || room.occupants.length===0" class="rounded-lg border border-dashed border-neutral-line bg-neutral-warm/30 px-3 py-3 text-center text-xs text-neutral-charcoal/40">Kosong — belum ada Jamaah. Klik Assign untuk tambah.</div>
                    <div v-for="occ in (room.occupants || [])" :key="occ.id" class="flex items-center justify-between rounded-lg bg-white border px-2.5 py-2 text-xs shadow-sm">
                      <span class="flex-1 truncate">
                        <span class="font-mono font-semibold">{{ occ.jamaah?.jamaahCode || `JMH-${occ.jamaahId}` }}</span> · <span class="font-medium">{{ occ.jamaah?.fullName || '' }}</span>
                        <span v-if="room.roomingMode==='SHARED_GROUP'" class="text-[11px] text-neutral-charcoal/50"> · {{ occ.jamaah?.order?.orderCode || `ORD-${occ.jamaah?.orderId}` }}</span>
                      </span>
                      <span class="ml-2 flex shrink-0 items-center gap-1">
                        <button class="rounded-md border border-neutral-line bg-white p-1.5 text-neutral-charcoal/70 hover:bg-neutral-warm hover:text-neutral-charcoal" title="Pindah kamar" @click="openMove(occ.jamaahId, stay.id)"><MoveRight class="h-3.5 w-3.5" /></button>
                        <button class="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100" title="Keluarkan dari kamar (unassign)" @click="removeOccupantById(occ.id, stay.id)"><UserMinus class="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                  </div>
                  <p class="mt-2 text-[11px] text-neutral-charcoal/50">Salah input? Klik <span class="inline-flex items-center gap-0.5 rounded bg-red-50 px-1 py-0.5 text-red-600"><UserMinus class="h-3 w-3" /> Keluarkan</span> untuk unassign, atau <MoveRight class="h-3 w-3" /> untuk pindah kamar. Room Full tetap bisa dikosongkan.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4">
            <h4 class="text-sm font-semibold">Unassigned Jamaah ({{ (stay.eligibleJamaahCount||0) - (stay.assignedCount||0) }})</h4>
            <p class="mt-1 text-xs text-neutral-charcoal/60">Jamaah dari Orders yang dicakup Stay ini tapi belum dapat kamar. Derived, bukan status manual.</p>
            <div class="mt-3">
              <button class="min-h-[32px] rounded-xl border bg-white px-3 py-1.5 text-xs font-medium" @click="loadStayDetail(stay.id)">Lihat Unassigned</button>
              <div v-if="currentStayDetail && currentStayDetail.id===stay.id" class="mt-3">
                <div v-if="!currentStayDetail.unassigned?.length" class="text-xs text-emerald-700">Semua Jamaah sudah assigned — {{ currentStayDetail.assignedCount }}/{{ currentStayDetail.eligibleJamaahCount }} Complete</div>
                <div v-else class="grid gap-1">
                  <div v-for="j in currentStayDetail.unassigned" :key="j.id" class="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs">
                    <span><span class="font-mono font-semibold">{{ j.jamaahCode }}</span> · {{ j.fullName }} · {{ j.order?.orderCode || `ORD-${j.orderId}` }} · Preferensi {{ j.roomType }}</span>
                    <button class="rounded-lg bg-sht-olive px-2 py-1 text-[11px] font-semibold text-white" @click="openMove(j.id, stay.id)">Assign</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <TourModal :open="showStayForm" :title="stayForm.id ? 'Edit Accommodation Stay' : 'Tambah Accommodation Stay'" subtitle="Trip → HOTEL Booking → Stay → Orders scope. Booking harus HOTEL, milik Trip yang sama." max-width="max-w-2xl" @close="showStayForm=false">
      <div class="space-y-4">
        <label class="block text-sm font-medium">Hotel Booking * (HOTEL only, same Trip)
          <select v-model="stayForm.bookingId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm" @change="onBookingSelect">
            <option value="">Pilih Booking HOTEL...</option>
            <option v-for="b in hotelBookings" :key="b.id" :value="b.id">{{ b.bookingCode }} · {{ b.vendor?.name || `Vendor #${b.vendorId}` }} · {{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }} · {{ b.description?.slice(0,40) }}</option>
          </select>
          <span v-if="!hotelBookings.length" class="mt-1 block text-[11px] text-red-600">Belum ada Booking HOTEL di Trip ini. Buat Booking HOTEL dulu.</span>
          <span v-else class="mt-1 block text-[11px] text-neutral-charcoal/50">Hanya HOTEL, bukan TRANSPORT/VISA dll. Booking.vendor mungkin provider, hotelName snapshot eksplisit.</span>
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="text-sm font-medium">Hotel Name * (snapshot aktual)<input v-model="stayForm.hotelName" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" placeholder="Sofwah Tower" /></label>
          <label class="text-sm font-medium">City *<select v-model="stayForm.city" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option>Makkah</option><option>Madinah</option><option>Jeddah</option><option>Other</option></select></label>
          <label class="text-sm font-medium">Check-in *<input v-model="stayForm.checkInDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
          <label class="text-sm font-medium">Check-out *<input v-model="stayForm.checkOutDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" /></label>
        </div>
        <div>
          <p class="text-sm font-medium">Orders Included * (yang sudah di Trip ini)</p>
          <div class="mt-2 max-h-[200px] overflow-auto rounded-xl border border-neutral-line p-3">
            <div v-if="!trip?.tripOrders?.length" class="text-xs text-neutral-charcoal/50">Belum ada Order di Trip ini. Hubungkan Order dulu.</div>
            <label v-for="to in trip?.tripOrders || []" :key="to.orderId" class="flex items-center gap-2 py-1.5 text-sm">
              <input type="checkbox" :value="to.orderId" v-model="stayForm.orderIds" class="rounded" />
              <span class="font-mono text-xs font-semibold">{{ to.order?.orderCode || `ORD-${to.orderId}` }}</span>
              <span class="text-xs">{{ to.order?.customer?.name || '' }} · {{ to.order?.paxCount || '?' }} pax</span>
            </label>
          </div>
          <p class="mt-1 text-[11px] text-neutral-charcoal/50">Stay bisa cover 1 Order, beberapa, atau semua Orders di Trip. Jika Booking punya orderId, preselect Order tersebut.</p>
        </div>
        <label class="block text-sm font-medium">Notes<textarea v-model="stayForm.notes" rows="2" class="mt-1 w-full rounded-xl border px-4 py-2 text-sm" /></label>
        <p v-if="stayError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ stayError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showStayForm=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="stayPending" @click="submitStay">Simpan Stay</button>
        </div>
      </template>
    </TourModal>

    <TourModal :open="showRoomForm" :title="roomForm.id ? 'Edit Room' : 'Tambah Room'" subtitle="Room label required, roomNumber optional, capacity default by type, mode SAME_ORDER/SHARED_GROUP" max-width="max-w-lg" @close="showRoomForm=false">
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="text-sm font-medium">Room Label *<input v-model="roomForm.roomLabel" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" placeholder="Room 501, Quad 01" /></label>
          <label class="text-sm font-medium">Room Number (optional)<input v-model="roomForm.roomNumber" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" placeholder="501" /></label>
          <label class="text-sm font-medium">Room Type *<select v-model="roomForm.roomType" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option v-for="t in ROOM_TYPES" :key="t" :value="t">{{ t }}</option></select><span class="mt-1 block text-[11px] text-neutral-charcoal/50">SINGLE=1 DOUBLE=2 TRIPLE=3 QUAD=4 QUINT=5</span></label>
          <label class="text-sm font-medium">Capacity *<input v-model.number="roomForm.capacity" type="number" min="1" max="10" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
          <label class="text-sm font-medium">Rooming Mode *<select v-model="roomForm.roomingMode" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option v-for="m in ROOMING_MODES" :key="m" :value="m">{{ m }}</option></select><span class="mt-1 block text-[11px] text-neutral-charcoal/50">SAME_ORDER: hanya 1 Order, SHARED_GROUP: boleh cross-order</span></label>
          <label v-if="roomForm.roomingMode==='SAME_ORDER'" class="text-sm font-medium">Order * (untuk SAME_ORDER)
            <select v-model="roomForm.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm">
              <option value="">Pilih Order...</option>
              <option v-for="to in trip?.tripOrders || []" :key="to.orderId" :value="to.orderId">{{ to.order?.orderCode || `ORD-${to.orderId}` }} · {{ to.order?.paxCount }} pax</option>
            </select>
            <span class="mt-1 block text-[11px] text-neutral-charcoal/50">Order harus belong to Trip dan included di Stay scope</span>
          </label>
        </div>
        <label class="block text-sm font-medium">Notes<textarea v-model="roomForm.notes" rows="2" class="mt-1 w-full rounded-xl border px-4 py-2 text-sm" /></label>
        <p v-if="roomError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ roomError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showRoomForm=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="roomPending" @click="submitRoom">Simpan Room</button>
        </div>
      </template>
    </TourModal>

    <TourModal :open="showOccupantForm" title="Assign Jamaah ke Room" subtitle="Validasi: belongs to Trip, Order included di Stay, tidak double di Stay yang sama, capacity, SAME_ORDER/SHARED_GROUP" max-width="max-w-2xl" @close="showOccupantForm=false">
      <div class="space-y-4">
        <div v-if="currentStayDetailLoading" class="text-sm text-neutral-charcoal/50">Memuat...</div>
        <div v-else-if="currentStayDetail">
          <p class="text-xs text-neutral-charcoal/60">Stay {{ currentStayDetail.stayCode }} · {{ currentStayDetail.hotelName }} · Room {{ stays.flatMap((s:any)=>s.rooms).find((r:any)=>r.id===occupantForm.roomId)?.roomLabel }}</p>
          <div class="mt-3 max-h-[400px] overflow-auto rounded-xl border p-3">
            <div v-for="order in currentStayDetail.orders" :key="order.id" class="mb-4">
              <p class="text-xs font-semibold">{{ order.orderCode }} · {{ order.customer?.name || '' }} · {{ order.jamaah?.length || 0 }} pax</p>
              <div class="mt-2 grid gap-1">
                <label v-for="j in order.jamaah" :key="j.id" class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" :class="isJamaahAlreadyAssigned(j.id, currentStayDetail) ? 'bg-neutral-warm/50 opacity-60' : 'bg-white hover:bg-neutral-warm/30'">
                  <input type="checkbox" :value="j.id" v-model="occupantForm.selectedJamaahIds" :disabled="isJamaahAlreadyAssigned(j.id, currentStayDetail)" class="rounded" />
                  <span class="font-mono text-xs font-semibold">{{ j.jamaahCode }}</span> · {{ j.fullName }} · Preferensi {{ j.roomType }}
                  <span v-if="isJamaahAlreadyAssigned(j.id, currentStayDetail)" class="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">Sudah assigned di Stay ini</span>
                </label>
              </div>
            </div>
          </div>
          <p class="mt-2 text-[11px] text-neutral-charcoal/50">Untuk SAME_ORDER hanya Jamaah dari Order terpilih yang eligible. Untuk SHARED_GROUP semua Orders di Stay. Satu Jamaah hanya 1 Room per Stay, tapi bisa beda Room di Stay lain (Makkah 501 dan Madinah 302).</p>
        </div>
        <p v-if="occupantError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ occupantError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showOccupantForm=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="occupantPending || !occupantForm.selectedJamaahIds.length" @click="submitAssign">Assign {{ occupantForm.selectedJamaahIds.length }} Jamaah</button>
        </div>
      </template>
    </TourModal>

    <TourModal :open="showMoveForm" title="Pindah Jamaah ke Room lain" subtitle="Moving harus pass destination validations" max-width="max-w-md" @close="showMoveForm=false">
      <div class="space-y-3">
        <p class="text-sm">Jamaah #{{ moveForm.jamaahId }} di Stay #{{ moveForm.stayId }}</p>
        <label class="block text-sm font-medium">Room Tujuan *
          <select v-model="moveForm.toRoomId" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm">
            <option value="">Pilih Room...</option>
            <option v-for="r in (currentStayDetail?.rooms || [])" :key="r.id" :value="r.id">{{ r.roomLabel }} · {{ r.roomType }} · {{ r.occupied }}/{{ r.capacity }} · {{ r.roomingMode }}</option>
          </select>
        </label>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showMoveForm=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" @click="submitMove">Pindah</button>
        </div>
      </template>
    </TourModal>
  </div>
</template>
