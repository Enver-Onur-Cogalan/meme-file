import type { ThemeId } from '../../../shared/api'

/**
 * Chip renkleri kullanıcının verisi; veritabanında olduğu gibi kalır. Tema
 * değişince renk silinmez, sadece o temanın ruhuna çevrilir: doygunluk ve
 * aydınlık kaydırılır, hue korunur. Böylece "sarı chip" her temada sarı
 * kalır ama cyber'da neon, klasikte hardal olur.
 */
interface Shift {
  saturation: number
  lightness: number
  /** Yazı mürekkep renginde olduğu için chip'in aydınlığı bu aralıkta tutulur. */
  range: [number, number]
  /** Doluysa hue en yakın değere oturtulur; palet daralır, tema kimliği güçlenir. */
  hues?: number[]
}

/** Cyberpunk'ta renkler beş neon tona iner: camgöbeği, magenta, sarı, yeşil, mor. */
const NEON_HUES = [187, 320, 52, 110, 265]
/** Klasikte vintage baskı tonları: hardal, tuğla, mürekkep mavisi, zeytin, gül. */
const VINTAGE_HUES = [42, 12, 205, 78, 340]

const SHIFTS: Record<ThemeId, Shift | null> = {
  sticker: null,
  cyber: { saturation: 2.2, lightness: 1.05, range: [0.58, 0.7], hues: NEON_HUES },
  modern: { saturation: 0.3, lightness: 1.05, range: [0.7, 0.86] },
  classic: { saturation: 0.72, lightness: 0.84, range: [0.52, 0.76], hues: VINTAGE_HUES }
}

export function themeColor(hex: string, theme: ThemeId): string {
  const shift = SHIFTS[theme]
  if (!shift) return hex
  const hsl = toHsl(hex)
  if (!hsl) return hex
  const [h, s, l] = hsl
  const hue = shift.hues ? nearestHue(h * 360, shift.hues) / 360 : h
  const saturation = clamp(s * shift.saturation, 0, 1)
  const lightness = clamp(l * shift.lightness, shift.range[0], shift.range[1])
  return toHex(hue, saturation, lightness)
}

/** Renk çarkı dairesel olduğu için uzaklık iki yönden de ölçülür. */
function nearestHue(hue: number, hues: number[]): number {
  let best = hues[0]
  let distance = Infinity
  for (const candidate of hues) {
    // ((a-b+180) mod 360) - 180 işaretli en kısa farkı verir.
    const diff = Math.abs(((hue - candidate + 540) % 360) - 180)
    if (diff < distance) {
      distance = diff
      best = candidate
    }
  }
  return best
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function toHsl(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const value = parseInt(match[1], 16)
  const r = ((value >> 16) & 255) / 255
  const g = ((value >> 8) & 255) / 255
  const b = (value & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6
  return [h, s, l]
}

function toHex(h: number, s: number, l: number): string {
  const channel = (n: number): number => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
  }
  return `#${[channel(0), channel(8), channel(4)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}
