import { describe, expect, it } from 'vitest'
import { normalizeForSearch } from './search'

describe('normalizeForSearch', () => {
  it('Türkçe karakterleri ASCII karşılıklarına indirger', () => {
    expect(normalizeForSearch('Kedi-Klavye-Bastı')).toBe('kedi-klavye-basti')
    expect(normalizeForSearch('İŞÇİ ĞÖÜ')).toBe('isci gou')
  })

  it('diğer aksanları da kaldırır', () => {
    expect(normalizeForSearch('Pokémon café')).toBe('pokemon cafe')
  })
})
