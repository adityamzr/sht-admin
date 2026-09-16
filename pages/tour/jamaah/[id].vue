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
    <PageHead :title="jamaah ? jamaah.fullName : 'Jamaah Detail'" :subtitle="jamaah ? `${jamaah.jamaahCode} · Order ${jamaah.order?.orderCode || '#'+jamaah.orderId} · Customer ${jamaah.order?.customer?.name || ''}` : ''">
      <template #actions><NuxtLink to="/tour/jamaah" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>
    <div v-if="jamaah" class="mt-6 rounded-2xl border bg-white p-6">
      <dl class="grid gap-4 sm:grid-cols-2 text-sm">
        <div><dt class="text-xs text-neutral-charcoal/50">Kode</dt><dd class="font-mono font-semibold">{{ jamaah.jamaahCode }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Order / Customer</dt><dd><NuxtLink :to="`/tour/orders/${jamaah.orderId}`" class="text-brand-teal hover:underline font-medium">{{ jamaah.order?.orderCode || `#${jamaah.orderId}` }}</NuxtLink> <span class="text-neutral-charcoal/60">{{ jamaah.order?.customer?.name || "" }}</span></dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Nama</dt><dd class="font-medium">{{ jamaah.fullName }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Gender</dt><dd>{{ jamaah.gender ? genderLabel(jamaah.gender) : "—" }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Birth</dt><dd>{{ jamaah.birthDate || "—" }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Passport</dt><dd>{{ jamaah.passportNumber || "—" }} exp {{ jamaah.passportExpiry || "—" }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Visa</dt><dd>{{ visaStatusLabel(jamaah.visaStatus) }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Siskopatuh</dt><dd>{{ siskopatuhStatusLabel(jamaah.siskopatuhStatus) }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">Room</dt><dd>{{ roomTypeLabel(jamaah.roomType) }}</dd></div>
        <div><dt class="text-xs text-neutral-charcoal/50">WhatsApp</dt><dd>{{ jamaah.whatsapp || "—" }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs text-neutral-charcoal/50">Notes</dt><dd>{{ jamaah.notes || "—" }}</dd></div>
      </dl>
    </div>
  </div>
</template>
