/**
 * Lucide ikonlarını kategorilere ayıran katalogu üretir.
 *
 * Kategori bilgisi ne `lucide-react` ne de `lucide-static` paketinde var;
 * yalnızca Lucide deposundaki `icons/<ad>.json` dosyalarında duruyor. 2100
 * ikonu tek tek indirmek yerine, kurulu `lucide-react` sürümünün etiketine
 * ait arşiv bir kez indirilip okunuyor. Üretilen dosya repoya commit'lenir,
 * böylece uygulamaya çalışma zamanı bağımlılığı eklenmiyor.
 *
 * Çalıştırmak için: node scripts/generate-icon-catalog.mjs
 * (Lucide sürümü yükseltilince yeniden çalıştırılmalı.)
 */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const version = require('lucide-react/package.json').version
const Lucide = await import('lucide-react')

/**
 * Lucide'ın 42 kategorisi meme etiketleme için fazla ayrıntılı ve çoğu
 * alakasız (charts, connectivity, cursors, development...). Burada onlar
 * uygulamanın kullandığı başlıklara toplanıyor; eşlenmeyen her şey
 * "other" altında kalıyor.
 */
const CATEGORY_MAP = {
  faces: ['emoji'],
  animals: ['animals'],
  gaming: ['gaming'],
  food: ['food-beverage'],
  music: ['multimedia'],
  sports: ['sports'],
  nature: ['nature', 'weather', 'seasons', 'sustainability', 'science'],
  symbols: ['shapes', 'math', 'arrows', 'navigation'],
  objects: [
    'tools',
    'home',
    'devices',
    'transportation',
    'travel',
    'shopping',
    'photography',
    'files',
    'buildings',
    'finance',
    'medical',
    'security',
    'time'
  ],
  people: ['people', 'account', 'accessibility', 'social', 'communication', 'mail']
}

const ORDER = [...Object.keys(CATEGORY_MAP), 'other']

/** `a-arrow-down` → `AArrowDown` */
const toPascal = (name) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const work = mkdtempSync(join(tmpdir(), 'lucide-'))
try {
  const url = `https://codeload.github.com/lucide-icons/lucide/tar.gz/refs/tags/${version}`
  console.log(`Lucide ${version} arşivi indiriliyor…`)
  execFileSync('bash', [
    '-c',
    `curl -sL --max-time 300 "${url}" | tar -xz -C "${work}" '*/icons/*.json'`
  ])

  const root = readdirSync(work)[0]
  const iconsDir = join(work, root, 'icons')
  const files = readdirSync(iconsDir).filter((file) => file.endsWith('.json'))

  const buckets = Object.fromEntries(ORDER.map((id) => [id, []]))
  let missing = 0

  for (const file of files.sort()) {
    const iconName = file.replace(/\.json$/, '')
    const pascal = toPascal(iconName)
    // Kurulu pakette karşılığı olmayan ikon katalogda yer almasın
    if (!(pascal in Lucide)) {
      missing += 1
      continue
    }
    const meta = JSON.parse(readFileSync(join(iconsDir, file), 'utf8'))
    const categories = Array.isArray(meta.categories) ? meta.categories : []
    const bucket =
      ORDER.find((id) => CATEGORY_MAP[id]?.some((category) => categories.includes(category))) ??
      'other'
    buckets[bucket].push(pascal)
  }

  const body = ORDER.map((id) => `  ${id}: ${JSON.stringify(buckets[id])}`).join(',\n')
  const output = `// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: lucide ${version} · Üreten: scripts/generate-icon-catalog.mjs
export const ICON_CATEGORY_IDS = ${JSON.stringify(ORDER)} as const

export type IconCategoryId = (typeof ICON_CATEGORY_IDS)[number]

export const ICON_CATEGORIES: Record<IconCategoryId, readonly string[]> = {
${body}
}
`
  const target = 'src/renderer/src/lib/icon-catalog.generated.ts'
  writeFileSync(target, output)

  console.log(`\n${target} yazıldı (${(output.length / 1024).toFixed(1)} KB)`)
  for (const id of ORDER) console.log(`  ${id.padEnd(9)} ${buckets[id].length}`)
  if (missing) console.log(`\nKurulu pakette bulunmayan ${missing} ikon atlandı.`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
