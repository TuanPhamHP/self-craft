<script setup lang="ts">
/**
 * /english/add — form thêm 1 từ mới vào eng_vocab.
 *
 * Reuse Zod schema `vocabCreateSchema` từ shared/schemas/english cho validate:
 * KHÔNG viết lại rule ở client → schema đổi 1 chỗ, client + server đồng bộ.
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import { vocabCreateSchema, type VocabCreateInput } from '#shared/schemas/english'

const toast = useToast()

/**
 * Form state — dùng string rỗng cho input; các field optional (ipa) sẽ
 * normalize empty → undefined trong toPayload().
 */
interface VocabFormState {
  word: string
  meaning: string
  example: string
  ipa: string
}

const state = reactive<VocabFormState>({
  word: '',
  meaning: '',
  example: '',
  ipa: '',
})

const submitting = ref(false)

function toPayload(s: VocabFormState): VocabCreateInput {
  return {
    word: s.word,
    meaning: s.meaning,
    example: s.example,
    ipa: s.ipa.trim() || undefined,
  }
}

async function onSubmit(_event: FormSubmitEvent<VocabCreateInput>) {
  submitting.value = true
  try {
    await $fetch('/api/english/vocab', {
      method: 'POST',
      body: toPayload(state),
    })
    toast.add({
      title: 'Đã thêm từ',
      description: `"${state.word}" đã vào queue học.`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    state.word = ''
    state.meaning = ''
    state.example = ''
    state.ipa = ''
  } catch (e) {
    toast.add({
      title: 'Lỗi',
      description: e instanceof Error ? e.message : 'Không thêm được từ',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl p-4 space-y-4">
    <h1 class="text-xl font-semibold">Thêm từ vựng</h1>

    <UCard>
      <UForm
        :schema="vocabCreateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Từ (word)" name="word" required>
          <UInput v-model="state.word" placeholder="ephemeral" class="w-full" />
        </UFormField>

        <UFormField label="Nghĩa (Tiếng Việt)" name="meaning" required>
          <UInput
            v-model="state.meaning"
            placeholder="tồn tại ngắn ngủi"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Ví dụ" name="example" required>
          <UTextarea
            v-model="state.example"
            :rows="3"
            placeholder="An ephemeral moment."
            class="w-full"
          />
        </UFormField>

        <UFormField label="IPA" name="ipa" hint="Không bắt buộc">
          <UInput v-model="state.ipa" placeholder="/ɪˈfem.ər.əl/" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            variant="soft"
            to="/english/review"
            :disabled="submitting"
          >
            Sang review
          </UButton>
          <UButton type="submit" :loading="submitting">Lưu</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
