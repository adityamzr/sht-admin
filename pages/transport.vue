<script setup lang="ts">
import type { TransportRoute, Vehicle } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const { data: routesData, refresh: refreshRoutes } = await useAdminFetch<{
    data: TransportRoute[];
}>("/api/admin/routes");
const { data: vehiclesData, refresh: refreshVehicles } = await useAdminFetch<{
    data: Vehicle[];
}>("/api/admin/vehicles");

const routes = computed(() => routesData.value?.data ?? []);
const vehicles = computed(() => vehiclesData.value?.data ?? []);

const tab = ref<"vehicles" | "routes">("vehicles");
const error = ref<string | null>(null);

// ── Vehicle form ────────────────────────────────────────────────────────────
const vForm = reactive({
    id: null as number | null,
    name: "",
    capacity: 6,
    luggageLabel: "",
    description: "",
});
const vOpen = ref(false);
function vCreate() {
    Object.assign(vForm, {
        id: null,
        name: "",
        capacity: 6,
        luggageLabel: "",
        description: "",
    });
    vOpen.value = true;
    error.value = null;
}
function vEdit(v: Vehicle) {
    Object.assign(vForm, {
        id: v.id,
        name: v.name,
        capacity: v.capacity,
        luggageLabel: v.luggageLabel,
        description: v.description,
    });
    vOpen.value = true;
    error.value = null;
}
async function vSubmit() {
    error.value = null;
    try {
        const body = {
            name: vForm.name,
            capacity: Number(vForm.capacity),
            luggageLabel: vForm.luggageLabel,
            description: vForm.description,
            image: "/images/transport-van.jpg",
            isActive: true,
            sortOrder: 0,
        };
        if (vForm.id) await adminPatch(`/api/admin/vehicles/${vForm.id}`, body);
        else await adminPost("/api/admin/vehicles", body);
        vOpen.value = false;
        await refreshVehicles();
    } catch (err: unknown) {
        error.value =
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menyimpan";
    }
}
async function vRemove(v: Vehicle) {
    if (!confirm(`Nonaktifkan ${v.name}?`)) return;
    await adminDelete(`/api/admin/vehicles/${v.id}`).catch(() => {});
    await refreshVehicles();
}

// ── Route form ──────────────────────────────────────────────────────────────
const rForm = reactive({
    id: null as number | null,
    name: "",
    pickup: "",
    destination: "",
    description: "",
});
const rOpen = ref(false);
function rCreate() {
    Object.assign(rForm, {
        id: null,
        name: "",
        pickup: "",
        destination: "",
        description: "",
    });
    rOpen.value = true;
    error.value = null;
}
function rEdit(r: TransportRoute) {
    Object.assign(rForm, {
        id: r.id,
        name: r.name,
        pickup: r.pickup,
        destination: r.destination,
        description: r.description,
    });
    rOpen.value = true;
    error.value = null;
}
async function rSubmit() {
    error.value = null;
    try {
        const body = {
            name: rForm.name,
            pickup: rForm.pickup,
            destination: rForm.destination,
            description: rForm.description,
            isActive: true,
            sortOrder: 0,
        };
        if (rForm.id) await adminPatch(`/api/admin/routes/${rForm.id}`, body);
        else await adminPost("/api/admin/routes", body);
        rOpen.value = false;
        await refreshRoutes();
    } catch (err: unknown) {
        error.value =
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menyimpan";
    }
}
async function rRemove(r: TransportRoute) {
    if (!confirm(`Nonaktifkan rute ${r.name}?`)) return;
    await adminDelete(`/api/admin/routes/${r.id}`).catch(() => {});
    await refreshRoutes();
}

// ── Route × Vehicle options ─────────────────────────────────────────────────
const selectedRouteId = ref<number | null>(null);
const attachVehicleId = ref<number | null>(null);
const selectedRoute = computed(
    () => routes.value.find((r) => r.id === selectedRouteId.value) ?? null,
);
async function attachVehicle() {
    if (!selectedRouteId.value || !attachVehicleId.value) return;
    error.value = null;
    try {
        await adminPost(`/api/admin/routes/${selectedRouteId.value}/vehicles`, {
            routeId: selectedRouteId.value,
            vehicleId: attachVehicleId.value,
        });
        attachVehicleId.value = null;
        await refreshRoutes();
    } catch (err: unknown) {
        error.value =
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menambah opsi";
    }
}
async function toggleOption(
    route: TransportRoute,
    optionId: number,
    isActive: boolean,
) {
    await adminPatch(`/api/admin/route-vehicles/${optionId}`, {
        isActive: !isActive,
    }).catch(() => {});
    await refreshRoutes();
}
async function removeOption(optionId: number) {
    if (!confirm("Lepas kendaraan dari rute ini?")) return;
    await adminDelete(`/api/admin/route-vehicles/${optionId}`).catch(() => {});
    await refreshRoutes();
}
</script>

