<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

async function onSubmit() {
  error.value = null
  pending.value = true
  try {
    await $fetch('/api/admin/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    const response = await $fetch<{ data?: Array<{ key: string }> }>('/api/admin/workspaces')
    const landing = response.data?.some((workspace) => workspace.key === 'tour') ? '/' : '/media'
    await navigateTo(landing)
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? 'Login gagal. Periksa email & password.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-soft p-5">
    <div class="w-full max-w-sm rounded-2xl border border-neutral-line bg-white p-8 shadow-sm">
      <div class="flex items-center gap-2.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-kabah-gradient text-base font-bold text-gold-soft">S</div>
        <div class="leading-tight">
          <p class="font-heading text-base font-semibold text-brand-green">Sudut Haramain</p>
          <p class="text-[10px] font-medium uppercase tracking-[0.22em] text-gold">Admin Panel</p>
        </div>
      </div>

      <h1 class="mt-7 font-heading text-xl font-semibold">Masuk ke Dashboard</h1>
      <p class="mt-1 text-sm text-neutral-charcoal/60">Area khusus tim internal Sudut Haramain Tour.</p>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label for="email" class="text-sm font-semibold">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 py-2.5 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            placeholder="admin@sudutharamain.id"
          />
        </div>
        <div>
          <label for="password" class="text-sm font-semibold">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 py-2.5 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            placeholder="••••••••"
          />
        </div>
        <p v-if="error" class="rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2.5 text-sm text-neutral-charcoal/80" role="alert">
          {{ error }}
        </p>
        <button
          type="submit"
          :disabled="pending"
          class="min-h-[44px] w-full rounded-xl bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-[#0b3230] disabled:opacity-50"
        >
          {{ pending ? 'Memproses…' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
