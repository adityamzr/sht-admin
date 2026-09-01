<script setup lang="ts">
import { List, Pencil, Plus } from "lucide-vue-next";
import { articleEditorTranslation, isCompleteArticleTranslation, type ArticleBlock, type ArticleTranslationInput } from "~/shared/article-localization";
import type { SupportedLocale } from "~/shared/locales";
const { show: showGlobalToast } = useAdminToast();
definePageMeta({ layout: "admin", middleware: "admin-auth" });

type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
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
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImage?: string | null;
    translations?: Partial<Record<SupportedLocale, Omit<ArticleTranslationInput, 'body'> & { body: ArticleBlock[]; complete: boolean }>>;
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
    "Sains & Teknologi",
    "Hiburan & Permainan",
    "Gaya Hidup",
    "Komunitas",
    "Lainnya",
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
const translationFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const pageCount = ref(0);
const editingId = ref<number | null>(null);
const previewOpen = ref(false);
const articleListOpen = ref(true);
const mobileWorkspaceTab = ref<'edit' | 'preview'>('edit');
const deleteConfirmOpen = ref(false);
const deletePending = ref(false);
const slugTouched = ref(false);
const fieldErrors = reactive<Record<string, string>>({});
const toast = ref<Toast | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const localeTab = ref<SupportedLocale>('id'); const enTranslation = reactive({ title:'', slug:'', excerpt:'', heroAlt:'', body:[] as ArticleBlock[], seoTitle:'', seoDescription:'' });
const form = reactive({
    title: "",
    slug: "",
    excerpt: "",
    heroImage: "",
    heroImageFileId: "",
    heroImageAlt: "",
    seoTitle: "",
    seoDescription: "",
    ogImage: "",
    publishedAt: null as string | null,
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
const previewLocale = ref<SupportedLocale>('id'); const previewTitle = computed(()=>previewLocale.value==='en'?enTranslation.title:form.title); const previewExcerpt = computed(()=>previewLocale.value==='en'?enTranslation.excerpt:form.excerpt); const previewHeroAlt = computed(()=>previewLocale.value==='en'?enTranslation.heroAlt:form.heroImageAlt); const previewBody = computed(()=>previewLocale.value==='en'?enTranslation.body:form.body);
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
function switchLocale(locale: SupportedLocale){localeTab.value=locale;previewLocale.value=locale}
function clearEnglish(){Object.assign(enTranslation,{title:'',slug:'',excerpt:'',heroAlt:'',body:[],seoTitle:'',seoDescription:''})}
function emptyForm() {
    editingId.value = null;
    localeTab.value = 'id'; previewLocale.value = 'id'; clearEnglish();
    slugTouched.value = false;
    clearErrors();
    Object.assign(form, {
        title: "",
        slug: "",
        excerpt: "",
        heroImage: "",
        heroImageFileId: "",
        heroImageAlt: "",
        seoTitle: "",
        seoDescription: "",
        ogImage: "",
        publishedAt: null,
        city: "GENERAL",
        contentType: "article",
        category: "Kehidupan",
        tags: "",
        status: "DRAFT",
        priority: 0,
        body: [{ type: "paragraph", text: "" }],
    });
    previewOpen.value = true;
    articleListOpen.value = false;
    mobileWorkspaceTab.value = 'edit';
}
function editArticle(article: AdminArticle) {
    editingId.value = article.id;
    slugTouched.value = true;
    clearErrors();
    const idTranslation = articleEditorTranslation(article, 'id');
    Object.assign(form, {
        title: idTranslation.title,
        slug: idTranslation.slug,
        excerpt: idTranslation.excerpt,
        heroImage: article.heroImage,
        heroImageFileId: article.heroImageFileId ?? "",
        heroImageAlt: idTranslation.heroAlt,
        city: article.city,
        contentType: article.contentType,
        category: article.category,
        tags: article.tags.join(", "),
        status: article.status,
        priority: article.priority,
        body: idTranslation.body,
        seoTitle: idTranslation.seoTitle,
        seoDescription: idTranslation.seoDescription,
        ogImage: article.ogImage ?? "",
        publishedAt: article.publishedAt,
    });
    Object.assign(enTranslation, articleEditorTranslation(article, 'en'));
    localeTab.value = 'id';
    previewLocale.value = 'id';
    previewOpen.value = true;
    articleListOpen.value = false;
    mobileWorkspaceTab.value = 'edit';
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
        heroImage: form.heroImage.trim(),
        heroImageFileId: form.heroImageFileId || null,
        city: form.city,
        contentType: form.contentType,
        category: form.category.trim(),
        tags: form.tags.split(",").map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean),
        status,
        priority: Number(form.priority) || 0,
        publishedAt: status === "PUBLISHED" ? form.publishedAt : null,
        ogImage: form.ogImage || null,
        translations: {
            id: {
                title: form.title.trim(), slug: form.slug.trim(), excerpt: form.excerpt.trim(),
                heroAlt: form.heroImageAlt.trim(), body: form.body.map(normalizeBlock),
                seoTitle: form.seoTitle.trim() || null, seoDescription: form.seoDescription.trim() || null,
            },
            en: {
                title: enTranslation.title.trim(), slug: enTranslation.slug.trim() || null,
                excerpt: enTranslation.excerpt.trim(), heroAlt: enTranslation.heroAlt.trim(),
                body: enTranslation.body.map(normalizeBlock), seoTitle: enTranslation.seoTitle.trim() || null,
                seoDescription: enTranslation.seoDescription.trim() || null,
            },
        },
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
                translation: translationFilter.value || undefined,
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
function translationComplete(article: AdminArticle, locale: SupportedLocale) {
    return isCompleteArticleTranslation(articleEditorTranslation(article, locale));
}
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
watch([search, statusFilter, cityFilter, categoryFilter, translationFilter], () => {
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
watch([search, statusFilter, cityFilter, categoryFilter, translationFilter], () => clear());
watch(currentPage, () => clear());
</script>

<template>
    <div>
        <PageHead title="Artikel" subtitle="Media · Content Library">
            <template #actions>
                <button type="button" class="inline-flex items-center gap-2 rounded-full border border-neutral-line bg-white px-4 py-2 text-sm font-semibold" @click="articleListOpen = !articleListOpen"><List class="h-4 w-4" />{{ articleListOpen ? 'Tutup Daftar' : 'Daftar Artikel' }}</button>
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
                class="grid gap-3 lg:grid-cols-[minmax(200px,1fr)_repeat(4,minmax(120px,150px))] lg:items-end"
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
                ><label>
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-charcoal/50">English</span>
                    <select v-model="translationFilter" class="mt-1.5 min-h-[42px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                        <option value="">Semua</option>
                        <option value="complete">Lengkap</option>
                        <option value="incomplete">Belum Lengkap</option>
                    </select>
                </label
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
            class="mt-6 space-y-6"
        >
            <section
                v-if="articleListOpen"
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
                                {{ formatUpdated(article.updatedAt) }}</span>
                            <span class="mt-2 flex flex-wrap gap-1" aria-label="Kelengkapan terjemahan">
                                <AdminStatusBadge :status="translationComplete(article, 'id') ? 'ACTIVE' : 'INACTIVE'" :label="translationComplete(article, 'id') ? 'ID ✓' : 'ID —'" />
                                <AdminStatusBadge :status="translationComplete(article, 'en') ? 'ACTIVE' : 'INACTIVE'" :label="translationComplete(article, 'en') ? 'EN ✓' : 'EN —'" />
                            </span></span
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

            <div class="flex rounded-xl border border-neutral-line bg-white p-1 lg:hidden" role="tablist" aria-label="Mode workspace"><button type="button" role="tab" class="flex-1 rounded-lg px-4 py-2 text-sm font-semibold" :class="mobileWorkspaceTab === 'edit' ? 'bg-sht-olive text-white' : ''" :aria-selected="mobileWorkspaceTab === 'edit'" @click="mobileWorkspaceTab = 'edit'"><Pencil class="mr-1 inline h-4 w-4" />Edit</button><button type="button" role="tab" class="flex-1 rounded-lg px-4 py-2 text-sm font-semibold" :class="mobileWorkspaceTab === 'preview' ? 'bg-sht-olive text-white' : ''" :aria-selected="mobileWorkspaceTab === 'preview'" @click="mobileWorkspaceTab = 'preview'">Preview</button></div>
            <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                <div class="lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto" :class="mobileWorkspaceTab === 'preview' ? 'block' : 'hidden lg:block'"><ArticleLivePreview :title="previewTitle" :excerpt="previewExcerpt" :hero-image="form.heroImage" :hero-alt="previewHeroAlt" :body="previewBody" :locale-label="previewLocale === 'en' ? 'English' : 'Indonesia'" :city="form.city" :category="form.category" /></div>

            <section
                :class="mobileWorkspaceTab === 'edit' ? 'block' : 'hidden lg:block'"
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
                <div class="mt-4 flex gap-2 border-b border-neutral-line pb-3"><button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="localeTab==='id'?'bg-sht-olive text-white':'border border-neutral-line'" @click="switchLocale('id')">Indonesia</button><button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="localeTab==='en'?'bg-sht-olive text-white':'border border-neutral-line'" @click="switchLocale('en')">English</button><span v-if="localeTab==='en'" class="self-center text-xs text-neutral-charcoal/55">Opsional · dapat disimpan partial</span></div><div v-if="localeTab==='en'" class="space-y-4 rounded-xl border border-sht-gold/30 bg-gold-sand/20 p-4"><label class="block text-sm font-semibold">Judul English<input v-model="enTranslation.title" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="English title"/></label><label class="block text-sm font-semibold">Slug English<input v-model="enTranslation.slug" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="english-slug (opsional untuk draft)"/></label><label class="block text-sm font-semibold">Excerpt English<textarea v-model="enTranslation.excerpt" rows="3" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label><label class="block text-sm font-semibold">Hero Alt English<input v-model="enTranslation.heroAlt" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label><label class="block text-sm font-semibold">SEO Title English<input v-model="enTranslation.seoTitle" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label><label class="block text-sm font-semibold">SEO Description English<textarea v-model="enTranslation.seoDescription" rows="2" class="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label><MediaStructuredBlockEditor v-model="enTranslation.body" folder="articles"/><p class="text-xs text-neutral-charcoal/55">Completeness publik membutuhkan judul, slug, excerpt, dan body.</p></div><div v-else><div class="mt-5 space-y-4">
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

                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="block text-sm font-semibold">SEO Title Indonesia
                            <input v-model="form.seoTitle" class="mt-1.5 w-full rounded-xl border border-neutral-line px-3 py-2 text-sm font-normal" />
                        </label>
                        <label class="block text-sm font-semibold">SEO Description Indonesia
                            <textarea v-model="form.seoDescription" rows="2" class="mt-1.5 w-full rounded-xl border border-neutral-line px-3 py-2 text-sm font-normal" />
                        </label>
                    </div>
                    <MediaStructuredBlockEditor v-model="form.body" folder="articles" :errors="fieldErrors" />

                    </div>
                </div>

                    <div
                        class="flex flex-wrap gap-2 border-t border-neutral-line pt-4"
                    >
                        <button
                            type="button"
                            class="rounded-full border border-neutral-line px-4 py-2 text-sm font-semibold hover:border-brand-green/40"
                            @click="previewOpen = !previewOpen; previewLocale = localeTab"
                        >
                            {{
                                previewOpen ? "Tutup Preview" : "Preview"
                            }}</button
                        ><button
                            type="button"
                            class="rounded-full bg-sht-olive px-4 py-2 text-sm font-semibold text-white"
                            @click="saveArticle(form.status)"
                        >
                            {{ form.status === 'DRAFT' ? 'Simpan Draft' : 'Simpan Perubahan' }}</button
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
            </section>
            </div>
        </div>

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
