<script setup lang="ts">
import type { TourVendor } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { vendorTypeLabel, vendorStatusLabel } = useTourLabels();

const search = ref("");
const vendorType = ref("");
const status = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({ search: search.value || undefined, vendorType: vendorType.value || undefined, status: status.value || undefined, page: page.value, pageSize: pageSize.value }));
const { data, refresh } = await useAdminFetch<{ data: TourVendor[]; meta: any }>("/api/admin/tour/vendors", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const VENDOR_TYPES = ["HOTEL","TRANSPORT","VISA","FLIGHT","SISKOPATUH","MUTHAWWIF","HANDLING","OTHER"];
const STATUSES = ["ACTIVE","INACTIVE"];

const showForm = ref(false);
const form = reactive({ id: null as number | null, name: "", vendorType: "HOTEL", contactName: "", whatsapp: "", email: "", city: "", country: "", defaultCurrency: "IDR", paymentInfo: "", status: "ACTIVE", notes: "" });
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() { Object.assign(form, { id: null, name: "", vendorType: "HOTEL", contactName: "", whatsapp: "", email: "", city: "", country: "", defaultCurrency: "IDR", paymentInfo: "", status: "ACTIVE", notes: "" }); showForm.value = true; }
function openEdit(v: any) { Object.assign(form, { id: v.id, name: v.name, vendorType: v.vendorType, contactName: v.contactName || "", whatsapp: v.whatsapp || "", email: v.email || "", city: v.city || "", country: v.country || "", defaultCurrency: v.defaultCurrency, paymentInfo: v.paymentInfo || "", status: v.status, notes: v.notes || "" }); showForm.value = true; }
async function submit() {
  formPending.value = true; formError.value = null;
  try {
    const body: any = { name: form.name, vendorType: form.vendorType, contactName: form.contactName || null, whatsapp: form.whatsapp || null, email: form.email || null, city: form.city || null, country: form.country || null, defaultCurrency: form.defaultCurrency, paymentInfo: form.paymentInfo || null, status: form.status, notes: form.notes || null };
    if (form.id) await adminPatch(`/api/admin/tour/vendors/${form.id}`, body); else await adminPost("/api/admin/tour/vendors", body);
    showForm.value = false; await refresh();
  } catch (err: any) { formError.value = err?.data?.statusMessage || "Gagal menyimpan"; } finally { formPending.value = false; }
}
async function remove(v: any) { if (!confirm(`Hapus vendor ${v.name}?`)) return; await adminDelete(`/api/admin/tour/vendors/${v.id}`).catch(()=>{}); await refresh(); }
</script>

<template>
  <div>
    <PageHead title="Vendors" subtitle="Manajemen vendor — Hotel, Transport, Visa, Flight, dll. Kode VND-0001, filter type/status.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Vendor</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari nama / kode / kontak..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="vendorType" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Tipe</option><option v-for="t in VENDOR_TYPES" :key="t" :value="t">{{ vendorTypeLabel(t) }}</option></select>
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ vendorStatusLabel(s) }}</option></select>
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? "Edit Vendor" : "Tambah Vendor" }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Nama<input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Tipe<select v-model="form.vendorType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="t in VENDOR_TYPES" :key="t" :value="t">{{ vendorTypeLabel(t) }}</option></select></label>
        <label class="text-sm font-medium">Kontak<input v-model="form.contactName" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">WhatsApp<input v-model="form.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Email<input v-model="form.email" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Kota<input v-model="form.city" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Negara<input v-model="form.country" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Currency<select v-model="form.defaultCurrency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option>IDR</option><option>SAR</option><option>USD</option></select></label>
        <label class="sm:col-span-2 text-sm font-medium">Payment Info<textarea v-model="form.paymentInfo" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
        <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="s in STATUSES" :key="s" :value="s">{{ vendorStatusLabel(s) }}</option></select></label>
        <label class="text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
      </div>
      <p v-if="formError" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm">{{ formError }}</p>
      <div class="mt-4 flex gap-2"><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button><button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm=false">Batal</button></div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Nama</th><th class="px-5 py-3">Tipe</th><th class="px-5 py-3">Kontak</th><th class="px-5 py-3">Currency</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="v in rows" :key="v.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ v.vendorCode }}</p><p class="font-medium">{{ v.name }}</p><p class="text-xs text-neutral-charcoal/50">{{ v.city }} {{ v.country ? "· "+v.country : "" }}</p></td>
            <td class="px-5 py-3"><span class="rounded-full bg-neutral-warm px-2.5 py-1 text-xs font-semibold">{{ vendorTypeLabel(v.vendorType) }}</span></td>
            <td class="px-5 py-3 text-xs">{{ v.contactName || "—" }}<br/><span class="text-neutral-charcoal/50">{{ v.whatsapp || "" }}</span></td>
            <td class="px-5 py-3">{{ v.defaultCurrency }}</td>
            <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="v.status==='ACTIVE' ? 'bg-sht-olive/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/50'">{{ vendorStatusLabel(v.status) }}</span></td>
            <td class="px-5 py-3 text-right"><button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5" @click="openEdit(v)">Edit</button><NuxtLink :to="`/tour/vendors/${v.id}`" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/60 hover:text-brand-green">Detail</NuxtLink><button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(v)">Hapus</button></td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="6" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada vendor.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
