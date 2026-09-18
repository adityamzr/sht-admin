<script setup lang="ts">
import {
    ArrowLeftRight,
    BadgeDollarSign,
    BookOpen,
    BriefcaseBusiness,
    Calculator,
    CarFront,
    ChevronDown,
    Hotel,
    Inbox,
    Images,
    Landmark,
    LayoutDashboard,
    ChartNoAxesCombined,
    MapPin,
    MapPinned,
    MessageSquareHeart,
    Newspaper,
    Plane,
    Settings,
    Users,
    CalendarRange,
    House,
    Menu,
    X,
    ShoppingBag,
    Contact,
    Ticket,
    Store,
    ClipboardList,
    FileText,
    CreditCard,
    Receipt,
    Wallet,
    BarChart3,
    LineChart,
} from "lucide-vue-next";

const route = useRoute();
const isOpen = ref(false);

type NavItem = { label: string; to: string; icon: any };
type NavGroup = { label: string; icon: any; items: NavItem[] };
type Standalone = { label: string; to: string; icon: any; standalone: true };

const tourStandaloneTop: Standalone = { label: "Dashboard", to: "/tour", icon: LayoutDashboard, standalone: true };
const tourStandaloneBottom: Standalone = { label: "Settings", to: "/settings", icon: Settings, standalone: true };

const tourGroups: NavGroup[] = [
    {
        label: "Sales",
        icon: Users,
        items: [
            { label: "Leads", to: "/leads", icon: Users },
            { label: "Customers", to: "/tour/customers", icon: Contact },
        ],
    },
    {
        label: "Operations",
        icon: ClipboardList,
        items: [
            { label: "Orders", to: "/tour/orders", icon: ShoppingBag },
            { label: "Trips", to: "/tour/trips", icon: MapPinned },
            { label: "Vendors", to: "/tour/vendors", icon: Store },
            { label: "Bookings", to: "/tour/bookings", icon: Ticket },
        ],
    },
    {
        label: "Finance",
        icon: BadgeDollarSign,
        items: [
            { label: "Overview", to: "/tour/finance", icon: LayoutDashboard },
            { label: "Invoices", to: "/tour/finance/invoices", icon: FileText },
            { label: "Payments", to: "/tour/finance/payments", icon: CreditCard },
            { label: "Expenses", to: "/tour/finance/expenses", icon: Wallet },
            { label: "Profitability", to: "/tour/finance/profitability", icon: BarChart3 },
            { label: "Reports", to: "/tour/finance/reports", icon: LineChart },
        ],
    },
    {
        label: "Catalog",
        icon: Store,
        items: [
            { label: "Hotels", to: "/hotels", icon: Hotel },
            { label: "Flights", to: "/flights", icon: Plane },
            { label: "Transport", to: "/transport", icon: CarFront },
            { label: "Services", to: "/services", icon: BriefcaseBusiness },
        ],
    },
    {
        label: "Pricing",
        icon: Calculator,
        items: [
            { label: "Prices", to: "/pricing", icon: BadgeDollarSign },
            { label: "Periods", to: "/pricing-periods", icon: CalendarRange },
            { label: "Exchange Rates", to: "/exchange-rates", icon: ArrowLeftRight },
            { label: "Departure Cities", to: "/departure-cities", icon: MapPin },
        ],
    },
];

const mediaMenu: { label: string; to: string; icon: any; section?: string }[] = [
    { label: "Dashboard", to: "/media", icon: LayoutDashboard },
    { label: "Analytics", to: "/media/analytics", icon: ChartNoAxesCombined },
    { label: "Home", to: "/media/settings/home", icon: House, section: "PAGE SETTINGS" },
    { label: "Makkah", to: "/media/settings/makkah", icon: MapPinned },
    { label: "Madinah", to: "/media/settings/madinah", icon: Landmark },
    { label: "Kontribusi Pengguna", to: "/media/contributions", icon: Inbox, section: "INTERAKSI" },
    { label: "Feedback Artikel", to: "/media/article-feedback", icon: MessageSquareHeart },
    { label: "Artikel", to: "/media/articles", icon: Newspaper, section: "CONTENT LIBRARY" },
    { label: "Panduan", to: "/media/guides", icon: BookOpen },
    { label: "Gallery", to: "/media/gallery", icon: Images },
    { label: "Map Locations", to: "/media/locations", icon: MapPin },
];

const activeWorkspace = useCookie<"media" | "tour">("admin-active-workspace", { default: () => "media" });
const currentWorkspaceKey = computed(() => {
    if (route.path === "/media" || route.path.startsWith("/media/")) return "media";
    if (route.path === "/tour" || route.path.startsWith("/tour/") || route.path === "/") return "tour";
    const flatTour = ["/leads","/estimations","/hotels","/flights","/transport","/services","/pricing","/pricing-periods","/exchange-rates","/departure-cities","/settings","/tour/finance"];
    if (flatTour.some(p => route.path === p || route.path.startsWith(p + "/"))) return "tour";
    const queryWorkspace = route.query.workspace;
    if (queryWorkspace === "media" || queryWorkspace === "tour") return queryWorkspace as any;
    return activeWorkspace.value;
});

