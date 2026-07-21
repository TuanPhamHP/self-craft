// scripts/seed-vocab/validate-batch.mjs
//
// Validate 1 file enriched-XXXX.json:
//  - Đúng schema (word/meaning_vi/example/ipa/band/domain/pos/state/enriched_by).
//  - Đúng 100 entry (hoặc số bạn override qua --expect N cho batch cuối).
//  - Mọi word có trong wordlist-general hoặc wordlist-domain.
//  - Metadata ipa/band/domain khớp input list (bắt lỗi copy sai từ next-batch).
//  - Không duplicate word trong file.
//
// Usage: yarn enrich:validate scripts/seed-vocab/enriched/enriched-0001.json

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { z } from 'zod'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node validate-batch.mjs <path/to/enriched-XXXX.json> [--expect N]')
  process.exit(1)
}
const filePath = args[0]
let expected = 100
const expectIdx = args.indexOf('--expect')
if (expectIdx !== -1) {
  expected = parseInt(args[expectIdx + 1], 10)
  if (!Number.isFinite(expected) || expected <= 0) {
    console.error('--expect must be positive int')
    process.exit(1)
  }
}

const entrySchema = z.object({
  word: z.string().trim().min(1),
  meaning_vi: z.string().trim().min(1).max(200),
  example: z.string().trim().min(3).max(400),
  ipa: z.string().trim().min(1),
  band: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  domain: z.string().trim().min(1).nullable(),
  pos: z.string().trim().min(1).nullable(),
  state: z.literal('New'),
  enriched_by: z.string().trim().min(1),
})
const fileSchema = z.array(entrySchema)

const data = JSON.parse(readFileSync(filePath, 'utf8'))
const parsed = fileSchema.safeParse(data)
if (!parsed.success) {
  console.error(`FAIL schema: ${filePath}`)
  console.error(JSON.stringify(parsed.error.issues.slice(0, 8), null, 2))
  process.exit(1)
}

if (parsed.data.length !== expected) {
  console.error(`FAIL count: expected ${expected}, got ${parsed.data.length}`)
  process.exit(1)
}

// Cross-check với wordlists.
const general = JSON.parse(readFileSync(join(DATA_DIR, 'wordlist-general.json'), 'utf8'))
const domain = JSON.parse(readFileSync(join(DATA_DIR, 'wordlist-domain.json'), 'utf8'))
const inputMap = new Map()
for (const e of general) inputMap.set(e.word, e)
for (const e of domain) inputMap.set(e.word, e) // domain thắng

const errs = []
const seen = new Set()
for (const e of parsed.data) {
  if (seen.has(e.word)) errs.push(`duplicate word: ${e.word}`)
  seen.add(e.word)
  const src = inputMap.get(e.word)
  if (!src) {
    errs.push(`word "${e.word}" not in wordlists`)
    continue
  }
  if (src.band !== e.band) errs.push(`${e.word}: band mismatch ${src.band}!=${e.band}`)
  if (src.ipa !== e.ipa) errs.push(`${e.word}: ipa mismatch "${src.ipa}"!="${e.ipa}"`)
  if ((src.domain ?? null) !== e.domain) errs.push(`${e.word}: domain mismatch "${src.domain ?? null}"!="${e.domain}"`)
  if ((src.pos ?? null) !== e.pos) errs.push(`${e.word}: pos mismatch "${src.pos ?? null}"!="${e.pos}"`)
}

if (errs.length > 0) {
  console.error(`FAIL cross-check: ${errs.length} errors (first 12):`)
  for (const e of errs.slice(0, 12)) console.error('  ' + e)
  process.exit(1)
}

console.log(`OK ${filePath}: ${parsed.data.length} entries, schema + metadata match input, no duplicates`)
