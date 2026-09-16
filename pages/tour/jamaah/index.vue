<script setup lang="ts">
import { Pencil, Trash2, Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { visaStatusLabel, siskopatuhStatusLabel, roomTypeLabel, genderLabel } = useTourLabels();

const search = ref("");
const orderId = ref("");
const visaStatus = ref("");
const siskopatuhStatus = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({
  search: search.value || undefined,
  orderId: orderId.value ? Number(orderId.value) : undefined,
  visaStatus: visaStatus.value || undefined,
  siskopatuhStatus: siskopatuhStatus.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}));
const { data, refresh } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/jamaah", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const orders = computed(() => ordersData.value?.data ?? []);

const VISA = ["NOT_STARTED","PROCESSING","APPROVED","ISSUED"];
const SISKO = ["PENDING","REGISTERED","ACTIVE"];
const ROOM = ["SINGLE","DOUBLE","TRIPLE","QUAD","QUINT","NA"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  orderId: "" as any,
  fullName: "",
  gender: "",
  birthDate: "",
  passportNumber: "",
  passportExpiry: "",
  visaStatus: "NOT_STARTED",
  siskopatuhStatus: "PENDING",
  roomType: "NA",
  whatsapp: "",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() { Object.assign(form, { id: null, orderId: "", fullName: "", gender: "", birthDate: "", passportNumber: "", passportExpiry: "", visaStatus: "NOT_STARTED", siskopatuhStatus: "PENDING", roomType: "NA", whatsapp: "", notes: "" }); showForm.value = true; }
function openEdit(j: any) { Object.assign(form, { id: j.id, orderId: j.orderId, fullName: j.fullName, gender: j.gender || "", birthDate: j.birthDate || "", passportNumber: j.passportNumber || "", passportExpiry: j.passportExpiry || "", visaStatus: j.visaStatus, siskopatuhStatus: j.siskopatuhStatus, roomType: j.roomType, whatsapp: j.whatsapp || "", notes: j.notes || "" }); showForm.value = true; }
async function submit() {
  formPending.value = true; formError.value = null;
  try {
    const body: any = { orderId: Number(form.orderId), fullName: form.fullName, gender: form.gender || null, birthDate: form.birthDate || null, passportNumber: form.passportNumber || null, passportExpiry: form.passportExpiry || null, visaStatus: form.visaStatus, siskopatuhStatus: form.siskopatuhStatus, roomType: form.roomType, whatsapp: form.whatsapp || null, notes: form.notes || null };
    if (form.id) await adminPatch(`/api/admin/tour/jamaah/${form.id}`, body); else await adminPost("/api/admin/tour/jamaah", body);
    showForm.value = false; await refresh();
  } catch (err: any) { formError.value = err?.data?.statusMessage || "Gagal menyimpan"; } finally { formPending.value = false; }
}
async function remove(j: any) { if (!confirm(`Hapus jamaah ${j.fullName}?`)) return; await adminDelete(`/api/admin/tour/jamaah/${j.id}`).catch(()=>{}); await refresh(); }
</script>

<template>
  <div>
    <PageHead title="Jamaah" subtitle="Rute kompatibilitas — pengelolaan utama di Order Detail.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Jamaah</button></template>
    </PageHead>

    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      Halaman ini tetap berfungsi untuk kompatibilitas bookmark, tapi workflow utama sekarang di <NuxtLink to="/tour/orders" class="font-semibold underline">Order Detail → Jamaah (X / Pax)</NuxtLink>. Jamaah tetap milik Order, bukan Booking.
    </div>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari nama / kode / passport / WA..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="orderId" class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-3 text-sm" @change="page=1">
        <option value="">Semua Order</option>
        <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · {{ o.paxCount }} pax</option>
      </select>
      <select v-model="visaStatus" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Visa</option><option v-for="v in VISA" :key="v" :value="v">{{ visaStatusLabel(v) }}</option></select>
      <select v-model="siskopatuhStatus" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Sisko</option><option v-for="s in SISKO" :key="s" :value="s">{{ siskopatuhStatusLabel(s) }}</option></select>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Jamaah' : 'Tambah Jamaah'" subtitle="Data jamaah milik Order" max-width="max-w-2xl" @close="showForm=false">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Konteks Pesanan</h4>
          <label class="mt-3 block text-sm font-medium">Order *
            <select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih Order...</option>
              <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · {{ o.paxCount }} pax</option>
            </select>
          </label>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Identitas</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="sm:col-span-2 text-sm font-medium">Nama Lengkap *<input v-model="form.fullName" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
            <label class="text-sm font-medium">Gender<select v-model="form.gender" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option value="">—</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></label>
            <label class="text-sm font-medium">Tanggal Lahir<input v-model="form.birthDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
            <label class="text-sm font-medium">WhatsApp<input v-model="form.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Paspor</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Nomor Paspor<input v-model="form.passportNumber" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
            <label class="text-sm font-medium">Masa Berlaku<input v-model="form.passportExpiry" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Operasional</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label class="text-sm font-medium">Visa<select v-model="form.visaStatus" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option v-for="v in VISA" :key="v" :value="v">{{ visaStatusLabel(v) }}</option></select></label>
            <label class="text-sm font-medium">Siskopatuh<select v-model="form.siskopatuhStatus" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option v-for="s in SISKO" :key="s" :value="s">{{ siskopatuhStatusLabel(s) }}</option></select></label>
            <label class="text-sm font-medium">Kamar<select v-model="form.roomType" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option v-for="r in ROOM" :key="r" :value="r">{{ roomTypeLabel(r) }}</option></select></label>
          </div>
        </div>
        <label class="block text-sm font-medium">Catatan<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border px-4 py-2 text-sm" /></label>
        <p v-if="formError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Nama</th><th class="px-5 py-3">Order</th><th class="px-5 py-3">Gender</th><th class="px-5 py-3">Visa</th><th class="px-5 py-3">Sisko</th><th class="px-5 py-3">Kamar</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="j in rows" :key="j.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ j.jamaahCode }}</p><p class="font-medium">{{ j.fullName }}</p></td>
            <td class="px-5 py-3 text-xs">{{ j.order?.orderCode || `Order #${j.orderId}` }}<br/><span class="text-neutral-charcoal/50">{{ j.order?.customer?.name || "" }}</span></td>
            <td class="px-5 py-3 text-xs">{{ j.gender ? genderLabel(j.gender) : "—" }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="j.visaStatus" type="visa" /></td>
            <td class="px-5 py-3"><TourStatusBadge :status="j.siskopatuhStatus" type="siskopatuh" /></td>
            <td class="px-5 py-3 text-xs">{{ roomTypeLabel(j.roomType) }}</td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(j)"><Pencil class="h-4 w-4" /></button>
                <NuxtLink :to="`/tour/jamaah/${j.id}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm" title="Detail"><Eye class="h-4 w-4" /></NuxtLink>
                <button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus" @click="remove(j)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="7" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada jamaah.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
