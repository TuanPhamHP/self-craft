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

const store = useEnglishReview()
const flipped = ref(false)

/** Reset flipped khi card đổi (index thay đổi hoặc queue reload). */
watch(
  () => store.currentCard?.cardId,
  () => {
    flipped.value = false
  },
)

function flip() {
  if (store.currentCard) flipped.value = true
}

async function grade(g: Grade) {
  if (!store.currentCard || !flipped.value) return
  await store.review(store.currentCard.cardId, g)
  // watch ở trên đã lo reset flipped khi cardId đổi.
}

// Keyboard bindings — attach on client only.
function onKey(e: KeyboardEvent) {
  // Bỏ qua khi user gõ trong input/textarea (không có ở page này, nhưng future-proof).
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
  <div class="mx-auto max-w-xl p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">English review</h1>
      <UBadge v-if="store.remaining > 0" color="primary" variant="soft">
        Còn {{ store.remaining }} card
      </UBadge>
    </div>

    <!-- Loading -->
    <UCard v-if="store.loading && !store.currentCard">
      <p class="text-sm text-neutral-500">Đang tải…</p>
    </UCard>

    <!-- Error -->
    <UCard v-else-if="store.error" class="border-red-300">
      <p class="text-red-600">Lỗi: {{ store.error }}</p>
      <template #footer>
        <UButton size="sm" @click="store.fetchDue()">Thử lại</UButton>
      </template>
    </UCard>

    <!-- Empty -->
    <UCard v-else-if="!store.currentCard">
      <p class="text-center text-lg">Hết card tới hạn hôm nay 🎉</p>
      <template #footer>
        <div class="flex justify-center gap-2">
          <UButton variant="soft" @click="store.fetchDue()">Nạp lại</UButton>
          <UButton to="/english/add" variant="outline">Thêm từ mới</UButton>
        </div>
      </template>
    </UCard>

    <!-- Flashcard -->
    <UCard v-else>
      <div class="space-y-3 py-6 text-center">
        <div class="text-3xl font-bold">{{ store.currentCard.word }}</div>
        <div v-if="store.currentCard.ipa" class="text-neutral-500">
          {{ store.currentCard.ipa }}
        </div>

        <template v-if="flipped">
          <hr class="my-3 border-neutral-200 dark:border-neutral-700" />
          <div class="text-lg">{{ store.currentCard.meaning }}</div>
          <div
            v-if="store.currentCard.example"
            class="italic text-neutral-600 dark:text-neutral-400"
          >
            {{ store.currentCard.example }}
          </div>
        </template>
      </div>

      <template #footer>
        <div v-if="!flipped" class="flex justify-center">
          <UButton size="lg" @click="flip">
            Hiện đáp án <span class="ml-2 text-xs opacity-70">(Space)</span>
          </UButton>
        </div>
        <div v-else class="grid grid-cols-4 gap-2">
          <UButton color="error" :loading="store.loading" @click="grade(1)">
            Again <span class="ml-1 text-xs opacity-70">1</span>
          </UButton>
          <UButton color="warning" :loading="store.loading" @click="grade(2)">
            Hard <span class="ml-1 text-xs opacity-70">2</span>
          </UButton>
          <UButton color="primary" :loading="store.loading" @click="grade(3)">
            Good <span class="ml-1 text-xs opacity-70">3</span>
          </UButton>
          <UButton color="success" :loading="store.loading" @click="grade(4)">
            Easy <span class="ml-1 text-xs opacity-70">4</span>
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
