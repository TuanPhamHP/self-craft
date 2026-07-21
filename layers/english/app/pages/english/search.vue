<script setup lang="ts">
/**
 * /english/search — tìm 1 từ.
 *
 * Flow:
 *  1. Query GET /api/english/vocab/search?q=... → nếu có trong DB user → hiển thị "đã có".
 *  2. Không có → gọi Free Dictionary API client-side qua useDictionary().
 *  3. External hit → hiển thị + nút "Lưu nhanh" (điều hướng sang /english/add với query params pre-fill).
 *  4. Cả 2 miss → empty state.
 */
import type { DictEntry } from '../../composables/useDictionary'

/**
 * Mirror eng_vocab row sau restructure shared-pool.
 * `createdBy` NULL = từ hệ thống; có value = từ private (user).
 */
interface VocabRow {
  id: number
  word: string
  meaning: string
  example: string
  ipa: string | null
  topic: string | null
  band: string | null
  pos: string | null
  createdBy: number | null
  createdAt: number
  updatedAt: number
}

interface SearchResponse {
  vocab: VocabRow | null
  inUserQueue: boolean
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'local'; vocab: VocabRow; inUserQueue: boolean }
  | { kind: 'external'; entries: DictEntry[] }
  | { kind: 'not-found'; q: string }
  | { kind: 'error'; message: string }

const q = ref('')
const state = ref<SearchState>({ kind: 'idle' })

const dict = useDictionary()

async function onSearch() {
  const query = q.value.trim()
  if (!query) return

  state.value = { kind: 'loading' }

  try {
    const res = await $fetch<SearchResponse>('/api/english/vocab/search', {
      query: { q: query },
    })
    if (res.vocab) {
      state.value = { kind: 'local', vocab: res.vocab, inUserQueue: res.inUserQueue }
      return
    }

    const entries = await dict.lookup(query)
    if (entries && entries.length > 0) {
      state.value = { kind: 'external', entries }
      return
    }

    state.value = { kind: 'not-found', q: query }
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    state.value = {
      kind: 'error',
      message: err?.data?.statusMessage ?? err?.message ?? 'Có lỗi xảy ra',
    }
  }
}

/**
 * Link "Thêm vào queue" cho system word chưa học — pre-fill /english/add.
 * Reuse cùng flow POST /api/english/vocab (nó detect system word, reuse vocab_id, tạo user_vocab).
 */
function addSystemWordLink(vocab: VocabRow): string {
  const params = new URLSearchParams({
    word: vocab.word,
    example: vocab.example,
  })
  if (vocab.ipa) params.set('ipa', vocab.ipa)
  return `/english/add?${params.toString()}`
}

/** Build link "Lưu nhanh" — pre-fill word + ipa + example vào form add. */
function saveLink(entry: DictEntry): string {
  const params = new URLSearchParams({ word: entry.word })
  const ipa = dict.pickIpa(entry)
  if (ipa) params.set('ipa', ipa)
  const example = dict.pickExample(entry)
  if (example) params.set('example', example)
  return `/english/add?${params.toString()}`
}

/** Audio đầu tiên có trong entry — cho UI phát âm nhanh. */
function firstAudio(entry: DictEntry): string | undefined {
  return entry.phonetics.find((p) => !!p.audio)?.audio
}

