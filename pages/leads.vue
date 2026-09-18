<script setup lang="ts">
import type { Lead } from "~/types";
import { MessageCircle, Pencil, UserPlus, Trash2, ExternalLink } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const { data, refresh } = await useAdminFetch<{ data: any[] }>("/api/admin/leads");
const rows = computed(() => (data.value as any)?.data ?? []);

// Services for interest
const { data: servicesData } = await useAdminFetch<{ data: any[] }>("/api/admin/services");
const services = computed(() => (servicesData.value as any)?.data ?? []);

// Customers for dedup check
const { data: customersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/customers", { query: { pageSize: 100 } });
const allCustomers = computed(() => (customersData.value as any)?.data ?? []);

const STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "WON", "LOST"];
const SOURCES = ["WhatsApp","Instagram","Referral","Website","Agent","Offline","Other"];

const showForm = ref(false);
const editing = ref<any>(null);
const form = reactive({
  name: "",
  whatsapp: "",
  email: "",
  source: "WhatsApp",
  paxEstimate: null as number | null,
  serviceId: null as number | null,
  notes: "",
  status: "NEW",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() {
  editing.value = null;
  Object.assign(form, { name: "", whatsapp: "", email: "", source: "WhatsApp", paxEstimate: null, serviceId: null, notes: "", status: "NEW" });
  showForm.value = true;
}
function openEdit(lead: any) {
  editing.value = lead;
  Object.assign(form, {
    name: lead.name,
    whatsapp: lead.whatsapp,
    email: lead.email || "",
    source: lead.source || "WhatsApp",
    paxEstimate: lead.paxEstimate || null,
    serviceId: lead.serviceId || null,
    notes: lead.notes || "",
    status: lead.status,
  });
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
      source: form.source,
      paxEstimate: form.paxEstimate ? Number(form.paxEstimate) : null,
      serviceId: form.serviceId ? Number(form.serviceId) : null,
      notes: form.notes || null,
      status: form.status,
    };
    if (editing.value) {
      await adminPatch(`/api/admin/leads/${editing.value.id}`, body);
    } else {
      // For create, API expects without status (defaults NEW), but we send source etc
      const createBody: any = {
        name: body.name,
        whatsapp: body.whatsapp,
        email: body.email,
        source: body.source,
        paxEstimate: body.paxEstimate,
        serviceId: body.serviceId,
        notes: body.notes,
      };
      await adminPost("/api/admin/leads", createBody);
    }
    showForm.value = false;
    await refresh();
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || "Gagal menyimpan lead";
  } finally { formPending.value = false; }
}

// Conversion
const showConvert = ref(false);
const convertLead = ref<any>(null);
const convertForm = reactive({
  useExistingCustomer: false,
  existingCustomerId: "" as any,
  customerName: "",
  customerWhatsapp: "",
  customerEmail: "",
  customerSource: "",
  customerNotes: "",
  orderPax: 1,
  orderPackage: "",
  orderType: "UMRAH_PACKAGE",
  orderPrice: 0,
});
const convertError = ref<string | null>(null);
const convertPending = ref(false);

const matchingCustomers = computed(() => {
  if (!convertLead.value) return [];
  const wa = convertLead.value.whatsapp;
  return allCustomers.value.filter((c: any) => c.whatsapp === wa);
});

function openConvert(lead: any) {
  convertLead.value = lead;
  const match = allCustomers.value.find((c: any) => c.whatsapp === lead.whatsapp);
  Object.assign(convertForm, {
    useExistingCustomer: !!match,
    existingCustomerId: match?.id || "",
    customerName: lead.name,
    customerWhatsapp: lead.whatsapp,
    customerEmail: lead.email || "",
    customerSource: lead.source || "WhatsApp",
    customerNotes: lead.notes || "",
    orderPax: lead.paxEstimate || 1,
    orderPackage: lead.serviceName || "",
    orderType: "UMRAH_PACKAGE",
    orderPrice: 0,
  });
  showConvert.value = true;
}

