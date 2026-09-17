const FOLD: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ç: 'c',
  Ç: 'c',
  ö: 'o',
  Ö: 'o',
  ü: 'u',
  Ü: 'u'
}

/**
 * Aramada "bastı" ile "basti" aynı sonucu versin diye Türkçe karakterleri
 * sadeleştirir. SQLite FTS5'in remove_diacritics seçeneği ı/İ'yi i'ye çevirmez.
 */
export function normalizeForSearch(text: string): string {
  return text
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (ch) => FOLD[ch])
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}
