<script setup lang="ts">
import {
    BookOpen,
    FileText,
    Images,
    Inbox,
    MapPinned,
    MessageCircle,
    ArrowUpRight,
    CircleAlert,
} from "lucide-vue-next";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
type Dashboard = any;
const data = ref<Dashboard | null>(null),
    pending = ref(true),
    error = ref("");
const cards = computed(() =>
    data.value
        ? [
              {
                  label: "Artikel Terbit",
                  value: data.value.summary.articlesPublished,
                  to: "/media/articles?status=PUBLISHED",
                  icon: FileText,
                  tone: "green",
              },
              {
                  label: "Panduan Terbit",
                  value: data.value.summary.guidesPublished,
                  to: "/media/guides?status=PUBLISHED",
                  icon: BookOpen,
                  tone: "sage",
              },
              {
                  label: "Gallery Terbit",
                  value: data.value.summary.galleryPublished,
                  to: "/media/gallery?status=PUBLISHED",
                  icon: Images,
                  tone: "gold",
              },
              {
                  label: "Lokasi Aktif",
                  value: data.value.summary.locationsActive,
                  to: "/media/locations?active=true",
                  icon: MapPinned,
                  tone: "sage",
              },
              {
                  label: "Kontribusi Baru",
                  value: data.value.summary.contributionsNew,
                  to: "/media/contributions?status=NEW",
                  icon: Inbox,
                  tone: "gold",
              },
              {
                  label: "Total Feedback",
                  value: data.value.summary.feedbackTotal,
                  to: "/media/article-feedback",
                  icon: MessageCircle,
                  tone: "green",
              },
          ]
        : [],
);
const date = (v: string) =>
    new Date(v).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
const typeLabel = (v: string) =>
    v === "INFORMATION_CORRECTION"
        ? "Koreksi Informasi"
        : v === "PLACE_RECOMMENDATION"
          ? "Rekomendasikan Tempat"
          : "Tips & Pengalaman";