async function doConvert() {
  convertPending.value = true;
  convertError.value = null;
  try {
    let customerId: number;
    if (convertForm.useExistingCustomer && convertForm.existingCustomerId) {
      customerId = Number(convertForm.existingCustomerId);
    } else {
      // Create customer from lead
      const custBody: any = {
        name: convertForm.customerName,
        whatsapp: convertForm.customerWhatsapp,
        email: convertForm.customerEmail || null,
        source: convertForm.customerSource?.toUpperCase() || 'WHATSAPP',
        customerType: 'B2C_JAMAAH',
        notes: `Dari Lead #${convertLead.value.id} · ${convertForm.customerNotes || ''}`.slice(0,2000),
      };
      // Normalize source to enum
      const sourceMap: Record<string,string> = { WHATSAPP:'WHATSAPP', INSTAGRAM:'INSTAGRAM', REFERRAL:'REFERRAL', WEBSITE:'OTHER', AGENT:'AGENT', OFFLINE:'OFFLINE', OTHER:'OTHER' };
      custBody.source = sourceMap[custBody.source] || 'OTHER';
      const custRes: any = await adminPost("/api/admin/tour/customers", custBody);
      customerId = custRes.data.id;
    }

    // Create order from lead
    const orderBody: any = {
      orderDate: new Date().toISOString().slice(0,10),
      customerId,
      leadId: convertLead.value.id,
      orderType: convertForm.orderType,
      packageName: convertForm.orderPackage || null,
      serviceSummary: convertLead.value.serviceName || convertLead.value.notes || '',
      paxCount: Number(convertForm.orderPax),
      status: 'DRAFT',
      sellingPriceIdr: Number(convertForm.orderPrice),
      notes: `Konversi dari Lead #${convertLead.value.id}`,
    };
    await adminPost("/api/admin/tour/orders", orderBody);

    // Mark lead WON
    await adminPatch(`/api/admin/leads/${convertLead.value.id}`, { status: 'WON' });

    showConvert.value = false;
    await refresh();
  } catch (e: any) {
    convertError.value = e?.data?.statusMessage || "Gagal konversi";
  } finally { convertPending.value = false; }
}

function waLink(lead: any) {
  return `https://wa.me/${lead.whatsapp}`;
}
</script>

