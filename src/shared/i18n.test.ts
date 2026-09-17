import { describe, expect, it } from 'vitest'
import { resolveLanguage, translate } from './i18n'
import { en } from './locales/en'
import { tr } from './locales/tr'

describe('i18n', () => {
  it('sistem diline göre dil seçer', () => {
    expect(resolveLanguage('system', 'tr-TR')).toBe('tr')
    expect(resolveLanguage('system', 'en-US')).toBe('en')
    expect(resolveLanguage('system', 'de-DE')).toBe('en')
    expect(resolveLanguage('tr', 'en-US')).toBe('tr')
    expect(resolveLanguage(undefined, 'tr')).toBe('tr')
  })

  it('parametreleri ve İngilizce çoğul biçimi doldurur', () => {
    expect(translate('tr', 'library.found', { count: 3 })).toBe('3 meme bulundu')
    expect(translate('en', 'library.found', { count: 1 })).toBe('1 meme found')
    expect(translate('en', 'library.found', { count: 5 })).toBe('5 memes found')
    expect(translate('en', 'folder.removeTitle', { name: 'Memes' })).toBe(
      'Remove "Memes" from the library?'
    )
  })

  it('iki dilde de aynı yer tutucular kullanılır', () => {
    const placeholders = (message: unknown): string[] =>
      [...JSON.stringify(message).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const key of Object.keys(tr) as (keyof typeof tr)[]) {
      const trNames = new Set(placeholders(tr[key]))
      const enNames = new Set(
        placeholders(en[key]).filter((name) => name !== 'count' || trNames.has('count'))
      )
      expect([...enNames].sort(), key).toEqual([...trNames].sort())
    }
  })
})
