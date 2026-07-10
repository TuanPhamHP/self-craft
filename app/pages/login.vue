<script setup lang="ts">
/**
 * /login — form đăng nhập single-user.
 * Thành công → refresh session state → redirect /english/review.
 * KHÔNG lưu bất kỳ credential nào ở client (cookie sealed do server set).
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginInput } from '#shared/schemas/auth'

// Client-side: nếu đã login sẵn thì đá thẳng vào review (khỏi lặp form).
const { loggedIn, fetch: refreshSession } = useUserSession()
watchEffect(() => {
  if (loggedIn.value) navigateTo('/english/review', { replace: true })
})

const state = reactive<LoginInput>({ username: '', password: '' })
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

// h3 error shape khi throw createError({...}) từ server.
interface H3ErrorResponse {
  statusCode?: number
  statusMessage?: string
  data?: { statusMessage?: string; message?: string }
}

async function onSubmit(_e: FormSubmitEvent<LoginInput>) {
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: state })
    await refreshSession() // sync composable state trước khi navigate.
    await navigateTo('/english/review', { replace: true })
  } catch (e) {
    const err = e as H3ErrorResponse
    errorMsg.value =
      err?.data?.statusMessage ?? err?.statusMessage ?? 'Đăng nhập thất bại'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm p-4 space-y-4">
    <h1 class="text-2xl font-semibold text-center">Đăng nhập</h1>

    <UCard>
      <UForm
        :schema="loginSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Username" name="username" required>
          <UInput
            v-model="state.username"
            autocomplete="username"
            placeholder="admin"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="errorMsg"
          color="error"
          variant="soft"
          :title="errorMsg"
        />

        <UButton type="submit" block :loading="submitting">Đăng nhập</UButton>
      </UForm>
    </UCard>
  </div>
</template>
