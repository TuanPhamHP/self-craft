<script setup lang="ts">
/**
 * /english — trang chủ module Tiếng Anh.
 *
 * Trang tĩnh: hero giới thiệu CEFR → 6 band cards (accordion mở can-do)
 * → bảng quy đổi tổng hợp. Data tĩnh nằm ở layers/english/data/cefr.ts,
 * component chỉ đọc — không hardcode số liệu.
 */
import { CEFR_BAND_INFOS, type CefrBandInfo } from '../../../data/cefr'

useSeoMeta({
  title: 'Tiếng Anh — CEFR & bảng quy đổi điểm',
  description:
    'Giải thích 6 band CEFR (A1 → C2) và bảng quy đổi giữa các hệ điểm phổ biến: IELTS, TOEIC, TOEFL iBT, Cambridge Scale.',
})

/** Cột hiển thị trong bảng quy đổi — thứ tự cố định. */
const SCORE_COLUMNS = [
  { key: 'ielts', label: 'IELTS' },
  { key: 'toeic', label: 'TOEIC (L&R)' },
  { key: 'toeflIbt', label: 'TOEFL iBT' },
  { key: 'cambridge', label: 'Cambridge Scale' },
] as const

type ScoreKey = (typeof SCORE_COLUMNS)[number]['key']

function scoreOf(band: CefrBandInfo, key: ScoreKey): string {
  return band.scores[key] ?? '—'
}

/** Set các band code đang mở expand. Cho phép mở nhiều cùng lúc. */
const expanded = ref<Set<string>>(new Set())

function toggle(code: string) {
  const next = new Set(expanded.value)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  expanded.value = next
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-10">
    <!-- Hero -->
    <section class="space-y-3">
      <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <UIcon name="i-lucide-book-open" class="h-3.5 w-3.5" />
        Module Tiếng Anh
      </div>
      <h1
        class="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
      >
        Khung tham chiếu CEFR & bảng quy đổi
      </h1>
      <p class="max-w-2xl text-sm leading-relaxed text-neutral-400 sm:text-base">
        CEFR (Common European Framework of Reference) chia trình độ ngoại ngữ thành 6 bậc từ A1
        (mới bắt đầu) đến C2 (thành thạo gần như bản xứ). Bảng dưới đây quy đổi nhanh giữa CEFR
        và các hệ điểm phổ biến (IELTS, TOEIC, TOEFL iBT, Cambridge Scale) để bạn định vị trình
        độ của mình.
      </p>

      <div class="flex flex-wrap gap-2 pt-1">
        <UButton
          to="/english/review"
          icon="i-lucide-layers"
          size="sm"
          class="whitespace-nowrap border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90"
        >
          Vào review
        </UButton>
        <UButton
          to="/english/add"
          icon="i-lucide-plus"
          size="sm"
          variant="soft"
          color="neutral"
          class="whitespace-nowrap"
        >
          Thêm từ mới
        </UButton>
      </div>
    </section>

    <!-- Band cards -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium uppercase tracking-wider text-neutral-500">
        6 band CEFR
      </h2>

      <ul class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="band in CEFR_BAND_INFOS"
          :key="band.code"
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 transition hover:border-white/20"
        >
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-70" :class="band.gradient" />

          <button
            type="button"
            class="flex w-full items-start gap-3 p-4 text-left transition hover:bg-white/5"
            :aria-expanded="expanded.has(band.code)"
            :aria-controls="`cando-${band.code}`"
            @click="toggle(band.code)"
          >
            <div class="relative shrink-0">
              <div class="absolute inset-0 rounded-lg bg-gradient-to-br opacity-40 blur-md" :class="band.gradient" />
              <div
                class="relative flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-semibold text-white ring-1 ring-white/20"
                :class="band.gradient"
              >
                {{ band.code }}
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-base font-medium text-white">{{ band.name }}</h3>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="h-4 w-4 shrink-0 text-neutral-500 transition-transform"
                  :class="{ 'rotate-180': expanded.has(band.code) }"
                />
              </div>
              <p class="mt-1 text-xs text-neutral-400">{{ band.description }}</p>
            </div>
          </button>

          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div v-if="expanded.has(band.code)" :id="`cando-${band.code}`" class="border-t border-white/5 px-4 py-3">
              <p class="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Có thể làm được
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(item, i) in band.canDo"
                  :key="i"
                  class="flex gap-2 text-xs leading-relaxed text-neutral-300"
                >
                  <UIcon name="i-lucide-check" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
          </Transition>
        </li>
      </ul>
    </section>

    <!-- Bảng quy đổi -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium uppercase tracking-wider text-neutral-500">
        Bảng quy đổi điểm
      </h2>

      <div class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur">
              <tr class="text-left text-xs uppercase tracking-wider text-neutral-500">
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">CEFR</th>
                <th
                  v-for="col in SCORE_COLUMNS"
                  :key="col.key"
                  scope="col"
                  class="whitespace-nowrap px-4 py-3 font-medium"
                >
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr
                v-for="band in CEFR_BAND_INFOS"
                :key="band.code"
                class="transition hover:bg-white/[0.02]"
              >
                <th scope="row" class="whitespace-nowrap px-4 py-3 text-left align-middle">
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-7 w-9 items-center justify-center rounded-md bg-gradient-to-br text-xs font-semibold text-white ring-1 ring-white/20"
                      :class="band.gradient"
                    >
                      {{ band.code }}
                    </span>
                    <span class="text-xs text-neutral-400">{{ band.name }}</span>
                  </div>
                </th>
                <td
                  v-for="col in SCORE_COLUMNS"
                  :key="col.key"
                  class="whitespace-nowrap px-4 py-3 text-neutral-200 tabular-nums"
                >
                  {{ scoreOf(band, col.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="text-xs text-neutral-500">
        Ô "—" nghĩa là bài thi tương ứng không phủ band đó (điểm nằm dưới ngưỡng đo hoặc trên
        trần thang điểm).
      </p>
    </section>
  </div>
</template>
