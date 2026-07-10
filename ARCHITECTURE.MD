# ARCHITECTURE — Learning PWA (cá nhân)

> Tài liệu design-of-record. Mọi quyết định kiến trúc chốt ở đây. Khi thực thi khác tài liệu này → cập nhật tài liệu, đừng để lệch ngầm.

## 1. Mục tiêu & nguyên tắc

- App **cá nhân**, 1 user. Ưu tiên **ship nhanh**, tránh over-engineering.
- **Extensible**: mỗi môn học là 1 module độc lập; thêm môn mới **không đụng core**.
- **Data học tập tích lũy lâu dài** → migration phải data-safe, không mất data.
- Core dùng chung: **SRS engine**, progress/streak/statistics, UI kit.

## 2. Stack (đã verify current, 07/2026)

| Layer | Chọn | Ghi chú |
| --- | --- | --- |
| Framework | **Nuxt 4** (srcDir = `app/`) | Composition API, `<script setup>`, TS strict |
| Host | **Cloudflare Pages** (SSR) | Nitro preset `cloudflare-pages` |
| DB | **Cloudflare D1** + **Drizzle ORM** | `drizzle-orm/d1`; migration qua `drizzle-kit` + `wrangler` |
| Auth | **nuxt-auth-utils** | Sealed-cookie session (h3), Workers-compatible, không cần session store |
| UI | **Nuxt UI 4** + **Tailwind v4** | v4 đã stable & free (unified UI+Pro); native Nuxt Layers support |
| State | **Pinia** |  |
| Validation | **Zod** | Schema dùng chung client/server |
| PWA | **@vite-pwa/nuxt** | Installable + cache shell/assets |
| SRS | **ts-fsrs** | Pure TS, chạy được browser + Workers + Node |
| Dev local | **nitro-cloudflare-dev** + **wrangler** | Emulate D1 binding qua getPlatformProxy |

**Lưu ý runtime**: CF Workers không có full Node API. Mọi lib mới phải edge-compatible. ts-fsrs, drizzle-orm/d1, nuxt-auth-utils đều đã confirm OK.

> **Flag**: Cloudflare đang đẩy dự án mới sang **Workers + Static Assets** (preset `cloudflare_module`) thay cho Pages. Ta bám Pages theo yêu cầu. Nếu sau này CF deprecate Pages cho project mới, đổi preset là thay đổi nhỏ (cùng D1 binding). Khi scaffold, confirm lại output dir Nitro emit (`dist` hay `.output/public`) trước khi set `pages_build_output_dir`.

## 3. Module architecture — Nuxt Layers

**Quyết định: mỗi môn học = 1 Nuxt Layer.** Đây là cơ chế idiomatic của Nuxt 4 cho "module độc lập, thêm môn không đụng core".

```
learning-pwa/
├── app/                      # CORE app shell (root layer)
│   ├── components/           # UI kit dùng chung (PascalCase)
│   ├── composables/          # use* dùng chung
│   ├── layouts/
│   ├── pages/                # /, /login, /dashboard
│   └── app.vue
├── server/
│   ├── api/                  # API core (auth, stats tổng)
│   ├── database/
│   │   ├── schema/           # ⬅ SCHEMA GOM TẬP TRUNG (xem §5)
│   │   │   ├── core.ts       # bảng core_* (srs cards, review logs, streak)
│   │   │   ├── english.ts    # bảng eng_*
│   │   │   ├── programming.ts# bảng prog_*
│   │   │   └── index.ts      # re-export tất cả
│   │   └── migrations/       # SQL do drizzle-kit sinh (wrangler apply)
│   └── utils/                # useDB(), helpers server-only
├── shared/
│   └── utils/                # ⬅ PURE BUSINESS LOGIC (srs, stats) — có golden test
│       ├── srs.ts
│       └── stats.ts
├── layers/                   # ⬅ MODULE MÔN HỌC
│   ├── english/
│   │   ├── nuxt.config.ts    # bắt buộc (dù rỗng) để là layer hợp lệ
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── pages/         # /english/*
│   │   │   └── stores/        # Pinia store của module
│   │   └── server/api/        # /api/english/*
│   └── programming/
│       └── ...                # cấu trúc tương tự
├── tests/                    # golden tests cho shared/utils (tsx)
├── drizzle.config.ts
├── nuxt.config.ts
├── wrangler.jsonc
├── CLAUDE.md
└── ARCHITECTURE.md
```

