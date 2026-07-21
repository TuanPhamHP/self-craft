// scripts/seed-vocab/next-batch.mjs
//
// In ra 100 từ TIẾP THEO chưa enrich (word, pos, band, ipa, domain).
// Checkpoint tự nhiên: skip entry `enriched:true` trong wordlists + skip word
// đã xuất hiện trong bất kỳ file enriched/*.json nào.
//
// Optional filter `--band A1|A2|B1|B2|C1|C2` giới hạn chỉ 1 band.
//
// Progress đi ra stderr (đếm, filename kế tiếp); data JSON đi ra stdout —
// dễ pipe hoặc redirect.
//
// Usage:
//   yarn enrich:next                       # in ra 100 từ + gợi ý filename (mixed band)
//   yarn enrich:next --band B2             # chỉ band B2
//   yarn enrich:next > /tmp/batch.json     # redirect JSON, đọc stderr xem filename

import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')
const ENRICHED_DIR = resolve(__dirname, 'enriched')
const BATCH_SIZE = 100

if (!existsSync(ENRICHED_DIR)) mkdirSync(ENRICHED_DIR, { recursive: true })

// CLI arg parse — chỉ hiểu `--band <X>`.
const args = process.argv.slice(2)
let bandFilter = null
const bandIdx = args.indexOf('--band')
if (bandIdx !== -1) {
  bandFilter = args[bandIdx + 1]
  if (!/^(A1|A2|B1|B2|C1|C2)$/.test(bandFilter ?? '')) {
    process.stderr.write(`--band phải là A1|A2|B1|B2|C1|C2, nhận "${bandFilter}"\n`)
    process.exit(1)
  }
}

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'))
}

const general = readJson(join(DATA_DIR, 'wordlist-general.json'))
const domain = readJson(join(DATA_DIR, 'wordlist-domain.json'))

// Merge — domain thắng nếu word trùng (có ngữ cảnh chuyên ngành rõ hơn).
const map = new Map()
for (const e of general) map.set(e.word, e)
for (const e of domain) map.set(e.word, e)

// Đọc mọi file enriched-XXXX.json để lấy set word đã done.
const enrichedFiles = readdirSync(ENRICHED_DIR)
  .filter((f) => /^enriched-\d{4}\.json$/.test(f))
  .sort()
const doneWords = new Set()
for (const f of enrichedFiles) {
  const arr = readJson(join(ENRICHED_DIR, f))
  for (const e of arr) doneWords.add(e.word)
}

const queue = []
for (const e of map.values()) {
  if (e.enriched === true) continue // batch1 đã seed
  if (doneWords.has(e.word)) continue
  if (bandFilter && e.band !== bandFilter) continue
  queue.push({
    word: e.word,
    pos: e.pos ?? null,
    band: e.band,
    ipa: e.ipa,
    domain: e.domain ?? null,
  })
}

const slice = queue.slice(0, BATCH_SIZE)
const nextIdx = enrichedFiles.length + 1
const nextName = `enriched-${String(nextIdx).padStart(4, '0')}.json`
const nextPath = join('scripts/seed-vocab/enriched', nextName)

process.stderr.write(`── next-batch ─────────────────────────\n`)
if (bandFilter) process.stderr.write(`Filter band:      ${bandFilter}\n`)
process.stderr.write(`Total in scope:   ${queue.length}${bandFilter ? ` (band=${bandFilter}, chưa enrich)` : ''}\n`)
process.stderr.write(`Already enriched: ${doneWords.size} (via ${enrichedFiles.length} file)\n`)
process.stderr.write(`This batch:       ${slice.length} words\n`)
process.stderr.write(`Write to:         ${nextPath}\n`)
process.stderr.write(`───────────────────────────────────────\n\n`)

process.stdout.write(JSON.stringify(slice, null, 2))
