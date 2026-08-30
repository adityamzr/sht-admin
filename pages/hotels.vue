<script setup lang="ts">
import type { Hotel, RoomType } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const { data, refresh } = await useAdminFetch<{ data: Hotel[] }>(
    "/api/admin/hotels",
);
const hotels = computed(() => data.value?.data ?? []);

const form = reactive({
    id: null as number | null,
    name: "",
    city: "Makkah",
    starRating: 4,
    distanceLabel: "",
    description: "",
    coverImage: "",
});
const showForm = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);

const selectedHotelId = ref<number | null>(null);
const roomForm = reactive({ name: "", capacity: 4 });
const roomError = ref<string | null>(null);

const selectedHotel = computed(
    () => hotels.value.find((h) => h.id === selectedHotelId.value) ?? null,
);

function openCreate() {
    Object.assign(form, {
        id: null,
        name: "",
        city: "Makkah",
        starRating: 4,
        distanceLabel: "",
        description: "",
        coverImage: "",
    });
    showForm.value = true;
    error.value = null;
}
function openEdit(h: Hotel) {
    Object.assign(form, {
        id: h.id,
        name: h.name,
        city: h.city,
        starRating: h.starRating,
        distanceLabel: h.distanceLabel,
        description: h.description,
        coverImage: h.coverImage,
    });
    showForm.value = true;
    error.value = null;
}
async function submit() {
    pending.value = true;
    error.value = null;
    try {
        const body = {
            name: form.name,
            city: form.city,
            starRating: Number(form.starRating),
            distanceLabel: form.distanceLabel,
            description: form.description,
            coverImage: form.coverImage,
            gallery: form.coverImage ? [form.coverImage] : [],
            isActive: true,
            sortOrder: 0,
        };
        if (form.id) await adminPatch(`/api/admin/hotels/${form.id}`, body);
        else await adminPost("/api/admin/hotels", body);
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
async function toggle(h: Hotel) {
    await adminPatch(`/api/admin/hotels/${h.id}`, {
        isActive: !h.isActive,
    }).catch(() => {});
    await refresh();
}
async function remove(h: Hotel) {
    if (!confirm(`Nonaktifkan ${h.name}?`)) return;
    await adminDelete(`/api/admin/hotels/${h.id}`).catch(() => {});
    await refresh();
}
async function addRoom() {
    if (!selectedHotelId.value) return;
    roomError.value = null;
    try {
        await adminPost(
            `/api/admin/hotels/${selectedHotelId.value}/room-types`,
            {
                name: roomForm.name,
                capacity: Number(roomForm.capacity),
                isActive: true,
                sortOrder: 0,
            },
        );
        roomForm.name = "";
        roomForm.capacity = 4;
        await refresh();
    } catch (err: unknown) {
        roomError.value =
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menambah tipe kamar";
    }
}
async function removeRoom(rt: RoomType) {
    if (!confirm(`Nonaktifkan tipe kamar ${rt.name}?`)) return;
    await adminDelete(`/api/admin/room-types/${rt.id}`).catch(() => {});
    await refresh();
}
</script>

<template>
    <div>
        <PageHead
            title="Hotels"
            subtitle="Katalog hotel Makkah & Madinah + tipe kamar (harga dikelola di modul Pricing)."
        >
            <template #actions>
                <button
                    type="button"
                    class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="openCreate"
                >
                    + Tambah Hotel
                </button>
            </template>
        </PageHead>

        <div
            v-if="showForm"
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-6"
        >
            <h3 class="font-heading text-base font-semibold">
                {{ form.id ? "Edit Hotel" : "Tambah Hotel" }}
            </h3>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <label class="text-sm font-medium"
                    >Nama
                    <input
                        v-model="form.name"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                        placeholder="Swissôtel Makkah"
                /></label>
                <label class="text-sm font-medium"
                    >Kota
                    <select
                        v-model="form.city"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"
                    >
                        <option>Makkah</option>
                        <option>Madinah</option>
                    </select>
                </label>
                <label class="text-sm font-medium"
                    >Bintang
                    <select
                        v-model="form.starRating"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"
                    >
                        <option v-for="n in 5" :key="n" :value="n">
                            {{ n }}
                        </option>
                    </select>
                </label>
                <label class="text-sm font-medium"
                    >Jarak/lokasi
                    <input
                        v-model="form.distanceLabel"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                        placeholder="±250 m dari Masjidil Haram"
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
                    >Gambar cover (path)
                    <input
                        v-model="form.coverImage"
                        class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4"
                        placeholder="/images/hotel-x.jpg"
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
            <table class="w-full min-w-[720px] text-left text-sm">
                <thead
                    class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60"
                >
                    <tr>
                        <th class="px-5 py-3">Hotel</th>
                        <th class="px-5 py-3">Kota</th>
                        <th class="px-5 py-3">Jarak</th>
                        <th class="px-5 py-3">Kamar</th>
                        <th class="px-5 py-3">Status</th>
                        <th class="px-5 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-line">
                    <tr
                        v-for="h in hotels"
                        :key="h.id"
                        :class="
                            selectedHotelId === h.id ? 'bg-brand-sky/20' : ''
                        "
                    >
                        <td class="px-5 py-3">
                            <p class="font-medium">{{ h.name }}</p>
                            <p class="text-xs text-neutral-charcoal/50">
                                {{ "★".repeat(h.starRating) }}
                            </p>
                        </td>
                        <td class="px-5 py-3">{{ h.city }}</td>
                        <td class="px-5 py-3 text-neutral-charcoal/60">
                            {{ h.distanceLabel || "—" }}
                        </td>
                        <td class="px-5 py-3">
                            <button
                                type="button"
                                class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5"
                                @click="
                                    selectedHotelId =
                                        selectedHotelId === h.id ? null : h.id
                                "
                            >
                                {{ h.roomTypes.length }} tipe ▾
                            </button>
                        </td>
                        <td class="px-5 py-3">
                            <button
                                type="button"
                                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                                :class="
                                    h.isActive
                                        ? 'bg-sht-olive/10 text-brand-green'
                                        : 'bg-neutral-warm text-neutral-charcoal/50'
                                "
                                @click="toggle(h)"
                            >
                                {{ h.isActive ? "Aktif" : "Nonaktif" }}
                            </button>
                        </td>
                        <td class="px-5 py-3 text-right">
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5"
                                @click="openEdit(h)"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600"
                                @click="remove(h)"
                            >
                                Nonaktifkan
                            </button>
                        </td>
                    </tr>
                    <tr v-if="hotels.length === 0">
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

        <!-- Tipe kamar (master-detail) -->
        <div
            v-if="selectedHotel"
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-6"
        >
            <h3 class="font-heading text-base font-semibold">
                Tipe Kamar — {{ selectedHotel.name }}
            </h3>
            <div class="mt-3 flex flex-wrap items-end gap-3">
                <label class="text-sm font-medium"
                    >Nama tipe
                    <select
                        v-model="roomForm.name"
                        class="mt-1 min-h-[44px] rounded-xl border border-neutral-line px-3"
                    >
                        <option>Double</option>
                        <option>Triple</option>
                        <option>Quad</option>
                    </select>
                </label>
                <label class="text-sm font-medium"
                    >Kapasitas (orang)
                    <input
                        v-model="roomForm.capacity"
                        type="number"
                        min="1"
                        max="12"
                        class="mt-1 min-h-[44px] w-28 rounded-xl border border-neutral-line px-3"
                    />
                </label>
                <button
                    type="button"
                    class="min-h-[44px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="addRoom"
                >
                    + Tambah
                </button>
            </div>
            <p v-if="roomError" class="mt-2 text-sm text-red-600">
                {{ roomError }}
            </p>
            <ul class="mt-4 divide-y divide-neutral-line">
                <li
                    v-for="rt in selectedHotel.roomTypes"
                    :key="rt.id"
                    class="flex items-center justify-between py-2.5 text-sm"
                >
                    <span
                        >{{ rt.name }} · kapasitas {{ rt.capacity }} orang
                        <span class="text-xs text-neutral-charcoal/50"
                            >(harga di modul Pricing)</span
                        ></span
                    >
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            class="rounded-full px-2.5 py-1 text-xs font-semibold"
                            :class="
                                rt.isActive
                                    ? 'bg-sht-olive/10 text-brand-green'
                                    : 'bg-neutral-warm text-neutral-charcoal/50'
                            "
                            @click="
                                adminPatch(`/api/admin/room-types/${rt.id}`, {
                                    isActive: !rt.isActive,
                                }).then(() => refresh())
                            "
                        >
                            {{ rt.isActive ? "Aktif" : "Nonaktif" }}
                        </button>
                        <button
                            type="button"
                            class="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600"
                            @click="removeRoom(rt)"
                        >
                            Nonaktifkan
                        </button>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>
