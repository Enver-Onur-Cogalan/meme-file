import { useCallback } from 'react'
import {
  translate,
  type MessageKey,
  type MessageParams,
  type Translate
} from '../../../shared/i18n'
import { useStore } from './store'

/** Bileşenler için: dil değişince bileşen yeniden çizilir. */
export function useT(): Translate {
  const language = useStore((s) => s.language)
  return useCallback((key, params) => translate(language, key, params), [language])
}

/** Bileşen dışı kod (ör. bildirimler, menüler) için anlık dil. */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(useStore.getState().language, key, params)
}

/**
 * "{count} meme bulundu" gibi metinleri sayının öncesi ve sonrası olarak böler;
 * böylece sayı animasyonlu gösterilirken çoğul biçim de doğru seçilir.
 */
export function useCountParts(key: MessageKey, count: number): [string, string] {
  const translateFn = useT()
  const marker = '§count§'
  // Çoğul biçim gerçek sayıya göre seçilir, sonra sayının yeri işaretlenir.
  const text = translateFn(key, { count }).replace(String(count), marker)
  const [before, after = ''] = text.split(marker)
  return [before, after]
}
