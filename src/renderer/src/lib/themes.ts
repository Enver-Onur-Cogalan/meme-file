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
    bg: '#141516',
    surf: '#1c1e1f',
    line: '#2b2e30',
    text: '#ededed',
    ink: '#0a0b0b',
    chips: ['#e2c782', '#8fb5d6', '#9ec79b']
  },
  {
    id: 'classic',
    labelKey: 'theme.classic',
    noteKey: 'theme.classicNote',
    bg: '#efe5cf',
    surf: '#f8f2e3',
    line: '#cdbda0',
    text: '#2c241a',
    ink: '#2c241a',
    chips: ['#e8b73c', '#c9574a', '#5f8fb3']
  }
]

/** Tema her pencerede (hızlı arama dâhil) kök elemente yazılır. */
export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
}
