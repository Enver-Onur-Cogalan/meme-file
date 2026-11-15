import type { Lang } from './i18n'

export const REPO = 'https://github.com/Enver-Onur-Cogalan/meme-file'
export const LATEST = `${REPO}/releases/latest`
export const LINKS = {
  portfolio: 'https://enveronurcogalan.vercel.app/',
  linkedin: 'https://www.linkedin.com/in/onurcogalan/',
  github: 'https://github.com/Enver-Onur-Cogalan'
}

export const media = (path: string): string => `${import.meta.env.BASE_URL}media/${path}`

export type ChipId = 'funny' | 'reaction' | 'fail' | 'cute' | 'angry' | 'wow' | 'sleepy'

export interface Chip {
  id: ChipId
  color: string
  icon: string
  name: Record<Lang, string>
}

// Uygulamadaki 8 hue'lu çıkartma paletinden.
export const CHIPS: Chip[] = [
  { id: 'funny', color: '#f5c542', icon: 'laugh', name: { tr: 'komik', en: 'funny' } },
  { id: 'reaction', color: '#5cc3e8', icon: 'zap', name: { tr: 'tepki', en: 'reaction' } },
  { id: 'fail', color: '#f2665a', icon: 'skull', name: { tr: 'fail', en: 'fail' } },
  { id: 'cute', color: '#ee7fb4', icon: 'heart', name: { tr: 'tatlı', en: 'cute' } },
  { id: 'angry', color: '#f59a3d', icon: 'flame', name: { tr: 'sinir', en: 'angry' } },
  { id: 'wow', color: '#b69cf2', icon: 'sparkles', name: { tr: 'vay', en: 'wow' } },
  { id: 'sleepy', color: '#6fd6c0', icon: 'moon', name: { tr: 'uykulu', en: 'sleepy' } }
]

export const chipById = (id: ChipId): Chip => CHIPS.find((chip) => chip.id === id)!

export interface Clip {
  slug: string
  name: Record<Lang, string>
  chips: ChipId[]
  duration: string
}

export const CLIPS: Clip[] = [
  { slug: 'smug', name: { tr: 'kendini beğenmiş tavşan', en: 'smug bunny' }, chips: ['funny', 'reaction'], duration: '0:03' },
  { slug: 'shocked', name: { tr: 'sincap şokta', en: 'squirrel shocked' }, chips: ['reaction', 'wow'], duration: '0:02' },
  { slug: 'yawn', name: { tr: 'kuş esniyor', en: 'bird yawn' }, chips: ['sleepy', 'cute'], duration: '0:04' },
  { slug: 'fail', name: { tr: 'kütüğü yedi', en: 'log to the face' }, chips: ['fail', 'funny'], duration: '0:04' },
  { slug: 'angry', name: { tr: 'tavşan sinirlendi', en: 'bunny is mad' }, chips: ['angry', 'reaction'], duration: '0:04' },
  { slug: 'cute', name: { tr: 'kocaman gözler', en: 'big puppy eyes' }, chips: ['cute'], duration: '0:02' },
  { slug: 'wow', name: { tr: 'uçan sincap', en: 'flying squirrel' }, chips: ['wow', 'reaction', 'funny'], duration: '0:04' },
  { slug: 'laugh', name: { tr: 'şeytani gülüş', en: 'evil laugh' }, chips: ['funny'], duration: '0:04' }
]

/** Elle asılmış hissi: her kâğıt kendi açısında, raptiyesi kendi yerinde. */
export function paperLean(index: number): { rotate: number; pin: number } {
  return { rotate: ((index * 7) % 9) / 2 - 2, pin: ((index * 11) % 13) - 6 }
}
