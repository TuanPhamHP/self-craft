<script setup lang="ts">
/**
 * Trang chủ tối giản — điều hướng vào các module + logout.
 * Dashboard/streak/stats để Phase 2 (xem ARCHITECTURE.md §9).
 */
const { user, clear: clearSession } = useUserSession()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clearSession() // sync composable state trước khi navigate
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <div class="mx-auto max-w-xl p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Self Craft</h1>
      <div class="flex items-center gap-2">
        <span v-if="user" class="text-sm text-neutral-500">
          {{ user.name }}
        </span>
        <UButton
          size="sm"
          variant="soft"
          color="neutral"
          icon="i-lucide-log-out"
          @click="logout"
        >
          Logout
        </UButton>
      </div>
    </div>
    <p class="text-neutral-500">Learning PWA — English + Programming.</p>

    <UCard>
      <h2 class="mb-3 text-lg font-medium">English</h2>
      <div class="flex flex-wrap gap-2">
        <UButton to="/english/review" icon="i-lucide-book-open">Review</UButton>
        <UButton to="/english/add" variant="soft" icon="i-lucide-plus">
          Thêm từ
        </UButton>
      </div>
    </UCard>
  </div>
</template>