onMounted(async () => {
    try {
        const r = await $fetch<any>("/api/admin/media/dashboard");
        data.value = r.data;
    } catch (e: any) {
        error.value = e.data?.statusMessage || "Dashboard gagal dimuat.";
    } finally {
        pending.value = false;
    }
});
</script>
<template>
    <div>
        <PageHead
            title="Sudut Haramain Media"
            subtitle="Ringkasan operasional konten dan sinyal editorial."
            ><template #actions
                ><span
                    class="rounded-full border border-gold-soft bg-gold-sand/50 px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/70"
                    >MEDIA</span
                ></template
            ></PageHead
        >
        <p
            v-if="error"
            class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
        >
            {{ error }}
        </p>
        <div
            v-if="pending"
            class="mt-8 rounded-2xl border border-neutral-line bg-white p-8 text-sm text-neutral-charcoal/60"
        >
            Memuat metrik Media...
        </div>
        <div v-else-if="data" class="mt-8 space-y-8">
            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <NuxtLink
                    v-for="card in cards"
                    :key="card.label"
                    :to="card.to"
                    class="group rounded-2xl border border-neutral-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                    ><div class="flex items-center justify-between">
                        <span
                            class="rounded-xl p-2"
                            :class="
                                card.tone === 'green'
                                    ? 'bg-sht-olive/10 text-brand-green'
                                    : card.tone === 'gold'
                                      ? 'bg-gold-sand text-gold'
                                      : 'bg-neutral-soft text-neutral-charcoal/70'
                            "
                            ><component :is="card.icon" class="h-5 w-5" /></span
                        ><ArrowUpRight
                            class="h-4 w-4 text-neutral-charcoal/30 transition group-hover:text-brand-green"
                        />
                    </div>
                    <p class="mt-4 text-xs text-neutral-charcoal/55">
                        {{ card.label }}
                    </p>
                    <p class="mt-1 text-2xl font-heading font-semibold">
                        {{ card.value }}
                    </p></NuxtLink
                >
            </section>
            <section>
                <div class="flex items-center gap-2">
                    <CircleAlert class="h-5 w-5 text-gold" />
                    <h2 class="font-heading text-xl font-semibold">
                        Perlu Perhatian
                    </h2>
                </div>
                <div class="mt-4 grid gap-4 lg:grid-cols-3">
                    <div
                        class="rounded-2xl border border-neutral-line bg-white p-5"
                    >
                        <h3 class="font-semibold">Kontribusi Baru</h3>
                        <div
                            v-if="data.attention.contributions.length"
                            class="mt-3 space-y-3"
                        >
                            <NuxtLink
                                v-for="x in data.attention.contributions"
                                :key="x.id"
                                to="/media/contributions"
                                class="block border-b pb-3 last:border-0"
                                ><p class="text-xs font-semibold text-gold">
                                    {{ typeLabel(x.type) }} ·
                                    {{ x.city || "Umum" }}
                                </p>
                                <p class="mt-1 line-clamp-2 text-sm">
                                    {{ x.subject || x.message }}
                                </p>
                                <small class="text-neutral-charcoal/45">{{
                                    date(x.createdAt)
                                }}</small></NuxtLink
                            >
                        </div>
                        <p v-else class="mt-4 text-sm text-neutral-charcoal/55">
                            Tidak ada kontribusi baru.
                        </p>
                    </div>
                    <div
                        class="rounded-2xl border border-neutral-line bg-white p-5"
                    >
                        <h3 class="font-semibold">
                            Artikel dengan Sinyal Negatif
                        </h3>
                        <div
                            v-if="data.attention.feedback.length"
                            class="mt-3 space-y-3"
                        >
                            <NuxtLink
                                v-for="x in data.attention.feedback"
                                :key="x.id"
                                to="/media/article-feedback"
                                class="block border-b pb-3 last:border-0"
                                ><p class="line-clamp-2 text-sm font-semibold">
                                    {{ x.title }}
                                </p>
                                <small class="text-red-700"
                                    >{{ x.notHelpful }} Kurang Membantu ·
                                    {{ x.helpfulRatio }}% Helpful</small
                                ></NuxtLink
                            >
                        </div>
                        <p v-else class="mt-4 text-sm text-brand-green">
                            Tidak ada artikel yang perlu perhatian.
                        </p>
                    </div>
                    <div
                        class="rounded-2xl border border-neutral-line bg-white p-5"
                    >
                        <h3 class="font-semibold">Draft Terbaru</h3>
                        <div
                            v-if="data.attention.drafts.length"
                            class="mt-3 space-y-3"
                        >
                            <NuxtLink
                                v-for="x in data.attention.drafts"
                                :key="`${x.kind}-${x.id}`"
                                :to="
                                    x.kind === 'article'
                                        ? `/media/articles`
                                        : '/media/guides'
                                "
                                class="block border-b pb-3 last:border-0"
                                ><p
                                    class="text-xs uppercase text-neutral-charcoal/45"
                                >
                                    {{ x.kind }}
                                </p>
                                <p class="line-clamp-2 text-sm font-semibold">
                                    {{ x.title }}
                                </p>
                                <small class="text-neutral-charcoal/45">{{
                                    date(x.updatedAt)
                                }}</small></NuxtLink
                            >
                        </div>
                        <p v-else class="mt-4 text-sm text-neutral-charcoal/55">
                            Tidak ada draft terbaru.
                        </p>
                    </div>
                </div>
            </section>
            <section>
                <h2 class="font-heading text-xl font-semibold">
                    Aktivitas Terbaru
                </h2>
                <div
                    class="mt-4 divide-y rounded-2xl border border-neutral-line bg-white"
                >
                    <NuxtLink
                        v-for="(x, i) in data.recentActivity"
                        :key="`${x.kind}-${x.id}-${i}`"
                        :to="x.to"
                        class="flex items-center gap-4 p-4 hover:bg-neutral-soft/40"
                        ><span
                            class="h-2 w-2 shrink-0 rounded-full bg-gold"
                        /><span class="min-w-0 flex-1"
                            ><p class="text-sm font-semibold">{{ x.label }}</p>
                            <p
                                class="truncate text-sm text-neutral-charcoal/60"
                            >
                                {{ x.title }}
                            </p></span
                        ><small
                            class="shrink-0 text-xs text-neutral-charcoal/45"
                            >{{ date(x.time) }}</small
                        ></NuxtLink
                    >
                    <p
                        v-if="!data.recentActivity.length"
                        class="p-8 text-center text-sm text-neutral-charcoal/55"
                    >
                        Belum ada aktivitas.
                    </p>
                </div>
            </section>
        </div>
    </div>
</template>