<template>
  <div>
    <PageHead title="Leads" subtitle="Kelola calon jamaah dari berbagai kanal. Buat manual, hubungi via WhatsApp, ubah status, dan konversi menjadi Customer & Order saat siap.">
      <template #actions>
        <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Add Lead</button>
      </template>
    </PageHead>

    <div class="mt-6 space-y-3">
      <div v-for="lead in rows" :key="lead.id" class="rounded-2xl border border-neutral-line bg-white p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-heading text-base font-semibold">{{ lead.name }}</p>
              <TourStatusBadge :status="lead.status" type="lead" />
              <span class="rounded-full border border-neutral-line px-2.5 py-1 text-xs font-medium text-neutral-charcoal/60">{{ lead.source || '—' }} · {{ lead.origin === 'estimation' ? 'Estimasi' : 'Layanan' }}</span>
              <span v-if="lead.paxEstimate" class="rounded-full bg-neutral-warm px-2.5 py-1 text-xs">{{ lead.paxEstimate }} pax</span>
            </div>
            <p class="mt-1 text-sm text-neutral-charcoal/70">
              <a :href="waLink(lead)" target="_blank" class="inline-flex items-center gap-1 font-medium text-brand-teal hover:underline"><MessageCircle class="h-4 w-4" /> +{{ lead.whatsapp }}</a>
              <span v-if="lead.email" class="text-neutral-charcoal/50"> · {{ lead.email }}</span>
            </p>
            <p v-if="lead.estimationNumber" class="mt-1 text-sm"><NuxtLink to="/estimations" class="font-semibold text-brand-green hover:underline">{{ lead.estimationNumber }}</NuxtLink></p>
            <p v-else-if="lead.serviceName" class="mt-1 text-sm text-neutral-charcoal/60">Minat: {{ lead.serviceName }}</p>
            <p v-if="lead.notes" class="mt-1.5 text-sm text-neutral-charcoal/60">📝 {{ lead.notes }}</p>
          </div>
          <div class="flex items-center gap-1">
            <a :href="waLink(lead)" target="_blank" class="rounded-xl p-2.5 text-neutral-charcoal/60 hover:bg-sht-olive/5 hover:text-brand-teal" title="Hubungi WhatsApp"><MessageCircle class="h-4 w-4" /></a>
            <button type="button" class="rounded-xl p-2.5 text-neutral-charcoal/60 hover:bg-neutral-warm hover:text-neutral-charcoal" title="Edit Lead" @click="openEdit(lead)"><Pencil class="h-4 w-4" /></button>
            <button type="button" class="rounded-xl bg-sht-olive/10 p-2.5 text-brand-green hover:bg-sht-olive/15" title="Konversi ke Customer/Order" @click="openConvert(lead)"><UserPlus class="h-4 w-4" /></button>
            <NuxtLink v-if="lead.estimationId" to="/estimations" class="rounded-xl p-2.5 text-neutral-charcoal/40 hover:bg-neutral-warm" title="Lihat Estimasi"><ExternalLink class="h-4 w-4" /></NuxtLink>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-line pt-3">
          <span class="text-xs text-neutral-charcoal/50">Status:</span>
          <select :value="lead.status" class="min-h-[36px] rounded-xl border border-neutral-line px-3 text-xs" @change="async (e) => { await adminPatch(`/api/admin/leads/${lead.id}`, { status: (e.target as HTMLSelectElement).value }); await refresh(); }">
            <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <span class="ml-auto text-xs text-neutral-charcoal/40">Diterima {{ new Date(lead.createdAt).toLocaleString('id-ID') }}</span>
        </div>
      </div>
      <p v-if="rows.length===0" class="rounded-2xl border border-neutral-line bg-white p-10 text-center text-neutral-charcoal/50">Belum ada lead. Buat manual via + Add Lead atau tunggu dari website.</p>
    </div>

    <!-- Add/Edit Lead Modal -->
    <TourModal :open="showForm" :title="editing ? 'Edit Lead' : 'Tambah Lead Manual'" subtitle="Lead bisa dari WhatsApp, Instagram, Referral, Website, Agent, Offline, dll. Status awal NEW." @close="showForm=false">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm font-medium">Nama *<input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Ahmad Fauzi" /></label>
        <label class="text-sm font-medium">WhatsApp *<input v-model="form.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="62812345678" /></label>
        <label class="text-sm font-medium">Email<input v-model="form.email" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="opsional" /></label>
        <label class="text-sm font-medium">Sumber *
          <select v-model="form.source" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
            <option v-for="s in SOURCES" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="text-sm font-medium">Estimasi Pax<input v-model.number="form.paxEstimate" type="number" min="1" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="misal 4" /></label>
        <label class="text-sm font-medium">Minat Layanan
          <select v-model="form.serviceId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
            <option :value="null">Tanpa layanan spesifik</option>
            <option v-for="svc in services" :key="svc.id" :value="svc.id">{{ svc.name }}</option>
          </select>
        </label>
        <label class="sm:col-span-2 text-sm font-medium">Catatan<textarea v-model="form.notes" rows="3" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" placeholder="Kebutuhan khusus, tanggal preferensi, dll" /></label>
        <label v-if="editing" class="text-sm font-medium">Status
          <select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
            <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
      </div>
      <p v-if="formError" class="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">{{ editing ? 'Simpan' : 'Buat Lead' }}</button>
        </div>
      </template>
    </TourModal>

    <!-- Convert Lead Modal -->
    <TourModal :open="showConvert" title="Konversi Lead ke Customer & Order" :subtitle="convertLead ? `Lead ${convertLead.name} · ${convertLead.whatsapp}` : ''" max-width="max-w-3xl" @close="showConvert=false">
      <div v-if="convertLead" class="space-y-6">
        <div v-if="matchingCustomers.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p class="font-semibold text-amber-800">⚠️ Customer dengan WhatsApp sama sudah ada:</p>
          <ul class="mt-2 space-y-1">
            <li v-for="c in matchingCustomers" :key="c.id" class="flex items-center justify-between"><span class="font-mono text-xs">{{ c.customerCode }} · {{ c.name }}</span><span class="text-xs text-neutral-charcoal/60">{{ c.city || '' }}</span></li>
          </ul>
          <p class="mt-2 text-xs text-amber-700">Anda bisa pakai customer yang sudah ada atau buat baru. Hindari duplikasi jika orang sama.</p>
        </div>

        <div>
          <h4 class="text-sm font-semibold">Customer</h4>
          <div class="mt-3 flex gap-2">
            <label class="flex items-center gap-2 text-sm"><input type="radio" :value="false" v-model="convertForm.useExistingCustomer" /> Buat baru</label>
            <label class="flex items-center gap-2 text-sm"><input type="radio" :value="true" v-model="convertForm.useExistingCustomer" :disabled="!matchingCustomers.length" /> Pakai yang ada</label>
          </div>
          <div v-if="convertForm.useExistingCustomer" class="mt-3">
            <select v-model="convertForm.existingCustomerId" class="min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih Customer...</option>
              <option v-for="c in matchingCustomers" :key="c.id" :value="c.id">{{ c.customerCode }} · {{ c.name }} · {{ c.whatsapp }}</option>
            </select>
          </div>
          <div v-else class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm">Nama<input v-model="convertForm.customerName" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" /></label>
            <label class="text-sm">WhatsApp<input v-model="convertForm.customerWhatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" /></label>
            <label class="text-sm">Email<input v-model="convertForm.customerEmail" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" /></label>
            <label class="text-sm">Sumber<input v-model="convertForm.customerSource" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" /></label>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-semibold">Order Awal</h4>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Prefill dari Lead, bisa diedit. Order manual tanpa Lead juga tetap didukung di halaman Orders.</p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm">Pax<input v-model.number="convertForm.orderPax" type="number" min="1" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" /></label>
            <label class="text-sm">Paket<input v-model="convertForm.orderPackage" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm" placeholder="Umrah 12D / Private" /></label>
            <label class="text-sm">Tipe<select v-model="convertForm.orderType" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option>UMRAH_PACKAGE</option><option>CUSTOM_PRIVATE</option><option>LAND_ARRANGEMENT</option><option>SERVICE_ONLY</option></select></label>
            <label class="text-sm">Harga IDR<TourMoneyInput v-model="convertForm.orderPrice" currency="IDR" placeholder="0" /></label>
          </div>
        </div>

        <p v-if="convertError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ convertError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showConvert=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="convertPending" @click="doConvert">Konversi → Customer & Order</button>
        </div>
      </template>
    </TourModal>
  </div>
</template>
