<template>
    <div class="min-h-screen">
        <AdminRouteLoading />
        <AdminPlatformTopbar />
        <AdminToast />
        <main class="admin-shell px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <slot />
        </main>
    </div>
</template>