<template>
    <div>
        <PageHead
            title="Transport"
            subtitle="Kendaraan, rute, dan kombinasi rute × kendaraan. Harga per trip di modul Pricing."
        />

        <div class="mt-6 flex gap-2">
            <button
                type="button"
                class="rounded-full px-4 py-2 text-sm font-semibold"
                :class="
                    tab === 'vehicles'
                        ? 'bg-sht-olive text-white'
                        : 'border border-neutral-line bg-white text-neutral-charcoal/70'
                "
                @click="tab = 'vehicles'"
            >
                Kendaraan
            </button>
            <button
                type="button"
                class="rounded-full px-4 py-2 text-sm font-semibold"
                :class="
                    tab === 'routes'
                        ? 'bg-sht-olive text-white'
                        : 'border border-neutral-line bg-white text-neutral-charcoal/70'
                "
                @click="tab = 'routes'"
            >
                Rute & Kombinasi
            </button>
        </div>
        <p
            v-if="error"
            class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm"
            role="alert"
        >
            {{ error }}
        </p>

        <!-- VEHICLES -->
        <template v-if="tab === 'vehicles'">
            <div class="mt-4 flex justify-end">
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="vCreate"
                >
                    + Tambah Kendaraan
                </button>
            </div>
            <div
                v-if="vOpen"
                class="mt-4 rounded-2xl border border-neutral-line bg-white p-6"
            >
                <h3 class="font-heading text-base font-semibold">
                    {{ vForm.id ? "Edit Kendaraan" : "Tambah Kendaraan" }}
                </h3>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <label class="text-sm font-medium"
                        >Nama
                        <input
                            v-model="vForm.name"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                            placeholder="Toyota HiAce"
                    /></label>
                    <label class="text-sm font-medium"
                        >Kapasitas penumpang
                        <input
                            v-model="vForm.capacity"
                            type="number"
                            min="1"
                            max="100"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                    /></label>
                    <label class="text-sm font-medium"
                        >Info bagasi
                        <input
                            v-model="vForm.luggageLabel"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                            placeholder="15 Koper Besar"
                    /></label>
                    <label class="text-sm font-medium"
                        >Deskripsi
                        <input
                            v-model="vForm.description"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                    /></label>
                </div>
                <div class="mt-4 flex gap-2">
                    <button
                        type="button"
                        class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                        @click="vSubmit"
                    >
                        Simpan
                    </button>
                    <button
                        type="button"
                        class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium"
                        @click="vOpen = false"
                    >
                        Batal
                    </button>
                </div>
            </div>
            <div
                class="mt-4 overflow-x-auto rounded-2xl border border-neutral-line bg-white"
            >
                <table class="w-full min-w-[560px] text-left text-sm">
                    <thead
                        class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60"
                    >
                        <tr>
                            <th class="px-5 py-3">Kendaraan</th>
                            <th class="px-5 py-3">Kapasitas</th>
                            <th class="px-5 py-3">Bagasi</th>
                            <th class="px-5 py-3">Status</th>
                            <th class="px-5 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-line">
                        <tr v-for="v in vehicles" :key="v.id">
                            <td class="px-5 py-3 font-medium">{{ v.name }}</td>
                            <td class="px-5 py-3">
                                {{ v.capacity }} penumpang
                            </td>
                            <td class="px-5 py-3 text-neutral-charcoal/60">
                                {{ v.luggageLabel || "—" }}
                            </td>
                            <td class="px-5 py-3">
                                <button
                                    type="button"
                                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                                    :class="
                                        v.isActive
                                            ? 'bg-sht-olive/10 text-brand-green'
                                            : 'bg-neutral-warm text-neutral-charcoal/50'
                                    "
                                    @click="
                                        adminPatch(
                                            `/api/admin/vehicles/${v.id}`,
                                            { isActive: !v.isActive },
                                        ).then(() => refreshVehicles())
                                    "
                                >
                                    {{ v.isActive ? "Aktif" : "Nonaktif" }}
                                </button>
                            </td>
                            <td class="px-5 py-3 text-right">
                                <button
                                    type="button"
                                    class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5"
                                    @click="vEdit(v)"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600"
                                    @click="vRemove(v)"
                                >
                                    Nonaktifkan
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <!-- ROUTES -->
        <template v-else>
            <div class="mt-4 flex justify-end">
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="rCreate"
                >
                    + Tambah Rute
                </button>
            </div>
            <div
                v-if="rOpen"
                class="mt-4 rounded-2xl border border-neutral-line bg-white p-6"
            >
                <h3 class="font-heading text-base font-semibold">
                    {{ rForm.id ? "Edit Rute" : "Tambah Rute" }}
                </h3>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <label class="text-sm font-medium"
                        >Nama rute
                        <input
                            v-model="rForm.name"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                            placeholder="Bandara Jeddah → Makkah"
                    /></label>
                    <label class="text-sm font-medium"
                        >Deskripsi
                        <input
                            v-model="rForm.description"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                    /></label>
                    <label class="text-sm font-medium"
                        >Pickup
                        <input
                            v-model="rForm.pickup"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                            placeholder="Jeddah Airport"
                    /></label>
                    <label class="text-sm font-medium"
                        >Tujuan
                        <input
                            v-model="rForm.destination"
                            class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                            placeholder="Makkah"
                    /></label>
                </div>
                <div class="mt-4 flex gap-2">
                    <button
                        type="button"
                        class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                        @click="rSubmit"
                    >
                        Simpan
                    </button>
                    <button
                        type="button"
                        class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium"
                        @click="rOpen = false"
                    >
                        Batal
                    </button>
                </div>
            </div>
            <div class="mt-4 space-y-4">
                <div
                    v-for="r in routes"
                    :key="r.id"
                    class="rounded-2xl border border-neutral-line bg-white p-5"
                >
                    <div
                        class="flex flex-wrap items-center justify-between gap-3"
                    >
                        <div>
                            <p class="font-heading text-base font-semibold">
                                {{ r.name }}
                            </p>
                            <p class="text-xs text-neutral-charcoal/60">
                                {{ r.pickup }} → {{ r.destination }}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span
                                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                                :class="
                                    r.isActive
                                        ? 'bg-sht-olive/10 text-brand-green'
                                        : 'bg-neutral-warm text-neutral-charcoal/50'
                                "
                                >{{ r.isActive ? "Aktif" : "Nonaktif" }}</span
                            >
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5"
                                @click="rEdit(r)"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600"
                                @click="rRemove(r)"
                            >
                                Nonaktifkan
                            </button>
                        </div>
                    </div>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <span
                            v-for="o in r.vehicleOptions"
                            :key="o.id"
                            class="inline-flex items-center gap-1.5 rounded-full border border-neutral-line bg-neutral-warm px-3 py-1.5 text-xs font-semibold"
                        >
                            {{ o.vehicle?.name ?? "#" + o.vehicleId }}
                            <span
                                :class="
                                    o.isActive
                                        ? 'text-brand-green'
                                        : 'text-neutral-charcoal/40'
                                "
                                >({{ o.isActive ? "aktif" : "nonaktif" }})</span
                            >
                            <button
                                type="button"
                                class="ml-1 font-semibold text-brand-teal"
                                @click="toggleOption(r, o.id, o.isActive)"
                            >
                                {{ o.isActive ? "nonaktifkan" : "aktifkan" }}
                            </button>
                            <button
                                type="button"
                                class="ml-1 font-semibold text-neutral-charcoal/40 hover:text-red-600"
                                @click="removeOption(o.id)"
                            >
                                lepas
                            </button>
                        </span>
                    </div>
                    <div
                        class="mt-3 flex items-center gap-2 border-t border-neutral-line pt-3"
                    >
                        <label
                            class="text-xs font-medium text-neutral-charcoal/60"
                            >Tambah kendaraan untuk rute ini:</label
                        >
                        <select
                            v-model="attachVehicleId"
                            class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm"
                        >
                            <option :value="null" disabled>
                                Pilih kendaraan…
                            </option>
                            <option
                                v-for="v in vehicles.filter(
                                    (x) =>
                                        !r.vehicleOptions.some(
                                            (o) => o.vehicleId === x.id,
                                        ),
                                )"
                                :key="v.id"
                                :value="v.id"
                            >
                                {{ v.name }} ({{ v.capacity }} pax)
                            </option>
                        </select>
                        <button
                            type="button"
                            class="min-h-[40px] rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white"
                            @click="
                                selectedRouteId = r.id;
                                attachVehicle();
                            "
                        >
                            + Tambah
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
