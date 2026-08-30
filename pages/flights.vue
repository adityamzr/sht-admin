<script setup lang="ts">
import type { Flight } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const { data, refresh } = await useAdminFetch<{ data: Flight[] }>(
    "/api/admin/flights",
);
const rows = computed(() => data.value?.data ?? []);

const form = reactive({
    id: null as number | null,
    airline: "",
    routeLabel: "CGK → JED",
    origin: "CGK",
    destination: "JED",
    flightType: "Direct",
    baggage: "Bagasi 30 kg",
});
const showForm = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);

function openCreate() {
    Object.assign(form, {
        id: null,
        airline: "",
        routeLabel: "CGK → JED",
        origin: "CGK",
        destination: "JED",
        flightType: "Direct",
        baggage: "Bagasi 30 kg",
    });
    showForm.value = true;
    error.value = null;
}
function openEdit(f: Flight) {
    Object.assign(form, {
        id: f.id,
        airline: f.airline,
        routeLabel: f.routeLabel,
        origin: f.origin,
        destination: f.destination,
        flightType: f.flightType,
        baggage: f.baggage,
    });
    showForm.value = true;
    error.value = null;
}
async function submit() {
    pending.value = true;
    error.value = null;
    try {
        const body = { ...form, isActive: true, sortOrder: 0 };
        if (form.id) await adminPatch(`/api/admin/flights/${form.id}`, body);
        else await adminPost("/api/admin/flights", body);
        showForm.value = false;
        await refresh();
    } catch (err: unknown) {
        error.value =
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menyimpan";
    } finally {
        pending.value = false;
    }
}
async function toggle(f: Flight) {
    await adminPatch(`/api/admin/flights/${f.id}`, {
        isActive: !f.isActive,
    }).catch(() => {});
    await refresh();
}
async function remove(f: Flight) {
    if (!confirm(`Nonaktifkan ${f.airline}?`)) return;
    await adminDelete(`/api/admin/flights/${f.id}`).catch(() => {});
    await refresh();
}
</script>

<template>
    <div>
        <PageHead
            title="Flights"
            subtitle="Opsi penerbangan MVP (CGK → JED) — dikelola admin, bukan live GDS. Harga di modul Pricing."
        >
            <template #actions>
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="openCreate"
                >
                    + Tambah Penerbangan
                </button>
            </template>
        </PageHead>

        <div
            v-if="showForm"
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-6"
        >
            <h3 class="font-heading text-base font-semibold">
                {{ form.id ? "Edit Penerbangan" : "Tambah Penerbangan" }}
            </h3>
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <label class="text-sm font-medium"
                    >Maskapai
                    <input
                        v-model="form.airline"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                        placeholder="Saudia"
                /></label>
                <label class="text-sm font-medium"
                    >Rute (label)
                    <input
                        v-model="form.routeLabel"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                /></label>
                <label class="text-sm font-medium"
                    >Tipe
                    <select
                        v-model="form.flightType"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"
                    >
                        <option>Direct</option>
                        <option>Transit</option>
                    </select>
                </label>
                <label class="text-sm font-medium"
                    >Asal
                    <input
                        v-model="form.origin"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                /></label>
                <label class="text-sm font-medium"
                    >Tujuan
                    <input
                        v-model="form.destination"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                /></label>
                <label class="text-sm font-medium"
                    >Bagasi
                    <input
                        v-model="form.baggage"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                /></label>
            </div>
            <p
                v-if="error"
                class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm"
                role="alert"
            >
                {{ error }}
            </p>
            <div class="mt-4 flex gap-2">
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    :disabled="pending"
                    @click="submit"
                >
                    Simpan
                </button>
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium"
                    @click="showForm = false"
                >
                    Batal
                </button>
            </div>
        </div>

        <div
            class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white"
        >
            <table class="w-full min-w-[680px] text-left text-sm">
                <thead
                    class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60"
                >
                    <tr>
                        <th class="px-5 py-3">Maskapai</th>
                        <th class="px-5 py-3">Rute</th>
                        <th class="px-5 py-3">Tipe</th>
                        <th class="px-5 py-3">Bagasi</th>
                        <th class="px-5 py-3">Status</th>
                        <th class="px-5 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-line">
                    <tr v-for="f in rows" :key="f.id">
                        <td class="px-5 py-3 font-medium">{{ f.airline }}</td>
                        <td class="px-5 py-3 text-neutral-charcoal/60">
                            {{ f.routeLabel }}
                        </td>
                        <td class="px-5 py-3">
                            <span
                                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                                :class="
                                    f.flightType === 'Direct'
                                        ? 'bg-sht-olive/10 text-brand-green'
                                        : 'bg-gold-sand text-neutral-charcoal'
                                "
                                >{{ f.flightType }}</span
                            >
                        </td>
                        <td class="px-5 py-3 text-neutral-charcoal/60">
                            {{ f.baggage }}
                        </td>
                        <td class="px-5 py-3">
                            <button
                                type="button"
                                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                                :class="
                                    f.isActive
                                        ? 'bg-sht-olive/10 text-brand-green'
                                        : 'bg-neutral-warm text-neutral-charcoal/50'
                                "
                                @click="toggle(f)"
                            >
                                {{ f.isActive ? "Aktif" : "Nonaktif" }}
                            </button>
                        </td>
                        <td class="px-5 py-3 text-right">
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5"
                                @click="openEdit(f)"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600"
                                @click="remove(f)"
                            >
                                Nonaktifkan
                            </button>
                        </td>
                    </tr>
                    <tr v-if="rows.length === 0">
                        <td
                            colspan="6"
                            class="px-5 py-8 text-center text-neutral-charcoal/50"
                        >
                            Belum ada data.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
