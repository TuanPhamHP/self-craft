/**
 * Store cho luồng review English flashcard.
 *
 * Queue = list vocab tới hạn (từ GET /api/english/cards/due), duyệt tuần tự bằng currentIndex.
 * Review xong 1 vocab → chuyển sang vocab kế; hết queue → UI hiển thị empty state.
 *
 * Sau restructure shared-pool: identifier là `vocabId` (không phải cardId cũ).
 *
 * Ghi chú: dùng setup-style `defineStore` cho HMR + type inference đầy đủ,
 * KHÔNG persist state ra localStorage (source of truth là D1, mỗi màn chỉ nạp lại).
 */

import { defineStore } from 'pinia'
import type { SrsState, Grade } from '#shared/utils/srs'
import type { VocabEnrollInput } from '#shared/schemas/english'

/** Payload trả về từ GET /api/english/cards/due — mirror server route. */
export interface EnglishDueCard {
  vocabId: number
  word: string
  meaning: string
  example: string | null
  ipa: string | null
  topic: string | null
  band: string | null
  /** Personal note; nếu != null thì hiển thị đè lên meaning. */
  note: string | null
  srsState: SrsState
}

/** Payload trả về từ POST /api/english/cards/:id/review. */
interface ReviewResponse {
  vocabId: number
  srsState: SrsState
  due: number
}

/** Payload trả về từ POST /api/english/cards/enroll. */
interface EnrollResponse {
  enrolled: number
  vocabIds: number[]
}

export const useEnglishReview = defineStore('english-review', () => {
  const queue = ref<EnglishDueCard[]>([])
  const currentIndex = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentCard = computed<EnglishDueCard | null>(
    () => queue.value[currentIndex.value] ?? null,
  )

  const remaining = computed(() =>
    Math.max(queue.value.length - currentIndex.value, 0),
  )

  async function fetchDue() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<EnglishDueCard[]>('/api/english/cards/due')
      queue.value = data
      currentIndex.value = 0
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không tải được danh sách card'
    } finally {
      loading.value = false
    }
  }

  async function review(vocabId: number, grade: Grade) {
    loading.value = true
    error.value = null
    try {
      await $fetch<ReviewResponse>(`/api/english/cards/${vocabId}/review`, {
        method: 'POST',
        body: { grade },
      })
      // Vocab vừa review đã được đẩy due về tương lai → xoá khỏi queue để card kế lên.
      // Xoá tại vị trí currentIndex; KHÔNG tăng currentIndex vì shift đã đưa card kế
      // về đúng slot hiện tại. Giữ currentIndex ổn định tránh out-of-range khi list co lại.
      const idx = queue.value.findIndex((c) => c.vocabId === vocabId)
      if (idx !== -1) queue.value.splice(idx, 1)
      if (currentIndex.value >= queue.value.length) {
        currentIndex.value = queue.value.length // báo hiệu hết card
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không chấm được card'
    } finally {
      loading.value = false
    }
  }

  /**
   * Bulk enroll từ pool hệ thống vào queue user, sau đó fetch lại due.
   * Trả về số đã enroll để UI show toast (có thể < count nếu pool cạn với filter).
   */
  async function enroll(input: VocabEnrollInput): Promise<number> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<EnrollResponse>('/api/english/cards/enroll', {
        method: 'POST',
        body: input,
      })
      if (res.enrolled > 0) {
        await fetchDue()
      }
      return res.enrolled
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không nạp được từ mới'
      return 0
    } finally {
      loading.value = false
    }
  }

  function reset() {
    queue.value = []
    currentIndex.value = 0
    error.value = null
  }

  return {
    queue,
    currentIndex,
    loading,
    error,
    currentCard,
    remaining,
    fetchDue,
    review,
    enroll,
    reset,
  }
})