// Tour navigation active detection
const allTourItems = computed(() => {
    const items: NavItem[] = [tourStandaloneTop, tourStandaloneBottom];
    tourGroups.forEach(g => items.push(...g.items));
    return items;
});

const activeTo = computed(() => {
    if (currentWorkspaceKey.value === "media") {
        const matches = mediaMenu.filter((x) =>
            x.to === "/" ? route.path === "/" : route.path === x.to || route.path.startsWith(`${x.to}/`),
        );
        return matches.sort((a, b) => b.to.length - a.to.length)[0]?.to;
    }
    const matches = allTourItems.value.filter((x) =>
        x.to === "/tour" ? route.path === "/tour" || route.path === "/tour/" : route.path === x.to || route.path.startsWith(`${x.to}/`),
    );
    return matches.sort((a, b) => b.to.length - a.to.length)[0]?.to;
});

const activeGroupLabel = computed(() => {
    if (currentWorkspaceKey.value !== "tour") return null;
    if (activeTo.value === tourStandaloneTop.to || activeTo.value === tourStandaloneBottom.to) return null;
    for (const g of tourGroups) {
        if (g.items.some(i => activeTo.value && (activeTo.value === i.to || activeTo.value.startsWith(i.to + "/") || i.to === activeTo.value))) {
            return g.label;
        }
        if (g.items.some(i => route.path === i.to || route.path.startsWith(i.to + "/"))) return g.label;
    }
    return null;
});

// Accordion open state with localStorage persistence
const openGroups = ref<Record<string, boolean>>({});

function loadOpenGroups() {
    if (typeof window === "undefined") return;
    try {
        const raw = localStorage.getItem("tour-sidebar-open-groups");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") openGroups.value = parsed;
        }
    } catch {}
}

function saveOpenGroups() {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem("tour-sidebar-open-groups", JSON.stringify(openGroups.value));
    } catch {}
}

function toggleGroup(label: string) {
    openGroups.value[label] = !openGroups.value[label];
    saveOpenGroups();
}

function ensureActiveGroupOpen() {
    const active = activeGroupLabel.value;
    if (active && !openGroups.value[active]) {
        openGroups.value[active] = true;
        saveOpenGroups();
    }
}

function onEsc(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) {
        isOpen.value = false
    }
}

watch(isOpen, (v) => {
    if (typeof document === 'undefined') return
    if (v) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
})

onMounted(() => {
    loadOpenGroups();
    ensureActiveGroupOpen();
    if (typeof window !== 'undefined') window.addEventListener('keydown', onEsc)
});

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onEsc)
    if (typeof document !== 'undefined') document.body.style.overflow = ''
})

watch(() => route.path, () => {
    isOpen.value = false;
    ensureActiveGroupOpen();
});

watch(activeGroupLabel, () => {
    ensureActiveGroupOpen();
});

const menu = computed(() => currentWorkspaceKey.value === "media" ? mediaMenu : []);
</script>

