<script setup lang="ts">
/**
 * /english/review — chạy queue card tới hạn.
 *
 * Luồng: fetchDue (nạp queue) → hiện card → user bấm "Hiện đáp án" (flip) →
 * chấm điểm (Again/Hard/Good/Easy) → store review → card kế → hết → empty state.
 *
 * Keyboard shortcuts:
 * - Space: lật thẻ (chỉ khi chưa lật + có card)
 * - 1/2/3/4: Again/Hard/Good/Easy (chỉ khi đã lật)
 */
import { useEnglishReview } from '../../stores/useEnglishReview'
import type { Grade } from '#shared/utils/srs'
import {
  CEFR_BANDS,
  vocabEnrollCounts,
  type CefrBand,
  type VocabEnrollCount,
} from '#shared/schemas/english'

const store = useEnglishReview()
const toast = useToast()
const flipped = ref(false)

/** Form state cho block "Nạp thêm từ" ở empty state. Undefined = random dimension đó. */
const enrollCount = ref<VocabEnrollCount>(5)
const enrollBand = ref<CefrBand | undefined>(undefined)
const enrollTopic = ref<string | undefined>(undefined)

const countItems = vocabEnrollCounts.map((c) => ({ label: `${c} từ`, value: c }))
const bandItems = CEFR_BANDS.map((b) => ({ label: b, value: b }))

/**
 * Fetch distinct topics từ pool hệ thống — lazy, chỉ chạy khi empty state hiển thị.
 * Dùng useLazyFetch để không block render; nếu lỗi thì topic dropdown chỉ show "Random".
 */
const { data: topics } = useLazyFetch<string[]>('/api/english/vocab/topics', {
  default: () => [],
})
const topicItems = computed(() =>
  (topics.value ?? []).map((t) => ({ label: t, value: t })),
)

async function onEnroll() {
  const enrolled = await store.enroll({
    count: enrollCount.value,
    band: enrollBand.value,
    topic: enrollTopic.value,
  })
  if (enrolled === 0) {
    toast.add({
      title: 'Không nạp được từ nào',
      description: 'Pool hệ thống đã cạn với filter này. Thử đổi band/chuyên ngành hoặc thêm từ tay.',
      color: 'warning',
      icon: 'i-lucide-info',
    })
    return
  }
  toast.add({
    title: `Đã nạp ${enrolled} từ mới`,
    description: enrolled < enrollCount.value
      ? `Pool chỉ còn ${enrolled}/${enrollCount.value} từ khớp filter.`
      : 'Queue đã cập nhật, bắt đầu học ngay.',
    color: 'success',
    icon: 'i-lucide-check',
  })
}

watch(
  () => store.currentCard?.vocabId,
  () => {
    flipped.value = false
  },
)

function flip() {
  if (store.currentCard) flipped.value = true
}

async function grade(g: Grade) {
  if (!store.currentCard || !flipped.value) return
  await store.review(store.currentCard.vocabId, g)
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (!flipped.value && e.code === 'Space') {
    e.preventDefault()
    flip()
    return
  }
  if (flipped.value) {
    const g = ({ Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4 } as const)[e.code]
    if (g) {
      e.preventDefault()
      grade(g as Grade)
    }
  }
}

