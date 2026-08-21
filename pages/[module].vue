<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()

const modules: Record<string, { title: string; description: string; milestone: string }> = {
  leads: { title: 'Leads', description: 'Calon jamaah dari estimator — pipeline konsultasi.', milestone: "M6'" },
  estimations: { title: 'Estimations', description: 'Riwayat estimasi tersimpan beserta snapshot harga.', milestone: "M6'" },
  hotels: { title: 'Hotels', description: 'Katalog hotel Makkah & Madinah beserta tipe kamar.', milestone: "M2'" },
  flights: { title: 'Flights', description: 'Opsi penerbangan yang dikelola admin (bukan live GDS).', milestone: "M2'" },
  transport: { title: 'Transport', description: 'Rute & kendaraan transportasi darat.', milestone: "M2'" },
  services: { title: 'Services', description: 'Layanan tambahan: muthowwif, perlengkapan, handling.', milestone: "M2'" },
  pricing: { title: 'Pricing', description: 'Supplier cost, markup, dan selling price per produk & periode.', milestone: "M3'" },
  'exchange-rates': { title: 'Exchange Rates', description: 'Kurs mata uang — di-snapshot ke setiap estimasi.', milestone: "M4'" },
  'departure-cities': { title: 'Departure Cities', description: 'Kota keberangkatan & fee per jamaah.', milestone: "M2'" },
  settings: { title: 'Settings', description: 'Preferensi panel & nomor WhatsApp resmi.', milestone: "M7'" },
}

const name = computed(() => String(route.params.module))
const mod = computed(() => modules[name.value])

if (!mod.value) {
  throw createError({ statusCode: 404, statusMessage: 'Modul tidak ditemukan' })
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-heading text-2xl font-semibold">{{ mod!.title }}</h1>
        <p class="mt-1 text-sm text-neutral-charcoal/60">{{ mod!.description }}</p>
      </div>
      <button
        type="button"
        disabled
        class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white opacity-50"
        title="Aktif setelah schema database siap"
      >
        + Tambah
      </button>
    </div>

    <div class="mt-6 rounded-2xl border border-dashed border-neutral-line bg-white p-10 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky/40 text-brand-green">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M4 7h16M9 11h6"/></svg>
      </div>
      <p class="mt-4 font-heading text-base font-semibold">Belum ada data</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-neutral-charcoal/60">
        Modul ini aktif pada milestone {{ mod!.milestone }} — schema database & CRUD sedang disiapkan.
      </p>
    </div>
  </div>
</template>
