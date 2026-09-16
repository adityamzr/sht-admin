<script setup lang="ts">
import type { TourCustomer } from "~/types";
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
    <PageHead
      title="Customers"
      subtitle="Database pelanggan — B2C Jamaah, B2B Travel, Institusi. Kode unik per workspace, searchable, filter type/source."
    >
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
        <option value="">Semua Source</option>
        <option v-for="s in SOURCES" :key="s" :value="s">{{ customerSourceLabel(s) }}</option>
      </select>
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? "Edit Customer" : "Tambah Customer" }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Nama
          <input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="Nama lengkap / perusahaan" />
        </label>
        <label class="text-sm font-medium">WhatsApp
          <input v-model="form.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="62812xxxx" />
        </label>
        <label class="text-sm font-medium">Email
          <input v-model="form.email" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="opsional" />
        </label>
        <label class="text-sm font-medium">Kota
          <input v-model="form.city" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="Jakarta" />
        </label>
        <label class="text-sm font-medium">Tipe
          <select v-model="form.customerType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option v-for="t in CUSTOMER_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label class="text-sm font-medium">Source
          <select v-model="form.source" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option v-for="s in SOURCES" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="sm:col-span-2 text-sm font-medium">Notes
          <textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" />
        </label>
      </div>
      <p v-if="formError" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm" role="alert">{{ formError }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="formPending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm = false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60">
          <tr>
            <th class="px-5 py-3">Kode</th>
            <th class="px-5 py-3">Nama</th>
            <th class="px-5 py-3">WhatsApp</th>
            <th class="px-5 py-3">Tipe</th>
            <th class="px-5 py-3">Source</th>
            <th class="px-5 py-3">Kota</th>
            <th class="px-5 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-line">
          <tr v-for="c in rows" :key="c.id">
            <td class="px-5 py-3 font-mono text-xs font-semibold">{{ c.customerCode }}</td>
            <td class="px-5 py-3">
              <p class="font-medium">{{ c.name }}</p>
              <p v-if="c.email" class="text-xs text-neutral-charcoal/50">{{ c.email }}</p>
            </td>
            <td class="px-5 py-3">{{ c.whatsapp }}</td>
            <td class="px-5 py-3"><span class="rounded-full bg-neutral-warm px-2.5 py-1 text-xs font-semibold">{{ customerTypeLabel(c.customerType) }}</span></td>
            <td class="px-5 py-3 text-xs">{{ customerSourceLabel(c.source) }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ c.city || "—" }}</td>
            <td class="px-5 py-3 text-right">
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5" @click="openEdit(c)">Edit</button>
              <NuxtLink :to="`/tour/customers/${c.id}`" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/60 hover:text-brand-green">Detail</NuxtLink>
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(c)">Hapus</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0 && !pending">
            <td colspan="7" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada customer. <button class="text-brand-teal underline" @click="openCreate">Tambah pertama</button></td>
          </tr>
          <tr v-if="pending">
            <td colspan="7" class="px-5 py-10 text-center text-neutral-charcoal/50">Memuat...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4">
      <AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n) => { page = n; }" />
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
