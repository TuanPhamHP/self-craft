<script setup lang="ts">
/**
 * /english/add — form thêm 1 từ mới vào eng_vocab.
 *
 * Reuse Zod schema `vocabCreateSchema` từ shared/schemas/english cho validate:
 * KHÔNG viết lại rule ở client → schema đổi 1 chỗ, client + server đồng bộ.
 */
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  vocabCreateSchema,
  type VocabCreateInput,
  type CefrBand,
  CEFR_BANDS,
} from '#shared/schemas/english'

const toast = useToast()

interface VocabFormState {
  word: string
  meaning: string
  example: string
  ipa: string
  topic: string
  // Undefined = "chưa chọn"; USelect sẽ bind về undefined khi clear.
  band: CefrBand | undefined
}

const state = reactive<VocabFormState>({
  word: '',
  meaning: '',
  example: '',
  ipa: '',
  topic: '',
  band: undefined,
})

/**
 * Prefill từ query string — dùng khi đến từ /english/search "Lưu nhanh".
 * Chỉ chấp nhận các field khớp Zod (word/ipa/example). Meaning KHÔNG prefill
 * vì Free Dictionary không có Vietnamese meaning — user PHẢI tự điền.
 */
const route = useRoute()
function readStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null
}
onMounted(() => {
  const w = readStr(route.query.word)
  const ipa = readStr(route.query.ipa)
  const ex = readStr(route.query.example)
  if (w) state.word = w
  if (ipa) state.ipa = ipa
  if (ex) state.example = ex
})

const submitting = ref(false)

function toPayload(s: VocabFormState): VocabCreateInput {
  return {
    word: s.word,
    meaning: s.meaning,
    example: s.example,
    ipa: s.ipa.trim() || undefined,
    topic: s.topic.trim() || undefined,
    band: s.band,
  }
}

interface VocabCreateResponse {
  reused: boolean
  vocab: { id: number; word: string; meaning: string }
  userVocab: { note: string | null }
}

async function onSubmit(_event: FormSubmitEvent<VocabCreateInput>) {
  submitting.value = true
  try {
    const res = await $fetch<VocabCreateResponse>('/api/english/vocab', {
      method: 'POST',
      body: toPayload(state),
    })
    if (res.reused) {
      const noteMsg = res.userVocab.note
        ? ` Nghĩa của bạn lưu làm note (khác nghĩa hệ thống "${res.vocab.meaning}").`
        : ''
      toast.add({
        title: 'Đã dùng từ có sẵn',
        description: `"${state.word}" đã có ở kho hệ thống — reuse không nhân bản.${noteMsg}`,
        color: 'info',
        icon: 'i-lucide-recycle',
      })
    } else {
      toast.add({
        title: 'Đã thêm từ',
        description: `"${state.word}" đã vào queue học.`,
        color: 'success',
        icon: 'i-lucide-check',
      })
    }
    state.word = ''
    state.meaning = ''
    state.example = ''
    state.ipa = ''
    // Giữ topic + band — thường add nhiều từ cùng chuyên ngành/band 1 lượt.
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
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <UIcon name="i-lucide-plus" class="h-4 w-4 text-neutral-300" />
      </div>
      <div>
        <h1 class="text-xl font-semibold text-white">Thêm từ vựng</h1>
        <p class="text-xs text-neutral-500">
          Từ mới sẽ vào queue học với state = New.
        </p>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
      <UForm
        :schema="vocabCreateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Từ (word)" name="word" required :ui="{ label: 'text-neutral-300' }">
          <UInput
            v-model="state.word"
            placeholder="ephemeral"
            icon="i-lucide-type"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Nghĩa (Tiếng Việt)"
          name="meaning"
          required
          :ui="{ label: 'text-neutral-300' }"
        >
          <UInput
            v-model="state.meaning"
            placeholder="tồn tại ngắn ngủi"
            icon="i-lucide-languages"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Ví dụ" name="example" required :ui="{ label: 'text-neutral-300' }">
          <UTextarea
            v-model="state.example"
            :rows="3"
            placeholder="An ephemeral moment."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="IPA"
          name="ipa"
          hint="Không bắt buộc"
          :ui="{ label: 'text-neutral-300' }"
        >
          <UInput
            v-model="state.ipa"
            placeholder="/ɪˈfem.ər.əl/"
            icon="i-lucide-volume-2"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Chuyên ngành"
            name="topic"
            hint="Không bắt buộc"
            :ui="{ label: 'text-neutral-300' }"
          >
            <UInput
              v-model="state.topic"
              placeholder="Lập trình, Kinh tế, ..."
              icon="i-lucide-tag"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Band (CEFR)"
            name="band"
            hint="Không bắt buộc"
            :ui="{ label: 'text-neutral-300' }"
          >
            <USelect
              v-model="state.band"
              :items="[...CEFR_BANDS]"
              placeholder="Chọn band"
              icon="i-lucide-signal"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex flex-wrap justify-end gap-2 pt-2">
          <UButton
            type="button"
            variant="soft"
            color="neutral"
            to="/english/review"
            :disabled="submitting"
            icon="i-lucide-layers"
            class="whitespace-nowrap"
          >
            Sang review
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            icon="i-lucide-save"
            class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
          >
            Lưu
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>
