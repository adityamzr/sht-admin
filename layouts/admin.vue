<template>
  <div class="min-h-screen lg:pl-64">
    <AdminTopbar />
    <AdminSidebar />
    <AdminToast />
    <main class="p-5 pt-20 sm:p-8 lg:pt-24">
      <slot />
    </main>
  </div>
</template>
