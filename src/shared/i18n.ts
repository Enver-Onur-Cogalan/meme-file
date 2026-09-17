import { en } from './locales/en'
import { tr } from './locales/tr'

export type Language = 'tr' | 'en'
export type LanguageSetting = 'system' | Language
export type MessageKey = keyof typeof tr
export type Message = string | { one: string; other: string }
export type Messages = Record<MessageKey, Message>
export type MessageParams = Record<string, string | number>

export const LANGUAGES: Language[] = ['tr', 'en']

const MESSAGES: Record<Language, Messages> = { tr, en }

/** "system": işletim sistemi dili Türkçe ise Türkçe, değilse İngilizce. */
export function resolveLanguage(
  setting: LanguageSetting | undefined,
  systemLocale: string
): Language {
  if (setting === 'tr' || setting === 'en') return setting
  return systemLocale.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

export function translate(language: Language, key: MessageKey, params?: MessageParams): string {
  const message = MESSAGES[language][key] ?? MESSAGES.tr[key] ?? key
  const text =
    typeof message === 'string'
      ? message
      : Number(params?.count) === 1
        ? message.one
        : message.other
  return params ? text.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : text
}

export type Translate = (key: MessageKey, params?: MessageParams) => string
