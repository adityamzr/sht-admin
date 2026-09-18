<script setup lang="ts">
import type { TourCustomer } from "~/types";
import { Pencil, Trash2, Eye, MessageCircle } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { customerTypeLabel, customerSourceLabel } = useTourLabels();

const search = ref("");
const customerType = ref("");
const source = ref("");
const page = ref(1);
const pageSize = ref(20);

const query = computed(() => ({
  search: search.value || undefined,
  customerType: customerType.value || undefined,
  source: source.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}));

const { data, pending, error, refresh } = await useAdminFetch<{ data: TourCustomer[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }>(
  "/api/admin/tour/customers",
  { query }
);

const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const CUSTOMER_TYPES = ["B2C_JAMAAH", "B2B_TRAVEL", "INSTITUTION"];
const SOURCES = ["WHATSAPP", "REFERRAL", "INSTAGRAM", "AGENT", "OFFLINE", "OTHER"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  name: "",
  whatsapp: "",
  email: "",
  city: "",
  customerType: "B2C_JAMAAH",
  source: "WHATSAPP",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() {
  Object.assign(form, { id: null, name: "", whatsapp: "", email: "", city: "", customerType: "B2C_JAMAAH", source: "WHATSAPP", notes: "" });
  formError.value = null;
  showForm.value = true;
}
function openEdit(c: TourCustomer) {
  Object.assign(form, {
    id: c.id,
    name: c.name,
    whatsapp: c.whatsapp,
    email: c.email || "",
    city: c.city || "",
    customerType: c.customerType,
    source: c.source,
    notes: c.notes || "",
  });
  formError.value = null;
  showForm.value = true;
}

async function submit() {
  formPending.value = true;
  formError.value = null;
  try {
    const body: any = {
      name: form.name,
      whatsapp: form.whatsapp,
      email: form.email || null,
      city: form.city || null,
      customerType: form.customerType,
      source: form.source,
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/customers/${form.id}`, body);
    else await adminPost("/api/admin/tour/customers", body);
    showForm.value = false;
    await refresh();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || err?.message || "Gagal menyimpan";
  } finally {
    formPending.value = false;
  }
}

async function remove(c: TourCustomer) {
  if (!confirm(`Hapus customer ${c.name} (${c.customerCode})?`)) return;
  await adminDelete(`/api/admin/tour/customers/${c.id}`).catch(() => {});
  await refresh();
}

function onSearch() {
  page.value = 1;
}
</script>

<template>
  <div>
    <PageHead title="Customers" subtitle="Kelola data pelanggan untuk pemesanan umrah dan layanan.">
      <template #actions>
        <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Customer</button>
      </template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari nama / WA / kode..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="onSearch" />
      <select v-model="customerType" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="onSearch">
        <option value="">Semua Tipe</option>
        <option v-for="t in CUSTOMER_TYPES" :key="t" :value="t">{{ customerTypeLabel(t) }}</option>
      </select>
      <select v-model="source" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="onSearch">
        <option value="">Semua Sumber</option>
        <option v-for="s in SOURCES" :key="s" :value="s">{{ customerSourceLabel(s) }}</option>
      </select>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Customer' : 'Tambah Customer'" subtitle="Data pelanggan untuk transaksi" @close="showForm=false">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm font-medium">Nama *<input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Ahmad Fauzi / PT Travel" /></label>
        <label class="text-sm font-medium">WhatsApp *<input v-model="form.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="62812xxxx" /></label>
        <label class="text-sm font-medium">Email<input v-model="form.email" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="opsional" /></label>
        <label class="text-sm font-medium">Kota<input v-model="form.city" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Jakarta" /></label>
        <label class="text-sm font-medium">Tipe Pelanggan<select v-model="form.customerType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="t in CUSTOMER_TYPES" :key="t" :value="t">{{ customerTypeLabel(t) }}</option></select></label>
        <label class="text-sm font-medium">Sumber<select v-model="form.source" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in SOURCES" :key="s" :value="s">{{ customerSourceLabel(s) }}</option></select></label>
        <label class="sm:col-span-2 text-sm font-medium">Catatan<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
      </div>
      <p v-if="formError" class="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="formPending" @click="submit">Simpan</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Nama</th><th class="px-5 py-3">Kontak</th><th class="px-5 py-3">Tipe</th><th class="px-5 py-3">Sumber</th><th class="px-5 py-3">Kota</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="c in rows" :key="c.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ c.customerCode }}</p><p class="font-medium">{{ c.name }}</p><p v-if="c.email" class="text-xs text-neutral-charcoal/50">{{ c.email }}</p></td>
            <td class="px-5 py-3"><a :href="`https://wa.me/${c.whatsapp}`" target="_blank" class="inline-flex items-center gap-1 text-brand-teal hover:underline"><MessageCircle class="h-3.5 w-3.5" />{{ c.whatsapp }}</a></td>
            <td class="px-5 py-3"><TourStatusBadge :status="c.customerType" type="customerType" /></td>
            <td class="px-5 py-3 text-xs">{{ customerSourceLabel(c.source) }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ c.city || "—" }}</td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button type="button" class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(c)"><Pencil class="h-4 w-4" /></button>
                <NuxtLink :to="`/tour/customers/${c.id}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-brand-green" title="Detail"><Eye class="h-4 w-4" /></NuxtLink>
                <button type="button" class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus" @click="remove(c)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0 && !pending"><td colspan="6" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada customer.</td></tr>
          <tr v-if="pending"><td colspan="6" class="px-5 py-10 text-center text-neutral-charcoal/50">Memuat...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
    <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