<template>
    <button
        type="button"
        class="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-sht-olive text-white shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-95 lg:hidden"
        aria-label="Buka menu admin"
        :aria-expanded="isOpen"
        aria-controls="admin-sidebar"
        @click="isOpen = !isOpen"
    >
        <Menu v-if="!isOpen" class="h-5 w-5" aria-hidden="true" /><X v-else class="h-5 w-5" aria-hidden="true" />
    </button>

    <!-- Backdrop with fade -->
    <Transition name="sidebar-backdrop">
        <div
            v-if="isOpen"
            class="fixed inset-0 z-30 bg-neutral-charcoal/40 backdrop-blur-[2px] lg:hidden"
            aria-hidden="true"
            @click="isOpen = false"
        />
    </Transition>

    <!-- Sidebar drawer -->
    <Transition name="sidebar-drawer">
        <aside
            v-show="isOpen || true"
            id="admin-sidebar"
            class="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-neutral-line bg-white shadow-xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none"
            :class="{ '!translate-x-0': isOpen }"
            role="navigation"
            aria-label="Admin sidebar"
            
        >
            <div class="flex h-16 items-center gap-2.5 border-b border-neutral-line px-5">
                <img src="/assets/images/logo_sh.png" class="h-10 w-10" alt="Logo Sudut Haramain" />
                <div class="leading-tight">
                    <p class="font-heading text-sm font-semibold text-brand-green">Sudut Haramain</p>
                    <p class="text-[10px] font-medium uppercase tracking-[0.22em] text-gold">Admin</p>
                </div>
                <button
                    type="button"
                    class="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-neutral-warm text-neutral-charcoal/60 hover:bg-neutral-line lg:hidden"
                    aria-label="Tutup menu"
                    @click="isOpen = false"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>
            <nav class="flex-1 overflow-y-auto p-3">
                <!-- TOUR WORKSPACE -->
                <template v-if="currentWorkspaceKey === 'tour'">
                    <NuxtLink
                        :to="tourStandaloneTop.to"
                        class="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ease-out"
                        :class="activeTo === tourStandaloneTop.to ? 'bg-sht-olive-dark text-white' : 'text-neutral-charcoal/70 hover:bg-sht-olive/5 hover:text-sht-olive'"
                    >
                        <component :is="tourStandaloneTop.icon" class="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        <span class="min-w-0 flex-1">{{ tourStandaloneTop.label }}</span>
                    </NuxtLink>

                    <div v-for="group in tourGroups" :key="group.label" class="mt-4">
                        <button
                            type="button"
                            class="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 ease-out"
                            :class="activeGroupLabel === group.label ? 'bg-neutral-warm text-neutral-charcoal' : 'text-neutral-charcoal/45 hover:bg-neutral-warm/60 hover:text-neutral-charcoal/70'"
                            :aria-expanded="!!openGroups[group.label]"
                            :aria-controls="`group-${group.label}`"
                            @click="toggleGroup(group.label)"
                        >
                            <component :is="group.icon" class="h-[16px] w-[16px] shrink-0" aria-hidden="true" />
                            <span class="min-w-0 flex-1">{{ group.label }}</span>
                            <ChevronDown
                                class="h-4 w-4 shrink-0 transition-transform duration-200 ease-out"
                                :class="openGroups[group.label] ? 'rotate-0' : '-rotate-90'"
                                aria-hidden="true"
                            />
                        </button>
                        <Transition name="accordion">
                            <div
                                v-show="openGroups[group.label]"
                                :id="`group-${group.label}`"
                                class="mt-1 space-y-0.5 overflow-hidden pl-2"
                            >
                                <NuxtLink
                                    v-for="item in group.items"
                                    :key="item.to"
                                    :to="item.to"
                                    class="flex items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ease-out"
                                    :class="activeTo === item.to ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'text-neutral-charcoal/70 hover:bg-sht-olive/5 hover:text-sht-olive hover:border-neutral-line'"
                                >
                                    <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                    <span class="min-w-0 flex-1">{{ item.label }}</span>
                                </NuxtLink>
                            </div>
                        </Transition>
                    </div>

                    <div class="mt-6 border-t border-neutral-line pt-4">
                        <NuxtLink
                            :to="tourStandaloneBottom.to"
                            class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ease-out"
                            :class="activeTo === tourStandaloneBottom.to ? 'bg-sht-olive-dark text-white' : 'text-neutral-charcoal/70 hover:bg-sht-olive/5 hover:text-sht-olive'"
                        >
                            <component :is="tourStandaloneBottom.icon" class="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                            <span class="min-w-0 flex-1">{{ tourStandaloneBottom.label }}</span>
                        </NuxtLink>
                    </div>
                </template>

                <!-- MEDIA WORKSPACE -->
                <template v-else>
                    <template v-for="(item, index) in menu" :key="item.label">
                        <p
                            v-if="item.section && (index === 0 || menu[index - 1].section !== item.section)"
                            class="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-charcoal/45"
                        >
                            {{ item.section }}
                        </p>
                        <NuxtLink
                            :to="item.to"
                            class="mb-0.5 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ease-out"
                            :class="activeTo === item.to ? 'bg-sht-olive-dark text-white hover:bg-sht-olive-dark hover:text-white' : 'text-neutral-charcoal/70 hover:bg-sht-olive/5 hover:text-sht-olive'"
                        >
                            <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                            <span class="min-w-0 flex-1">{{ item.label }}</span>
                        </NuxtLink>
                    </template>
                </template>
            </nav>
            <div class="border-t border-neutral-line p-4">
                <p class="text-xs text-neutral-charcoal/50">v0.2.0 — M2 backend foundation</p>
            </div>
        </aside>
    </Transition>
</template>

<style scoped>
/* Drawer motion tokens */
:root {
  --motion-fast: 150ms;
  --motion-normal: 200ms;
  --motion-ease: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Backdrop fade */
.sidebar-backdrop-enter-active {
  transition: opacity 200ms ease-out;
}
.sidebar-backdrop-leave-active {
  transition: opacity 150ms ease-in;
}
.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
  opacity: 0;
}

/* Drawer slide */
.sidebar-drawer-enter-active,
.sidebar-drawer-leave-active {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.sidebar-drawer-enter-from,
.sidebar-drawer-leave-to {
  transform: translateX(-100%);
}

/* Accordion height + opacity */
.accordion-enter-active {
  transition: all 200ms ease-out;
  overflow: hidden;
}
.accordion-leave-active {
  transition: all 180ms ease-in;
  overflow: hidden;
}
.accordion-enter-from {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
.accordion-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 500px;
}
.accordion-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 500px;
}
.accordion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-backdrop-enter-active,
  .sidebar-backdrop-leave-active,
  .sidebar-drawer-enter-active,
  .sidebar-drawer-leave-active,
  .accordion-enter-active,
  .accordion-leave-active {
    transition: none !important;
  }
}
</style>
