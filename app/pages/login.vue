<script setup lang="ts">
/**
 * /login — form đăng nhập bằng email + password.
 * Thành công → refresh session state → redirect /.
 * KHÔNG lưu bất kỳ credential nào ở client (cookie sealed do server set).
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const { loggedIn, fetch: refreshSession } = useUserSession()
watchEffect(() => {
  if (loggedIn.value) navigateTo('/', { replace: true })
})

const state = reactive<LoginInput>({ email: '', password: '' })
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

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
    await refreshSession()
    await navigateTo('/', { replace: true })
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
  <AuthShell title="Đăng nhập" subtitle="Tiếp tục hành trình học của bạn.">
    <UForm
      :schema="loginSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Email"
        name="email"
        required
        :ui="{ label: 'text-neutral-300' }"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Password"
        name="password"
        required
        :ui="{ label: 'text-neutral-300' }"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          icon="i-lucide-lock"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="errorMsg"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="errorMsg"
      />

      <UButton
        type="submit"
        block
        size="lg"
        :loading="submitting"
        trailing-icon="i-lucide-arrow-right"
        class="mt-2 justify-center border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 font-medium text-white shadow-lg shadow-purple-500/25 transition hover:opacity-90 hover:shadow-purple-500/40"
      >
        Đăng nhập
      </UButton>

      <div class="flex items-center justify-between pt-1 text-xs">
        <NuxtLink to="/forgot" class="text-neutral-400 hover:text-neutral-200">
          Quên mật khẩu?
        </NuxtLink>
        <NuxtLink to="/register" class="text-neutral-400 hover:text-neutral-200">
          Đăng ký
        </NuxtLink>
      </div>
    </UForm>
  </AuthShell>
</template>
