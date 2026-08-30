<script setup lang="ts">
import {
    Bell,
    ChevronDown,
    LogOut,
    UserPen,
    UserRound,
    X,
} from "lucide-vue-next";
type WorkspaceOption = {
    id: number;
    key: string;
    name: string;
    description: string | null;
    role: string;
};
type AdminUser = { id: number; email: string; name: string; isActive: boolean };
const route = useRoute();
const { data: workspaceResponse } = await useAdminFetch<{
    data: WorkspaceOption[];
}>("/api/admin/workspaces");
const { data: userResponse } = await useAdminFetch<{ user: AdminUser }>(
    "/api/admin/auth/me",
);
const workspaceOpen = ref(false),
    notificationOpen = ref(false),
    accountOpen = ref(false),
    workspaceEl = ref<HTMLElement | null>(null),
    notificationEl = ref<HTMLElement | null>(null),
    accountEl = ref<HTMLElement | null>(null);
const workspaces = computed(() => workspaceResponse.value?.data ?? []),
    currentKey = computed(() =>
        route.path === "/media" || route.path.startsWith("/media/")
            ? "media"
            : "tour",
    ),
    currentWorkspace = computed(
        () =>
            workspaces.value.find((x) => x.key === currentKey.value) ?? {
                key: currentKey.value,
                name:
                    currentKey.value === "media"
                        ? "Sudut Haramain Media"
                        : "Sudut Haramain Tour",
            },
    ),
    user = computed(() => userResponse.value?.user),
    workspaceAccent = computed(() =>
        currentKey.value === "media"
            ? "border-sht-olive/25 text-sht-olive"
            : "border-gold-soft text-neutral-charcoal",
    );
function workspacePath(key: string) {
    return key === "media" ? "/media" : "/tour";
}
function closeMenus() {
    workspaceOpen.value = false;
    notificationOpen.value = false;
    accountOpen.value = false;
}
function open(which: "workspace" | "notification" | "account") {
    workspaceOpen.value = which === "workspace";
    notificationOpen.value = which === "notification";
    accountOpen.value = which === "account";
}
async function logout() {
    await $fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
    navigateTo("/login");
}
function outside(e: PointerEvent) {
    const t = e.target as Node;
    if (workspaceOpen.value && !workspaceEl.value?.contains(t))
        workspaceOpen.value = false;
    if (notificationOpen.value && !notificationEl.value?.contains(t))
        notificationOpen.value = false;
    if (accountOpen.value && !accountEl.value?.contains(t))
        accountOpen.value = false;
}
function key(e: KeyboardEvent) {
    if (e.key === "Escape") closeMenus();
}
onMounted(() => {
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
});
onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("keydown", key);
});
watch(() => route.fullPath, closeMenus);
</script>
<template>
    <header
        class="fixed inset-x-0 top-0 z-50 h-16 border-b border-neutral-line bg-white/95 backdrop-blur lg:left-64"
    >
        <div
            class="flex h-full items-center justify-between gap-3 px-4 pl-[4.5rem] sm:px-6 lg:px-8 lg:pl-6"
        >
            <div ref="workspaceEl" class="relative min-w-0">
                <button
                    type="button"
                    class="flex max-w-fit items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold"
                    :class="workspaceAccent"
                    :aria-expanded="workspaceOpen"
                    @click="open('workspace')"
                >
                    <span
                        class="flex h-6 w-6 items-center justify-center rounded-lg bg-current/10 text-[10px] font-bold"
                        >{{ currentKey === "media" ? "M" : "T" }}</span
                    ><span class="truncate">{{ currentWorkspace.name }}</span
                    ><ChevronDown class="h-4 w-4 shrink-0 opacity-60" />
                </button>
                <div
                    v-if="workspaceOpen"
                    class="absolute left-0 top-full z-[60] mt-2 w-64 rounded-xl border bg-white p-1 shadow-lg"
                >
                    <NuxtLink
                        v-for="workspace in workspaces"
                        :key="workspace.key"
                        :to="workspacePath(workspace.key)"
                        class="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-neutral-soft"
                        @click="closeMenus"
                        ><span
                            class="flex h-5 w-5 items-center justify-center rounded-md bg-current/10 text-[9px] font-bold"
                            >{{ workspace.key === "media" ? "M" : "T" }}</span
                        ><span
                            ><span class="block">{{ workspace.name }}</span
                            ><span
                                class="text-[11px] text-neutral-charcoal/50"
                                >{{ workspace.role }}</span
                            ></span
                        ></NuxtLink
                    >
                </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
                <div ref="notificationEl" class="relative">
                    <button
                        type="button"
                        class="flex h-10 w-10 items-center justify-center rounded-full text-neutral-charcoal/65 hover:bg-neutral-soft hover:text-brand-green"
                        aria-label="Notifikasi"
                        :aria-expanded="notificationOpen"
                        @click="open('notification')"
                    >
                        <Bell class="h-5 w-5" />
                    </button>
                    <div
                        v-if="notificationOpen"
                        class="absolute right-0 top-full z-[60] mt-2 w-56 rounded-xl border bg-white p-4 text-sm shadow-lg"
                    >
                        <p class="font-semibold">Notifikasi</p>
                        <p class="mt-2 text-xs text-neutral-charcoal/55">
                            Belum ada notifikasi.
                        </p>
                    </div>
                </div>
                <span
                    class="hidden rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline-flex"
                    :class="workspaceAccent"
                    >{{ currentKey }}</span
                >
                <div ref="accountEl" class="relative">
                    <button
                        type="button"
                        class="flex max-w-fit items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-neutral-soft"
                        :aria-expanded="accountOpen"
                        aria-label="Menu akun"
                        @click="open('account')"
                    >
                        <span
                            class="flex h-8 w-8 items-center justify-center rounded-full bg-sht-olive-dark text-xs font-bold text-white"
                            >{{
                                user?.name?.charAt(0)?.toUpperCase() || "A"
                            }}</span
                        ><span class="hidden md:block"
                            ><span
                                class="block truncate text-sm font-semibold"
                                >{{ user?.name || "Admin" }}</span
                            ><span
                                class="block truncate text-[11px] text-neutral-charcoal/50"
                                >{{ user?.email || "" }}</span
                            ></span
                        ><ChevronDown
                            class="hidden h-4 w-4 text-neutral-charcoal/50 sm:block"
                        />
                    </button>
                    <div
                        v-if="accountOpen"
                        class="absolute right-0 top-full z-[60] mt-2 w-52 rounded-xl border bg-white p-1 shadow-lg"
                    >
                        <button
                            type="button"
                            disabled
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-charcoal/40"
                        >
                            <UserPen class="h-4 w-4" />Profil<span
                                class="ml-auto text-[10px]"
                                >Segera</span
                            ></button
                        ><button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                            @click="logout"
                        >
                            <LogOut class="h-4 w-4" />Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>