**Vì sao Layers thay vì folder thường:**

- Auto-register: drop layer vào `layers/` là Nuxt nhận, không phải sửa core config.
- Isolation thật: layer có `app/` + `server/` riêng, alias `#layers/<name>`.
- Nuxt UI 4 tự sinh `@source` cho từng layer dir (Tailwind scan đúng).
- Thêm môn mới = tạo 1 folder layer + file schema module → core bất động.

**Alternative (không chọn):** folder `app/modules/*` convention thường — đơn giản hơn chút nhưng không có isolation/auto-register thật, và không đúng tinh thần "không đụng core". Với ≥2 module thì Layers đáng công.

**Import shared:**

- `shared/utils/*.ts` (trực tiếp trong `utils/`) → **auto-import** trong app + server.
- File lồng sâu (`shared/utils/foo/bar.ts`) **không** auto-import → dùng alias `#shared/utils/foo/bar`.
- Golden test (Node/tsx) import bằng **relative path** (`../shared/utils/srs`) vì alias `#shared` cần Nuxt resolver.

## 4. SRS engine (trung tâm)

**Nguyên tắc: không rải lời gọi ts-fsrs khắp nơi.** Wrap toàn bộ trong `shared/utils/srs.ts`, expose pure functions. Flashcard English và concept Programming đều đi qua đây.

Public API contract (pure, không side-effect, không I/O):

```ts
// shared/utils/srs.ts
import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';

// SrsState = subset lưu DB (đã serialize Date → epoch ms)
export interface SrsState {
	due: number; // epoch ms
	stability: number;
	difficulty: number;
	elapsedDays: number;
	scheduledDays: number;
	reps: number;
	lapses: number;
	state: number; // 0 New | 1 Learning | 2 Review | 3 Relearning
	lastReview: number | null;
}

export type Grade = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

// Tạo card mới cho item chưa học
export function srsNew(now?: number): SrsState;

// Áp 1 lần review → trả state mới (dùng khi user đã chấm điểm)
export function srsReview(state: SrsState, grade: Grade, now: number): SrsState;

// Preview 4 outcome (hiện interval trên nút Again/Hard/Good/Easy)
export function srsPreview(state: SrsState, now: number): Record<Grade, { due: number; scheduledDays: number }>;

// Lọc card tới hạn
export function srsIsDue(state: SrsState, now: number): boolean;
```

Bên dưới dùng `fsrs()`, `scheduler.repeat()` (preview), `scheduler.next(card, now, rating)` (apply). **Serialize Date → epoch ms** khi lưu D1 (D1 = SQLite: integer/real/text, không có Date).

- **Golden test bắt buộc** (`tests/srs.test.ts`, pattern `test:fire`): pin output cho một chuỗi review cố định (seed `now` cụ thể, `enable_fuzz: false` để deterministic). Đây là network an toàn khi nâng cấp ts-fsrs hoặc đổi param.
- Fallback SM-2: chỉ làm nếu có lý do rõ. Nếu đổi engine, **chỉ file này thay đổi** — API contract giữ nguyên.

## 5. Database & migration

**Schema gom tập trung** tại `server/database/schema/` (file per-module, prefix table). Lý do đã nêu ở tóm tắt: 1 D1 binding, migration tích lũy → 1 pipeline review được toàn bộ diff = an toàn hơn phân tán.

Quy ước bảng:

- `core_*`: srs cards, review logs, streak, user (1 row).
- `eng_*`, `prog_*`: dữ liệu riêng module.
- Card model tách 2 phần: **content** (thuộc module, vd `eng_vocab`) + **srs state** (bảng `core_cards` chung, tham chiếu `module` + `item_id`). Cho phép SRS engine xử lý mọi loại card đồng nhất.

**Migration flow (data-safe, không được skip bước):**

```
1. Sửa schema trong server/database/schema/*.ts
2. pnpm db:generate           # drizzle-kit sinh SQL vào server/database/migrations/
3. Đọc kỹ file SQL sinh ra    # ⬅ bắt buộc: bắt ALTER/DROP nguy hiểm mất data
4. pnpm db:migrate:local      # apply D1 local, test
5. pnpm test:fire && pnpm typecheck
6. pnpm db:migrate:remote     # chỉ khi 1-5 pass; đây là data thật
```

