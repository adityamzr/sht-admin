<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const modules = [
  { label: 'Artikel', description: 'Kelola artikel dan catatan editorial.', status: 'Buka', to: '/media/articles' },
  { label: 'Visual Haramain', description: 'Kelola master gallery dan visual kota.', status: 'Segera Hadir' },
  { label: 'Lokasi', description: 'Kelola titik lokasi dan informasi kota.', status: 'Segera Hadir' },
  { label: 'Kontribusi', description: 'Terima dan tindak lanjuti masukan dari pembaca.', status: 'Buka', to: '/media/contributions' },
  { label: 'Feedback', description: 'Pantau insight feedback editorial.', status: 'Segera Hadir' },
]
</script>

<template>
  <div>
    <PageHead title="Sudut Haramain Media" subtitle="Kelola konten sudutharamain.id dari workspace ini."><template #actions><span class="rounded-full border border-gold-soft bg-gold-sand/50 px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/70">MEDIA</span></template></PageHead>
    <section class="mt-8 rounded-2xl border border-neutral-line bg-white p-6">
      <h2 class="font-heading text-lg font-semibold text-neutral-charcoal">Modul Media</h2>
      <p class="mt-1 text-sm text-neutral-charcoal/60">Artikel sudah aktif sebagai modul pertama. Modul lain akan ditambahkan pada milestone berikutnya.</p>
      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="module in modules" :key="module.label" class="rounded-xl border border-neutral-line p-4">
          <div class="flex items-start justify-between gap-3"><h3 class="font-heading font-semibold text-neutral-charcoal">{{ module.label }}</h3><NuxtLink v-if="module.to" :to="module.to" class="shrink-0 rounded-full bg-brand-green px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">{{ module.status }}</NuxtLink><span v-else class="shrink-0 rounded-full border border-gold-soft bg-gold-sand/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-charcoal/60">{{ module.status }}</span></div>
          <p class="mt-2 text-sm leading-relaxed text-neutral-charcoal/60">{{ module.description }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
