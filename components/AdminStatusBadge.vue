<script setup lang="ts">
import {
    Archive,
    CheckCheck,
    CircleCheck,
    CircleDot,
    CirclePause,
    Clock3,
    Eye,
    Pencil,
    RefreshCw,
    LayoutTemplate,
} from "lucide-vue-next";
const props = defineProps<{ status: string; label?: string }>();
const icon = computed(
    () =>
        ({
            PUBLISHED: CircleCheck,
            ACTIVE: CircleCheck,
            FOLLOWED_UP: CheckCheck,
            EDITABLE: Pencil,
            DYNAMIC: RefreshCw,
            STATIC: LayoutTemplate,
            DRAFT: Clock3,
            ARCHIVED: Archive,
            INACTIVE: CirclePause,
            NEW: CircleDot,
            READ: Eye,
        })[props.status] || CircleDot,
);
const tone = computed(
    () =>
        ({
            PUBLISHED: "border-brand-green/20 bg-sht-olive/10 text-brand-green",
            ACTIVE: "border-brand-green/20 bg-sht-olive/10 text-brand-green",
            FOLLOWED_UP:
                "border-brand-green/20 bg-sht-olive/10 text-brand-green",
            EDITABLE: "border-gold-soft bg-gold-sand text-neutral-charcoal",
            DYNAMIC: "border-sky-200 bg-sky-50 text-sky-700",
            STATIC: "border-neutral-line bg-neutral-soft text-neutral-charcoal/60",
            DRAFT: "border-gold-soft bg-gold-sand text-neutral-charcoal",
            ARCHIVED:
                "border-neutral-line bg-neutral-soft text-neutral-charcoal/60",
            INACTIVE:
                "border-neutral-line bg-neutral-soft text-neutral-charcoal/60",
            NEW: "border-sky-200 bg-sky-50 text-sky-700",
            READ: "border-sky-100 bg-sky-50/60 text-sky-700",
        })[props.status] ||
        "border-neutral-line bg-neutral-soft text-neutral-charcoal/60",
);
</script>
<template>
    <span
        class="inline-flex w-fit shrink-0 self-start items-center gap-1.5 rounded-full border px-2.5 py-1 h-fit text-[10px] font-semibold uppercase leading-none tracking-[0.1em]"
        :class="tone"
        ><component :is="icon" class="h-3.5 w-3.5" />{{ label || status }}</span
    >
</template>
