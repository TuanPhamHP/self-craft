# CLAUDE.md

Hướng dẫn vận hành cho Claude Code agents trên repo này. Đọc kèm `ARCHITECTURE.md` (design-of-record — chi tiết kiến trúc, phases, DB nằm ở đó).

## Dự án là gì

Learning PWA **cá nhân** (1 user): học Tiếng Anh + Lập trình. Kiến trúc **module-based qua Nuxt Layers**, core dùng chung **SRS engine** (spaced repetition). Ưu tiên **ship nhanh, tránh over-engineering**.

## Stack (đã chốt — không tự đổi)

Nuxt 4 (TS strict) · Cloudflare Pages (SSR, Nitro preset `cloudflare-pages`) · D1 + Drizzle ORM · nuxt-auth-utils · Nuxt UI 4 + Tailwind v4 · Pinia · Zod · @vite-pwa/nuxt · ts-fsrs · dev: nitro-cloudflare-dev + wrangler.

Đề xuất lib mới: phải edge-compatible (CF Workers không có full Node API), nhẹ, maintain tốt → **nêu rõ lý do**.

## Luật vàng (enforcement)

1. **Không `any`.** Bắt buộc phải dùng → comment giải thích tại chỗ.
2. **`typecheck` (vue-tsc) là cổng.** Build KHÔNG check type. Chạy `pnpm typecheck` trước khi coi task là xong.
3. **Pure business logic** (SRS calc, statistics) → `shared/utils/`, có **golden test** (`pnpm test:fire`). Không nhét logic này vào component/API.
4. **SRS chỉ gọi qua `shared/utils/srs.ts`.** Không rải `ts-fsrs` khắp code. Đổi engine = chỉ file này đổi.
5. **Migration data-safe** (xem quy trình dưới). Data học tập tích lũy — không được mất.
6. **Component** PascalCase, 1 file 1 component, props type rõ. **Composables** `use*`. **Server utils** trong `server/utils/`.
7. **Comment**: tiếng Việt cho business logic, English cho code kỹ thuật chung.
8. Code ngắn gọn, dễ maintain > abstraction sớm.

## Cấu trúc thư mục

- `app/` — core shell (srcDir Nuxt 4): components, composables, layouts, pages core.
- `layers/<module>/` — mỗi môn 1 layer (english, programming), tự chứa `app/` + `server/api/` + Pinia stores. **Có `nuxt.config.ts` riêng (dù rỗng).**
- `shared/utils/` — pure logic, auto-import. File trực tiếp trong `utils/` mới auto-import.
- `server/database/schema/` — schema **gom tập trung**, file per-module, prefix table (`core_`, `eng_`, `prog_`), `index.ts` re-export.
- `server/database/migrations/` — SQL do drizzle-kit sinh.
- `tests/` — golden test (tsx, relative import vào `shared/utils`).

Thêm môn mới = tạo folder `layers/<mod>/` + file `server/database/schema/<mod>.ts` → **không sửa core config**.

## Quy trình đổi schema (KHÔNG skip bước)

```
1. Sửa server/database/schema/*.ts
2. pnpm db:generate            # sinh SQL migration
3. ĐỌC KỸ file SQL sinh ra     # bắt ALTER/DROP nguy hiểm; ưu tiên additive
4. pnpm db:migrate:local       # apply D1 local
5. pnpm test:fire && pnpm typecheck
6. pnpm db:migrate:remote      # CHỈ khi 1–5 pass — đây là data thật
```

Không DROP/rename cột đang có data nếu chưa copy sang.

## Scaffold sequence (Phase 1, lần đầu)

```bash
# 1. Init
pnpm dlx nuxi@latest init learning-pwa && cd learning-pwa

# 2. Deps
pnpm add @nuxt/ui nuxt-auth-utils @vite-pwa/nuxt pinia zod drizzle-orm ts-fsrs
pnpm add -D drizzle-kit wrangler nitro-cloudflare-dev tsx @types/node

# 3. Tạo D1
wrangler d1 create learning-db   # copy database_id vào wrangler.jsonc

# 4. Dev (D1 local emulate)
pnpm dev
```

`nuxt.config.ts` (điểm mấu chốt):

```ts
export default defineNuxtConfig({
	compatibilityDate: '2026-07-01', // dùng ngày gần đây
	modules: ['@nuxt/ui', 'nuxt-auth-utils', '@vite-pwa/nuxt', '@pinia/nuxt', 'nitro-cloudflare-dev'],
	nitro: {
		preset: 'cloudflare-pages',
		experimental: { asyncContext: true },
		cloudflare: { deployConfig: true, nodeCompat: true },
	},
	css: ['~/assets/css/main.css'], // @import "tailwindcss"; @import "@nuxt/ui";
});
```

`wrangler.jsonc`:

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "learning-pwa",
	"compatibility_date": "2026-07-01",
	"pages_build_output_dir": "./dist", // confirm output dir Nitro emit ở build đầu
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "learning-db",
			"database_id": "<từ wrangler d1 create>",
			"migrations_dir": "server/database/migrations",
		},
	],
}
```

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
	dialect: 'sqlite',
	schema: './server/database/schema/index.ts',
	out: './server/database/migrations',
});
```

Env cần: `NUXT_SESSION_PASSWORD` (≥32 ký tự) cho nuxt-auth-utils.

## package.json scripts (giữ format comment + tag)

Mỗi script có dòng `"// tên"` phía trên mô tả + tag **LOCAL / DEPLOY / PRODUCTION**:

```jsonc
{
	"// dev": "LOCAL — dev server + emulate D1 binding",
	"dev": "nuxi dev",
	"// typecheck": "LOCAL — cổng enforcement type; chạy trước khi xong task",
	"typecheck": "nuxi typecheck",
	"// test:fire": "LOCAL — golden test pure logic (SRS, stats)",
	"test:fire": "tsx --test tests/**/*.test.ts",
	"// db:generate": "LOCAL — sinh SQL migration từ schema",
	"db:generate": "drizzle-kit generate",
	"// db:migrate:local": "LOCAL — apply migration D1 local",
	"db:migrate:local": "wrangler d1 migrations apply learning-db --local",
	"// db:migrate:remote": "PRODUCTION — apply migration D1 remote (DATA THẬT, cẩn thận)",
	"db:migrate:remote": "wrangler d1 migrations apply learning-db --remote",
	"// build": "DEPLOY — build Nitro cho CF Pages",
	"build": "nuxi build",
	"// deploy": "DEPLOY — build + đẩy lên CF Pages",
	"deploy": "nuxi build && wrangler pages deploy ./dist",
}
```

## Phase guard

Roadmap: **P1** scaffold + core SRS + English vocab flashcard · **P2** Programming module + stats/streak/dashboard · **P3** offline queue + sync + môn mới.

Request ngoài scope phase hiện tại (mặc định P1) → **nhắc roadmap trước**, hỏi có muốn làm sớm không, rồi mới làm.

## Definition of done cho mỗi task

- [ ] `pnpm typecheck` pass, không `any` không giải thích.
- [ ] Pure logic mới có golden test, `pnpm test:fire` pass.
- [ ] Đổi schema → đã theo đủ 6 bước migration.
- [ ] Đặt đúng chỗ: module logic vào layer, pure logic vào `shared/utils`, không nhét vào core.
