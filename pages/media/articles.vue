<script setup lang="ts">
import { Plus } from "lucide-vue-next";
const { show: showGlobalToast } = useAdminToast();
definePageMeta({ layout: "admin", middleware: "admin-auth" });

type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type ArticleBlock = {
    fileId?: string;
    type: "paragraph" | "heading" | "image" | "blockquote" | "list" | "callout";
    level?: 2 | 3;
    text?: string;
    ordered?: boolean;
    items?: string[];
    src?: string;
    alt?: string;
    caption?: string;
};
type AdminArticle = {
    id: number;
    heroImageFileId?: string | null;
    title: string;
    slug: string;
    excerpt: string;
    heroImage: string;
    heroImageAlt: string;
    body: ArticleBlock[];
    city: string;
    contentType: string;
    category: string;
    tags: string[];
    status: ArticleStatus;
    priority: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};
type Toast = {
    message: string;
    type: "success" | "error" | "warning" | "info";
};

const categoryOptions = [
    "Ibadah",
    "Panduan",
    "Kehidupan",
    "Sosial",
    "Ekonomi",
    "Bisnis",
    "Kuliner",
    "Transportasi",
    "Akomodasi",
    "Makkah",
    "Madinah",
    "Budaya",
    "Sejarah",
    "Berita / Update",
];
const contentTypeOptions = [
    { value: "article", label: "Artikel" },
    { value: "update", label: "Update" },
    { value: "practical", label: "Panduan Praktis" },
];
const articles = ref<AdminArticle[]>([]);
const pending = ref(false);
const search = ref("");
const statusFilter = ref("");
const cityFilter = ref("");
const categoryFilter = ref("");
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
const localeTab = ref<'id'|'en'>('id'); const enTranslation = reactive({ title:'', slug:'', excerpt:'', heroAlt:'', body:[] as ArticleBlock[], seoTitle:'', seoDescription:'' });
const form = reactive({
    title: "",
    slug: "",
    excerpt: "",
    heroImage: "",
    heroImageFileId: "",
    heroImageAlt: "",
    city: "GENERAL",
    contentType: "article",
    category: "Kehidupan",
    tags: "",
    status: "DRAFT" as ArticleStatus,
    priority: 0,
    body: [] as ArticleBlock[],
});