function playAudio(url: string) {
  new Audio(url).play().catch(() => {
    // Ignore — có thể browser block autoplay hoặc network fail.
  })
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <UIcon name="i-lucide-search" class="h-4 w-4 text-neutral-300" />
      </div>
      <div>
        <h1 class="text-xl font-semibold text-white">Tra từ</h1>
        <p class="text-xs text-neutral-500">
          Tìm trong bộ từ của bạn trước — nếu chưa có, tra Free Dictionary API.
        </p>
      </div>
    </div>

    <!-- Search form -->
    <form
      class="flex gap-2"
      @submit.prevent="onSearch"
    >
      <UInput
        v-model="q"
        placeholder="ephemeral, hello, serendipity..."
        icon="i-lucide-search"
        size="lg"
        autofocus
        class="flex-1"
        :ui="{ base: 'w-full' }"
      />
      <UButton
        type="submit"
        size="lg"
        :loading="state.kind === 'loading'"
        icon="i-lucide-arrow-right"
        class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
      >
        Tìm
      </UButton>
    </form>

    <!-- Results -->
    <div v-if="state.kind === 'loading'" class="rounded-2xl border border-white/10 bg-neutral-900/50 p-8 text-center text-sm text-neutral-500">
      Đang tra…
    </div>

    <!-- Local hit -->
    <div
      v-else-if="state.kind === 'local'"
      class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50"
    >
      <div
        class="absolute inset-x-0 top-0 h-px bg-gradient-to-r"
        :class="
          state.inUserQueue
            ? 'from-transparent via-emerald-500/60 to-transparent'
            : 'from-transparent via-amber-500/60 to-transparent'
        "
      />
      <!-- Header khác nhau theo 2 case: đang học vs từ hệ thống chưa thêm -->
      <div
        class="border-b border-white/5 px-5 py-2.5"
        :class="state.inUserQueue ? 'bg-emerald-500/5' : 'bg-amber-500/5'"
      >
        <div
          class="flex items-center gap-2 text-xs"
          :class="state.inUserQueue ? 'text-emerald-300' : 'text-amber-300'"
        >
          <UIcon
            :name="state.inUserQueue ? 'i-lucide-check-circle-2' : 'i-lucide-library'"
            class="h-3.5 w-3.5"
          />
          {{
            state.inUserQueue
              ? 'Đã có trong queue học của bạn'
              : 'Có sẵn ở kho hệ thống — chưa vào queue của bạn'
          }}
        </div>
      </div>

      <div class="space-y-3 p-6">
        <div class="flex flex-wrap items-baseline gap-2">
          <div class="text-3xl font-semibold text-white">{{ state.vocab.word }}</div>
          <div v-if="state.vocab.ipa" class="text-sm text-neutral-500">
            {{ state.vocab.ipa }}
          </div>
        </div>

        <div v-if="state.vocab.band || state.vocab.topic || state.vocab.pos" class="flex flex-wrap gap-1.5">
          <UBadge v-if="state.vocab.band" color="primary" variant="soft" size="sm">
            {{ state.vocab.band }}
          </UBadge>
          <UBadge v-if="state.vocab.pos" color="neutral" variant="outline" size="sm">
            {{ state.vocab.pos }}
          </UBadge>
          <UBadge v-if="state.vocab.topic" color="neutral" variant="soft" size="sm">
            {{ state.vocab.topic }}
          </UBadge>
        </div>

        <div class="text-lg text-neutral-100">{{ state.vocab.meaning }}</div>
        <div class="text-sm italic text-neutral-400">
          “{{ state.vocab.example }}”
        </div>

        <div class="pt-2">
          <UButton
            v-if="state.inUserQueue"
            to="/english/review"
            variant="soft"
            color="neutral"
            icon="i-lucide-layers"
            class="whitespace-nowrap"
          >
            Đi tới review
          </UButton>
          <UButton
            v-else
            :to="addSystemWordLink(state.vocab)"
            icon="i-lucide-plus"
            class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
          >
            Thêm vào queue học
          </UButton>
        </div>
      </div>
    </div>

    <!-- External hit (Free Dictionary API) -->
    <div v-else-if="state.kind === 'external'" class="space-y-4">
      <div
        v-for="(entry, i) in state.entries"
        :key="i"
        class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50"
      >
        <div class="border-b border-white/5 bg-indigo-500/5 px-5 py-2.5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-xs text-indigo-300">
              <UIcon name="i-lucide-globe" class="h-3.5 w-3.5" />
              Từ Free Dictionary — chưa có trong bộ của bạn
            </div>
            <UButton
              :to="saveLink(entry)"
              size="xs"
              icon="i-lucide-save"
              class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white hover:opacity-90"
            >
              Lưu nhanh
            </UButton>
          </div>
        </div>

        <div class="space-y-5 p-6">
          <!-- Word + phonetics -->
          <div>
            <div class="flex flex-wrap items-baseline gap-3">
              <div class="text-3xl font-semibold text-white">{{ entry.word }}</div>
              <div
                v-for="(p, pi) in entry.phonetics.filter((x) => x.text)"
                :key="pi"
                class="text-sm text-neutral-500"
              >
                {{ p.text }}
              </div>
            </div>
            <div v-if="firstAudio(entry)" class="mt-2">
              <UButton
                size="xs"
                variant="soft"
                color="neutral"
                icon="i-lucide-volume-2"
                @click="playAudio(firstAudio(entry)!)"
              >
                Phát âm
              </UButton>
            </div>
          </div>

          <!-- Meanings grouped by partOfSpeech -->
          <div
            v-for="(m, mi) in entry.meanings"
            :key="mi"
            class="space-y-2 border-t border-white/5 pt-4 first:border-none first:pt-0"
          >
            <div class="flex items-center gap-2">
              <UBadge color="neutral" variant="outline" size="sm">
                {{ m.partOfSpeech }}
              </UBadge>
              <span
                v-if="m.synonyms.length"
                class="text-xs text-neutral-500"
              >
                syn: {{ m.synonyms.slice(0, 4).join(', ') }}
              </span>
            </div>
            <ol class="ml-4 list-decimal space-y-2 text-sm text-neutral-200">
              <li v-for="(d, di) in m.definitions" :key="di">
                <div>{{ d.definition }}</div>
                <div
                  v-if="d.example"
                  class="mt-0.5 text-xs italic text-neutral-500"
                >
                  “{{ d.example }}”
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-else-if="state.kind === 'not-found'"
      class="rounded-2xl border border-white/10 bg-neutral-900/50 p-8 text-center"
    >
      <UIcon name="i-lucide-search-x" class="mx-auto mb-3 h-8 w-8 text-neutral-600" />
      <p class="text-sm text-neutral-400">
        Không tìm thấy “<span class="text-neutral-200">{{ state.q }}</span>” — cả trong bộ từ lẫn Free Dictionary.
      </p>
      <div class="mt-4">
        <UButton
          :to="`/english/add?word=${encodeURIComponent(state.q)}`"
          variant="soft"
          color="neutral"
          icon="i-lucide-plus"
          class="whitespace-nowrap"
        >
          Thêm thủ công
        </UButton>
      </div>
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="state.kind === 'error'"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="state.message"
    />
  </div>
</template>
