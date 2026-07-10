/**
 * SRS wrapper — điểm gọi ts-fsrs DUY NHẤT trong toàn repo.
 *
 * Nguyên tắc:
 * - Không rải `ts-fsrs` khắp code (component/API/store) → đổi engine chỉ động đến file này.
 * - Pure: không I/O, không side-effect. Consumer tự lo persist DB.
 * - Deterministic: `enable_fuzz: false` để golden test pin được output.
 * - Serialize Date → epoch ms khi lưu (D1 = SQLite: integer/real/text, không có Date).
 */

import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type FSRSParameters,
  type Grade as FsrsGrade,
  type RecordLog,
} from 'ts-fsrs'

/** State subset lưu DB — camelCase + epoch ms (mirror `core_cards`). */
export interface SrsState {
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  /** 0 New | 1 Learning | 2 Review | 3 Relearning */
  state: number
  lastReview: number | null
}

/** Rating: 1 Again | 2 Hard | 3 Good | 4 Easy (khớp ts-fsrs Rating, loại Manual=0). */
export type Grade = 1 | 2 | 3 | 4

/** Kết quả preview cho 1 grade (dùng render nút Again/Hard/Good/Easy với interval hiển thị). */
export interface SrsPreviewOutcome {
  due: number
  scheduledDays: number
}

/**
 * Params cố định cho toàn app:
 * - `enable_fuzz: false` → deterministic, golden test pin được.
 * - Nếu sau này tune params (vd request_retention), đổi ở đây; MỌI logic đi qua file này nên đồng nhất.
 */
const FSRS_PARAMS: Partial<FSRSParameters> = {
  enable_fuzz: false,
}

const engine = fsrs(FSRS_PARAMS)

// ==== Conversion helpers (Date <-> epoch ms) ====

function cardToState(card: Card): SrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  }
}

function stateToCard(s: SrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    // ts-fsrs Card yêu cầu learning_steps (fsrs 5.x). Card mới createEmptyCard = 0.
    // Field không có trong SrsState (không cần persist cho use-case hiện tại) → mặc định 0
    // và ts-fsrs sẽ tính lại khi review nếu cần.
    learning_steps: 0,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as State,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  }
}

// ==== Public API (khớp ARCHITECTURE.md §4) ====

/** Tạo state cho card mới chưa học lần nào. */
export function srsNew(now?: number): SrsState {
  const seed = now ?? Date.now()
  const card = createEmptyCard(new Date(seed))
  return cardToState(card)
}

/** Áp 1 review → trả state mới. Consumer persist state + append review log. */
export function srsReview(state: SrsState, grade: Grade, now: number): SrsState {
  const card = stateToCard(state)
  // Cast: `Grade` cục bộ (1|2|3|4) đã trùng giá trị runtime với Rating.Again..Easy,
  // nhưng TS coi enum member là opaque nên phải nhắc kiểu cho ts-fsrs Grade.
  const { card: nextCard } = engine.next(card, new Date(now), grade as unknown as FsrsGrade)
  return cardToState(nextCard)
}

/** Preview 4 outcome (hiển thị interval trên nút Again/Hard/Good/Easy). */
export function srsPreview(
  state: SrsState,
  now: number,
): Record<Grade, SrsPreviewOutcome> {
  const card = stateToCard(state)
  const record = engine.repeat(card, new Date(now)) as RecordLog
  return {
    1: {
      due: record[Rating.Again].card.due.getTime(),
      scheduledDays: record[Rating.Again].card.scheduled_days,
    },
    2: {
      due: record[Rating.Hard].card.due.getTime(),
      scheduledDays: record[Rating.Hard].card.scheduled_days,
    },
    3: {
      due: record[Rating.Good].card.due.getTime(),
      scheduledDays: record[Rating.Good].card.scheduled_days,
    },
    4: {
      due: record[Rating.Easy].card.due.getTime(),
      scheduledDays: record[Rating.Easy].card.scheduled_days,
    },
  }
}

/** Card tới hạn khi due <= now. */
export function srsIsDue(state: SrsState, now: number): boolean {
  return state.due <= now
}
