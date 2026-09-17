import {
  resolveLanguage,
  translate,
  type Language,
  type LanguageSetting,
  type MessageKey,
  type MessageParams
} from '../shared/i18n'

// Electron'a bağımlı değil; böylece ffmpeg/clip modülleri testlerde de kullanılabilir.
let language: Language = 'tr'

export function setLanguage(setting: LanguageSetting | undefined, systemLocale: string): Language {
  language = resolveLanguage(setting, systemLocale)
  return language
}

export function currentLanguage(): Language {
  return language
}

export function t(key: MessageKey, params?: MessageParams): string {
  return translate(language, key, params)
}
