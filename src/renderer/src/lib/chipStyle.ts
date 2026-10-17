import type { CSSProperties } from 'react'
import type { ThemeId } from '../../../shared/api'
import { mix, toRgba } from './palette'

/** Chip'in temaya göre dolgusu, konturu ve yazı rengi. */
export interface ChipSkin {
  surface: CSSProperties
  /** Yazı ve ikon rengi. */
  ink: string
  /** Sayaç rozetinin zemini. */
  badge: string
}

/** Hologram temasında her chip bu sarıya doğru çekilir. */
const HOLO = '#ffd23f'

export function chipSkin(color: string, theme: ThemeId): ChipSkin {
  if (theme === 'cyber') {
    // Hologram: dolgu saydam, kenar ve yazı ışık saçıyor.
    return {
      surface: {
        backgroundColor: toRgba(color, 0.14),
        backgroundImage: `linear-gradient(135deg, ${toRgba(HOLO, 0.22)}, ${toRgba(color, 0.05)} 45%, ${toRgba(HOLO, 0.28)}), repeating-linear-gradient(0deg, ${toRgba('#ffffff', 0.1)} 0 1px, transparent 1px 3px)`,
        borderColor: toRgba(color, 0.85),
        boxShadow: `0 0 10px ${toRgba(color, 0.45)}, inset 0 0 10px ${toRgba(HOLO, 0.18)}`,
        textShadow: `0 0 8px ${toRgba(color, 0.9)}, 0 1px 2px rgba(0, 0, 0, 0.6)`
      },
      ink: mix(color, '#ffffff', 0.68),
      badge: toRgba('#000000', 0.45)
    }
  }
  if (theme === 'modern') {
    // Demir plaka: üstten ışık, altta gölge, perçinli kenar.
    return {
      surface: {
        backgroundColor: color,
        backgroundImage: `linear-gradient(180deg, ${toRgba('#ffffff', 0.45)}, ${toRgba('#ffffff', 0)} 42%, ${toRgba('#000000', 0.28)}), repeating-linear-gradient(90deg, ${toRgba('#ffffff', 0.07)} 0 1px, transparent 1px 3px)`,
        borderColor: mix(color, '#000000', 0.55),
        boxShadow: `inset 0 1px 0 ${toRgba('#ffffff', 0.55)}, inset 0 -1px 0 ${toRgba('#000000', 0.35)}, 0 2px 6px ${toRgba('#000000', 0.5)}`,
        textShadow: `0 1px 0 ${toRgba('#ffffff', 0.35)}`
      },
      ink: mix(color, '#000000', 0.72),
      badge: toRgba('#000000', 0.55)
    }
  }
  return {
    surface: { backgroundColor: color },
    ink: 'var(--color-ink)',
    badge: 'var(--color-ink)'
  }
}
