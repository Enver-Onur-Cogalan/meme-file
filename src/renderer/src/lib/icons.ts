import * as Lucide from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ICON_CATEGORIES, ICON_CATEGORY_IDS, type IconCategoryId } from './icon-catalog.generated'

export { ICON_CATEGORY_IDS }
export type { IconCategoryId }

/** Kategori sekmelerinde kullanılan liste; "öne çıkanlar" her zaman başta. */
export type IconTab = 'featured' | IconCategoryId
export const ICON_TABS: readonly IconTab[] = ['featured', ...ICON_CATEGORY_IDS]

/**
 * Lucide'ın tüm ikonları. `icons` dışa aktarımı bazı ikonları içermediği için modülün kendisinden
 * oluşturulur. Eski adlar (ör. Laugh → FaceGrinning) kayıtlı chip'ler bozulmasın diye aramada kalır.
 */
export const LUCIDE_ICONS: ReadonlyMap<string, LucideIcon> = new Map(
  Object.entries(Lucide)
    .filter(
      ([name, value]) =>
        /^[A-Z]/.test(name) &&
        !name.endsWith('Icon') &&
        !name.startsWith('Lucide') &&
        typeof value === 'object' &&
        value !== null
    )
    .map(([name, value]) => [name, value as unknown as LucideIcon])
)

/** Seçicide aynı ikon farklı adlarla iki kez görünmesin. */
const UNIQUE_ICON_NAMES: string[] = (() => {
  const seen = new Set<LucideIcon>()
  return [...LUCIDE_ICONS.entries()]
    .filter(([, icon]) => !seen.has(icon) && !!seen.add(icon))
    .map(([name]) => name)
})()

/** Türkçe aramalar için sık kullanılan ikonların anahtar kelimeleri. */
const TURKISH_KEYWORDS: Record<string, string> = {
  ates: 'flame fire',
  kedi: 'cat',
  kopek: 'dog',
  oyun: 'gamepad game joystick',
  gul: 'laugh smile',
  komik: 'laugh smile',
  uzgun: 'frown',
  kizgin: 'angry',
  kalp: 'heart',
  yildiz: 'star',
  muzik: 'music',
  kafatasi: 'skull',
  hayalet: 'ghost',
  kupa: 'trophy',
  tac: 'crown',
  roket: 'rocket',
  bomba: 'bomb',
  simsek: 'zap',
  goz: 'eye',
  kahve: 'coffee',
  ay: 'moon',
  gunes: 'sun',
  film: 'film clapperboard',
  mikrofon: 'mic',
  hedef: 'target crosshair',
  kilic: 'sword',
  para: 'coins dollar',
  bebek: 'baby',
  parti: 'party',
  uyku: 'bed moon',
  yemek: 'pizza utensils',
  araba: 'car'
}

export const FEATURED_ICONS = [
  'Laugh',
  'Smile',
  'Frown',
  'Angry',
  'Skull',
  'Ghost',
  'Cat',
  'Dog',
  'Heart',
  'Zap',
  'Sparkles',
  'ThumbsUp',
  'Gamepad2',
  'Crosshair',
  'Target',
  'Sword',
  'Trophy',
  'Crown',
  'Rocket',
  'Bomb',
  'Music',
  'Mic',
  'Tv',
  'Film',
  'Eye',
  'Coffee',
  'Moon',
  'Star',
  'Flame',
  'PartyPopper',
  'Pizza',
  'Tag'
].filter((name) => LUCIDE_ICONS.has(name))

/**
 * Bir kategorinin ikonları. Katalog üretilirken kurulu pakete göre
 * süzülüyor ama aynı ikonun eski adları hâlâ listede olabilir; burada
 * tekrarlar ayıklanıyor.
 */
export function iconsInCategory(tab: IconTab): readonly string[] {
  if (tab === 'featured') return FEATURED_ICONS
  const unique = new Set(UNIQUE_ICON_NAMES)
  return ICON_CATEGORIES[tab].filter((name) => unique.has(name))
}

export function searchIcons(query: string, limit = 120): string[] {
  const normalized = query
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .trim()
  if (!normalized) return FEATURED_ICONS
  const compact = normalized.replace(/\s+/g, '')
  // Türkçe eşleşmeler kelime başından aranır: "kedi" → "cat" ama "ScatterChart" değil.
  const translated = TURKISH_KEYWORDS[normalized]?.split(' ') ?? []
  const results: string[] = []
  for (const name of UNIQUE_ICON_NAMES) {
    const words = name.split(/(?=[A-Z0-9])/).map((word) => word.toLowerCase())
    if (
      name.toLowerCase().includes(compact) ||
      translated.some((term) => words.some((word) => word.startsWith(term)))
    ) {
      results.push(name)
      if (results.length >= limit) break
    }
  }
  return results
}