onMounted(() => {
  store.fetchDue()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-white">English review</h1>
        <p class="text-xs text-neutral-500">
          Bấm Space để lật · 1/2/3/4 để chấm điểm
        </p>
      </div>
      <UBadge v-if="store.remaining > 0" color="primary" variant="soft" size="lg">
        Còn {{ store.remaining }}
      </UBadge>
    </div>

    <!-- Loading -->
    <div
      v-if="store.loading && !store.currentCard"
      class="rounded-2xl border border-white/10 bg-neutral-900/50 p-10 text-center text-sm text-neutral-500"
    >
      Đang tải…
    </div>

    <!-- Error -->
    <div
      v-else-if="store.error"
      class="rounded-2xl border border-red-500/30 bg-red-500/5 p-5"
    >
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-circle-alert" class="mt-0.5 h-5 w-5 text-red-400" />
        <div class="flex-1">
          <p class="text-sm text-red-300">Lỗi: {{ store.error }}</p>
          <UButton class="mt-3" size="sm" color="error" variant="soft" @click="store.fetchDue()">
            Thử lại
          </UButton>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!store.currentCard"
      class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50"
    >
      <div class="relative p-8 text-center">
        <div
          class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/60 to-transparent"
        />
        <div class="text-4xl">🎉</div>
        <p class="mt-3 text-lg text-white">Hết card tới hạn hôm nay</p>
        <p class="mt-1 text-sm text-neutral-500">
          Nạp thêm từ pool hệ thống hoặc tự thêm từ mới.
        </p>

        <!-- Enroll form: chỉ hiện ở empty state -->
        <div class="mt-6 border-t border-white/5 pt-6 text-left">
          <p class="mb-3 text-center text-xs uppercase tracking-wider text-neutral-500">
            Nạp thêm từ mới
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <USelect
              v-model="enrollCount"
              :items="countItems"
              icon="i-lucide-layers"
              size="md"
              class="w-full"
            />
            <USelect
              v-model="enrollBand"
              :items="bandItems"
              placeholder="Band (random)"
              icon="i-lucide-signal"
              size="md"
              class="w-full"
            />
            <USelect
              v-model="enrollTopic"
              :items="topicItems"
              placeholder="Chuyên ngành (random)"
              icon="i-lucide-tag"
              size="md"
              class="w-full"
            />
          </div>
          <p
            v-if="enrollBand || enrollTopic"
            class="mt-2 flex items-center justify-center gap-2 text-xs text-neutral-500"
          >
            <span>Filter đang bật:</span>
            <UBadge v-if="enrollBand" color="primary" variant="soft" size="sm">
              {{ enrollBand }}
            </UBadge>
            <UBadge v-if="enrollTopic" color="neutral" variant="soft" size="sm">
              {{ enrollTopic }}
            </UBadge>
            <UButton
              variant="ghost"
              size="xs"
              color="neutral"
              icon="i-lucide-x"
              @click="() => { enrollBand = undefined; enrollTopic = undefined }"
            >
              Xoá
            </UButton>
          </p>
        </div>

        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <UButton
            size="lg"
            icon="i-lucide-sparkles"
            :loading="store.loading"
            class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
            @click="onEnroll"
          >
            Nạp {{ enrollCount }} từ mới
          </UButton>
          <UButton
            variant="soft"
            color="neutral"
            icon="i-lucide-refresh-cw"
            class="whitespace-nowrap"
            @click="store.fetchDue()"
          >
            Nạp lại
          </UButton>
          <UButton
            to="/english/add"
            variant="outline"
            icon="i-lucide-plus"
            class="whitespace-nowrap"
          >
            Thêm từ tay
          </UButton>
        </div>
      </div>
    </div>

    <!-- Flashcard -->
    <div v-else class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50">
      <div
        class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent"
      />

      <div class="min-h-[280px] px-6 py-10 text-center">
        <!-- Meta badges: band + topic (nếu có). Nằm trên word, subtle. -->
        <div
          v-if="store.currentCard.band || store.currentCard.topic"
          class="mb-4 flex flex-wrap justify-center gap-1.5"
        >
          <UBadge
            v-if="store.currentCard.band"
            color="primary"
            variant="soft"
            size="sm"
          >
            {{ store.currentCard.band }}
          </UBadge>
          <UBadge
            v-if="store.currentCard.topic"
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ store.currentCard.topic }}
          </UBadge>
        </div>

        <div class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {{ store.currentCard.word }}
        </div>
        <div v-if="store.currentCard.ipa" class="mt-2 text-sm text-neutral-500">
          {{ store.currentCard.ipa }}
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div v-if="flipped" class="mt-6 space-y-3">
            <div
              class="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <div class="text-xl text-neutral-100">
              {{ store.currentCard.note ?? store.currentCard.meaning }}
            </div>
            <div
              v-if="store.currentCard.note && store.currentCard.note !== store.currentCard.meaning"
              class="text-xs text-neutral-500"
            >
              Nghĩa hệ thống: {{ store.currentCard.meaning }}
            </div>
            <div
              v-if="store.currentCard.example"
              class="mx-auto max-w-md text-sm italic text-neutral-400"
            >
              “{{ store.currentCard.example }}”
            </div>
          </div>
        </Transition>
      </div>

      <div class="border-t border-white/5 bg-neutral-950/50 p-4">
        <div v-if="!flipped" class="flex justify-center">
          <UButton
            size="lg"
            icon="i-lucide-eye"
            class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
            @click="flip"
          >
            Hiện đáp án
            <span class="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">
              Space
            </span>
          </UButton>
        </div>
        <div v-else class="grid grid-cols-4 gap-2">
          <UButton
            block
            color="error"
            class="whitespace-nowrap"
            :loading="store.loading"
            @click="grade(1)"
          >
            Again
            <span class="ml-1 hidden rounded bg-black/25 px-1 py-px text-[10px] font-mono sm:inline">1</span>
          </UButton>
          <UButton
            block
            color="warning"
            class="whitespace-nowrap"
            :loading="store.loading"
            @click="grade(2)"
          >
            Hard
            <span class="ml-1 hidden rounded bg-black/25 px-1 py-px text-[10px] font-mono sm:inline">2</span>
          </UButton>
          <UButton
            block
            color="primary"
            class="whitespace-nowrap"
            :loading="store.loading"
            @click="grade(3)"
          >
            Good
            <span class="ml-1 hidden rounded bg-black/25 px-1 py-px text-[10px] font-mono sm:inline">3</span>
          </UButton>
          <UButton
            block
            color="success"
            class="whitespace-nowrap"
            :loading="store.loading"
            @click="grade(4)"
          >
            Easy
            <span class="ml-1 hidden rounded bg-black/25 px-1 py-px text-[10px] font-mono sm:inline">4</span>
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
