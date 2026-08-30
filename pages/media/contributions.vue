<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
type Item = {
    id: number;
    type: string;
    city: string | null;
    subject: string | null;
    message: string;
    name: string | null;
    contact: string | null;
    sourcePage: string | null;
    sourceUrl: string | null;
    mapsUrl: string | null;
    status: string;
    internalNote: string | null;
    createdAt: string;
    readAt: string | null;
    followedUpAt: string | null;
    archivedAt: string | null;
};
const { show } = useAdminToast();
const types = [
        ["INFORMATION_CORRECTION", "Koreksi Informasi"],
        ["PLACE_RECOMMENDATION", "Rekomendasikan Tempat"],
        ["TIP_EXPERIENCE", "Tips & Pengalaman"],
    ],
    statuses = [
        ["NEW", "Baru"],
        ["READ", "Sudah Dibaca"],
        ["FOLLOWED_UP", "Ditindaklanjuti"],
        ["ARCHIVED", "Diarsipkan"],
    ];
const items = ref<Item[]>([]),
    selected = ref<Item | null>(null),
    pending = ref(false),
    search = ref(""),
    status = ref(""),
    type = ref(""),
    city = ref(""),
    page = ref(1),
    total = ref(0),
    pageCount = ref(0),
    note = ref(""),
    toast = ref("");
const label = (a: any[], v: string) => a.find((x) => x[0] === v)?.[1] ?? v;
const date = (v: string | null) =>
    v
        ? new Date(v).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "—";
async function load() {
    pending.value = true;
    try {
        const r = await $fetch<any>("/api/admin/media/contributions", {
            query: {
                search: search.value || undefined,
                status: status.value || undefined,
                type: type.value || undefined,
                city: city.value || undefined,
                page: page.value,
                pageSize: 10,
            },
        });
        items.value = r.data;
        total.value = r.meta.total;
        pageCount.value = r.meta.pageCount;
        if (selected.value)
            selected.value =
                items.value.find((x) => x.id === selected.value!.id) ||
                selected.value;
    } catch (e: any) {
        show(e.data?.statusMessage || "Kontribusi gagal dimuat.", "error");
    } finally {
        pending.value = false;
    }
}
async function open(x: Item) {
    try {
        const r = await $fetch<any>(`/api/admin/media/contributions/${x.id}`);
        selected.value = r.data;
        note.value = r.data.internalNote || "";
        await load();
    } catch (e: any) {
        show(e.data?.statusMessage || "Detail gagal dimuat.", "error");
    }
}
async function action(s: string) {
    if (!selected.value) return;
    try {
        const r = await $fetch<any>(
            `/api/admin/media/contributions/${selected.value.id}`,
            { method: "PATCH", body: { status: s } },
        );
        selected.value = r.data;
        await load();
        show("Status diperbarui.", "success");
    } catch (e: any) {
        show(e.data?.statusMessage || "Status gagal diperbarui.", "error");
    }
}
async function saveNote() {
    if (!selected.value) return;
    try {
        const r = await $fetch<any>(
            `/api/admin/media/contributions/${selected.value.id}`,
            { method: "PATCH", body: { internalNote: note.value || null } },
        );
        selected.value = r.data;
        show("Catatan internal disimpan.", "success");
    } catch (e: any) {
        show(e.data?.statusMessage || "Catatan gagal disimpan.", "error");
    }
}
watch([search, status, type, city], () => {
    page.value = 1;
    load();
});
onMounted(load);

