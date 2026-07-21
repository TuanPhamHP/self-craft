<script setup lang="ts">
/**
 * AskNameModal — hỏi tên hiển thị khi user chưa có `name` trong DB.
 *
 * Tự-điều khiển: đọc session, hiện khi user tồn tại + name=null. Không cho dismiss
 * (dismissible=false, close=false) — bắt buộc phải nhập trước khi dùng app.
 * Submit → POST /api/auth/name → refresh session → modal tự đóng do user.name đã set.
 *
 * Chỉ mount 1 lần trong default layout — auth pages dùng layout khác nên không thấy modal.
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { nameUpdateSchema, type NameUpdateInput } from '#shared/schemas/auth'

const { user, fetch: refreshSession } = useUserSession()

// One-way: open theo state của user; đóng chỉ khi API set name xong + session refresh.
const open = computed(() => !!user.value && !user.value.name)

const state = reactive<NameUpdateInput>({ name: '' })
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

async function onSubmit(_e: FormSubmitEvent<NameUpdateInput>) {
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch('/api/auth/name', { method: 'POST', body: state })
    await refreshSession()
    // Modal tự đóng vì computed `open` recompute → false.
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Không lưu được tên'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :close="false"
    :ui="{
      overlay: 'bg-neutral-950/80 backdrop-blur-sm',
      content: 'ring-1 ring-white/10 bg-neutral-900',
    }"
  >
    <template #content>
      <div class="relative overflow-hidden p-6 sm:p-8">
        <div
          class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/70 to-transparent"
        />

        <!-- Icon -->
        <div class="mb-5 flex justify-center">
          <div class="relative">
            <div
              class="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 opacity-60 blur-lg"
            />
            <div
              class="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 ring-1 ring-white/20"
            >
              <UIcon name="i-lucide-user-round" class="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <!-- Copy -->
        <div class="mb-6 text-center">
          <h2 class="text-xl font-semibold text-white">
            Tôi có thể gọi bạn là gì?
          </h2>
          <p class="mt-2 text-sm text-neutral-400">
            Tên hiển thị này chỉ dùng để chào hỏi trong app — bạn có thể đổi sau.
          </p>
        </div>

        <!-- Form -->
        <UForm
          :schema="nameUpdateSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField name="name" required :ui="{ label: 'text-neutral-300' }">
            <UInput
              v-model="state.name"
              placeholder="Tuấn"
              icon="i-lucide-sparkles"
              size="lg"
              autofocus
              class="w-full"
              :maxlength="50"
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
            class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 font-medium text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
          >
            Bắt đầu
          </UButton>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
