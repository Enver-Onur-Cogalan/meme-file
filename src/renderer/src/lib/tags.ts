/**
 * Chip paleti: 8 hue × 3 ton.
 *
 * Orta satır uygulamanın ilk gününden beri kullanılan sekiz renk; açık ve
 * koyu satırlar onlardan türetildi (aynı hue, aydınlığı kaydırılmış). Tek
 * aileden geldikleri için yan yana durduklarında uyum bozulmuyor.
 *
 * Koyu tonlar keyfî bir oranla koyulaştırılmadı: çıkartmada yazı `ink`
 * renginde, sayaç rozetinde ise chip rengi mürekkep üstünde yazı oluyor.
 * İki yön de aynı kontrastı istediği için her ton, mürekkebe karşı en az
 * 4.8 kontrast bırakan en koyu değerde durdu. Paletteki en düşük oran 4.83.
 *
 * Serbest renk seçici bilerek yok: çıkartma koyu kontur ve okunur yazı
 * varsayıyor, keyfî bir hex ikisini de bozabiliyor.
 */
const LIGHT = [
  '#f5d784',
  '#f5bb7f',
  '#f4a19a',
  '#f4bbd6',
  '#d1c2f5',
  '#99d7ed',
  '#a6e2d5',
  '#b3e2b3'
] as const

const BASE = [
  '#f5c542',
  '#f59a3d',
  '#f2665a',
  '#ee7fb4',
  '#b69cf2',
  '#5cc3e8',
  '#6fd6c0',
  '#7fd47f'
] as const

const DEEP = [
  '#d19a05',
  '#d16c05',
  '#f54334',
  '#ec4494',
  '#976ff1',
  '#169dcd',
  '#2db79a',
  '#37bb37'
] as const

/** Seçicide 8 sütunluk ızgarada üç satır olarak dizilir. */
export const SWATCHES = [...LIGHT, ...BASE, ...DEEP] as const

/**
 * Yeni chip için henüz kullanılmamış bir renk. Önce orta satır denenir:
 * ilk chip'ler en doygun tonları alsın, açık ve koyu tonlar palet
 * dolduktan sonra devreye girsin. Hepsi kullanılıyorsa sıradaki renge
 * dönülür, çünkü renk tekrarı yasak değil.
 */
export function nextFreeSwatch(usedColors: string[], fallbackIndex = 0): string {
  const used = new Set(usedColors.map((color) => color.toLowerCase()))
  const ordered = [...BASE, ...DEEP, ...LIGHT]
  return ordered.find((swatch) => !used.has(swatch)) ?? SWATCHES[fallbackIndex % SWATCHES.length]
}

/** Sidebar'daki çıkartmaların hafif eğikliği; chip'e göre sabit kalsın diye id'den türetilir. */
export function tiltFor(id: number): number {
  return [-2, 1.5, -1, 2, 1, -1.5][id % 6]
}
