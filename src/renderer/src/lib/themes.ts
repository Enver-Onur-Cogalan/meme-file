import { applyMotionProfile } from './motion'
import type { MessageKey } from '../../../shared/i18n'
import type { ThemeId } from '../../../shared/api'

/** Ayarlardaki tema kartları: her biri kendi paletinden küçük bir örnek gösterir. */
export interface ThemePreview {
  id: ThemeId
  labelKey: MessageKey
  noteKey: MessageKey
  bg: string
  surf: string
  line: string
  text: string
  ink: string
  chips: [string, string, string]
}

export const THEMES: ThemePreview[] = [
  {
    id: 'sticker',
    labelKey: 'theme.sticker',
    noteKey: 'theme.stickerNote',
    bg: '#1b1814',
    surf: '#26221c',
    line: '#3a342b',
    text: '#f4ecdc',
    ink: '#15130f',
    chips: ['#f5c542', '#f2665a', '#5cc3e8']
  },
  {
    id: 'cyber',
    labelKey: 'theme.cyber',
    noteKey: 'theme.cyberNote',
    bg: '#0a0e14',
    surf: '#121a24',
    line: '#1f3040',
    text: '#e8fbff',
    ink: '#03060a',
    chips: ['#22e5ff', '#ffe14d', '#ff3b6b']
  },
  {
    id: 'modern',
    labelKey: 'theme.modern',
    noteKey: 'theme.modernNote',
    bg: '#1a1d20',
    surf: '#24282b',
    line: '#383d41',
    text: '#eef3f6',
    ink: '#0a0b0b',
    chips: ['#e3c86a', '#7fb0d2', '#94c491']
  },
  {
    id: 'classic',
    labelKey: 'theme.classic',
    noteKey: 'theme.classicNote',
    bg: '#c0c0c0',
    surf: '#d4d0c8',
    line: '#7b7b7b',
    text: '#0b0b0b',
    ink: '#008080',
    chips: ['#e8c33c', '#d86056', '#74b4d8']
  }
]

/** Tema her pencerede (hızlı arama dâhil) kök elemente yazılır. */
export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  applyMotionProfile(theme)
}