const {
    selected: selectedIds,
    selectPage,
    toggle,
    clear,
    isSelected: isBulkSelected,
} = useBulkSelection<any>();
const bulkActions = [
    { value: "READ", label: "Tandai Sudah Dibaca" },
    { value: "FOLLOWED_UP", label: "Tandai Ditindaklanjuti" },
    { value: "ARCHIVED", label: "Arsipkan" },
];
const allBulkSelected = computed(
    () =>
        items.value.length > 0 &&
        items.value.every((x: any) => isBulkSelected(x.id)),
);
async function applyBulk(value: string) {
    try {
        const payload: any = { ids: selectedIds.value };
        payload.status = value;
        const result = await $fetch(
            "/api/admin/media/contributions/bulk-status",
            { method: "PATCH", body: payload },
        );
        show(String(result.updated) + " item berhasil diperbarui.", "success");
        clear();
        await load();
    } catch (e: any) {
        show(e.data?.statusMessage || "Bulk action gagal.", "error");
    }
}
watch([search, status, type, city], () => clear());
watch(page, () => clear());
</script>
<template>
    <div>
        <PageHead title="Kontribusi Pengguna" subtitle="Media · Interaksi"
            ><template #actions
                ><span
                    class="rounded-full border border-gold-soft bg-gold-sand px-3 py-1.5 text-xs font-semibold"
                    >INBOX</span
                ></template
            ></PageHead
        >
        <section
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-5"
        >
            <div class="grid gap-3 lg:grid-cols-4">
                <input
                    v-model="search"
                    placeholder="Cari isi, subjek, nama..."
                    class="rounded-xl border px-3 py-2 text-sm"
                /><select
                    v-model="status"
                    class="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Semua status</option>
                    <option v-for="x in statuses" :value="x[0]">
                        {{ x[1] }}
                    </option></select
                ><select
                    v-model="type"
                    class="rounded-xl border px-3 py-2 text-sm"
                >
                    <option value="">Semua tipe</option>
                    <option v-for="x in types" :value="x[0]">
                        {{ x[1] }}
                    </option></select
                ><input
                    v-model="city"
                    placeholder="Kota / konteks"
                    class="rounded-xl border px-3 py-2 text-sm"
                />
            </div>
        </section>
        <BulkActionBar
            :count="selectedIds.length"
            :actions="bulkActions"
            @action="applyBulk"
            @clear="clear"
        />
        <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <section
                class="rounded-2xl border border-neutral-line bg-white p-5"
            >
                <div class="flex justify-between">
                    <label class="mr-3 text-xs"
                        ><input
                            type="checkbox"
                            :checked="allBulkSelected"
                            @change="selectPage(items)"
                        />
                        Halaman</label
                    >
                    <h2 class="font-heading text-lg font-semibold">
                        Inbox Kontribusi
                    </h2>
                    <span class="text-xs text-neutral-charcoal/50"
                        >{{ total }} kiriman</span
                    >
                </div>
                <div v-if="pending" class="py-12 text-center text-sm">
                    Memuat...
                </div>
                <div v-else class="mt-4 divide-y">
                    <button
                        v-for="x in items"
                        :key="x.id"
                        class="flex w-full gap-3 py-4 text-left"
                        :class="selected?.id === x.id ? 'bg-gold-sand/30' : ''"
                        @click="open(x)"
                    >
                        <input
                            type="checkbox"
                            class="shrink-0"
                            :checked="isBulkSelected(x.id)"
                            @click.stop="toggle(x.id)"
                        /><span class="min-w-0 flex-1"
                            ><b class="block truncate">{{
                                x.subject || x.message
                            }}</b
                            ><small class="mt-1 block text-neutral-charcoal/55"
                                >{{ label(types, x.type) }} ·
                                {{ x.city || "Umum" }} ·
                                {{ x.name || "Anonim" }}</small
                            ><small
                                class="mt-1 block text-neutral-charcoal/45"
                                >{{ date(x.createdAt) }}</small
                            ></span
                        ><AdminStatusBadge
                            :status="x.status"
                            :label="label(statuses, x.status)"
                        />
                    </button>
                </div>
                <p
                    v-if="!pending && !items.length"
                    class="py-12 text-center text-sm"
                >
                    Belum ada kontribusi.
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
                        :class="n === page ? 'bg-brand-green text-white' : ''"
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
                <div
                    v-if="!selected"
                    class="py-16 text-center text-sm text-neutral-charcoal/50"
                >
                    Pilih kontribusi untuk membaca detail.
                </div>
                <div v-else>
                    <p
                        class="text-xs font-semibold uppercase tracking-wider text-gold"
                    >
                        {{ label(types, selected.type) }} ·
                        {{ selected.status }}
                    </p>
                    <h2 class="mt-3 font-heading text-xl font-semibold">
                        {{ selected.subject || "Tanpa subjek" }}
                    </h2>
                    <p class="mt-4 whitespace-pre-wrap text-sm leading-7">
                        {{ selected.message }}
                    </p>
                    <dl class="mt-5 space-y-2 border-t pt-4 text-sm">
                        <div>
                            <dt class="font-semibold">Kota / konteks</dt>
                            <dd>{{ selected.city || "—" }}</dd>
                        </div>
                        <div>
                            <dt class="font-semibold">Pengirim</dt>
                            <dd>
                                {{ selected.name || "—" }} ·
                                {{ selected.contact || "—" }}
                            </dd>
                        </div>
                        <div>
                            <dt class="font-semibold">Dikirim</dt>
                            <dd>{{ date(selected.createdAt) }}</dd>
                        </div>
                        <div v-if="selected.sourcePage">
                            <dt class="font-semibold">Source page</dt>
                            <dd>{{ selected.sourcePage }}</dd>
                        </div>
                        <div
                            v-if="selected.sourceUrl || selected.mapsUrl"
                            class="flex gap-3"
                        >
                            <a
                                v-if="selected.sourceUrl"
                                :href="selected.sourceUrl"
                                target="_blank"
                                class="text-brand-green underline"
                                >Source URL</a
                            ><a
                                v-if="selected.mapsUrl"
                                :href="selected.mapsUrl"
                                target="_blank"
                                class="text-brand-green underline"
                                >Maps</a
                            >
                        </div>
                    </dl>
                    <label class="mt-5 block text-sm font-semibold"
                        >Catatan internal<textarea
                            v-model="note"
                            rows="3"
                            class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="Hanya terlihat oleh admin"
                        />
                    </label>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <button
                            class="rounded-full bg-brand-green px-3 py-2 text-xs text-white"
                            @click="saveNote"
                        >
                            Simpan Catatan</button
                        ><button
                            v-if="
                                selected.status !== 'FOLLOWED_UP' &&
                                selected.status !== 'ARCHIVED'
                            "
                            class="rounded-full border px-3 py-2 text-xs"
                            @click="action('FOLLOWED_UP')"
                        >
                            Tandai Ditindaklanjuti</button
                        ><button
                            v-if="selected.status !== 'ARCHIVED'"
                            class="rounded-full border px-3 py-2 text-xs"
                            @click="action('ARCHIVED')"
                        >
                            Arsipkan</button
                        ><button
                            v-else
                            class="rounded-full border px-3 py-2 text-xs"
                            @click="action('READ')"
                        >
                            Pulihkan
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>
