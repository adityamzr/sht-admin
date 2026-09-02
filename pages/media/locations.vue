<script setup lang="ts">
import { mediaEditorTranslation, isCompleteLocationTranslation, type LocationTranslation } from '~/shared/media-localization';
import type { SupportedLocale } from '~/shared/locales';
import { Plus } from "lucide-vue-next";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
type Item = {
    id: number;
    name: string;
    city: string;
    category: string;
    shortDescription: string;
    latitude: number;
    longitude: number;
    googleMapsUrl: string | null;
    imageUrl: string | null;
    imageFileId: string | null;
    altText: string | null;
    tags: string[];
    sortOrder: number;
    isActive: boolean;
    updatedAt: string;
    translations?: Partial<Record<SupportedLocale, LocationTranslation & { complete: boolean }>>;
};
const { show } = useAdminToast();
const cities = ["MAKKAH", "MADINAH"],
    categories = [
        "HARAM",
        "TRANSPORTASI",
        "MIQAT",
        "KULINER",
        "FASILITAS",
        "ZIARAH",
        "NABAWI",
        "RAWDHAH",
    ];
const items = ref<Item[]>([]),
    pending = ref(false),
    total = ref(0),
    page = ref(1),
    pageSize = ref(12),
    search = ref(""),
    city = ref(""),
    category = ref(""),
    active = ref(""),
    editingId = ref<number | null>(null),
    confirmDelete = ref(false),
    toast = ref("");
