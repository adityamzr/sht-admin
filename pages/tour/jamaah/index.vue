<script setup lang="ts">
import type { TourJamaah } from "~/types";
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
    <PageHead title="Jamaah" subtitle="Jamaah = many per Order, terpisah dari Customer. Filter order/visa/siskopatuh, searchable.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Jamaah</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari nama / kode / passport / WA..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <input v-model="orderId" placeholder="Order ID" type="number" class="min-h-[44px] w-24 rounded-xl border border-neutral-line px-3 text-sm" @input="page=1" />
      <select v-model="visaStatus" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Visa</option><option v-for="v in VISA" :key="v" :value="v">{{ visaStatusLabel(v) }}</option></select>
      <select v-model="siskopatuhStatus" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Sisko</option><option v-for="s in SISKO" :key="s" :value="s">{{ siskopatuhStatusLabel(s) }}</option></select>
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? "Edit Jamaah" : "Tambah Jamaah" }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Order<select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">Pilih Order...</option><option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || `#${o.customerId}` }} · {{ o.paxCount }} pax</option></select></label>
        <label class="text-sm font-medium">Nama Lengkap<input v-model="form.fullName" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Gender<select v-model="form.gender" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">—</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></label>
        <label class="text-sm font-medium">Birth Date<input v-model="form.birthDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Passport<input v-model="form.passportNumber" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Expiry<input v-model="form.passportExpiry" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Visa<select v-model="form.visaStatus" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="v in VISA" :key="v" :value="v">{{ visaStatusLabel(v) }}</option></select></label>
        <label class="text-sm font-medium">Siskopatuh<select v-model="form.siskopatuhStatus" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="s in SISKO" :key="s" :value="s">{{ siskopatuhStatusLabel(s) }}</option></select></label>
        <label class="text-sm font-medium">Room<select v-model="form.roomType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="r in ROOM" :key="r" :value="r">{{ roomTypeLabel(r) }}</option></select></label>
        <label class="text-sm font-medium">WhatsApp<input v-model="form.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
      </div>
      <p v-if="formError" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm">{{ formError }}</p>
      <div class="mt-4 flex gap-2"><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button><button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm=false">Batal</button></div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Nama</th><th class="px-5 py-3">Order / Customer</th><th class="px-5 py-3">Gender</th><th class="px-5 py-3">Visa</th><th class="px-5 py-3">Sisko</th><th class="px-5 py-3">Room</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="j in rows" :key="j.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ j.jamaahCode }}</p><p class="font-medium">{{ j.fullName }}</p><p class="text-xs text-neutral-charcoal/50">{{ j.passportNumber || "—" }}</p></td>
            <td class="px-5 py-3 text-xs">{{ j.order?.orderCode || `#${j.orderId}` }}<br/><span class="text-neutral-charcoal/50">{{ j.order?.customer?.name || "" }}</span></td>
            <td class="px-5 py-3 text-xs">{{ j.gender ? genderLabel(j.gender) : "—" }}</td>
            <td class="px-5 py-3"><span class="rounded-full bg-neutral-warm px-2 py-1 text-xs">{{ visaStatusLabel(j.visaStatus) }}</span></td>
            <td class="px-5 py-3"><span class="rounded-full bg-neutral-warm px-2 py-1 text-xs">{{ siskopatuhStatusLabel(j.siskopatuhStatus) }}</span></td>
            <td class="px-5 py-3 text-xs">{{ roomTypeLabel(j.roomType) }}</td>
            <td class="px-5 py-3 text-right"><button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5" @click="openEdit(j)">Edit</button><NuxtLink :to="`/tour/jamaah/${j.id}`" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/60 hover:text-brand-green">Detail</NuxtLink><button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(j)">Hapus</button></td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="7" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada jamaah.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
