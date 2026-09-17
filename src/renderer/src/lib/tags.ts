export const SWATCHES = [
  '#f5c542',
  '#f59a3d',
  '#f2665a',
  '#ee7fb4',
  '#b69cf2',
  '#5cc3e8',
  '#6fd6c0',
  '#7fd47f'
] as const

/** Sidebar'daki çıkartmaların hafif eğikliği; chip'e göre sabit kalsın diye id'den türetilir. */
export function tiltFor(id: number): number {
  return [-2, 1.5, -1, 2, 1, -1.5][id % 6]
}