const localeTab = ref<SupportedLocale>('id');
const translationFilter = ref('');
const previewOpen = ref(false);
const english = reactive({ name: '', shortDescription: '', altText: '' });
const form = reactive({
    name: "",
    city: "MAKKAH",
    category: "HARAM",
    shortDescription: "",
    latitude: "",
    longitude: "",
    googleMapsUrl: "",
    imageUrl: "",
    imageFileId: "",
    altText: "",
    tags: "",
    sortOrder: 10,
    isActive: true,
});
const editorText = computed(() => localeTab.value === 'en' ? english : form);
const pageCount = computed(() => Math.ceil(total.value / pageSize.value));
const editing = computed(() => editingId.value !== null);
function reset() {
    editingId.value = null;
    localeTab.value = 'id'; previewOpen.value = false;
    Object.assign(english, { name: '', shortDescription: '', altText: '' });
    Object.assign(form, {
        name: "",
        city: "MAKKAH",
        category: "HARAM",
        shortDescription: "",
        latitude: "",
        longitude: "",
        googleMapsUrl: "",
        imageUrl: "",
        imageFileId: "",
        altText: "",
        tags: "",
        sortOrder: 10,
        isActive: true,
    });
}
function edit(x: Item) {
    editingId.value = x.id;
    const idText = mediaEditorTranslation<LocationTranslation>(x, 'id', { name: x.name, shortDescription: x.shortDescription, altText: x.altText }, { name: '', shortDescription: '', altText: null });
    const enText = mediaEditorTranslation<LocationTranslation>(x, 'en', idText, { name: '', shortDescription: '', altText: null });
    Object.assign(english, { name: enText.name ?? "", shortDescription: enText.shortDescription ?? "", altText: enText.altText ?? "" });
    localeTab.value = 'id'; previewOpen.value = false;
    Object.assign(form, {
        ...x,
        name: idText.name ?? "", shortDescription: idText.shortDescription ?? "", altText: idText.altText ?? "",
        latitude: String(x.latitude),
        longitude: String(x.longitude),
        googleMapsUrl: x.googleMapsUrl || "",
        imageUrl: x.imageUrl || "",
        imageFileId: x.imageFileId || "",

        tags: x.tags.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function num(v: string) {
    if (!v.trim()) return null;
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
}
async function load() {
    pending.value = true;
    try {
        const r = await $fetch<any>("/api/admin/media/locations", {
            query: {
                search: search.value || undefined,
                translation: translationFilter.value || undefined,
                city: city.value || undefined,
                category: category.value || undefined,
                active: active.value || undefined,
                page: page.value,
                pageSize: pageSize.value,
            },
        });
        items.value = r.data;
        total.value = r.meta.total;
    } catch (e: any) {
        show(e.data?.statusMessage || "Lokasi gagal dimuat.", "error");
    } finally {
        pending.value = false;
    }
}
function payload() {
    return {
        city: form.city, category: form.category, latitude: num(form.latitude), longitude: num(form.longitude),
        googleMapsUrl: form.googleMapsUrl || null, imageUrl: form.imageUrl || null, imageFileId: form.imageFileId || null,
        tags: form.tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
        translations: {
            id: { name: form.name.trim(), shortDescription: form.shortDescription.trim(), altText: form.altText.trim() || null },
            en: { name: english.name.trim(), shortDescription: english.shortDescription.trim(), altText: english.altText.trim() || null },
        },
    };
}
async function save() {
    const p = payload();
    if (
        !form.name ||
        p.latitude === null ||
        p.longitude === null ||
        p.latitude < -90 ||
        p.latitude > 90 ||
        p.longitude < -180 ||
        p.longitude > 180
    ) {
        show(
            "Nama dan koordinat valid wajib diisi. Latitude -90..90, longitude -180..180.",
            "error",
        );
        return;
    }
    try {
        if (editingId.value)
            await $fetch(`/api/admin/media/locations/${editingId.value}`, {
                method: "PATCH",
                body: p,
            });
        else {
            const r = await $fetch<any>("/api/admin/media/locations", {
                method: "POST",
                body: p,
            });
            editingId.value = r.data.id;
        }
        show("Lokasi tersimpan.", "success");
        await load();
    } catch (e: any) {
        show(e.data?.statusMessage || "Gagal menyimpan.", "error");
    }
}
async function remove() {
    if (!editingId.value) return;
    try {
        await $fetch(`/api/admin/media/locations/${editingId.value}`, {
            method: "DELETE",
        });
        confirmDelete.value = false;
        reset();
        await load();
        show("Lokasi dan asset berhasil dihapus.", "success");
    } catch (e: any) {
        show(
            e.data?.statusMessage ||
                "Asset gagal dihapus; lokasi tetap tersimpan.",
            "error",
        );
    }
}
watch([search, city, category, active, translationFilter], () => {
    page.value = 1;
    load();
});
onMounted(load);

const { selected, selectPage, toggle, clear, isSelected } =
    useBulkSelection<any>();
const bulkActions = [
    { value: "true", label: "Aktifkan" },
    { value: "false", label: "Nonaktifkan" },
];
const allSelected = computed(
    () =>
        items.value.length > 0 &&
        items.value.every((x: any) => isSelected(x.id)),
);
async function applyBulk(value: string) {
    try {
        const payload: any = { ids: selected.value };
        payload.isActive = value === "true";
        const result = await $fetch("/api/admin/media/locations/bulk-active", {
            method: "PATCH",
            body: payload,
        });
        show(String(result.updated) + " item berhasil diperbarui.", "success");
        clear();
        await load();
    } catch (e: any) {
        show(e.data?.statusMessage || "Bulk action gagal.", "error");
    }
}
watch([search, city, category, active, translationFilter], () => clear());
watch(page, () => clear());
</script>
<template>
    <div>
        <PageHead title="Map Locations" subtitle="Media · Content Library"
            ><template #actions
                ><button
                    class="inline-flex items-center justify-center w-fit rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="reset"
                >
                    <Plus class="h-4 w-4 flex-none" />
                    Lokasi Baru
                </button></template
            ></PageHead
        >
        <section
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-5"
        >
            <div class="grid gap-3 md:grid-cols-4">
                <input
                    v-model="search"
                    placeholder="Cari lokasi..."
                    class="rounded-xl border px-3 py-2 text-sm"
                /><select
                    v-model="city"
                    class="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Semua kota</option>
                    <option v-for="x in cities">{{ x }}</option></select
                ><select
                    v-model="category"
                    class="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Semua kategori</option>
                    <option v-for="x in categories">{{ x }}</option></select
                ><select
                    v-model="active"
                    class="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Semua status</option>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                </select>
                <MediaTranslationFilter v-model="translationFilter" />
            </div>
        </section>
        <BulkActionBar
            :count="selected.length"
            :actions="bulkActions"
            @action="applyBulk"
            @clear="clear"
        />
        <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section
                class="rounded-2xl border border-neutral-line bg-white p-5"
            >
                <div class="flex justify-between">
                    <label class="mr-3 text-xs"
                        ><input
                            type="checkbox"
                            :checked="allSelected"
                            @change="selectPage(items)"
                        />
                        Halaman</label
                    >
                    <h2 class="font-heading text-lg font-semibold">
                        Daftar Lokasi
                    </h2>
                    <span class="text-xs text-neutral-charcoal/50"
                        >{{ total }} lokasi</span
                    >
                </div>
                <div v-if="pending" class="py-12 text-center text-sm">
                    Memuat...
                </div>
                <div v-else class="mt-4 divide-y">
                    <button
                        v-for="x in items"
                        :key="x.id"
                        class="flex w-full items-center gap-3 py-3 text-left"
                        @click="edit(x)"
                    >
                        <input
                            type="checkbox"
                            class="shrink-0"
                            :checked="isSelected(x.id)"
                            @click.stop="toggle(x.id)"
                        /><img
                            v-if="x.imageUrl"
                            :src="x.imageUrl"
                            :alt="x.altText || x.name"
                            class="h-12 w-12 rounded-lg object-cover"
                        /><span class="min-w-0 flex-1"
                            ><b class="block truncate">{{ x.name }}</b
                            ><small class="block text-neutral-charcoal/55"
                                >{{ x.city }} · {{ x.category }} ·
                                {{ x.latitude }}, {{ x.longitude }}</small
                            ><small class="block"
                                >Urutan {{ x.sortOrder }} ·
                                {{ x.isActive ? "Aktif" : "Nonaktif" }}</small
                            ></span
                        >
                        <MediaTranslationBadges :id-complete="isCompleteLocationTranslation(x.translations?.id ?? x)" :en-complete="isCompleteLocationTranslation(x.translations?.en)" />
                    </button>
                </div>
                <p
                    v-if="!pending && !items.length"
                    class="py-12 text-center text-sm"
                >
                    Belum ada lokasi.
                </p>
                <div
                    v-if="pageCount > 1"
                    class="mt-4 flex flex-wrap gap-2 border-t pt-4"
                >
                    <button
                        class="rounded-full border px-3 py-1 text-xs"
                        :disabled="page === 1"
                        @click="
                            page--;
                            load();
                        "
                    >
                        Previous</button
                    ><button
                        v-for="n in pageCount"
                        :key="n"
                        class="rounded-full border px-2 py-1 text-xs"
                        :class="n === page ? 'bg-sht-olive text-white' : ''"
                        @click="
                            page = n;
                            load();
                        "
                    >
                        {{ n }}</button
                    ><button
                        class="rounded-full border px-3 py-1 text-xs"
                        :disabled="page === pageCount"
                        @click="
                            page++;
                            load();
                        "
                    >
                        Next
                    </button>
                </div>
            </section>
            <section
                class="rounded-2xl border border-neutral-line bg-white p-5"
            >
                <h2 class="font-heading text-lg font-semibold">
                    {{ editing ? "Edit Lokasi" : "Lokasi Baru" }}
                </h2>
                <MediaLocaleTabs v-model="localeTab" />
                <div class="mt-4 space-y-3">
                    <MediaImageUploader
                        v-model="form.imageUrl"
                        @update:file-id="form.imageFileId = $event"
                        label="Location image"
                        folder="locations"
                    /><input
                        v-model="editorText.name"
                        placeholder="Nama lokasi"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    /><select
                        v-model="form.city"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                        <option v-for="x in cities">{{ x }}</option></select
                    ><select
                        v-model="form.category"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                        <option v-for="x in categories">{{ x }}</option></select
                    ><textarea
                        v-model="editorText.shortDescription"
                        placeholder="Deskripsi singkat"
                        rows="3"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <div class="grid grid-cols-2 gap-2">
                        <label class="text-sm font-semibold"
                            >Latitude<input
                                v-model="form.latitude"
                                placeholder="21.4245589"
                                inputmode="decimal"
                                class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label
                        ><label class="text-sm font-semibold"
                            >Longitude<input
                                v-model="form.longitude"
                                placeholder="39.8248709"
                                inputmode="decimal"
                                class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        /></label>
                    </div>
                    <input
                        v-model="form.googleMapsUrl"
                        placeholder="Google Maps URL (opsional)"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    /><input
                        v-model="editorText.altText"
                        placeholder="Alt text (opsional)"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    /><input
                        v-model="form.tags"
                        placeholder="Tags, pisahkan koma"
                        class="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <div class="grid grid-cols-2 gap-2">
                        <input
                            v-model.number="form.sortOrder"
                            type="number"
                            placeholder="Sort order"
                            class="rounded-lg border px-3 py-2 text-sm"
                        /><label class="flex items-center gap-2 text-sm"
                            ><input v-model="form.isActive" type="checkbox" />
                            Aktif</label
                        >
                    </div>
                    <div class="rounded-xl border border-neutral-line p-3" v-if="previewOpen" aria-label="Preview locations">
                        <img v-if="form.imageUrl" :src="form.imageUrl" :alt="editorText.altText || ''" class="max-h-48 rounded-lg object-cover" />
                        <h3 class="mt-2 font-semibold">{{ editorText.name || (localeTab === 'en' ? 'English preview' : 'Preview Indonesia') }}</h3>
                        <p class="mt-1 text-sm">{{ editorText.shortDescription }}</p>

                    </div>
                    <p v-if="localeTab === 'en'" class="text-xs text-neutral-charcoal/55">Nama dan deskripsi singkat diperlukan untuk publik English. Gambar, kategori, koordinat, dan status berlaku untuk kedua bahasa.</p>
                    <div class="flex flex-wrap gap-2 border-t pt-4">
                        <button type="button" class="rounded-full border px-3 py-2 text-sm" @click="previewOpen = !previewOpen">{{ previewOpen ? 'Tutup Preview' : 'Preview' }}</button>
                        <button
                            class="rounded-full bg-sht-olive px-4 py-2 text-sm text-white"
                            @click="save"
                        >
                            Simpan</button
                        ><a
                            v-if="editing"
                            :href="
                                form.googleMapsUrl ||
                                `https://www.google.com/maps/dir/?api=1&destination=${form.latitude},${form.longitude}`
                            "
                            target="_blank"
                            class="rounded-full border px-4 py-2 text-sm"
                            >Open in Maps</a
                        ><button
                            v-if="editing"
                            class="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700"
                            @click="confirmDelete = true"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </section>
        </div>
        <div
            v-if="confirmDelete"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
        >
            <div class="rounded-2xl bg-white p-6">
                <h2 class="font-semibold">Hapus lokasi?</h2>
                <p class="my-4 text-sm">
                    Asset ImageKit akan ikut dihapus bila fileId tersedia.
                </p>
                <button
                    class="mr-2 rounded-full border px-4 py-2"
                    @click="confirmDelete = false"
                >
                    Batal</button
                ><button
                    class="rounded-full bg-red-700 px-4 py-2 text-white"
                    @click="remove"
                >
                    Hapus
                </button>
            </div>
        </div>
    </div>
</template>
