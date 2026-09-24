import { describe, expect, it } from 'vitest'
import { nextFreeSwatch, SWATCHES } from './tags'

/** WCAG bağıl parlaklık; chip rengi ile mürekkep arasındaki kontrast için. */
function luminance(hex: string): number {
  const channel = (value: number): number => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastWithInk(hex: string): number {
  const ink = luminance('#1b1814')
  const color = luminance(hex)
  return (Math.max(ink, color) + 0.05) / (Math.min(ink, color) + 0.05)
}

describe('SWATCHES', () => {
  it('24 benzersiz renk içerir', () => {
    expect(SWATCHES).toHaveLength(24)
    expect(new Set(SWATCHES).size).toBe(24)
  })

  it('hepsi mürekkeple okunur kontrastta kalır', () => {
    // Çıkartmada yazı mürekkep renginde, sayaç rozetinde ise tam tersi;
    // iki yön de aynı oranı ister. Palet değişirse bu test uyarır.
    for (const swatch of SWATCHES) {
      expect(contrastWithInk(swatch), swatch).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('nextFreeSwatch', () => {
  it('kullanılmamış bir renk döndürür', () => {
    const used = SWATCHES.slice(0, 5)
    expect(used).not.toContain(nextFreeSwatch([...used]))
  })

  it('büyük/küçük harf farkını yok sayar', () => {
    const upper = SWATCHES.map((swatch) => swatch.toUpperCase())
    // Hepsi kullanılıyor sayılmalı; sıradaki renge dönülür
    expect(SWATCHES).toContain(nextFreeSwatch(upper))
  })

  it('palet dolunca sıradaki renge döner', () => {
    expect(nextFreeSwatch([...SWATCHES], 0)).toBe(SWATCHES[0])
    expect(nextFreeSwatch([...SWATCHES], 25)).toBe(SWATCHES[1])
  })
})
