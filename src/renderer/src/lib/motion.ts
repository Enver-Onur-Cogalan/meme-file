import type { ThemeId } from '../../../shared/api'
import { useStore } from './store'

/**
 * Hareket, temanın bir parçası: Sticker Duvarı zıplar, Cyberpunk anında
 * oturur, Modern sakin süzülür, Klasik mürekkep gibi ağır ağır yerleşir.
 *
 * `spring` ve `bouncy` nesneleri yerinde güncellenir; Motion geçiş nesnesini
 * animasyon başlarken okuduğu için bileşenlerin yeniden çizilmesi gerekmez.
 */
export const spring: { type: 'spring'; stiffness: number; damping: number } = {
  type: 'spring',
  stiffness: 460,
  damping: 32
}
export const bouncy: { type: 'spring'; stiffness: number; damping: number } = {
  type: 'spring',
  stiffness: 520,
  damping: 20
}

export interface Feel {
  /** Çıkartma eğikliği çarpanı; 0 = hiç eğilmesin. */
  tilt: number
  /** Üzerine gelince kart ne kadar kalkar. */
  lift: number
  /** Üzerine gelince ne kadar döner. */
  rotate: number
  /** Üzerine gelince büyüme oranı. */
  grow: number
  /** Tıklama anındaki ezilme. */
  press: number
  /** Kartın listeye giriş animasyonu. */
  enter: { opacity: number; y: number; rotate: number; scale: number }
  card: { stiffness: number; damping: number }
}

const PROFILES: Record<
  ThemeId,
  {
    spring: { stiffness: number; damping: number }
    bouncy: { stiffness: number; damping: number }
    feel: Feel
  }
> = {
  sticker: {
    spring: { stiffness: 460, damping: 32 },
    bouncy: { stiffness: 520, damping: 20 },
    feel: {
      tilt: 1,
      lift: -4,
      rotate: -1.2,
      grow: 1.03,
      press: 0.93,
      enter: { opacity: 0, y: 18, rotate: -1.5, scale: 0.97 },
      card: { stiffness: 380, damping: 26 }
    }
  },
  cyber: {
    spring: { stiffness: 900, damping: 46 },
    bouncy: { stiffness: 1000, damping: 38 },
    feel: {
      tilt: 0,
      lift: -2,
      rotate: 0,
      grow: 1.02,
      press: 0.97,
      enter: { opacity: 0, y: 6, rotate: 0, scale: 0.995 },
      card: { stiffness: 900, damping: 44 }
    }
  },
  modern: {
    spring: { stiffness: 320, damping: 38 },
    bouncy: { stiffness: 340, damping: 34 },
    feel: {
      tilt: 0,
      lift: -3,
      rotate: 0,
      grow: 1.015,
      press: 0.985,
      enter: { opacity: 0, y: 12, rotate: 0, scale: 1 },
      card: { stiffness: 300, damping: 34 }
    }
  },
  classic: {
    spring: { stiffness: 300, damping: 22 },
    bouncy: { stiffness: 330, damping: 17 },
    feel: {
      tilt: 1.6,
      lift: -3,
      rotate: -2.4,
      grow: 1.04,
      press: 0.91,
      enter: { opacity: 0, y: 14, rotate: 3, scale: 0.94 },
      card: { stiffness: 260, damping: 20 }
    }
  }
}

export function applyMotionProfile(theme: ThemeId): void {
  const profile = PROFILES[theme] ?? PROFILES.sticker
  Object.assign(spring, profile.spring)
  Object.assign(bouncy, profile.bouncy)
}

/** Tema değişince yeniden çizilsin diye hook: kart ve chip hareketleri buradan okunur. */
export function useFeel(): Feel {
  const theme = useStore((s) => s.settings?.theme ?? 'sticker')
  return (PROFILES[theme] ?? PROFILES.sticker).feel
}
