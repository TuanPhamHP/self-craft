/**
 * Golden test cho SRS engine (shared/utils/srs.ts).
 *
 * Pin INVARIANT (không pin ms tuyệt đối) — invariant giữ nguyên qua các version
 * ts-fsrs; số ms cụ thể có thể thay đổi khi engine tune params.
 *
 * Chạy: yarn test:fire  (tsx --test).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  srsNew,
  srsReview,
  srsPreview,
  srsIsDue,
  type Grade,
  type SrsState,
} from '../shared/utils/srs'

// Seed thời gian cố định — mọi chuỗi review dùng chung để deterministic.
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0) // 2026-01-01T00:00:00Z
const DAY_MS = 24 * 60 * 60 * 1000

const GRADE_AGAIN: Grade = 1
const GRADE_HARD: Grade = 2
const GRADE_GOOD: Grade = 3
const GRADE_EASY: Grade = 4

describe('srsNew', () => {
  it('card mới: state=New(0), due=now, reps=lapses=0, lastReview=null', () => {
    const s = srsNew(T0)
    assert.equal(s.state, 0, 'state must be New(0)')
    assert.equal(s.due, T0, 'due of a new card equals now')
    assert.equal(s.reps, 0)
    assert.equal(s.lapses, 0)
    assert.equal(s.lastReview, null)
  })
})

describe('srsReview', () => {
  it('sau Good: due tiến về tương lai, reps tăng, lastReview được set', () => {
    const s0 = srsNew(T0)
    const s1 = srsReview(s0, GRADE_GOOD, T0)
    assert.ok(s1.due > T0, 'due phải > now sau khi review Good')
    assert.equal(s1.reps, s0.reps + 1, 'reps tăng đúng 1')
    assert.equal(s1.lastReview, T0, 'lastReview = thời điểm review')
  })

  it('chuỗi Good liên tiếp: scheduledDays không giảm (interval mở rộng dần)', () => {
    let s = srsNew(T0)
    let t = T0
    const scheduled: number[] = []
    for (let i = 0; i < 6; i++) {
      s = srsReview(s, GRADE_GOOD, t)
      scheduled.push(s.scheduledDays)
      // Nhảy đến đúng due kế tiếp cho vòng review sau (giữ elapsed nhất quán).
      t = s.due
    }
    for (let i = 1; i < scheduled.length; i++) {
      assert.ok(
        scheduled[i] >= scheduled[i - 1],
        `scheduledDays không được giảm giữa 2 lần Good (bước ${i}): ${scheduled[i - 1]} -> ${scheduled[i]}`,
      )
    }
  })

  it('Again sinh due <= Good khi review cùng thời điểm từ cùng state', () => {
    // Tạo 1 state đã trưởng thành để so sánh 2 nhánh grade.
    let base: SrsState = srsNew(T0)
    let t = T0
    for (let i = 0; i < 3; i++) {
      base = srsReview(base, GRADE_GOOD, t)
      t = base.due
    }
    const nowCompare = base.due
    const afterAgain = srsReview(base, GRADE_AGAIN, nowCompare)
    const afterGood = srsReview(base, GRADE_GOOD, nowCompare)
    assert.ok(
      afterAgain.due <= afterGood.due,
      `Again.due (${afterAgain.due}) phải <= Good.due (${afterGood.due})`,
    )
  })
})

describe('srsPreview', () => {
  it('preview: Easy>=Good>=Hard>=Again (interval scheduledDays không đảo thứ tự)', () => {
    // Preview trên card mới có ý nghĩa hạn chế (đều ngắn); dùng card đã review vài lần.
    let s = srsNew(T0)
    let t = T0
    for (let i = 0; i < 3; i++) {
      s = srsReview(s, GRADE_GOOD, t)
      t = s.due
    }
    const p = srsPreview(s, t)
    assert.ok(
      p[4].scheduledDays >= p[3].scheduledDays,
      `Easy(${p[4].scheduledDays}) >= Good(${p[3].scheduledDays})`,
    )
    assert.ok(
      p[3].scheduledDays >= p[2].scheduledDays,
      `Good(${p[3].scheduledDays}) >= Hard(${p[2].scheduledDays})`,
    )
    assert.ok(
      p[2].scheduledDays >= p[1].scheduledDays,
      `Hard(${p[2].scheduledDays}) >= Again(${p[1].scheduledDays})`,
    )
  })

  it('preview khớp srsReview: due từ preview[grade] === due sau srsReview cùng grade', () => {
    let s = srsNew(T0)
    let t = T0
    for (let i = 0; i < 2; i++) {
      s = srsReview(s, GRADE_GOOD, t)
      t = s.due
    }
    const p = srsPreview(s, t)
    for (const g of [GRADE_AGAIN, GRADE_HARD, GRADE_GOOD, GRADE_EASY] as const) {
      const applied = srsReview(s, g, t)
      assert.equal(
        applied.due,
        p[g].due,
        `preview.due phải khớp srsReview.due cho grade ${g}`,
      )
    }
  })
})

describe('srsIsDue', () => {
  it('biên: due == now → true; due > now (dù 1 ms) → false', () => {
    const s = srsNew(T0)
    assert.equal(srsIsDue(s, T0), true, 'due == now là tới hạn')
    assert.equal(srsIsDue(s, T0 - 1), false, 'now < due chưa tới hạn')

    const later: SrsState = { ...s, due: T0 + DAY_MS }
    assert.equal(srsIsDue(later, T0), false)
    assert.equal(srsIsDue(later, T0 + DAY_MS), true)
    assert.equal(srsIsDue(later, T0 + DAY_MS + 1), true)
  })
})
