# ARCHITECTURE — Learning PWA

> Tài liệu design-of-record. Mọi quyết định kiến trúc chốt ở đây. Khi thực thi khác tài liệu này → cập nhật tài liệu, đừng để lệch ngầm.

## 1. Mục tiêu & nguyên tắc

- **Multi-user, invite-only** (owner mời qua email; không open registration). Ưu tiên **ship nhanh**, tránh over-engineering.
- **Extensible**: mỗi môn học là 1 module độc lập; thêm môn mới **không đụng core**.
- **Data học tập tích lũy lâu dài** → migration phải data-safe, không mất data.
- Core dùng chung: **auth**, **SRS engine**, progress/streak/statistics, UI kit.
- **Data scope per-user**: mọi bảng data (cards, review logs, vocab, ...) đều có `user_id` FK. Mọi query PHẢI filter userId — quên 1 chỗ = leak cross-user.

## 2. Stack (đã verify current, 07/2026)

| Layer | Chọn | Ghi chú |
| --- | --- | --- |
| Framework | **Nuxt 4** (srcDir = `app/`) | Composition API, `<script setup>`, TS strict |
| Host | **Cloudflare Pages** (SSR) | Nitro preset `cloudflare-pages` |
| DB | **Cloudflare D1** + **Drizzle ORM** | `drizzle-orm/d1`; migration qua `drizzle-kit` + `wrangler` |
| Auth | **nuxt-auth-utils** | Sealed-cookie session (h3), Workers-compatible, không cần session store. User + invite + reset lưu D1 |
| Email | **Resend** (REST API, fetch trực tiếp) | Transactional email cho invite + reset password. Free tier 3000/tháng. Dev fallback: log link ra console khi env EMPTY |
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

- `core_users`: tài khoản (email unique, password_hash scrypt, is_admin, `name` nullable). First-registered user auto = admin (bootstrap khi DB rỗng); sau đó registration invite-only.
- `core_invites`: token mời (token_hash SHA-256, expires_at TTL 7 ngày, used_at nullable, invited_by FK).
- `core_password_resets`: token reset password (token_hash SHA-256, expires_at TTL 1 giờ, used_at nullable, user_id FK CASCADE).
- `core_review_logs`: audit trail **module-agnostic** — `(module, item_id)` thay vì FK card cụ thể. Ví dụ English: `module='english'`, `item_id = eng_vocab.id`. Không bao giờ DROP/rewrite.
- `core_cards`: **hiện chưa dùng.** Ban đầu thiết kế làm SRS state chung; sau English restructure (xem dưới) đã chuyển sang bảng module-specific. Giữ nguyên chờ Programming (P2) quyết định pattern.
- `eng_*`, `prog_*`: dữ liệu riêng module. Mỗi module tự quyết pattern (shared pool hay per-user).

**English data model** (sau restructure shared-pool):

- `eng_vocab`: **content pool 2 nguồn**:
  - `created_by IS NULL` = từ hệ thống (seed), mọi user thấy.
  - `created_by = <userId>` = từ private user tự thêm, chỉ user đó thấy.
  - Partial unique index: `(word) WHERE created_by IS NULL` + `(created_by, word) WHERE created_by IS NOT NULL`.
- `eng_user_vocab`: **SRS state + personal note per (user_id, vocab_id)** — PK compound. `note` override `eng_vocab.meaning` khi hiển thị. FK CASCADE cả 2 chiều.
- Lý do tách: cho phép hệ thống seed từ common lists (CEFR, chuyên ngành) mà không nhân bản mỗi user; user vẫn cá nhân hoá nghĩa qua `note`.

**Query rule cứng**:
- Mọi bảng có `user_id` PHẢI kèm `eq(<table>.userId, userId)` trong WHERE. Không có helper generic — mỗi handler tự làm, review kỹ khi PR.
- Với `eng_vocab`: query "vocab trong scope user X" = `WHERE created_by IS NULL OR created_by = X`. Sort ưu tiên private khi tie (`ORDER BY created_by IS NULL`).

**Migration flow (data-safe, không được skip bước):**

