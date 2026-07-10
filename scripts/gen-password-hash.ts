/**
 * scripts/gen-password-hash.ts
 *
 * Sinh scrypt hash cho password đăng nhập single-user.
 * Chạy 1 LẦN mỗi khi đổi password → paste output vào .env (NUXT_AUTH_PASSWORD_HASH).
 *
 * Dùng driver Scrypt của @adonisjs/hash (chính là driver nuxt-auth-utils dùng bên trong
 * hashPassword/verifyPassword) → hash format PHC tương thích, verifyPassword ở server
 * sẽ nhận đúng.
 *
 * Cách chạy (yarn):
 *   - Tương tác:      `yarn auth:hash`             → nhập password khi được hỏi.
 *   - Truyền tham số: `yarn auth:hash <password>`  → tiện scripting, chú ý password vào shell history.
 */

import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

async function readPassword(): Promise<string> {
  const argPw = process.argv[2]
  if (argPw && argPw.length > 0) return argPw

  const rl = createInterface({ input, output })
  try {
    return await rl.question('Password: ')
  } finally {
    rl.close()
  }
}

const password = await readPassword()
if (!password || password.length < 8) {
  console.error('❌ Password phải >= 8 ký tự.')
  process.exit(1)
}

// Dùng default Scrypt params — khớp default của nuxt-auth-utils.
const hasher = new Hash(new Scrypt({}))
const hash = await hasher.make(password)

console.log('')
console.log('Copy dòng dưới vào .env:')
console.log('')
console.log(`NUXT_AUTH_PASSWORD_HASH=${hash}`)
console.log('')
