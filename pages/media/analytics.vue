<script setup lang="ts">
import {
    Activity,
    BookOpen,
    Eye,
    FileText,
    MousePointerClick,
    Search,
    Users,
} from "lucide-vue-next";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const preset = ref(30),
    locale = ref(""),
    city = ref(""),
    customFrom = ref(""),
    customTo = ref(""),
    data = ref<any>(null),
    pending = ref(true),
    error = ref("");
const dates = computed(() => {
    const to = customTo.value
        ? new Date(customTo.value + "T23:59:59.999Z")
        : new Date();
    const from = customFrom.value
        ? new Date(customFrom.value + "T00:00:00.000Z")
        : new Date(to.getTime() - (preset.value - 1) * 86400000);
    return { from: from.toISOString(), to: to.toISOString() };
});
async function load() {
    pending.value = true;
    error.value = "";
    try {
        data.value = (
            await $fetch<any>("/api/admin/media/analytics", {
                query: {
                    ...dates.value,
                    locale: locale.value || undefined,
                    city: city.value || undefined,
                },
            })
        ).data;
    } catch (e: any) {
        error.value = e.data?.statusMessage || "Analytics gagal dimuat.";
    } finally {
        pending.value = false;
    }
}
watch([preset, locale, city], () => {
    customFrom.value = "";
    customTo.value = "";
    load();
});
watch([customFrom, customTo], () => {
    if (customFrom.value && customTo.value) load();
});
onMounted(load);
const cards = computed(() =>
    data.value
        ? [
              {
                  label: "Page Views",
                  value: data.value.overview.pageViews,
                  icon: Eye,
              },
              {
                  label: "Approx. Visitors",
                  value: data.value.overview.visitors,
                  icon: Users,
              },
              {
                  label: "Sessions",
                  value: data.value.overview.sessions,
                  icon: Activity,
              },
              {
                  label: "Article Views",
                  value: data.value.overview.articleViews,
                  icon: FileText,
              },
              {
                  label: "Pages / Session",
                  value: data.value.overview.pagesPerSession ?? "—",
                  icon: MousePointerClick,
              },
          ]
        : [],
);
const maxTrend = computed(() =>
    Math.max(
        1,
        ...(data.value?.trend || []).map((x: any) =>
            Math.max(x.pageViews, x.visitors),
        ),
    ),
);
const interactionLabels: any = {
    whatsapp_click: "WhatsApp Clicks",
    instagram_click: "Instagram Clicks",
    map_direction_click: "Buka Arah",
    gallery_open: "Gallery Opens",
    contribution_submit: "Kontribusi Berhasil",
    article_feedback_helpful: "Feedback Helpful",
    article_feedback_not_helpful: "Feedback Kurang Membantu",
};
const format = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);
</script>
<template>
    <div>
        <PageHead title="Analytics" subtitle="Performa sudutharamain.id" />
        <div
            class="mt-6 flex flex-wrap gap-3 rounded-2xl border border-neutral-line bg-white p-4"
        >
            <button
                v-for="n in [7, 30, 90]"
                :key="n"
                class="rounded-xl px-4 py-2 text-sm font-semibold"
                :class="
                    preset === n && !customFrom
                        ? 'bg-sht-olive text-white'
                        : 'bg-neutral-soft'
                "
                @click="preset = n"
            >
                {{ n }} Hari</button
            ><input
                v-model="customFrom"
                type="date"
                class="rounded-xl border border-neutral-line px-3 py-2 text-sm"
            /><input
                v-model="customTo"
                type="date"
                class="rounded-xl border border-neutral-line px-3 py-2 text-sm"
            /><select
                v-model="locale"
                class="rounded-xl border border-neutral-line px-3 py-2 text-sm"
            >
                <option value="">Semua Locale</option>
                <option value="id">Indonesia</option>
                <option value="en">English</option></select
            ><select
                v-model="city"
                class="rounded-xl border border-neutral-line px-3 py-2 text-sm"
            >
                <option value="">Semua Kota</option>
                <option value="MAKKAH">Makkah</option>
                <option value="MADINAH">Madinah</option>
            </select>
        </div>
        <p
            v-if="error"
            class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
            {{ error }}
        </p>
        <div
            v-if="pending"
            class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
            <div
                v-for="n in 5"
                :key="n"
                class="h-28 animate-pulse rounded-2xl bg-neutral-soft"
            />
        </div>
        <div v-else-if="data" class="mt-8 space-y-8">
            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div
                    v-for="card in cards"
                    :key="card.label"
                    class="rounded-2xl border border-neutral-line bg-white p-5"
                >
                    <component :is="card.icon" class="h-5 w-5 text-gold" />
                    <p class="mt-4 text-xs text-neutral-charcoal/55">
                        {{ card.label }}
                    </p>
                    <p class="mt-1 font-heading text-2xl font-semibold">
                        {{
                            typeof card.value === "number"
                                ? format(card.value)
                                : card.value
                        }}
                    </p>
                </div>
            </section>
            <p
                v-if="!data.overview.pageViews && !data.overview.articleViews"
                class="rounded-2xl border border-neutral-line bg-white p-8 text-center text-neutral-charcoal/55"
            >
                Belum ada data untuk periode ini.
            </p>
            <section
                class="rounded-2xl border border-neutral-line bg-white p-5"
            >
                <h2 class="font-heading text-xl font-semibold">
                    Trend Traffic
                </h2>
                <div class="mt-6 flex h-48 items-end gap-1 overflow-hidden">
                    <div
                        v-for="x in data.trend"
                        :key="x.day"
                        class="group flex min-w-0 flex-1 items-end justify-center gap-px"
                        :title="`${x.day}: ${x.pageViews} views, ${x.visitors} visitors`"
                    >
                        <span
                            class="w-2 rounded-t bg-sht-olive"
                            :style="{
                                height: `${Math.max(3, (x.pageViews / maxTrend) * 170)}px`,
                            }"
                        /><span
                            class="w-2 rounded-t bg-gold"
                            :style="{
                                height: `${Math.max(3, (x.visitors / maxTrend) * 170)}px`,
                            }"
                        />
                    </div>
                </div>
                <div class="mt-3 flex gap-5 text-xs text-neutral-charcoal/55">
                    <span>● Page Views</span
                    ><span class="text-gold">● Visitors</span>
                </div>
            </section>
            <section
                class="rounded-2xl border border-neutral-line bg-white p-5"
            >
                <h2 class="font-heading text-xl font-semibold">
                    Performa Konten
                </h2>
                <div class="mt-4 overflow-x-auto">
                    <table class="w-full min-w-[700px] text-left text-sm">
                        <thead class="text-xs text-neutral-charcoal/50">
                            <tr>
                                <th class="py-3">Judul</th>
                                <th>Views</th>
                                <th>Visitors</th>
                                <th>Feedback</th>
                                <th>Helpful Rate</th>
                                <th>Sinyal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="x in data.articles"
                                :key="x.id"
                                class="border-t"
                            >
                                <td class="py-3 font-medium">{{ x.title }}</td>
                                <td>{{ format(x.views) }}</td>
                                <td>{{ format(x.visitors) }}</td>
                                <td>{{ x.helpful }} / {{ x.notHelpful }}</td>
                                <td>
                                    {{
                                        x.helpfulRate === null
                                            ? "—"
                                            : x.helpfulRate + "%"
                                    }}
                                </td>
                                <td>
                                    <span
                                        class="rounded-full px-2 py-1 text-xs"
                                        :class="
                                            x.signal === 'Perlu Perhatian'
                                                ? 'bg-red-50 text-red-700'
                                                : x.signal === 'Perlu Dipantau'
                                                  ? 'bg-amber-50 text-amber-700'
                                                  : 'bg-green-50 text-green-700'
                                        "
                                        >{{ x.signal }}</span
                                    >
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
            <div class="grid gap-6 xl:grid-cols-3">
                <section
                    v-for="block in [
                        {
                            title: 'Top Halaman',
                            rows: data.topPages,
                            kind: 'page',
                        },
                        {
                            title: 'Panduan Terpopuler',
                            rows: data.guides,
                            kind: 'guide',
                        },
                        {
                            title: 'Pencarian Terpopuler',
                            rows: data.searches,
                            kind: 'search',
                        },
                    ]"
                    :key="block.title"
                    class="rounded-2xl border border-neutral-line bg-white p-5"
                >
                    <h2 class="font-heading text-lg font-semibold">
                        {{ block.title }}
                    </h2>
                    <div class="mt-4 space-y-3">
                        <div
                            v-for="(x, i) in block.rows"
                            :key="i"
                            class="flex justify-between gap-3 border-t pt-3 text-sm"
                        >
                            <span class="min-w-0 truncate">{{
                                x.path || x.title || x.keyword
                            }}</span
                            ><b>{{ format(x.views ?? x.count) }}</b>
                        </div>
                        <p
                            v-if="!block.rows.length"
                            class="text-sm text-neutral-charcoal/50"
                        >
                            Belum ada data.
                        </p>
                    </div>
                </section>
            </div>
            <div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                <section
                    v-for="block in [
                        {
                            title: 'Sumber Traffic',
                            rows: data.sources,
                            label: (x: any) => x.source,
                        },
                        {
                            title: 'Perangkat',
                            rows: data.devices,
                            label: (x: any) => x.device,
                        },
                        {
                            title: 'Interaksi',
                            rows: data.interactions,
                            label: (x: any) =>
                                interactionLabels[x.type] || x.type,
                        },
                        {
                            title: 'Insight Kota',
                            rows: data.cities,
                            label: (x: any) =>
                                x.city === 'MAKKAH' ? 'Makkah' : 'Madinah',
                        },
                    ]"
                    :key="block.title"
                    class="rounded-2xl border border-neutral-line bg-white p-5"
                >
                    <h2 class="font-heading text-lg font-semibold">
                        {{ block.title }}
                    </h2>
                    <div class="mt-4 space-y-3">
                        <div v-for="(x, i) in block.rows" :key="i">
                            <div class="flex justify-between text-sm">
                                <span>{{ block.label(x) }}</span
                                ><b>
                                    {{ format(x.count ?? x.views) }}
                                    <small
                                        v-if="x.percentage !== undefined"
                                        class="font-normal text-neutral-charcoal/50"
                                    >
                                        ({{ x.percentage }}%)
                                    </small>
                                </b>
                            </div>
                            <div class="mt-1 h-1.5 rounded bg-neutral-soft">
                                <div
                                    class="h-full rounded bg-sht-olive"
                                    :style="{
                                        width: `${Math.min(100, ((x.count ?? x.views) / Math.max(1, ...block.rows.map((r: any) => r.count ?? r.views))) * 100)}%`,
                                    }"
                                />
                            </div>
                        </div>
                        <p
                            v-if="!block.rows.length"
                            class="text-sm text-neutral-charcoal/50"
                        >
                            Belum ada data.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
