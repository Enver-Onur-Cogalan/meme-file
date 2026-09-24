/**
 * Oynatma sırası seçimleri. Store'dan ayrı durmalarının sebebi, saf
 * olmaları: liste ve mevcut konum girer, sıradaki kimlik çıkar. Böylece
 * tarayıcı ortamı olmadan test edilebiliyorlar.
 */

/** Listede bir ileri/geri gider; uçlarda başa sarar. */
export function adjacentId<T extends { id: number }>(
  items: readonly T[],
  currentId: number | null,
  step: 1 | -1
): number | null {
  if (items.length === 0) return null
  const index = items.findIndex((item) => item.id === currentId)
  if (index === -1) return null
  return items[(index + step + items.length) % items.length].id
}

/**
 * Rastgele bir kimlik seçer. Son gösterilenler ve o an açık olan elenir;
 * küçük kütüphanelerde hepsi elenirse kural adım adım gevşetilir, çünkü
 * "hiç video yok" demek yanlış olur.
 */
export function randomId<T extends { id: number }>(
  items: readonly T[],
  recent: readonly number[],
  currentId: number | null,
  random: () => number = Math.random
): number | null {
  if (items.length === 0) return null
  const skip = new Set<number>([...recent, ...(currentId === null ? [] : [currentId])])

  let pool = items.filter((item) => !skip.has(item.id))
  if (pool.length === 0) pool = items.filter((item) => item.id !== currentId)
  if (pool.length === 0) pool = [...items]

  return pool[Math.floor(random() * pool.length)].id
}
