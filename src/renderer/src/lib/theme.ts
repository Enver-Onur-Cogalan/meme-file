import type { ThemeId } from '../../../shared/api'
import { themeColor } from './palette'
import { useStore } from './store'

export function useThemeId(): ThemeId {
  return useStore((s) => s.settings?.theme ?? 'sticker')
}

/** Chip rengini aktif temaya çeviren yardımcı. */
export function useTagColor(): (hex: string) => string {
  const theme = useThemeId()
  return (hex) => themeColor(hex, theme)
}
