/**
 * useDictionary — client-side lookup Free Dictionary API.
 *
 * URL: https://api.dictionaryapi.dev/api/v2/entries/en/<word>
 * KHÔNG proxy qua backend theo yêu cầu (API public + free, không cần cache).
 * 404 → null (từ không tồn tại). Lỗi khác → throw.
 */

/** 1 audio/phonetic entry — nhiều biến thể phát âm (US/UK...). */
export interface DictPhonetic {
  text?: string
  audio?: string
  sourceUrl?: string
  license?: { name: string; url: string }
}

export interface DictDefinition {
  definition: string
  synonyms: string[]
  antonyms: string[]
  example?: string
}

export interface DictMeaning {
  partOfSpeech: string
  definitions: DictDefinition[]
  synonyms: string[]
  antonyms: string[]
}

export interface DictEntry {
  word: string
  phonetic?: string
  phonetics: DictPhonetic[]
  meanings: DictMeaning[]
  license?: { name: string; url: string }
  sourceUrls?: string[]
}

export function useDictionary() {
  async function lookup(word: string): Promise<DictEntry[] | null> {
    const clean = word.trim()
    if (!clean) return null
    try {
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`
      const data = await $fetch<DictEntry[]>(url)
      return Array.isArray(data) && data.length > 0 ? data : null
    } catch (e) {
      const err = e as { status?: number; statusCode?: number }
      // 404 = từ không có → coi như null (caller hiển thị "not found").
      if (err.status === 404 || err.statusCode === 404) return null
      throw e
    }
  }

  /** Chọn phonetic đầu tiên có text — dùng làm IPA gợi ý khi "Lưu nhanh". */
  function pickIpa(entry: DictEntry): string | undefined {
    return entry.phonetic || entry.phonetics.find((p) => !!p.text)?.text
  }

  /** Chọn example đầu tiên tìm thấy trong bất kỳ definition nào — làm câu ví dụ gợi ý. */
  function pickExample(entry: DictEntry): string | undefined {
    for (const m of entry.meanings) {
      for (const d of m.definitions) {
        if (d.example) return d.example
      }
    }
    return undefined
  }

  return { lookup, pickIpa, pickExample }
}
