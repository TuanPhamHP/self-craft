<script setup lang="ts">
/**
 * /reset?token=… — đặt lại password.
 * Không auto-login sau reset (an toàn); user login lại bằng password mới.
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { resetSchema, type ResetInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { loggedIn } = useUserSession()
watchEffect(() => {
  if (loggedIn.value) navigateTo('/', { replace: true })
})

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' ? t : ''
})

const state = reactive<ResetInput>({ token: '', password: '' })
watchEffect(() => {
  state.token = token.value
})

const submitting = ref(false)
const done = ref(false)
const errorMsg = ref<string | null>(null)

async function onSubmit(_e: FormSubmitEvent<ResetInput>) {
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch('/api/auth/reset', { method: 'POST', body: state })
    done.value = true
    setTimeout(() => navigateTo('/login', { replace: true }), 1500)
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Reset thất bại'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell title="Đặt lại mật khẩu" subtitle="Nhập password mới cho tài khoản của bạn.">
    <UAlert
      v-if="!token"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Thiếu token"
      description="Mở link từ email được gửi để đặt lại mật khẩu."
    />

    <UAlert
      v-else-if="done"
      color="success"
      variant="soft"
      icon="i-lucide-check"
      title="Đã đổi password"
      description="Đang chuyển sang trang đăng nhập…"
    />

    <UForm
      v-else
      :schema="resetSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Password mới"
        name="password"
        required
        help="Tối thiểu 8 ký tự"
        :ui="{ label: 'text-neutral-300' }"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
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
        Đổi password
      </UButton>
    </UForm>
  </AuthShell>
</template>
