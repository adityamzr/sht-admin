<script setup lang="ts">
import { ChevronDown, LayoutGrid, LogOut, UserPen } from "lucide-vue-next";

type AdminUser = {
    id: number;
    email: string;
    name: string;
    avatarUrl?: string | null;
};
const { data: userResponse } = await useAdminFetch<{ user: AdminUser }>(
    "/api/admin/auth/me",
);
const user = computed(() => userResponse.value?.user);
const accountOpen = ref(false);
const accountEl = ref<HTMLElement | null>(null);

function close() {
    accountOpen.value = false;
}
async function logout() {
    await $fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
    await navigateTo("/login");
}
function outside(event: PointerEvent) {
    if (!accountEl.value?.contains(event.target as Node)) close();
}
function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") close();
}
onMounted(() => {
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
    <header
        class="fixed inset-x-0 top-0 z-50 h-16 border-b border-neutral-line bg-white/95 backdrop-blur"
    >
        <div
            class="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
            <NuxtLink
                to="/workspaces"
                class="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sht-gold"
            >
                <img
                    src="/assets/images/logo_sh.png"
                    class="h-9 w-9 shrink-0"
                    alt="Logo Sudut Haramain"
                />
                <div class="min-w-0 leading-tight">
                    <p
                        class="truncate font-heading text-sm font-semibold text-brand-green"
                    >
                        Sudut Haramain Admin
                    </p>
                    <p
                        class="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-charcoal/50"
                    >
                        <LayoutGrid class="h-3 w-3" /> Workspace
                    </p>
                </div>
            </NuxtLink>

            <div ref="accountEl" class="relative">
                <button
                    type="button"
                    class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-neutral-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sht-gold"
                    :aria-expanded="accountOpen"
                    aria-label="Menu akun"
                    @click="accountOpen = !accountOpen"
                >
                    <span
                        class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sht-olive-dark text-xs font-bold text-white"
                    >
                        <img
                            v-if="user?.avatarUrl"
                            :src="user.avatarUrl"
                            alt=""
                            class="h-full w-full object-cover"
                        />
                        <span v-else>{{
                            user?.name?.charAt(0)?.toUpperCase() || "A"
                        }}</span>
                    </span>
                    <span class="hidden sm:block"
                        ><span
                            class="block max-w-40 truncate text-sm font-semibold"
                            >{{ user?.name || "Admin" }}</span
                        ><span
                            class="block max-w-40 truncate text-[11px] text-neutral-charcoal/50"
                            >{{ user?.email || "" }}</span
                        ></span
                    >
                    <ChevronDown
                        class="hidden h-4 w-4 text-neutral-charcoal/50 sm:block"
                    />
                </button>
                <Transition name="platform-menu">
                    <div
                        v-if="accountOpen"
                        class="absolute right-0 top-full z-[60] mt-2 w-52 rounded-xl border border-neutral-line bg-white p-1 shadow-lg"
                    >
                        <NuxtLink
                            to="/profile"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-neutral-soft"
                            @click="close"
                            ><UserPen class="h-4 w-4" />Profil</NuxtLink
                        >
                        <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                            @click="logout"
                        >
                            <LogOut class="h-4 w-4" />Logout
                        </button>
                    </div>
                </Transition>
            </div>
        </div>
    </header>
</template>

<style scoped>
.platform-menu-enter-active,
.platform-menu-leave-active {
    transition:
        opacity var(--motion-fast) ease-out,
        transform var(--motion-fast) ease-out;
}
.platform-menu-enter-from,
.platform-menu-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
