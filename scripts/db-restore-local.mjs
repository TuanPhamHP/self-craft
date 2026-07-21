// scripts/db-restore-local.mjs
//
// Restore D1 local từ 1 SQL dump (thường là output của db:dump:remote).
// Flow: DROP tất cả bảng user (giữ sqlite internal) → apply dump.
// Sau restore, DB local có state y hệt remote tại thời điểm dump.
//
// Không nuke directory .wrangler/state — trên Windows workerd hay giữ lock,
// và ta không muốn động vào state của session khác.
//
// Usage: yarn db:restore:local <path/to/dump.sql>

import { execSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'

const dumpFile = process.argv[2]
if (!dumpFile) {
  console.error('Usage: yarn db:restore:local <path/to/dump.sql>')
  process.exit(1)
}
if (!existsSync(dumpFile)) {
  console.error(`Dump file không tồn tại: ${dumpFile}`)
  process.exit(1)
}

console.log(`[restore] Dump: ${dumpFile} (${statSync(dumpFile).size} bytes)`)

const DB = 'self-craft-db'

function d1(command, opts = {}) {
  return execSync(`wrangler d1 execute ${DB} --local --command ${JSON.stringify(command)}`, {
    stdio: opts.silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
  })
}

// Lấy danh sách bảng user (bỏ sqlite_*, bỏ system tables của D1 như _cf_*, d1_migrations).
console.log(`[restore] Liệt kê bảng hiện tại…`)
const raw = d1(
  `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
  { silent: true },
)
const allNames = [...raw.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((m) => m[1])
// D1 giữ `_cf_*` và `d1_migrations` là bảng nội bộ — SQLITE_AUTH nếu ta DROP.
// Dump file có INSERT vào d1_migrations, ta chỉ cần xoá các bảng user (schema hiện tại).
const dropList = allNames.filter((n) => !n.startsWith('_cf_') && n !== 'd1_migrations')
console.log(`[restore] Tổng ${allNames.length} bảng (${allNames.join(', ')}); DROP ${dropList.length} bảng user: ${dropList.join(', ') || '(none)'}`)

if (dropList.length > 0) {
  // Ghi drop.sql ra .backups/ tạm, dùng --file (tránh multi-line trong --command trên Windows).
  const { writeFileSync, unlinkSync } = await import('node:fs')
  const tmp = `.backups/_drop_${Date.now()}.sql`
  // Không PRAGMA foreign_keys — D1 cấm PRAGMA runtime. FK CASCADE tự xử lý order.
  const dropSql = dropList.map((n) => `DROP TABLE IF EXISTS \`${n}\`;`).join('\n')
  writeFileSync(tmp, dropSql, 'utf8')
  console.log(`[restore] DROP qua ${tmp}…`)
  try {
    execSync(`wrangler d1 execute ${DB} --local --file=${JSON.stringify(tmp)}`, { stdio: 'inherit' })
  } finally {
    try { unlinkSync(tmp) } catch { /* best-effort cleanup */ }
  }

  // Xoá dữ liệu d1_migrations (không DROP bảng — chỉ reset content) để dump có thể INSERT lại.
  console.log(`[restore] Reset d1_migrations content…`)
  execSync(
    `wrangler d1 execute ${DB} --local --command "DELETE FROM d1_migrations"`,
    { stdio: 'inherit' },
  )
}

console.log(`[restore] Applying dump…`)
execSync(`wrangler d1 execute ${DB} --local --file=${JSON.stringify(dumpFile)}`, {
  stdio: 'inherit',
})

console.log(`[restore] Xong. Bảng sau restore:`)
execSync(
  `wrangler d1 execute ${DB} --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"`,
  { stdio: 'inherit' },
)
