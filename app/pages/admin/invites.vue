<script setup lang="ts">
/**
 * /admin/invites — quản lý invite (admin-only, chặn ở middleware + server).
 * List + tạo invite (nhập email) + revoke invite chưa dùng.
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { inviteCreateSchema, type InviteCreateInput } from '#shared/schemas/auth'

interface Invite {
  id: number
  email: string
  expiresAt: number
  usedAt: number | null
  createdAt: number
}

const invites = ref<Invite[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)

async function fetchInvites() {
  loading.value = true
  errorMsg.value = null
  try {
    invites.value = await $fetch<Invite[]>('/api/admin/invites')
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Không tải được'
  } finally {
    loading.value = false
  }
}
onMounted(fetchInvites)

const state = reactive<InviteCreateInput>({ email: '' })
const submitting = ref(false)
const submitError = ref<string | null>(null)
const toast = useToast()

async function onSubmit(_e: FormSubmitEvent<InviteCreateInput>) {
  submitting.value = true
  submitError.value = null
  try {
    await $fetch('/api/admin/invites', { method: 'POST', body: state })
    toast.add({
      title: 'Đã gửi invite',
      description: state.email,
      color: 'success',
      icon: 'i-lucide-mail-check',
    })
    state.email = ''
    await fetchInvites()
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    submitError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Gửi invite thất bại'
  } finally {
    submitting.value = false
  }
}

async function revoke(id: number) {
  if (!confirm('Revoke invite này?')) return
  await $fetch(`/api/admin/invites/${id}`, { method: 'DELETE' })
  await fetchInvites()
}

const now = Date.now()
function fmt(ts: number) {
  return new Date(ts).toLocaleString()
}
function statusOf(inv: Invite): { label: string; color: 'success' | 'neutral' | 'error' } {
  if (inv.usedAt) return { label: 'Đã dùng', color: 'neutral' }
  if (inv.expiresAt < now) return { label: 'Hết hạn', color: 'error' }
  return { label: 'Chờ dùng', color: 'success' }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <UIcon name="i-lucide-mail-plus" class="h-4 w-4 text-neutral-300" />
      </div>
      <div>
        <h1 class="text-xl font-semibold text-white">Invite</h1>
        <p class="text-xs text-neutral-500">
          Mời user mới bằng email. Link có hiệu lực 7 ngày.
        </p>
      </div>
    </div>

    <!-- Create form -->
    <div class="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
      <UForm
        :schema="inviteCreateSchema"
        :state="state"
        class="flex flex-col gap-3 sm:flex-row sm:items-start"
        @submit="onSubmit"
      >
        <UFormField name="email" class="flex-1">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="new-user@example.com"
            icon="i-lucide-mail"
            size="md"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          :loading="submitting"
          icon="i-lucide-send"
          class="whitespace-nowrap"
        >
          Gửi invite
        </UButton>
      </UForm>
      <UAlert
        v-if="submitError"
        class="mt-3"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="submitError"
      />
    </div>

    <!-- List -->
    <div class="rounded-2xl border border-white/10 bg-neutral-900/50">
      <div class="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <h2 class="text-sm font-medium text-neutral-300">Danh sách invite</h2>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="fetchInvites"
        >
          Làm mới
        </UButton>
      </div>

      <div class="p-5">
        <UAlert
          v-if="errorMsg"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="errorMsg"
        />

        <div v-else-if="!invites.length" class="py-8 text-center text-sm text-neutral-500">
          Chưa có invite nào.
        </div>

        <ul v-else class="divide-y divide-white/5">
          <li
            v-for="inv in invites"
            :key="inv.id"
            class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div class="min-w-0">
              <div class="truncate font-medium text-neutral-100">{{ inv.email }}</div>
              <div class="mt-0.5 text-xs text-neutral-500">
                Tạo: {{ fmt(inv.createdAt) }} · Hết hạn: {{ fmt(inv.expiresAt) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="statusOf(inv).color" variant="soft">
                {{ statusOf(inv).label }}
              </UBadge>
              <UButton
                v-if="!inv.usedAt"
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-x"
                square
                aria-label="Revoke"
                @click="revoke(inv.id)"
              />
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
