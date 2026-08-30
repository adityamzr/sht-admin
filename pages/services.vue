<script setup lang="ts">
import type { Service } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const { data, refresh } = await useAdminFetch<{ data: Service[] }>(
    "/api/admin/services",
);
const rows = computed(() => data.value?.data ?? []);

const form = reactive({
    id: null as number | null,
    code: "",
    name: "",
    description: "",
    category: "additional",
    pricingUnit: "pax",
    inTripBuilder: true,
    standalone: true,
});
const showForm = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);

const unitLabel: Record<string, string> = {
    pax: "per orang",
    room_night: "per kamar/malam",
    vehicle_trip: "per trip",
    group_session: "per sesi",
};
const categoryLabel: Record<string, string> = {
    core_journey: "Core Journey",
    assisted: "Assisted",
    additional: "Additional",
};

function openCreate() {
    Object.assign(form, {
        id: null,
        code: "",
        name: "",
        description: "",
        category: "additional",
        pricingUnit: "pax",
        inTripBuilder: true,
        standalone: true,
    });
    showForm.value = true;
    error.value = null;
}
function openEdit(s: Service) {
    Object.assign(form, {
        id: s.id,
        code: s.code ?? "",
        name: s.name,
        description: s.description,
        category: s.category,
        pricingUnit: s.pricingUnit,
        inTripBuilder: s.inTripBuilder,
        standalone: s.standalone,
    });
    showForm.value = true;
    error.value = null;
}
async function submit() {
    pending.value = true;
    error.value = null;
    try {
        const body = {
            code: form.code || null,
            name: form.name,
            description: form.description,
            category: form.category,
            pricingUnit: form.pricingUnit,
            inTripBuilder: form.inTripBuilder,
            standalone: form.standalone,
            image: "",
            isActive: true,
            sortOrder: 0,
        };
        if (form.id) await adminPatch(`/api/admin/services/${form.id}`, body);
        else await adminPost("/api/admin/services", body);
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
async function toggle(s: Service) {
    await adminPatch(`/api/admin/services/${s.id}`, {
        isActive: !s.isActive,
    }).catch(() => {});
    await refresh();
}
async function remove(s: Service) {
    if (!confirm(`Nonaktifkan ${s.name}?`)) return;
    await adminDelete(`/api/admin/services/${s.id}`).catch(() => {});
    await refresh();
}
</script>

<template>
    <div>
        <PageHead
            title="Services"
            subtitle="Layanan umum — visa dimodelkan sebagai service (unit harga di kolom Pricing Unit)."
        >
            <template #actions>
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="openCreate"
                >
                    + Tambah Layanan
                </button>
            </template>
        </PageHead>

        <div
            v-if="showForm"
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-6"
        >
            <h3 class="font-heading text-base font-semibold">
                {{ form.id ? "Edit Layanan" : "Tambah Layanan" }}
            </h3>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <label class="text-sm font-medium"
                    >Nama
                    <input
                        v-model="form.name"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                        placeholder="Visa Umroh"
                /></label>
                <label class="text-sm font-medium"
                    >Kode (slug, opsional)
                    <input
                        v-model="form.code"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                        placeholder="visa"
                /></label>
                <label class="sm:col-span-2 text-sm font-medium"
                    >Deskripsi
                    <textarea
                        v-model="form.description"
                        rows="2"
                        class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2"
                    />
                </label>
                <label class="text-sm font-medium"
                    >Kategori
                    <select
                        v-model="form.category"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"
                    >
                        <option value="core_journey">Core Journey</option>
                        <option value="assisted">Assisted</option>
                        <option value="additional">Additional</option>
                    </select>
                </label>
                <label class="text-sm font-medium"
                    >Unit harga
                    <select
                        v-model="form.pricingUnit"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"
                    >
                        <option value="pax">pax (per orang)</option>
                        <option value="group_session">
                            group_session (per sesi)
                        </option>
                        <option value="room_night">
                            room_night (per kamar/malam)
                        </option>
                        <option value="vehicle_trip">
                            vehicle_trip (per trip)
                        </option>
                    </select>
                </label>
                <label class="flex items-center gap-2 text-sm font-medium"
                    ><input
                        v-model="form.inTripBuilder"
                        type="checkbox"
                        class="h-4 w-4 accent-brand-green"
                    />
                    Tersedia di Trip Builder</label
                >
                <label class="flex items-center gap-2 text-sm font-medium"
                    ><input
                        v-model="form.standalone"
                        type="checkbox"
                        class="h-4 w-4 accent-brand-green"
                    />
                    Tersedia standalone</label
                >
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
            <table class="w-full min-w-[760px] text-left text-sm">
                <thead
                    class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60"
                >
                    <tr>
                        <th class="px-5 py-3">Layanan</th>
                        <th class="px-5 py-3">Kategori</th>
                        <th class="px-5 py-3">Unit Harga</th>
                        <th class="px-5 py-3">Trip Builder</th>
                        <th class="px-5 py-3">Standalone</th>
                        <th class="px-5 py-3">Status</th>
                        <th class="px-5 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-line">
                    <tr v-for="s in rows" :key="s.id">
                        <td class="px-5 py-3">
                            <p class="font-medium">{{ s.name }}</p>
                            <p class="text-xs text-neutral-charcoal/50">
                                {{ s.code }}
                            </p>
                        </td>
                        <td class="px-5 py-3 text-neutral-charcoal/60">
                            {{ categoryLabel[s.category] ?? s.category }}
                        </td>
                        <td class="px-5 py-3 text-neutral-charcoal/60">
                            {{ s.pricingUnit }} ·
                            {{ unitLabel[s.pricingUnit] ?? "" }}
                        </td>
                        <td class="px-5 py-3">
                            {{ s.inTripBuilder ? "✓" : "—" }}
                        </td>
                        <td class="px-5 py-3">
                            {{ s.standalone ? "✓" : "—" }}
                        </td>
                        <td class="px-5 py-3">
                            <button
                                type="button"
                                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                                :class="
                                    s.isActive
                                        ? 'bg-sht-olive/10 text-brand-green'
                                        : 'bg-neutral-warm text-neutral-charcoal/50'
                                "
                                @click="toggle(s)"
                            >
                                {{ s.isActive ? "Aktif" : "Nonaktif" }}
                            </button>
                        </td>
                        <td class="px-5 py-3 text-right">
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5"
                                @click="openEdit(s)"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600"
                                @click="remove(s)"
                            >
                                Nonaktifkan
                            </button>
                        </td>
                    </tr>
                    <tr v-if="rows.length === 0">
                        <td
                            colspan="7"
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
