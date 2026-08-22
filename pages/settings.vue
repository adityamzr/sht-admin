<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>

<template>
  <div>
    <PageHead title="Settings" subtitle="Konfigurasi produksi & keamanan." />

    <div class="mt-6 space-y-4">
      <div class="rounded-2xl border border-neutral-line bg-white p-6">
        <h3 class="font-heading text-base font-semibold">Konfigurasi produksi (M2)</h3>
        <ul class="mt-3 space-y-2 text-sm text-neutral-charcoal/70">
          <li>• <b>DATABASE_URL</b> — wajib; Neon (Singapore) di production, lokal untuk development.</li>
          <li>• <b>NUXT_SESSION_SECRET</b> — wajib ≥ 32 karakter; dipakai untuk seal cookie session admin. Ganti dengan nilai acak produksi di Vercel env.</li>
          <li>• <b>Nomor WhatsApp resmi</b> — dikelola di sisi <b>sht-web</b> (NUXT_PUBLIC_WHATSAPP_NUMBER), dipakai saat flow lead M8.</li>
          <li>• Buat akun admin production: <code class="rounded bg-neutral-warm px-1.5 py-0.5 text-xs">ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create</code> (password tidak di-commit).</li>
        </ul>
      </div>
      <div class="rounded-2xl border border-neutral-line bg-white p-6">
        <h3 class="font-heading text-base font-semibold">Data & keamanan</h3>
        <ul class="mt-3 space-y-2 text-sm text-neutral-charcoal/70">
          <li>• Data internal (supplier cost, markup, catatan) hanya di admin API — API publik (/api/v1) memakai serializer eksplisit.</li>
          <li>• Produk yang sudah direferensikan estimasi: nonaktifkan/arsipkan — tidak dihapus hard.</li>
          <li>• Estimasi = snapshot immutabel (item + kurs tersimpan).</li>
        </ul>
      </div>
    </div>
  </div>
</template>