const editingArticle = computed(() =>
    editingId.value
        ? (articles.value.find((article) => article.id === editingId.value) ??
          null)
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
function formatUpdated(value: string) {
    return new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function showToast(message: string, type: Toast["type"]) {
    showGlobalToast(
        message,
        type === "warning" ? "warning" : type === "error" ? "error" : "success",
    );
}
function toastClass(type: Toast["type"]) {
    return type === "success"
        ? "border-brand-green/30 bg-sht-olive/5 text-brand-green"
        : type === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : type === "warning"
            ? "border-gold-soft bg-gold-sand text-neutral-charcoal"
            : "border-neutral-line bg-neutral-soft text-neutral-charcoal";
}
function dismissToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = null;
    toastTimer = null;
}
function clearErrors() {
    Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
}
function switchLocale(locale:'id'|'en'){localeTab.value=locale}
function clearEnglish(){Object.assign(enTranslation,{title:'',slug:'',excerpt:'',heroAlt:'',body:[],seoTitle:'',seoDescription:''})}
function emptyForm() {
    editingId.value = null;
    localeTab.value = 'id'; clearEnglish();
    slugTouched.value = false;
    clearErrors();
    Object.assign(form, {
        title: "",
        slug: "",
        excerpt: "",
        heroImage: "",
        heroImageFileId: "",
        heroImageAlt: "",
        city: "GENERAL",
        contentType: "article",
        category: "Kehidupan",
        tags: "",
        status: "DRAFT",
        priority: 0,
        body: [{ type: "paragraph", text: "" }],
    });
    previewOpen.value = false;
}
function editArticle(article: AdminArticle) {
    editingId.value = article.id;
    slugTouched.value = true;
    clearErrors();
    Object.assign(form, {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        heroImage: article.heroImage,
        heroImageFileId: (article as any).heroImageFileId ?? "",
        heroImageAlt: article.heroImageAlt,
        city: article.city,
        contentType: article.contentType,
        category: article.category,
        tags: article.tags.join(", "),
        status: article.status,
        priority: article.priority,
        body: JSON.parse(JSON.stringify(article.body ?? [])),
    });
    const english = (article as any).translations?.en; Object.assign(enTranslation, english ? { title: english.title || '', slug: english.slug || '', excerpt: english.excerpt || '', heroAlt: english.heroAlt || '', body: JSON.parse(JSON.stringify(english.body || [])), seoTitle: english.seoTitle || '', seoDescription: english.seoDescription || '' } : { title:'', slug:'', excerpt:'', heroAlt:'', body:[], seoTitle:'', seoDescription:'' }); localeTab.value = 'id';
    previewOpen.value = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function addBlock(type: ArticleBlock["type"]) {
    form.body.push(
        type === "heading"
            ? { type, level: 2, text: "" }
            : type === "list"
              ? { type, ordered: false, items: [""] }
              : type === "image"
                ? { type, src: "", alt: "", caption: "" }
                : { type, text: "" },
    );
}
function removeBlock(index: number) {
    form.body.splice(index, 1);
}
function normalizeBlock(block: ArticleBlock): ArticleBlock {
    if (block.type === "list")
        return {
            ...block,
            items: (block.items ?? [])
                .map((item) => item.trim())
                .filter(Boolean),
        };
    return block;
}
function validateForm() {
    clearErrors();
    if (!form.title.trim()) fieldErrors.title = "Judul wajib diisi.";
    if (!form.slug.trim()) fieldErrors.slug = "Slug wajib diisi.";
    if (!form.category.trim()) fieldErrors.category = "Kategori wajib dipilih.";
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
function payload(status: ArticleStatus) {
    return {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        heroImage: form.heroImage.trim(),
        heroImageFileId: form.heroImageFileId || null,
        heroImageAlt: form.heroImageAlt.trim(),
        body: form.body.map(normalizeBlock),
        city: form.city,
        contentType: form.contentType,
        category: form.category.trim(),
        tags: form.tags
            .split(",")
            .map((tag) => tag.trim().toLocaleLowerCase())
            .filter(Boolean),
        status,
        priority: Number(form.priority) || 0,
        publishedAt: status === "PUBLISHED" ? new Date().toISOString() : null,
        seoTitle: null,
        seoDescription: null,
        ogImage: null,
        translations: { id: { title: form.title.trim(), slug: form.slug.trim(), excerpt: form.excerpt.trim(), heroAlt: form.heroImageAlt.trim(), body: form.body.map(normalizeBlock), seoTitle: null, seoDescription: null }, en: { title: enTranslation.title.trim(), slug: enTranslation.slug.trim() || null, excerpt: enTranslation.excerpt.trim(), heroAlt: enTranslation.heroAlt.trim(), body: enTranslation.body.map(normalizeBlock), seoTitle: enTranslation.seoTitle.trim() || null, seoDescription: enTranslation.seoDescription.trim() || null } },
    };
}
async function loadArticles() {
    pending.value = true;
    try {
        const response = await $fetch<{
            data: AdminArticle[];
            meta: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>("/api/admin/media/articles", {
            query: {
                search: search.value || undefined,
                status: statusFilter.value || undefined,
                city: cityFilter.value || undefined,
                category: categoryFilter.value || undefined,
                page: currentPage.value,
                pageSize: pageSize.value,
            },
        });
        articles.value = response.data;
        total.value = response.meta.total;
        pageCount.value = response.meta.pageCount;
    } catch (err: unknown) {
        showToast(
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Artikel gagal dimuat.",
            "error",
        );
    } finally {
        pending.value = false;
    }
}
async function saveArticle(status: ArticleStatus) {
    form.status = status;
    if (!validateForm()) {
        showToast("Periksa field yang masih belum lengkap.", "error");
        return;
    }
    try {
        const body = payload(status);
        if (editingId.value)
            await $fetch(`/api/admin/media/articles/${editingId.value}`, {
                method: "PATCH",
                body,
            });
        else {
            const response = await $fetch<{ data: AdminArticle }>(
                "/api/admin/media/articles",
                { method: "POST", body },
            );
            editingId.value = response.data.id;
            slugTouched.value = true;
        }
        showToast(
            status === "PUBLISHED"
                ? "Artikel berhasil dipublikasikan."
                : status === "ARCHIVED"
                  ? "Artikel diarsipkan."
                  : editingId.value
                    ? "Draft berhasil disimpan."
                    : "Artikel berhasil dibuat.",
            status === "ARCHIVED" ? "warning" : "success",
        );
        await loadArticles();
    } catch (err: unknown) {
        showToast(
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menyimpan artikel.",
            "error",
        );
    }
}
async function confirmDelete() {
    if (!editingId.value) return;
    deletePending.value = true;
    try {
        await $fetch(`/api/admin/media/articles/${editingId.value}`, {
            method: "DELETE",
        });
        deleteConfirmOpen.value = false;
        emptyForm();
        await loadArticles();
        showToast("Artikel berhasil dihapus.", "success");
    } catch (err: unknown) {
        showToast(
            (err as { data?: { statusMessage?: string } }).data
                ?.statusMessage ?? "Gagal menghapus artikel.",
            "error",
        );
    } finally {
        deletePending.value = false;
    }
}
function setPage(page: number) {
    if (page >= 1 && page <= pageCount.value && page !== currentPage.value) {
        currentPage.value = page;
        loadArticles();
    }
}
function changePageSize() {
    currentPage.value = 1;
    loadArticles();
}
function enComplete(article: any) { return Boolean(article.translations?.en?.complete) }
function displayContentType(value: string) {
    return (
        contentTypeOptions.find((option) => option.value === value)?.label ??
        value
    );
}
watch(
    () => form.title,
    (title) => {
        if (!slugTouched.value) form.slug = slugify(title);
    },
);
watch([search, statusFilter, cityFilter, categoryFilter], () => {
    currentPage.value = 1;
    loadArticles();
});
onMounted(loadArticles);
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
        articles.value.length > 0 &&
        articles.value.every((x: any) => isSelected(x.id)),
);
async function applyBulk(value: string) {
    try {
        const payload: any = { ids: selected.value };
        payload.status = value;
        const result = await $fetch("/api/admin/media/articles/bulk-status", {
            method: "PATCH",
            body: payload,
        });
        showToast(
            String(result.updated) + " item berhasil diperbarui.",
            "success",
        );
        clear();
        await loadArticles();
    } catch (e: any) {
        toast.value = e.data?.statusMessage || "Bulk action gagal.";
    }
}
watch([search, statusFilter, cityFilter, categoryFilter], () => clear());
watch(currentPage, () => clear());
</script>

<template>
    <div>
        <PageHead title="Artikel" subtitle="Media · Content Library">
            <template #actions>
                <button
                    type="button"
                    class="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3230]"
                    @click="emptyForm"
                >
                    <Plus class="h-4 w-4 flex-none" />
                    <span>Artikel Baru</span>
                </button>
            </template>
        </PageHead>

        <section
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-5"
            aria-label="Filter artikel"
        >
            <div
                class="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_150px_150px_190px] lg:items-end"
            >
                <label
                    ><span
                        class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50"
                        >Cari</span
                    ><input
                        v-model="search"
                        type="search"
                        placeholder="Cari judul atau slug..."
                        class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/15" /></label
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
                ><label
                    ><span
                        class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50"
                        >City</span
                    ><select
                        v-model="cityFilter"
                        class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm"
                    >
                        <option value="">Semua city</option>
                        <option>GENERAL</option>
                        <option>MAKKAH</option>
                        <option>MADINAH</option>
                    </select></label
                ><label
                    ><span
                        class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50"
                        >Kategori</span
                    ><select
                        v-model="categoryFilter"
                        class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm"
                    >
                        <option value="">Semua kategori</option>
                        <option
                            v-for="category in categoryOptions"
                            :key="category"
                        >
                            {{ category }}
                        </option>
                    </select></label
                >
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
                aria-labelledby="article-list-heading"
            >
                <div class="flex items-center justify-between">
                    <label class="mr-3 flex items-center gap-2 text-xs"
                        ><input
                            type="checkbox"
                            :checked="allSelected"
                            @change="selectPage(articles)"
                        />
                        Halaman</label
                    >
                    <h2
                        id="article-list-heading"
                        class="font-heading text-lg font-semibold"
                    >
                        Daftar Artikel
                    </h2>
                    <span class="text-xs text-neutral-charcoal/50"
                        >{{ total }} artikel · halaman {{ currentPage }} /
                        {{ Math.max(pageCount, 1) }}</span
                    >
                </div>
                <div
                    v-if="pending"
                    class="py-12 text-center text-sm text-neutral-charcoal/50"
                >
                    Memuat artikel...
                </div>
                <div
                    v-else-if="!articles.length"
                    class="border-t border-neutral-line py-12 text-center text-sm text-neutral-charcoal/55"
                >
                    Belum ada artikel.
                </div>
                <div v-else class="mt-4 divide-y divide-neutral-line">
                    <button
                        v-for="article in articles"
                        :key="article.id"
                        type="button"
                        class="flex w-full items-center gap-3 py-3 text-left hover:bg-neutral-soft/50"
                        @click="editArticle(article)"
                    >
                        <input
                            type="checkbox"
                            class="shrink-0"
                            :checked="isSelected(article.id)"
                            @click.stop="toggle(article.id)"
                        />
                        <div
                            class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-soft"
                        >
                            <img
                                v-if="article.heroImage"
                                :src="article.heroImage"
                                :alt="article.heroImageAlt || article.title"
                                class="h-full w-full object-cover"
                            /><span
                                v-else
                                class="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.08em] text-neutral-charcoal/40"
                                >No image</span
                            >
                        </div>
                        <span class="min-w-0 flex-1"
                            ><span
                                class="block truncate font-semibold text-neutral-charcoal"
                                >{{ article.title }}</span
                            ><span
                                class="mt-1 block text-xs text-neutral-charcoal/55"
                                >{{ article.city }} · {{ article.category }} ·
                                Prioritas {{ article.priority }}</span
                            ><span
                                class="mt-1 block text-xs text-neutral-charcoal/45"
                                >Terbit: {{ formatDate(article.publishedAt) }} ·
                                Diubah:
                                {{ formatUpdated(article.updatedAt) }}</span
                            ></span
                        ><span
                            class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
                            :class="
                                article.status === 'PUBLISHED'
                                    ? 'bg-sht-olive/10 text-brand-green'
                                    : article.status === 'ARCHIVED'
                                      ? 'bg-neutral-line text-neutral-charcoal/55'
                                      : 'bg-gold-sand text-neutral-charcoal/70'
                            "
                            >{{ article.status }}</span
                        >
                    </button>
                </div>
                <div
                    v-if="pageCount > 1"
                    class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-line pt-4"
                >
                    <div class="flex items-center gap-1">
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
                                    : 'border border-neutral-line text-neutral-charcoal/70'
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
                            Next
                        </button>
                    </div>
                    <label
                        class="flex items-center gap-2 text-xs text-neutral-charcoal/55"
                        >Per halaman<select
                            v-model.number="pageSize"
                            class="rounded-lg border border-neutral-line px-2 py-1 text-xs"
                            @change="changePageSize"
                        >
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="50">50</option>
                        </select></label
                    >
                </div>
            </section>

            <section
                class="rounded-2xl border max-h-fit border-neutral-line bg-white p-5"
                aria-labelledby="article-editor-heading"
            >
                <div class="flex items-center justify-between gap-3">
                    <h2
                        id="article-editor-heading"
                        class="font-heading text-lg font-semibold"
                    >
                        {{ editingArticle ? "Edit Artikel" : "Artikel Baru" }}
                    </h2>
                    <button
                        v-if="editingId"
                        type="button"
                        class="text-xs font-semibold text-neutral-charcoal/55 underline underline-offset-4"
                        @click="emptyForm"
                    >
                        Reset
                    </button>
                </div>
                <div class="mt-4 flex gap-2 border-b border-neutral-line pb-3"><button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="localeTab==='id'?'bg-sht-olive text-white':'border border-neutral-line'" @click="switchLocale('id')">Indonesia</button><button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="localeTab==='en'?'bg-sht-olive text-white':'border border-neutral-line'" @click="switchLocale('en')">English</button><span v-if="localeTab==='en'" class="self-center text-xs text-neutral-charcoal/55">Opsional · dapat disimpan partial</span></div><div v-if="localeTab==='en'" class="space-y-4 rounded-xl border border-sht-gold/30 bg-gold-sand/20 p-4"><label class="block text-sm font-semibold">Judul English<input v-model="enTranslation.title" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="English title"/></label><label class="block text-sm font-semibold">Slug English<input v-model="enTranslation.slug" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="english-slug (opsional untuk draft)"/></label><label class="block text-sm font-semibold">Excerpt English<textarea v-model="enTranslation.excerpt" rows="3" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label><label class="block text-sm font-semibold">Body English<textarea :value="enTranslation.body.map((b:any)=>b.text||'').join('\n')" rows="6" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Satu paragraf per baris" @input="enTranslation.body=($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean).map(text=>({type:'paragraph',text}))"/></label><p class="text-xs text-neutral-charcoal/55">Completeness publik membutuhkan judul, slug, excerpt, dan body.</p></div><div v-else><div class="mt-5 space-y-4">
                    <label class="block text-sm font-semibold"
                        >Judul<input
                            data-field="title"
                            v-model="form.title"
                            type="text"
                            class="mt-1.5 min-h-[42px] w-full rounded-xl border px-3 text-sm font-normal"
                            :class="
                                fieldErrors.title
                                    ? 'border-red-400'
                                    : 'border-neutral-line'
                            "
                            placeholder="Judul artikel"
                        /><span
                            v-if="fieldErrors.title"
                            class="mt-1 block text-xs font-normal text-red-700"
                            >{{ fieldErrors.title }}</span
                        ></label
                    ><label class="block text-sm font-semibold"
                        >Slug<input
                            data-field="slug"
                            v-model="form.slug"
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
                        >Excerpt
                        <p
                            class="mt-1 text-xs font-normal text-neutral-charcoal/55"
                        >
                            Ringkasan singkat yang digunakan pada kartu artikel
                            dan preview.
                        </p>
                        <textarea
                            v-model="form.excerpt"
                            rows="3"
                            class="mt-1.5 w-full rounded-xl border border-neutral-line px-3 py-2 text-sm font-normal"
                        />
                    </label>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="block text-sm font-semibold"
                            >City<select
                                v-model="form.city"
                                class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm font-normal"
                            >
                                <option>GENERAL</option>
                                <option>MAKKAH</option>
                                <option>MADINAH</option>
                            </select></label
                        ><label class="block text-sm font-semibold"
                            >Content Type<select
                                v-model="form.contentType"
                                class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm font-normal"
                            >
                                <option
                                    v-for="option in contentTypeOptions"
                                    :key="option.value"
                                    :value="option.value"
                                >
                                    {{ option.label }}
                                </option>
                            </select></label
                        >
                    </div>
                    <div class="grid gap-3 sm:grid-cols-[1fr_100px]">
                        <label class="block text-sm font-semibold"
                            >Kategori<select
                                data-field="category"
                                v-model="form.category"
                                class="mt-1.5 min-h-[42px] w-full rounded-xl border px-3 text-sm font-normal"
                                :class="
                                    fieldErrors.category
                                        ? 'border-red-400'
                                        : 'border-neutral-line'
                                "
                            >
                                <option value="">Pilih kategori</option>
                                <option
                                    v-for="category in categoryOptions"
                                    :key="category"
                                >
                                    {{ category }}
                                </option></select
                            ><span
                                v-if="fieldErrors.category"
                                class="mt-1 block text-xs font-normal text-red-700"
                                >{{ fieldErrors.category }}</span
                            ></label
                        ><label class="block text-sm font-semibold"
                            >Prioritas<input
                                v-model.number="form.priority"
                                type="number"
                                class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm font-normal"
                        /></label>
                    </div>
                    <label class="block text-sm font-semibold"
                        >Tags<span class="font-normal text-neutral-charcoal/50">
                            (pisahkan dengan koma)</span
                        ><input
                            v-model="form.tags"
                            type="text"
                            class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm font-normal"
                            placeholder="makkah, panduan"
                    /></label>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <MediaImageUploader
                            v-model="form.heroImage"
                            @update:file-id="form.heroImageFileId = $event"
                            label="Hero Image"
                            folder="articles"
                        /><label class="block text-sm font-semibold"
                            >Hero Image Alt<input
                                v-model="form.heroImageAlt"
                                type="text"
                                class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm font-normal"
                        /></label>
                    </div>

                    <div class="border-t border-neutral-line pt-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="font-semibold">Body Blocks</h3>
                                <p
                                    class="mt-1 text-xs text-neutral-charcoal/55"
                                >
                                    Structured JSON blocks, bukan raw HTML.
                                </p>
                            </div>
                            <select
                                class="min-h-[36px] rounded-full border border-neutral-line px-3 text-xs"
                                @change="
                                    (event) => {
                                        const select =
                                            event.target as HTMLSelectElement;
                                        if (select.value)
                                            addBlock(
                                                select.value as ArticleBlock['type'],
                                            );
                                        select.value = '';
                                    }
                                "
                            >
                                <option value="">Tambah block...</option>
                                <option value="paragraph">Paragraph</option>
                                <option value="heading">H2 / H3</option>
                                <option value="image">Image</option>
                                <option value="blockquote">Quote</option>
                                <option value="list">
                                    Bullet / Numbered List
                                </option>
                                <option value="callout">Info / Callout</option>
                            </select>
                        </div>
                        <div class="mt-4 space-y-3">
                            <div
                                v-for="(block, index) in form.body"
                                :key="index"
                                class="rounded-xl border border-neutral-line p-3"
                            >
                                <div
                                    class="flex items-center justify-between gap-3"
                                >
                                    <span
                                        class="text-xs font-semibold uppercase tracking-[0.12em] text-gold"
                                        >{{
                                            block.type === "heading"
                                                ? `H${block.level}`
                                                : block.type
                                        }}</span
                                    ><button
                                        type="button"
                                        class="text-xs text-red-700"
                                        @click="removeBlock(index)"
                                    >
                                        Hapus
                                    </button>
                                </div>
                                <textarea
                                    v-if="
                                        [
                                            'paragraph',
                                            'blockquote',
                                            'callout',
                                        ].includes(block.type)
                                    "
                                    :data-field="`body-${index}`"
                                    v-model="block.text"
                                    rows="3"
                                    class="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                                    :class="
                                        fieldErrors[`body-${index}`]
                                            ? 'border-red-400'
                                            : 'border-neutral-line'
                                    "
                                />
                                <div
                                    v-else-if="block.type === 'heading'"
                                    class="mt-2 grid gap-2 sm:grid-cols-[90px_1fr]"
                                >
                                    <select
                                        v-model.number="block.level"
                                        class="rounded-lg border border-neutral-line px-2 text-sm"
                                    >
                                        <option :value="2">H2</option>
                                        <option :value="3">H3</option></select
                                    ><input
                                        :data-field="`body-${index}`"
                                        v-model="block.text"
                                        type="text"
                                        class="rounded-lg border border-neutral-line px-3 text-sm"
                                        placeholder="Subheading"
                                    />
                                </div>
                                <div
                                    v-else-if="block.type === 'list'"
                                    class="mt-2"
                                >
                                    <select
                                        v-model="block.ordered"
                                        class="rounded-lg border border-neutral-line px-2 py-1 text-xs"
                                    >
                                        <option :value="false">Bullet</option>
                                        <option :value="true">
                                            Numbered
                                        </option></select
                                    ><textarea
                                        :value="(block.items ?? []).join('\n')"
                                        rows="3"
                                        class="mt-2 w-full rounded-lg border border-neutral-line px-3 py-2 text-sm"
                                        @input="
                                            block.items = (
                                                $event.target as HTMLTextAreaElement
                                            ).value.split('\n')
                                        "
                                    />
                                </div>
                                <div v-else class="mt-2 grid gap-2">
                                    <MediaImageUploader
                                        v-model="block.src"
                                        @update:file-id="block.fileId = $event"
                                        label="Body image"
                                        folder="articles"
                                    /><input
                                        v-model="block.alt"
                                        type="text"
                                        class="rounded-lg border border-neutral-line px-3 py-2 text-sm"
                                        placeholder="Alt text"
                                    /><input
                                        v-model="block.caption"
                                        type="text"
                                        class="rounded-lg border border-neutral-line px-3 py-2 text-sm"
                                        placeholder="Caption (opsional)"
                                    />
                                </div>
                                <p
                                    v-if="fieldErrors[`body-${index}`]"
                                    class="mt-1 text-xs text-red-700"
                                >
                                    {{ fieldErrors[`body-${index}`] }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="flex flex-wrap gap-2 border-t border-neutral-line pt-4"
                    >
                        <button
                            type="button"
                            class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold hover:border-brand-green/40"
                            @click="previewOpen = !previewOpen"
                        >
                            {{
                                previewOpen ? "Tutup Preview" : "Preview"
                            }}</button
                        ><button
                            type="button"
                            class="rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                            @click="saveArticle('DRAFT')"
                        >
                            Simpan Draft</button
                        ><button
                            v-if="
                                form.status !== 'PUBLISHED' &&
                                form.status !== 'ARCHIVED'
                            "
                            type="button"
                            class="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-brand-green"
                            @click="saveArticle('PUBLISHED')"
                        >
                            Publish</button
                        ><button
                            v-if="editingId && form.status === 'PUBLISHED'"
                            type="button"
                            class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold"
                            @click="saveArticle('DRAFT')"
                        >
                            Return ke Draft</button
                        ><button
                            v-if="editingId && form.status !== 'ARCHIVED'"
                            type="button"
                            class="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                            @click="saveArticle('ARCHIVED')"
                        >
                            Archive</button
                        ><button
                            v-if="editingId"
                            type="button"
                            class="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800"
                            @click="deleteConfirmOpen = true"
                        >
                            Delete Artikel
                        </button>
                    </div>
                    </div>
                </div>
            </section>
        </div>

        <section
            v-if="previewOpen"
            class="mt-6 rounded-2xl border border-neutral-line bg-white p-6"
            aria-label="Preview artikel"
        >
            <p
                class="text-xs font-semibold uppercase tracking-[0.16em] text-gold"
            >
                Preview · {{ form.city }} · {{ form.category }}
            </p>
            <h2
                class="mt-3 font-heading text-3xl font-semibold text-neutral-charcoal"
            >
                {{ form.title || "Judul artikel" }}
            </h2>
            <p
                class="mt-3 max-w-2xl text-base leading-relaxed text-neutral-charcoal/65"
            >
                {{ form.excerpt || "Excerpt artikel..." }}
            </p>
            <img
                v-if="form.heroImage"
                :src="form.heroImage"
                :alt="form.heroImageAlt"
                class="mt-6 max-h-[420px] w-full max-w-4xl rounded-xl object-cover"
            />
            <div class="mt-8 max-w-2xl text-neutral-charcoal/80">
                <template v-for="(block, index) in form.body" :key="index">
                    <p
                        v-if="block.type === 'paragraph'"
                        class="mb-5 text-sm leading-7"
                    >
                        {{ block.text }}
                    </p>
                    <h2
                        v-else-if="
                            block.type === 'heading' && block.level === 2
                        "
                        class="mb-4 mt-9 text-2xl font-bold leading-tight text-neutral-charcoal"
                    >
                        {{ block.text }}
                    </h2>
                    <h3
                        v-else-if="block.type === 'heading'"
                        class="mb-3 mt-7 text-xl font-semibold leading-tight text-neutral-charcoal"
                    >
                        {{ block.text }}
                    </h3>
                    <blockquote
                        v-else-if="block.type === 'blockquote'"
                        class="mb-6 border-l-2 border-gold pl-4 text-base italic leading-7 text-neutral-charcoal/75"
                    >
                        {{ block.text }}
                    </blockquote>
                    <ul
                        v-else-if="block.type === 'list' && !block.ordered"
                        class="mb-6 list-disc space-y-2 pl-6 text-sm leading-7"
                    >
                        <li
                            v-for="(item, itemIndex) in block.items"
                            :key="`${index}-${itemIndex}`"
                        >
                            {{ item }}
                        </li>
                    </ul>
                    <ol
                        v-else-if="block.type === 'list'"
                        class="mb-6 list-decimal space-y-2 pl-6 text-sm leading-7"
                    >
                        <li
                            v-for="(item, itemIndex) in block.items"
                            :key="`${index}-${itemIndex}`"
                        >
                            {{ item }}
                        </li>
                    </ol>
                    <aside
                        v-else-if="block.type === 'callout'"
                        class="mb-6 border-l-2 border-gold bg-gold-sand/50 px-4 py-3 text-sm leading-6 text-neutral-charcoal/75"
                    >
                        {{ block.text }}
                    </aside>
                    <figure v-else-if="block.type === 'image'" class="mb-6">
                        <img
                            :src="block.src"
                            :alt="block.alt"
                            class="w-full rounded-xl object-cover"
                        />
                        <figcaption
                            v-if="block.caption"
                            class="mt-2 text-xs leading-5 text-neutral-charcoal/50"
                        >
                            {{ block.caption }}
                        </figcaption>
                    </figure>
                </template>
            </div>
        </section>

        <div
            v-if="deleteConfirmOpen"
            class="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-charcoal/40 p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-article-heading"
        >
            <div
                class="w-full max-w-md rounded-2xl border border-neutral-line bg-white p-6 shadow-xl"
            >
                <h2
                    id="delete-article-heading"
                    class="font-heading text-xl font-semibold text-neutral-charcoal"
                >
                    Hapus artikel?
                </h2>
                <p
                    class="mt-3 text-sm leading-relaxed text-neutral-charcoal/70"
                >
                    Artikel akan dihapus dan tidak lagi tersedia di CMS maupun
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
                        class="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        :disabled="deletePending"
                        @click="confirmDelete"
                    >
                        {{ deletePending ? "Menghapus..." : "Hapus Artikel" }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
