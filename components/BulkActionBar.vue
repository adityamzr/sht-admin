<script setup lang="ts">
const props = defineProps<{
    count: number;
    label?: string;
    actions: Array<{
        value: string;
        label: string;
        tone?: "default" | "warning";
    }>;
}>();
const emit = defineEmits<{ action: [string]; clear: [] }>();
const confirmValue = ref<string | null>(null);
const confirmLabel = computed(
    () =>
        props.actions.find((a) => a.value === confirmValue.value)?.label ||
        "aksi ini",
);
function request(a: {
    value: string;
    label: string;
    tone?: "default" | "warning";
}) {
    if (a.tone === "warning" || props.count >= 10) confirmValue.value = a.value;
    else emit("action", a.value);
}
function confirm() {
    if (confirmValue.value) {
        emit("action", confirmValue.value);
        confirmValue.value = null;
    }
}
</script>
<template>
    <div
        v-if="count"
        class="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-gold-soft bg-gold-sand/40 p-3"
    >
        <strong class="mr-auto text-sm"
            >{{ count }} {{ label || "item" }} dipilih</strong
        ><button
            v-for="a in actions"
            :key="a.value"
            class="rounded-full border border-neutral-line bg-white px-3 py-1.5 text-xs font-semibold"
            @click="request(a)"
        >
            {{ a.label }}</button
        ><button
            class="px-2 py-1 text-xs font-semibold text-neutral-charcoal/60"
            @click="emit('clear')"
        >
            Batalkan pilihan
        </button>
    </div>
    <div
        v-if="confirmValue"
        class="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-charcoal/40 p-5"
    >
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 class="font-heading text-lg font-semibold">
                {{ confirmLabel }} {{ count }} item?
            </h2>
            <p class="mt-2 text-sm text-neutral-charcoal/65">
                Perubahan akan diterapkan pada item di halaman ini.
            </p>
            <div class="mt-5 flex justify-end gap-2">
                <button
                    class="rounded-full border px-4 py-2 text-sm"
                    @click="confirmValue = null"
                >
                    Batal</button
                ><button
                    class="rounded-full bg-sht-olive px-4 py-2 text-sm text-white"
                    @click="confirm"
                >
                    Konfirmasi
                </button>
            </div>
        </div>
    </div>
</template>
