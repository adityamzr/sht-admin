<script setup lang="ts">
import { Pencil, Trash2, Eye, MessageCircle, UserPlus } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { bookingTypeLabel, bookingStatusLabel, vendorTypeLabel, visaStatusLabel, siskopatuhStatusLabel, roomTypeLabel, genderLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data, refresh: refreshBooking } = await useAdminFetch<{ data: any }>(`/api/admin/tour/bookings/${id}`);
const booking = computed(() => data.value?.data ?? null);

// Jamaah from linked order
const jamaahRows = ref<any[]>([]);
async function loadJamaah() {
  if (!booking.value?.orderId) { jamaahRows.value = []; return; }
  try {
    const res: any = await $fetch(`/api/admin/tour/jamaah`, { query: { orderId: booking.value.orderId, pageSize: 100 }, headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined });
    jamaahRows.value = res.data ?? [];
  } catch { jamaahRows.value = []; }
}
watch(() => booking.value?.orderId, () => { loadJamaah(); }, { immediate: true });
async function refreshJamaah() { await loadJamaah(); }

// Jamaah modal
const showJamaahForm = ref(false);
const editingJamaah = ref<any>(null);
const jamaahForm = reactive({
  fullName: "",
  gender: "" as any,
  birthDate: "",
  passportNumber: "",
  passportExpiry: "",
  visaStatus: "NOT_STARTED",
  siskopatuhStatus: "PENDING",
  roomType: "NA",
  whatsapp: "",
  notes: "",
});
const jamaahError = ref<string | null>(null);
const jamaahPending = ref(false);

function openJamaahCreate() {
  editingJamaah.value = null;
  Object.assign(jamaahForm, { fullName: "", gender: "", birthDate: "", passportNumber: "", passportExpiry: "", visaStatus: "NOT_STARTED", siskopatuhStatus: "PENDING", roomType: "NA", whatsapp: "", notes: "" });
  showJamaahForm.value = true;
}
function openJamaahEdit(j: any) {
  editingJamaah.value = j;
  Object.assign(jamaahForm, {
    fullName: j.fullName,
    gender: j.gender || "",
    birthDate: j.birthDate || "",
    passportNumber: j.passportNumber || "",
    passportExpiry: j.passportExpiry || "",
    visaStatus: j.visaStatus,
    siskopatuhStatus: j.siskopatuhStatus,
    roomType: j.roomType,
    whatsapp: j.whatsapp || "",
    notes: j.notes || "",
  });
  showJamaahForm.value = true;
}
async function submitJamaah() {
  jamaahPending.value = true;
  jamaahError.value = null;
  try {
    if (!booking.value?.orderId) throw new Error("Booking belum terhubung ke Order, jadi Jamaah tidak bisa dikelola di sini");
    const body: any = {
      orderId: booking.value.orderId,
      fullName: jamaahForm.fullName,
      gender: jamaahForm.gender || null,
      birthDate: jamaahForm.birthDate || null,
      passportNumber: jamaahForm.passportNumber || null,
      passportExpiry: jamaahForm.passportExpiry || null,
      visaStatus: jamaahForm.visaStatus,
      siskopatuhStatus: jamaahForm.siskopatuhStatus,
      roomType: jamaahForm.roomType,
      whatsapp: jamaahForm.whatsapp || null,
      notes: jamaahForm.notes || null,
    };
    if (editingJamaah.value) await adminPatch(`/api/admin/tour/jamaah/${editingJamaah.value.id}`, body);
    else await adminPost("/api/admin/tour/jamaah", body);
    showJamaahForm.value = false;
    await refreshJamaah();
  } catch (e: any) {
    jamaahError.value = e?.data?.statusMessage || e.message || "Gagal simpan jamaah";
  } finally { jamaahPending.value = false; }
}
async function deleteJamaah(j: any) {
  if (!confirm(`Hapus jamaah ${j.fullName}?`)) return;
  await adminDelete(`/api/admin/tour/jamaah/${j.id}`).catch(()=>{});
  await refreshJamaah();
}
</script>