- Không bao giờ `DROP`/rename cột đang có data nếu không có bước copy. Ưu tiên additive migration.
- `drizzle.config.ts`: `dialect: 'sqlite'`, `out: './server/database/migrations'` (khớp `migrations_dir` trong wrangler config).
- `db:generate` dùng drizzle-kit; `db:migrate:*` dùng **wrangler** (`wrangler d1 migrations apply`).

`useDB()` (server util):

```ts
// server/utils/db.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
export function useDB() {
	const d1 = useEvent().context.cloudflare?.env?.DB;
	if (!d1) throw createError({ statusCode: 500, statusMessage: 'D1 binding "DB" not found' });
	return drizzle(d1, { schema });
}
```

## 6. API convention

- Nitro server routes trong `server/api/` (core) và `layers/<mod>/server/api/` (module).
- Validate input bằng **Zod** ở đầu handler (schema dùng chung từ `shared/`).
- Error trả về có cấu trúc thống nhất: `{ statusCode, statusMessage, data? }` qua `createError`.
- Auth: `requireUserSession(event)` (nuxt-auth-utils) đầu mỗi route cần bảo vệ.

## 7. Auth (single-user)

- `nuxt-auth-utils`: session sealed-cookie, cần env `NUXT_SESSION_PASSWORD` (≥32 ký tự).
- Single user: 1 credential lưu env (hash password), route `/api/auth/login` verify → `setUserSession(event, { user })`.
- Không cần bảng session; cookie tự chứa. Hợp app cá nhân + Workers.

## 8. PWA & offline

- **Phase 1–2: online-first.** `@vite-pwa/nuxt` chỉ cache shell + static assets (installable, load nhanh khi offline nhưng review vẫn cần mạng).
- **Offline review queue + sync = Phase 3.** Không làm sớm (tránh phức tạp IndexedDB/conflict trước khi cần).

## 9. Phases (definition-of-done)

### Phase 1 — Scaffold + Core SRS + English vocab flashcard

DoD:

- [ ] Project chạy `pnpm dev` với D1 local emulate qua nitro-cloudflare-dev.
- [ ] Deploy được lên CF Pages, D1 remote bound, migration remote chạy OK.
- [ ] Auth single-user hoạt động (login → session → protected route).
- [ ] `shared/utils/srs.ts` xong + golden test pass (`pnpm test:fire`).
- [ ] Schema core (`core_cards`, `core_review_logs`) + `eng_vocab`.
- [ ] Layer `english`: thêm từ vựng, review flashcard chạy qua SRS engine, lưu D1.
- [ ] `pnpm typecheck` pass, không `any` không giải thích.

### Phase 2 — Programming module + stats/streak/dashboard

DoD:

- [ ] Layer `programming`: flashcard khái niệm, cùng SRS engine, schema `prog_*`.
- [ ] `shared/utils/stats.ts` (streak, retention, review count) + golden test.
- [ ] Dashboard core: streak, cards due, thống kê theo module.
- [ ] Thêm module thứ 2 **không sửa** core config (chứng minh tính extensible).

### Phase 3 — Offline review queue + sync

DoD:

- [ ] Queue review khi offline (IndexedDB), sync khi online, resolve conflict rõ ràng.
- [ ] Cân nhắc thêm môn mới.

**Guard**: request ngoài scope phase hiện tại → nhắc roadmap trước khi làm.

## 10. Coding conventions (tóm tắt — chi tiết ở CLAUDE.md)

- Component PascalCase, 1 file 1 component, props type rõ.
- Composables `use*`; server utils trong `server/utils/`.
- Pure business logic → `shared/utils/` + golden test.
- Không `any` (bắt buộc phải giải thích). `typecheck` (vue-tsc) là cổng enforcement — **build không check type**.
- package.json: mỗi script có comment `"// tên"` phía trên, tag LOCAL/DEPLOY/PRODUCTION.
- Code ngắn gọn > abstraction sớm.
- Comment: tiếng Việt cho business logic, English cho code kỹ thuật chung.
