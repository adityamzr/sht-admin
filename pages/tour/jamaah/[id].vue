<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { visaStatusLabel, siskopatuhStatusLabel, roomTypeLabel, genderLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data } = await useAdminFetch<{ data: any }>(`/api/admin/tour/jamaah/${id}`);
const jamaah = computed(() => data.value?.data ?? null);
</script>
<template>
  <div>
    <PageHead :title="jamaah ? jamaah.fullName : 'Detail Jamaah'" :subtitle="jamaah ? `${jamaah.jamaahCode} · ${jamaah.order?.orderCode || `Order #${jamaah.orderId}`} · ${jamaah.order?.customer?.name || ''}` : ''">
      <template #actions><NuxtLink :to="jamaah ? `/tour/orders/${jamaah.orderId}` : '/tour/orders'" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Ke Order</NuxtLink></template>
    </PageHead>
    <div v-if="jamaah" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <div class="flex flex-wrap gap-2">
        <TourStatusBadge :status="jamaah.visaStatus" type="visa" />
        <TourStatusBadge :status="jamaah.siskopatuhStatus" type="siskopatuh" />
        <span class="rounded-full bg-neutral-warm px-3 py-1 text-xs">{{ roomTypeLabel(jamaah.roomType) }}</span>
      </div>
      <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Kode Jamaah</dt><dd class="mt-1 font-mono font-semibold">{{ jamaah.jamaahCode }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Order / Pelanggan</dt><dd class="mt-1"><NuxtLink :to="`/tour/orders/${jamaah.orderId}`" class="font-medium text-brand-teal hover:underline">{{ jamaah.order?.orderCode || `Order #${jamaah.orderId}` }}</NuxtLink> <span class="text-neutral-charcoal/60">{{ jamaah.order?.customer?.name || "" }}</span></dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Nama Lengkap</dt><dd class="mt-1 font-medium">{{ jamaah.fullName }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Gender</dt><dd class="mt-1">{{ jamaah.gender ? genderLabel(jamaah.gender) : "—" }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Tanggal Lahir</dt><dd class="mt-1">{{ jamaah.birthDate || "—" }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">WhatsApp</dt><dd class="mt-1">{{ jamaah.whatsapp || "—" }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Paspor</dt><dd class="mt-1">{{ jamaah.passportNumber || "—" }} • exp {{ jamaah.passportExpiry || "—" }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Visa</dt><dd class="mt-1">{{ visaStatusLabel(jamaah.visaStatus) }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Siskopatuh</dt><dd class="mt-1">{{ siskopatuhStatusLabel(jamaah.siskopatuhStatus) }}</dd></div>
        <div><dt class="text-xs uppercase text-neutral-charcoal/50">Preferensi Kamar</dt><dd class="mt-1">{{ roomTypeLabel(jamaah.roomType) }}<br/><span class="text-[11px] text-neutral-charcoal/50">Preferensi ini bukan alokasi kamar aktual. Rooming dikelola dari Trip.</span></dd></div>
        <div class="sm:col-span-2"><dt class="text-xs uppercase text-neutral-charcoal/50">Catatan</dt><dd class="mt-1 text-neutral-charcoal/70">{{ jamaah.notes || "—" }}</dd></div>
      </dl>
      <p class="mt-6 text-xs text-neutral-charcoal/50">Jamaah milik Order. Kelola lengkap di <NuxtLink :to="`/tour/orders/${jamaah.orderId}`" class="underline">Order Detail</NuxtLink>.</p>
    </div>
  </div>
</template>
