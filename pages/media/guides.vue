<script setup lang="ts">
import { mediaEditorTranslation, isCompleteGuideTranslation, type GuideTranslation } from '~/shared/media-localization';
import type { SupportedLocale } from '~/shared/locales';
import type { ArticleBlock } from '~/shared/article-localization';
import { articleImageFigureStyle, articleImageRatioStyle, articleImageObjectStyle } from '~/shared/article-block-presentation';
import { normalizeTableBlock } from '~/shared/article-block-editor';
import { Plus } from "lucide-vue-next";
const { show: showGlobalToast } = useAdminToast();
definePageMeta({ layout: "admin", middleware: "admin-auth" });

type GuideStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type AdminGuide = {
    id: number;
    title: string;
    slug: string;
    group: string;
    summary: string | null;
    body: ArticleBlock[];
    sortOrder: number;
    status: GuideStatus;
    publishedAt: string | null;
    updatedAt: string;
    translations?: Partial<Record<SupportedLocale, GuideTranslation & { complete: boolean }>>;
};
type Toast = { message: string; type: "success" | "error" | "warning" };

const groupOptions = [
    "MULAI DI SINI",
    "KEHIDUPAN DI HARAMAIN",
    "TRANSPORTASI",
    "HOTEL",
    "MAKKAH",
    "MADINAH",
    "PERJALANAN",
    "IBADAH",
];
const guides = ref<AdminGuide[]>([]);
const pending = ref(false);
const search = ref("");
const groupFilter = ref("");
const statusFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const pageCount = ref(0);
const editingId = ref<number | null>(null);
const previewOpen = ref(false);
const deleteConfirmOpen = ref(false);
const deletePending = ref(false);
const slugTouched = ref(false);
const fieldErrors = reactive<Record<string, string>>({});
const toast = ref<Toast | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const localeTab = ref<SupportedLocale>('id');
const previewLocale = ref<SupportedLocale>('id');
const translationFilter = ref('');
const emptyEnglish = () => ({ title: '', slug: '', summary: '', body: [] as ArticleBlock[] });
const english = reactive(emptyEnglish());
const form = reactive({
    title: "",
    slug: "",
    group: "MULAI DI SINI",
    summary: "",
    sortOrder: 10,
    status: "DRAFT" as GuideStatus,
    publishedAt: null as string | null,
    body: [] as ArticleBlock[],
});
const editorText = computed(() => localeTab.value === 'en' ? english : form);
const previewText = computed(() => previewLocale.value === 'en' ? english : form);
const editingGuide = computed(() =>
    editingId.value
        ? (guides.value.find((guide) => guide.id === editingId.value) ?? null)
        : null,
);
const pageNumbers = computed(() =>
    Array.from({ length: pageCount.value }, (_, index) => index + 1),
);

