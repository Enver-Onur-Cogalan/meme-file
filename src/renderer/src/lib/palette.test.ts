import { describe, expect, it } from 'vitest'
import { themeColor } from './palette'

describe('themeColor', () => {
  it('Sticker Duvarı rengi olduğu gibi bırakır', () => {
    expect(themeColor('#f5c542', 'sticker')).toBe('#f5c542')
  })

  it('cyber temada renk tanınır kalır ama doygunlaşır', () => {
    // Sarı sarı kalır: hue korunur, doygunluk artar.
    const neon = themeColor('#f5c542', 'cyber')
    expect(Math.abs(hue(neon) - hue('#f5c542'))).toBeLessThan(2)
    expect(saturation(neon)).toBeGreaterThan(saturation('#f5c542') - 0.01)
  })

  it('modern temada renk yumuşar ama tanınır kalır', () => {
    const muted = themeColor('#f2665a', 'modern')
    expect(saturation(muted)).toBeLessThan(saturation('#f2665a'))
    expect(Math.abs(hue(muted) - hue('#f2665a'))).toBeLessThan(2)
    expect(lightness(muted)).toBeGreaterThan(0.55)
  })

  it('klasik temada mürekkebe karşı okunur kalacak kadar aydınlık', () => {
    for (const color of ['#f5c542', '#5cc3e8', '#b69cf2', '#37bb37']) {
      expect(lightness(themeColor(color, 'classic'))).toBeGreaterThan(0.5)
    }
  })

  it('98 temasında renkler biraz solup koyulaşır', () => {
    const flat = themeColor('#5cc3e8', 'classic')
    expect(saturation(flat)).toBeLessThan(saturation('#5cc3e8'))
    expect(lightness(flat)).toBeLessThan(lightness('#5cc3e8'))
  })

  it('tanınmayan değeri olduğu gibi döndürür', () => {
    expect(themeColor('turuncu', 'cyber')).toBe('turuncu')
  })
})

function parts(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function lightness(hex: string): number {
  const [r, g, b] = parts(hex)
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}

function saturation(hex: string): number {
  const [r, g, b] = parts(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const l = (max + min) / 2
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
}

function hue(hex: string): number {
  const [r, g, b] = parts(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6
  return h * 360
}