```
1. Sửa schema trong server/database/schema/*.ts
2. yarn db:generate           # drizzle-kit sinh SQL vào server/database/migrations/
                              # dùng --custom nếu cần backfill/recreate table (SQLite giới hạn ALTER)
3. Đọc kỹ file SQL sinh ra    # ⬅ bắt buộc: bắt ALTER/DROP nguy hiểm mất data
4. yarn db:migrate:local      # apply D1 local, test
5. yarn test:fire && yarn typecheck
6. yarn db:dump:remote        # ⬅ BẮT BUỘC snapshot .backups/<ts>.sql trước khi động data thật
7. yarn db:migrate:remote     # chỉ khi 1-6 pass; đây là data thật
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

## 7. Auth (multi-user, invite-only)

- `nuxt-auth-utils`: session sealed-cookie, cần env `NUXT_SESSION_PASSWORD` (≥32 ký tự). Không cần bảng session; cookie tự chứa.
- Session shape: `{ user: { id, email, isAdmin } }` (augment ở `auth.d.ts` root).
- **Login**: `POST /api/auth/login` — query `core_users` theo email, `verifyPassword` scrypt. Message lỗi generic (chống enumeration).
- **Register** (`POST /api/auth/register`):
  - Có `token` → validate `core_invites` (unused + not-expired) → dùng email từ invite → tạo user (isAdmin=false) → mark invite used.
  - Không `token` → bootstrap first-user: chỉ được khi `core_users` rỗng → tạo user isAdmin=true. Sau đó chặn.
- **Invite** (`/api/admin/invites` GET/POST + `/:id` DELETE, admin-only): sinh raw token (32-byte random, base64url), lưu SHA-256 hash, gửi link `/register?token=<raw>` qua Resend. TTL 7 ngày.
- **Forgot** (`POST /api/auth/forgot`): luôn trả 200 (anti-enumeration). Nếu email có user → tạo `core_password_resets` (token hash, TTL 1h), gửi link `/reset?token=<raw>`.
- **Reset** (`POST /api/auth/reset`): validate token → `hashPassword` mới → update `core_users.passwordHash` → mark token used → `clearUserSession`. User login lại bằng password mới.
- **Middleware `auth.global.ts`**: public routes = `[/login, /register, /forgot, /reset]`; `/admin/*` chặn `!isAdmin`; còn lại require login.
- **Env**:
  - `NUXT_SESSION_PASSWORD` (≥32 ký tự) — nuxt-auth-utils.
  - `NUXT_RESEND_API_KEY`, `NUXT_RESEND_FROM_EMAIL` — Resend. Dev có thể để EMPTY → email log ra console (link copy paste vẫn dùng được).
  - `NUXT_APP_URL` — base URL để build link trong email (production: URL Pages; dev: `http://localhost:3000`).
- **Token security**: raw token 32-byte random (base64url ~43 ký tự) chỉ có trong link email; DB lưu SHA-256 hash → DB leak ≠ token dùng được.

## 8. PWA & offline

- **Phase 1–2: online-first.** `@vite-pwa/nuxt` chỉ cache shell + static assets (installable, load nhanh khi offline nhưng review vẫn cần mạng).
- **Offline review queue + sync = Phase 3.** Không làm sớm (tránh phức tạp IndexedDB/conflict trước khi cần).

## 9. Phases (definition-of-done)

### Phase 1 — Scaffold + Core SRS + English vocab flashcard

DoD:

- [ ] Project chạy `pnpm dev` với D1 local emulate qua nitro-cloudflare-dev.
- [ ] Deploy được lên CF Pages, D1 remote bound, migration remote chạy OK.
- [ ] Auth multi-user hoạt động (first-user bootstrap → invite → register → login → protected route; forgot/reset qua email).
- [ ] `shared/utils/srs.ts` xong + golden test pass (`pnpm test:fire`).
- [ ] Schema core (`core_users`, `core_invites`, `core_password_resets`, `core_review_logs` module-agnostic) + English (`eng_vocab` shared pool + `eng_user_vocab` per-user SRS state).
- [ ] Layer `english`: thêm từ vựng (system pool reuse hoặc private), search local + Free Dictionary fallback, review flashcard chạy qua SRS engine, lưu D1.
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