function slugify(value: string) {
    return value
        .toLocaleLowerCase()
        .trim()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 180);
}
function formatDate(value: string | null) {
    return value
        ? new Date(value).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";
}
function showToast(message: string, type: Toast["type"]) {
    showGlobalToast(
        message,
        type === "warning" ? "warning" : type === "error" ? "error" : "success",
    );
}
function dismissToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = null;
    toastTimer = null;
}
function clearErrors() {
    Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
}
function emptyForm() {
    editingId.value = null;
    localeTab.value = previewLocale.value = "id";
    Object.assign(english, emptyEnglish());
    slugTouched.value = false;
    clearErrors();
    Object.assign(form, {
        title: "",
        slug: "",
        group: "MULAI DI SINI",
        summary: "",
        sortOrder: 10,
        status: "DRAFT",
        publishedAt: null,
        body: [{ type: "paragraph", text: "" } as ArticleBlock],
    });
    previewOpen.value = false;
}
function editGuide(guide: AdminGuide) {
    editingId.value = guide.id;
    slugTouched.value = true;
    clearErrors();
    const idText = mediaEditorTranslation<GuideTranslation>(guide, 'id', { title: guide.title, slug: guide.slug, summary: guide.summary, body: guide.body }, { title: '', slug: null, summary: null, body: [] });
    const enText = mediaEditorTranslation<GuideTranslation>(guide, 'en', idText, { title: '', slug: null, summary: null, body: [] });
    Object.assign(english, enText, { slug: enText.slug ?? '', summary: enText.summary ?? '' });
    localeTab.value = previewLocale.value = 'id';
    Object.assign(form, {
        title: idText.title,
        slug: idText.slug ?? "",
        group: guide.group,
        summary: idText.summary ?? "",
        sortOrder: guide.sortOrder,
        status: guide.status,
        body: idText.body as ArticleBlock[],
        publishedAt: guide.publishedAt,
    });
    previewOpen.value = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function normalizeBlock(block: ArticleBlock): ArticleBlock {
    if (block.type === "list") {
        return {
            ...block,
            items: (block.items ?? [])
                .map((item) => item.trim())
                .filter(Boolean),
        };
    }
    if (block.type === "table") {
        return normalizeTableBlock(block);
    }
    return block;
}
function validateForm() {
    clearErrors();
    if (!form.title.trim()) fieldErrors.title = "Judul wajib diisi.";
    if (!form.slug.trim()) fieldErrors.slug = "Slug wajib diisi.";
    if (!form.group) fieldErrors.group = "Group wajib dipilih.";
    form.body.forEach((block, index) => {
        if (
            ["paragraph", "heading", "blockquote", "callout"].includes(
                block.type,
            ) &&
            !block.text?.trim()
        )
            fieldErrors[`body-${index}`] = "Isi block wajib diisi.";
        if (block.type === "image" && block.src && !block.alt?.trim())
            fieldErrors[`body-${index}`] =
                "Alt text wajib diisi untuk image block.";
        if (block.type === "table") {
            const normalized = normalizeTableBlock(block);
            const headers = normalized.headers ?? [];
            const rows = normalized.rows ?? [];
            const alignments = normalized.alignments ?? [];
            if (headers.length < 2) {
                fieldErrors[`body-${index}`] = "Tabel minimal 2 kolom.";
            } else if (rows.length < 1) {
                fieldErrors[`body-${index}`] = "Tabel minimal 1 baris.";
            } else if (headers.some(h => typeof h !== 'string')) {
                fieldErrors[`body-${index}`] = "Header tabel tidak valid.";
            } else if (rows.some(r => !Array.isArray(r) || r.length !== headers.length)) {
                fieldErrors[`body-${index}`] = "Baris tabel tidak konsisten dengan header.";
            } else if (alignments.length !== headers.length) {
                fieldErrors[`body-${index}`] = "Alignment tabel tidak konsisten.";
            } else if (headers.every(h => !h.trim())) {
                fieldErrors[`body-${index}`] = "Header tabel tidak boleh semua kosong.";
            }
        }
    });
    const first = Object.keys(fieldErrors)[0];
    if (first)
        nextTick(() =>
            document
                .querySelector<HTMLElement>(`[data-field="${first}"]`)
                ?.focus(),
        );
    return !first;
}
function payload(status: GuideStatus) {
    return {
        group: form.group, sortOrder: Number(form.sortOrder) || 0, status,
        publishedAt: status === 'PUBLISHED' ? form.publishedAt : null,
        translations: {
            id: { title: form.title.trim(), slug: form.slug.trim(), summary: form.summary.trim() || null, body: form.body.map(normalizeBlock) },
            en: { title: english.title.trim(), slug: english.slug.trim() || null, summary: english.summary.trim() || null, body: english.body.map(normalizeBlock) },
        },
    };
}
async function loadGuides() {
    pending.value = true;
    try {
        const response = await $fetch<{
            data: AdminGuide[];
            meta: { total: number; pageCount: number };
        }>("/api/admin/media/guides", {
            query: {
                search: search.value || undefined,
                translation: translationFilter.value || undefined,
                group: groupFilter.value || undefined,
                status: statusFilter.value || undefined,
                page: currentPage.value,
                pageSize: pageSize.value,
            },
        });
        guides.value = response.data;
        total.value = response.meta.total;
        pageCount.value = response.meta.pageCount;
    } catch (err: unknown) {
        showToast(
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Panduan gagal dimuat.",
            "error",
        );
    } finally {
        pending.value = false;
    }
}
async function saveGuide(status: GuideStatus) {
    if (!validateForm()) {
        showToast("Periksa field yang masih belum lengkap.", "error");
        return;
    }
    try {
        const body = payload(status);
        const response = await $fetch<{ data: AdminGuide }>(
            editingId.value ? `/api/admin/media/guides/${editingId.value}` : '/api/admin/media/guides',
            { method: editingId.value ? 'PATCH' : 'POST', body },
        );
        editingId.value = response.data.id;
        form.status = response.data.status;
        form.publishedAt = response.data.publishedAt;
        slugTouched.value = true;
        showToast(
            status === "PUBLISHED"
                ? "Panduan berhasil dipublikasikan."
                : status === "ARCHIVED"
                  ? "Panduan diarsipkan."
                  : editingId.value
                    ? "Draft panduan berhasil disimpan."
                    : "Panduan berhasil dibuat.",
            status === "ARCHIVED" ? "warning" : "success",
        );
        await loadGuides();
    } catch (err: unknown) {
        showToast(
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menyimpan panduan.",
            "error",
        );
    }
}
async function confirmDelete() {
    if (!editingId.value) return;
    deletePending.value = true;
    try {
        await $fetch(`/api/admin/media/guides/${editingId.value}`, {
            method: "DELETE",
        });
        deleteConfirmOpen.value = false;
        emptyForm();
        await loadGuides();
        showToast("Panduan berhasil dihapus.", "success");
    } catch (err: unknown) {
        showToast(
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menghapus panduan.",
            "error",
        );
    } finally {
        deletePending.value = false;
    }
}
function setPage(page: number) {
    if (page >= 1 && page <= pageCount.value && page !== currentPage.value) {
        currentPage.value = page;
        loadGuides();
    }
}
function changePageSize() {
    currentPage.value = 1;
    loadGuides();
}
watch(
    () => form.title,
    (title) => {
        if (!slugTouched.value) form.slug = slugify(title);
    },
);
watch([search, groupFilter, statusFilter, translationFilter], () => {
    currentPage.value = 1;
    loadGuides();
});
onMounted(loadGuides);
onBeforeUnmount(() => {
    if (toastTimer) clearTimeout(toastTimer);
});

const { selected, selectPage, toggle, clear, isSelected } =
    useBulkSelection<any>();
const bulkActions = [
    { value: "PUBLISHED", label: "Publish" },
    { value: "DRAFT", label: "Kembalikan ke Draft" },
    { value: "ARCHIVED", label: "Archive" },
];
const allSelected = computed(
    () =>
        guides.value.length > 0 &&
        guides.value.every((x: any) => isSelected(x.id)),
);
async function applyBulk(value: string) {
    try {
        const payload: any = { ids: selected.value };
        payload.status = value;
        const result = await $fetch("/api/admin/media/guides/bulk-status", {
            method: "PATCH",
            body: payload,
        });
        showToast(
            String(result.updated) + " item berhasil diperbarui.",
            "success",
        );
        clear();
        await loadGuides();
    } catch (e: any) {
        toast.value = e.data?.statusMessage || "Bulk action gagal.";
    }
}
watch([search, groupFilter, statusFilter, translationFilter], () => clear());
watch(currentPage, () => clear());
</script>

<template>
    <div>
        <PageHead title="Panduan" subtitle="Media · Content Library"
            ><template #actions
                ><button
                    type="button"
                    class="inline-flex w-fit items-center justify-center rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                    @click="emptyForm"
                >
                    <Plus class="h-4 w-4 flex-none" />
                    Panduan Baru
                </button></template
            ></PageHead
        >
        <div
            v-if="toast"
            class="fixed right-4 top-4 z-[80] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg sm:right-8"
            :class="
                toast.type === 'success'
                    ? 'border-brand-green/30 bg-sht-olive/5 text-brand-green'
                    : toast.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-gold-soft bg-gold-sand text-neutral-charcoal'
            "
            role="status"
        >
            <span class="flex-1">{{ toast.message }}</span
            ><button
                type="button"
                class="shrink-0 text-lg leading-none opacity-60"
                aria-label="Tutup notifikasi"
                @click="dismissToast"
            >
                ×
            </button>
        </div>
        <section
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-5"
            aria-label="Filter panduan"
        >
            <div
                class="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,0.8fr)_150px] lg:items-end"
            >
                <label
                    ><span
                        class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50"
                        >Cari</span
                    ><input
                        v-model="search"
                        type="search"
                        placeholder="Cari judul atau slug..."
                        class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm" /></label
                ><label
                    ><span
                        class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50"
                        >Group</span
                    ><select
                        v-model="groupFilter"
                        class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm"
                    >
                        <option value="">Semua group</option>
                        <option v-for="group in groupOptions" :key="group">
                            {{ group }}
                        </option>
                    </select></label
                ><label
                    ><span
                        class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50"
                        >Status</span
                    ><select
                        v-model="statusFilter"
                        class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm"
                    >
                        <option value="">Semua status</option>
                        <option>DRAFT</option>
                        <option>PUBLISHED</option>
                        <option>ARCHIVED</option>
                    </select></label
                >
                <MediaTranslationFilter v-model="translationFilter" />
            </div>
        </section>
        <BulkActionBar
            :count="selected.length"
            :actions="bulkActions"
            @action="applyBulk"
            @clear="clear"
        />
        <div
            class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]"
        >
            <section
                class="rounded-2xl border border-neutral-line bg-white p-5"
                aria-labelledby="guide-list-heading"
            >
                <div class="flex items-center justify-between">
                    <label class="mr-3 flex items-center gap-2 text-xs"
                        ><input
                            type="checkbox"
                            :checked="allSelected"
                            @change="selectPage(guides)"
                        />
                        Halaman</label
                    >
                    <h2
                        id="guide-list-heading"
                        class="font-heading text-lg font-semibold"
                    >
                        Daftar Panduan
                    </h2>
                    <span class="text-xs text-neutral-charcoal/50"
                        >{{ total }} panduan · halaman {{ currentPage }} /
                        {{ Math.max(pageCount, 1) }}</span
                    >
                </div>
                <div
                    v-if="pending"
                    class="py-12 text-center text-sm text-neutral-charcoal/50"
                >
                    Memuat panduan...
                </div>
                <div
                    v-else-if="!guides.length"
                    class="border-t border-neutral-line py-12 text-center text-sm text-neutral-charcoal/55"
                >
                    Belum ada panduan.
                </div>
                <div v-else class="mt-4 divide-y divide-neutral-line">
                    <button
                        v-for="guide in guides"
                        :key="guide.id"
                        type="button"
                        class="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-neutral-soft/50"
                        @click="editGuide(guide)"
                    >
                        <input
                            type="checkbox"
                            class="shrink-0"
                            :checked="isSelected(guide.id)"
                            @click.stop="toggle(guide.id)"
                        /><span class="min-w-0 flex-1"
                            ><span class="block truncate font-semibold">{{
                                guide.title
                            }}</span
                            ><span
                                class="mt-1 block text-xs text-neutral-charcoal/55"
                                >{{ guide.group }} · Urutan
                                {{ guide.sortOrder }}</span
                            ><span
                                class="mt-1 block text-xs text-neutral-charcoal/45"
                                >Diubah: {{ formatDate(guide.updatedAt) }}</span
                            ><MediaTranslationBadges :id-complete="isCompleteGuideTranslation(guide.translations?.id ?? guide)" :en-complete="isCompleteGuideTranslation(guide.translations?.en)" /></span
                        ><span
                            class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase"
                            :class="
                                guide.status === 'PUBLISHED'
                                    ? 'bg-sht-olive/10 text-brand-green'
                                    : guide.status === 'ARCHIVED'
                                      ? 'bg-neutral-line text-neutral-charcoal/55'
                                      : 'bg-gold-sand text-neutral-charcoal/70'
                            "
                            >{{ guide.status }}</span
                        >
                    </button>
                </div>
                <div
                    v-if="pageCount > 1"
                    class="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-line pt-4"
                >
                    <button
                        type="button"
                        class="rounded-full border border-neutral-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                        :disabled="currentPage === 1"
                        @click="setPage(currentPage - 1)"
                    >
                        Previous</button
                    ><button
                        v-for="page in pageNumbers"
                        :key="page"
                        type="button"
                        class="h-8 min-w-8 rounded-full px-2 text-xs font-semibold"
                        :class="
                            page === currentPage
                                ? 'bg-sht-olive text-white'
                                : 'border border-neutral-line'
                        "
                        @click="setPage(page)"
                    >
                        {{ page }}</button
                    ><button
                        type="button"
                        class="rounded-full border border-neutral-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                        :disabled="currentPage === pageCount"
                        @click="setPage(currentPage + 1)"
                    >
                        Next</button
                    ><select
                        v-model.number="pageSize"
                        class="ml-auto rounded-lg border border-neutral-line px-2 py-1 text-xs"
                        @change="changePageSize"
                    >
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                    </select>
                </div>
            </section>

            <section
                class="rounded-2xl max-h-fit border border-neutral-line bg-white p-5"
                aria-labelledby="guide-editor-heading"
            >
                <h2
                    id="guide-editor-heading"
                    class="font-heading text-lg font-semibold"
                >
                    {{ editingGuide ? "Edit Panduan" : "Panduan Baru" }}
                </h2>
                <MediaLocaleTabs v-model="localeTab" />
                <div class="mt-5 space-y-4">
                    <label class="block text-sm font-semibold"
                        >Judul<input
                            data-field="title"
                            v-model="editorText.title"
                            type="text"
                            class="mt-1.5 min-h-[42px] w-full rounded-xl border px-3 text-sm font-normal"
                            :class="
                                fieldErrors.title
                                    ? 'border-red-400'
                                    : 'border-neutral-line'
                            "
                        /><span
                            v-if="fieldErrors.title"
                            class="mt-1 block text-xs font-normal text-red-700"
                            >{{ fieldErrors.title }}</span
                        ></label
                    ><label class="block text-sm font-semibold"
                        >Slug<input
                            data-field="slug"
                            v-model="editorText.slug"
                            type="text"
                            class="mt-1.5 min-h-[42px] w-full rounded-xl border px-3 text-sm font-normal"
                            :class="
                                fieldErrors.slug
                                    ? 'border-red-400'
                                    : 'border-neutral-line'
                            "
                            @input="slugTouched = true"
                        /><span
                            v-if="fieldErrors.slug"
                            class="mt-1 block text-xs font-normal text-red-700"
                            >{{ fieldErrors.slug }}</span
                        ></label
                    ><label class="block text-sm font-semibold"
                        >Group<select
                            data-field="group"
                            v-model="form.group"
                            class="mt-1.5 min-h-[42px] w-full rounded-xl border px-3 text-sm font-normal"
                            :class="
                                fieldErrors.group
                                    ? 'border-red-400'
                                    : 'border-neutral-line'
                            "
                        >
                            <option v-for="group in groupOptions" :key="group">
                                {{ group }}
                            </option></select
                        ><span
                            v-if="fieldErrors.group"
                            class="mt-1 block text-xs font-normal text-red-700"
                            >{{ fieldErrors.group }}</span
                        ></label
                    ><label class="block text-sm font-semibold"
                        >Summary (opsional)<textarea
                            v-model="editorText.summary"
                            rows="2"
                            class="mt-1.5 w-full rounded-xl border border-neutral-line px-3 py-2 text-sm font-normal"
                        /></label
                    ><label class="block text-sm font-semibold"
                        >Sort Order<input
                            v-model.number="form.sortOrder"
                            type="number"
                            min="0"
                            step="10"
                            class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm font-normal"
                        /><span
                            class="mt-1 block text-xs font-normal text-neutral-charcoal/50"
                            >Angka lebih kecil tampil lebih awal dalam
                            group.</span
                        ></label
                    >
                    <div v-if="localeTab === 'id'" class="border-t border-neutral-line pt-4">
                        <MediaStructuredBlockEditor
                            v-model="form.body"
                            folder="guides"
                            :errors="fieldErrors"
                        />
                    </div>
                    <div v-else class="border-t border-neutral-line pt-4">
                        <MediaStructuredBlockEditor
                            v-model="english.body"
                            folder="guides"
                        />
                        <p class="mt-3 text-xs text-neutral-charcoal/55">Publik English membutuhkan judul, slug, dan body. Group dan urutan berlaku untuk kedua bahasa.</p>
                    </div>
                    <div
                        class="flex flex-wrap gap-2 border-t border-neutral-line pt-4"
                    >
                        <button
                            type="button"
                            class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold"
                            @click="previewOpen = !previewOpen; previewLocale = localeTab"
                        >
                            {{
                                previewOpen ? "Tutup Preview" : "Preview"
                            }}</button
                        ><button
                            type="button"
                            class="rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                            @click="saveGuide(form.status)"
                        >
                            {{ form.status === 'DRAFT' ? 'Simpan Draft' : 'Simpan Perubahan' }}</button
                        ><button
                            v-if="
                                form.status !== 'PUBLISHED' &&
                                form.status !== 'ARCHIVED'
                            "
                            type="button"
                            class="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-brand-green"
                            @click="saveGuide('PUBLISHED')"
                        >
                            Publish</button
                        ><button
                            v-if="editingId && form.status === 'PUBLISHED'"
                            type="button"
                            class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold"
                            @click="saveGuide('DRAFT')"
                        >
                            Return ke Draft</button
                        ><button
                            v-if="editingId && form.status !== 'ARCHIVED'"
                            type="button"
                            class="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                            @click="saveGuide('ARCHIVED')"
                        >
                            Archive</button
                        ><button
                            v-if="editingId"
                            type="button"
                            class="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800"
                            @click="deleteConfirmOpen = true"
                        >
                            Delete Panduan
                        </button>
                    </div>
                </div>
            </section>
        </div>

        <section
            v-if="previewOpen"
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-6"
            aria-label="Preview panduan"
        >
            <p
                class="text-xs font-semibold uppercase tracking-[0.16em] text-gold"
            >
                Preview · {{ form.group }}
            </p>
            <h2 class="mt-3 text-3xl font-semibold">
                {{ previewText.title || "Judul panduan" }}
            </h2>
            <p
                v-if="previewText.summary"
                class="mt-3 max-w-2xl text-base text-neutral-charcoal/65"
            >
                {{ previewText.summary }}
            </p>
            <div class="mt-8 max-w-2xl text-neutral-charcoal/80">
                <template v-for="(block, index) in previewText.body" :key="index"
                    ><p
                        v-if="block.type === 'paragraph'"
                        class="mb-5 text-sm leading-7"
                    >
                        {{ block.text }}
                    </p>
                    <h2
                        v-else-if="
                            block.type === 'heading' && block.level === 2
                        "
                        class="mb-4 mt-9 text-2xl font-bold leading-tight"
                    >
                        {{ block.text }}
                    </h2>
                    <h3
                        v-else-if="block.type === 'heading'"
                        class="mb-3 mt-7 text-xl font-semibold leading-tight"
                    >
                        {{ block.text }}
                    </h3>
                    <blockquote
                        v-else-if="block.type === 'blockquote'"
                        class="mb-6 border-l-2 border-gold pl-4 text-base italic leading-7"
                    >
                        {{ block.text }}
                    </blockquote>
                    <ul
                        v-else-if="block.type === 'list' && !block.ordered"
                        class="mb-6 list-disc space-y-2 pl-6 text-sm leading-7"
                    >
                        <li v-for="item in block.items" :key="item">
                            {{ item }}
                        </li>
                    </ul>
                    <ol
                        v-else-if="block.type === 'list'"
                        class="mb-6 list-decimal space-y-2 pl-6 text-sm leading-7"
                    >
                        <li v-for="item in block.items" :key="item">
                            {{ item }}
                        </li>
                    </ol>
                    <aside
                        v-else-if="block.type === 'callout'"
                        class="mb-6 border-l-2 border-gold bg-gold-sand/50 px-4 py-3 text-sm leading-6"
                    >
                        {{ block.text }}
                    </aside>
                    <figure v-else-if="block.type === 'image'" class="mx-auto mb-6 w-full" :style="articleImageFigureStyle(block as any)">
                        <div class="overflow-hidden rounded-xl" :style="articleImageRatioStyle(block as any)">
                            <img
                                :src="block.src"
                                :alt="block.alt"
                                class="w-full"
                                :style="articleImageObjectStyle(block as any)"
                            />
                        </div>
                        <figcaption
                            v-if="block.caption"
                            class="mt-2 text-xs text-neutral-charcoal/50"
                        >
                            {{ block.caption }}
                        </figcaption>
                    </figure><div v-else-if="block.type === 'table'" class="mb-8 overflow-x-auto rounded-xl border border-neutral-line bg-white">
                        <table class="min-w-[480px] w-full border-collapse text-sm">
                            <caption v-if="block.caption" class="caption-top px-4 py-2 text-left text-xs font-medium text-neutral-charcoal/60">{{ block.caption }}</caption>
                            <thead>
                                <tr class="bg-neutral-soft/70">
                                    <th v-for="(header, hIdx) in (block.headers ?? [])" :key="hIdx" scope="col" class="border-b border-neutral-line px-3 py-2 text-left font-semibold" :style="{ textAlign: (block.alignments?.[hIdx] ?? 'left') }">{{ header }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, rIdx) in (block.rows ?? [])" :key="rIdx" class="border-b border-neutral-line last:border-0">
                                    <td v-for="(cell, cIdx) in row" :key="cIdx" class="px-3 py-2 align-top" :style="{ textAlign: (block.alignments?.[cIdx] ?? 'left') }">{{ cell }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div></template
                >
            </div>
        </section>
        <div
            v-if="deleteConfirmOpen"
            class="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-charcoal/40 p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-guide-heading"
        >
            <div
                class="w-full max-w-md rounded-2xl border border-neutral-line bg-white p-6 shadow-xl"
            >
                <h2
                    id="delete-guide-heading"
                    class="font-heading text-xl font-semibold"
                >
                    Hapus panduan?
                </h2>
                <p
                    class="mt-3 text-sm leading-relaxed text-neutral-charcoal/70"
                >
                    Panduan akan dihapus dan tidak lagi tersedia di CMS maupun
                    public API.
                </p>
                <div class="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold"
                        :disabled="deletePending"
                        @click="deleteConfirmOpen = false"
                    >
                        Batal</button
                    ><button
                        type="button"
                        class="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                        :disabled="deletePending"
                        @click="confirmDelete"
                    >
                        {{ deletePending ? "Menghapus..." : "Hapus Panduan" }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
