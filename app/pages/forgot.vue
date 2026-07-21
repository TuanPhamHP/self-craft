<script setup lang="ts">
/**
 * /forgot — gửi request reset password.
 * Server luôn trả 200 (anti-enumeration), UI hiển thị confirm dù email có tồn tại hay không.
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { forgotSchema, type ForgotInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const { loggedIn } = useUserSession()
watchEffect(() => {
  if (loggedIn.value) navigateTo('/', { replace: true })
})

const state = reactive<ForgotInput>({ email: '' })
const submitting = ref(false)
const sent = ref(false)
const errorMsg = ref<string | null>(null)

async function onSubmit(_e: FormSubmitEvent<ForgotInput>) {
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch('/api/auth/forgot', { method: 'POST', body: state })
    sent.value = true
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Có lỗi xảy ra'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell title="Quên mật khẩu" subtitle="Nhập email — nếu có tài khoản, link reset sẽ được gửi.">
    <UAlert
      v-if="sent"
      color="success"
      variant="soft"
      icon="i-lucide-mail-check"
      title="Đã gửi (nếu email tồn tại)"
      description="Kiểm tra hộp thư. Link có hiệu lực 1 giờ."
    />

    <UForm
      v-else
      :schema="forgotSchema"
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
        Gửi link reset
      </UButton>

      <div class="pt-1 text-center text-xs">
        <NuxtLink to="/login" class="text-neutral-400 hover:text-neutral-200">
          Quay lại đăng nhập
        </NuxtLink>
      </div>
    </UForm>
  </AuthShell>
</template>
