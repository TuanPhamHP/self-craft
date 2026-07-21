<script setup lang="ts">
/**
 * Root shell — force dark mode + delegate render qua layout.
 * `<NuxtLayout>` chọn layout theo page (definePageMeta({ layout: 'auth' }) cho public auth pages,
 * default cho các page trong app).
 */
useHead({
  htmlAttrs: { class: 'dark' },
  bodyAttrs: { class: 'bg-neutral-950 text-neutral-100' },
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