<template>
  <div>
    <PageHead :title="booking ? booking.bookingCode : 'Booking Detail'" :subtitle="booking ? `${bookingTypeLabel(booking.bookingType)} · ${booking.currency} ${Number(booking.amount).toLocaleString('id-ID')} · Setara Rp ${Number(booking.amountIdr).toLocaleString('id-ID')}` : ''">
      <template #actions><NuxtLink to="/tour/bookings" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="booking" class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- Core Booking Info -->
      <div class="lg:col-span-1 space-y-6">
        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading text-sm font-semibold">Detail Pemesanan</h3>
          <dl class="mt-4 space-y-3 text-sm">
            <div><dt class="text-xs text-neutral-charcoal/50">Kode Booking</dt><dd class="font-mono font-semibold">{{ booking.bookingCode }}</dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Tanggal</dt><dd>{{ booking.bookingDate }}</dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Jenis Layanan</dt><dd><TourStatusBadge :status="booking.bookingType" type="bookingType" /></dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Vendor</dt><dd><NuxtLink :to="`/tour/vendors/${booking.vendorId}`" class="font-medium text-brand-teal hover:underline">{{ booking.vendor?.name || `Vendor #${booking.vendorId}` }}</NuxtLink> <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ booking.vendor?.vendorCode || "" }}</span> <span v-if="booking.vendor?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700 text-[11px]">Arsip</span><br/><span class="text-xs text-neutral-charcoal/60">{{ booking.vendor ? vendorTypeLabel(booking.vendor.vendorType) : "" }} · {{ booking.vendor?.city || "" }}</span></dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Trip</dt><dd><NuxtLink v-if="booking.trip" :to="`/tour/trips/${booking.tripId}`" class="text-brand-teal hover:underline font-medium">{{ booking.trip.tripCode }} · {{ booking.trip.name }}</NuxtLink><span v-else class="text-neutral-charcoal/50">Tanpa Trip</span></dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Order & Customer</dt><dd><NuxtLink v-if="booking.order" :to="`/tour/orders/${booking.orderId}`" class="font-medium text-brand-teal hover:underline">{{ booking.order.orderCode }}</NuxtLink><span v-else class="text-neutral-charcoal/50">{{ booking.orderId ? `Order #${booking.orderId}` : "Tanpa Order" }}</span><br/><span v-if="booking.customer" class="text-xs text-neutral-charcoal/60">{{ booking.customer.name }} · {{ booking.customer.customerCode }}</span></dd></div>
          </dl>
        </div>

        <div class="rounded-2xl border bg-white p-6">
          <h3 class="font-heading text-sm font-semibold">Biaya & Administrasi</h3>
          <dl class="mt-4 space-y-3 text-sm">
            <div><dt class="text-xs text-neutral-charcoal/50">Biaya</dt><dd class="font-semibold">{{ booking.currency }} {{ Number(booking.amount).toLocaleString('id-ID') }}</dd></div>
            <div v-if="booking.currency !== 'IDR'"><dt class="text-xs text-neutral-charcoal/50">Kurs saat booking</dt><dd>{{ booking.exchangeRateSnapshot ? Number(booking.exchangeRateSnapshot).toLocaleString('id-ID') : "—" }} <span class="text-xs text-neutral-charcoal/50">disimpan agar riwayat tetap konsisten</span></dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Setara IDR</dt><dd class="font-semibold text-brand-green">Rp {{ Number(booking.amountIdr).toLocaleString('id-ID') }}</dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Jatuh Tempo</dt><dd>{{ booking.dueDate || "—" }}</dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Status</dt><dd><TourStatusBadge :status="booking.status" type="booking" /></dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Deskripsi</dt><dd class="text-neutral-charcoal/70">{{ booking.description || "—" }}</dd></div>
            <div><dt class="text-xs text-neutral-charcoal/50">Catatan</dt><dd class="text-neutral-charcoal/70">{{ booking.notes || "—" }}</dd></div>
          </dl>
        </div>
      </div>

      <!-- Jamaah Hub -->
      <div class="lg:col-span-2">
        <div class="rounded-2xl border bg-white p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading text-base font-semibold">Jamaah Terkait</h3>
              <p class="mt-1 text-xs text-neutral-charcoal/60">Dikelola dari Order yang terhubung ke Booking ini. Satu sumber kebenaran: Jamaah milik Order.</p>
            </div>
            <button type="button" class="min-h-[36px] rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white" :disabled="!booking.orderId" @click="openJamaahCreate"><span class="inline-flex items-center gap-1"><UserPlus class="h-4 w-4" /> Tambah Jamaah</span></button>
          </div>

          <div v-if="!booking.orderId" class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p class="text-sm font-medium text-amber-800">Belum ada Order terhubung</p>
            <p class="mt-1 text-xs text-amber-700">Hubungkan Booking ini ke Order dulu di form Edit Booking, baru Jamaah bisa dikelola di sini.</p>
            <NuxtLink :to="`/tour/orders`" class="mt-3 inline-block rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white">Lihat Orders</NuxtLink>
          </div>

          <div v-else>
            <div class="mt-4 flex items-center gap-2 text-xs text-neutral-charcoal/60">
              <span>Order {{ booking.order?.orderCode || `#${booking.orderId}` }} · {{ jamaahRows.length }} jamaah</span>
              <NuxtLink :to="`/tour/orders/${booking.orderId}`" class="ml-auto text-brand-teal hover:underline">Lihat Order →</NuxtLink>
            </div>

            <div v-if="jamaahRows.length===0" class="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-neutral-charcoal/50">Belum ada jamaah untuk order ini. Tambahkan jamaah pertama.</div>

            <div v-else class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[800px] text-left text-sm">
                <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Nama</th><th class="py-2">Identitas</th><th class="py-2">Passport</th><th class="py-2">Visa</th><th class="py-2">Sisko</th><th class="py-2">Kamar</th><th class="py-2 text-right">Aksi</th></tr></thead>
                <tbody class="divide-y">
                  <tr v-for="j in jamaahRows" :key="j.id">
                    <td class="py-2"><p class="font-medium">{{ j.fullName }}</p><p class="flex items-center gap-1 text-xs text-neutral-charcoal/50"><span v-if="j.gender">{{ genderLabel(j.gender) }} ·</span> {{ j.birthDate || "—" }} <span v-if="j.whatsapp" class="inline-flex items-center gap-1"><MessageCircle class="h-3 w-3" />{{ j.whatsapp }}</span></p></td>
                    <td class="py-2 text-xs font-mono">{{ j.jamaahCode }}</td>
                    <td class="py-2 text-xs">{{ j.passportNumber || "—" }}<br/><span class="text-neutral-charcoal/50">exp {{ j.passportExpiry || "—" }}</span></td>
                    <td class="py-2"><TourStatusBadge :status="j.visaStatus" type="visa" /></td>
                    <td class="py-2"><TourStatusBadge :status="j.siskopatuhStatus" type="siskopatuh" /></td>
                    <td class="py-2 text-xs">{{ roomTypeLabel(j.roomType) }}</td>
                    <td class="py-2 text-right">
                      <div class="flex justify-end gap-1">
                        <button class="rounded-lg p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openJamaahEdit(j)"><Pencil class="h-4 w-4" /></button>
                        <button class="rounded-lg p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus" @click="deleteJamaah(j)"><Trash2 class="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Jamaah Modal -->
    <TourModal :open="showJamaahForm" :title="editingJamaah ? 'Edit Jamaah' : 'Tambah Jamaah'" :subtitle="booking.order ? `Untuk ${booking.order.orderCode} · ${booking.customer?.name || ''}` : ''" max-width="max-w-2xl" @close="showJamaahForm=false">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Identitas</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="sm:col-span-2 text-sm font-medium">Nama Lengkap *<input v-model="jamaahForm.fullName" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" placeholder="Ahmad Fauzi" /></label>
            <label class="text-sm font-medium">Gender<select v-model="jamaahForm.gender" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option value="">—</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></label>
            <label class="text-sm font-medium">Tanggal Lahir<input v-model="jamaahForm.birthDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
            <label class="text-sm font-medium">WhatsApp<input v-model="jamaahForm.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" placeholder="628..." /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Paspor</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Nomor Paspor<input v-model="jamaahForm.passportNumber" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
            <label class="text-sm font-medium">Masa Berlaku<input v-model="jamaahForm.passportExpiry" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Operasional</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label class="text-sm font-medium">Visa<select v-model="jamaahForm.visaStatus" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option value="NOT_STARTED">{{ visaStatusLabel("NOT_STARTED") }}</option><option value="PROCESSING">{{ visaStatusLabel("PROCESSING") }}</option><option value="APPROVED">{{ visaStatusLabel("APPROVED") }}</option><option value="ISSUED">{{ visaStatusLabel("ISSUED") }}</option></select></label>
            <label class="text-sm font-medium">Siskopatuh<select v-model="jamaahForm.siskopatuhStatus" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option value="PENDING">{{ siskopatuhStatusLabel("PENDING") }}</option><option value="REGISTERED">{{ siskopatuhStatusLabel("REGISTERED") }}</option><option value="ACTIVE">{{ siskopatuhStatusLabel("ACTIVE") }}</option></select></label>
            <label class="text-sm font-medium">Tipe Kamar<select v-model="jamaahForm.roomType" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option value="SINGLE">{{ roomTypeLabel("SINGLE") }}</option><option value="DOUBLE">{{ roomTypeLabel("DOUBLE") }}</option><option value="TRIPLE">{{ roomTypeLabel("TRIPLE") }}</option><option value="QUAD">{{ roomTypeLabel("QUAD") }}</option><option value="QUINT">{{ roomTypeLabel("QUINT") }}</option><option value="NA">{{ roomTypeLabel("NA") }}</option></select></label>
          </div>
        </div>
        <label class="block text-sm font-medium">Catatan<textarea v-model="jamaahForm.notes" rows="2" class="mt-1 w-full rounded-xl border px-4 py-2 text-sm" /></label>
        <p v-if="jamaahError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ jamaahError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showJamaahForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="jamaahPending" @click="submitJamaah">Simpan Jamaah</button>
        </div>
      </template>
    </TourModal>
  </div>
</template>
