<script setup lang="ts">
/**
 * /register — 2 chế độ:
 *  A. Có ?token=… → validate token qua GET /api/auth/invite/:token, hiển thị email từ invite (readonly),
 *     user chỉ đặt password.
 *  B. Không có token → bootstrap first-user: cho nhập email + password.
 *     Server sẽ reject nếu DB đã có user (nên UI cần graceful error).
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { registerSchema, type RegisterInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { loggedIn, fetch: refreshSession } = useUserSession()

watchEffect(() => {
  if (loggedIn.value) navigateTo('/', { replace: true })
})

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' && t.length > 0 ? t : undefined
})

const inviteEmail = ref<string | null>(null)
const inviteError = ref<string | null>(null)
const inviteLoading = ref(false)

// Nếu có token → gọi validate. Fail → block form.
watchEffect(async () => {
  if (!token.value) {
    inviteEmail.value = null
    inviteError.value = null
    return
  }
  inviteLoading.value = true
  inviteError.value = null
  try {
    const res = await $fetch<{ ok: true; email: string }>(
      `/api/auth/invite/${encodeURIComponent(token.value)}`,
    )
    inviteEmail.value = res.email
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    inviteError.value =
      err?.data?.statusMessage ?? err?.statusMessage ?? 'Invite không hợp lệ'
  } finally {
    inviteLoading.value = false
  }
})

const state = reactive<RegisterInput>({
  token: undefined,
  email: undefined,
  password: '',
})

// Đồng bộ state.token với query.
watchEffect(() => {
  state.token = token.value
})

const submitting = ref(false)
const errorMsg = ref<string | null>(null)

async function onSubmit(_e: FormSubmitEvent<RegisterInput>) {
  submitting.value = true
  errorMsg.value = null
  try {
    // Nếu có token, dùng email từ invite; nếu không, dùng state.email.
    const body: RegisterInput = token.value
      ? { token: token.value, password: state.password }
      : { email: state.email, password: state.password }

    await $fetch('/api/auth/register', { method: 'POST', body })
    await refreshSession()
    await navigateTo('/', { replace: true })
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value =
      err?.data?.statusMessage ?? err?.statusMessage ?? 'Đăng ký thất bại'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell
    title="Đăng ký"
    :subtitle="
      token
        ? 'Bạn được mời tham gia — hoàn tất đăng ký bằng password.'
        : 'Tạo tài khoản đầu tiên (admin) cho workspace này.'
    "
  >
    <div v-if="inviteLoading" class="text-sm text-neutral-400">
      Đang kiểm tra invite…
    </div>

    <UAlert
      v-else-if="inviteError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="inviteError"
    />

    <UForm
      v-else
      :schema="registerSchema"
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
          v-if="token"
          :model-value="inviteEmail ?? ''"
          disabled
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
        />
        <UInput
          v-else
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
        Tạo tài khoản
      </UButton>

      <div class="pt-1 text-center text-xs">
        <NuxtLink to="/login" class="text-neutral-400 hover:text-neutral-200">
          Đã có tài khoản? Đăng nhập
        </NuxtLink>
      </div>
    </UForm>
  </AuthShell>
</template>
