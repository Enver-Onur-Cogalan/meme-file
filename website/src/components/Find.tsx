import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CHIPS, CLIPS, type ChipId } from '../data'
import { useLang } from '../i18n'
import { ChipSticker } from './bits'
import { PostIt } from './PostIt'

/** Uygulamadaki gibi: aksan ve büyük/küçük harf fark etmez, "ı" da "i" sayılır. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function Find(): React.JSX.Element {
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<ChipId[]>(['funny'])
  const [mode, setMode] = useState<'and' | 'or'>('or')

  const results = useMemo(() => {
    const q = fold(query.trim())
    return CLIPS.filter((clip) => {
      if (q) {
        const haystack = fold([clip.name[lang], ...clip.chips.map((id) => CHIPS.find((c) => c.id === id)!.name[lang])].join(' '))
        if (!haystack.includes(q)) return false
      }
      if (picked.length === 0) return true
      return mode === 'and' ? picked.every((id) => clip.chips.includes(id)) : picked.some((id) => clip.chips.includes(id))
    })
  }, [query, picked, mode, lang])

  const toggle = (id: ChipId): void =>
    setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))

  return (
    <section data-track="find" className="section find" id="features">
      <div className="section-head">
        <h2>{t.find.title}</h2>
        <p>{t.find.lead}</p>
      </div>

      <div className="find-demo">
        <div className="find-tools">
          <label className="search">
            <Search size={18} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.find.search} />
            {query && (
              <button className="icon-btn" onClick={() => setQuery('')} aria-label={t.find.clear}>
                <X size={16} />
              </button>
            )}
          </label>
          <LayoutGroup id="mode">
            <div className="mode" role="group">
              {(['and', 'or'] as const).map((value) => (
                <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value}>
                  {mode === value && (
                    <motion.span layoutId="mode-pill" className="mode-pill" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                  )}
                  <span className="mode-label">{value === 'and' ? t.find.and : t.find.or}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        </div>

        <div className="find-chips">
          {CHIPS.map((chip, i) => {
            const on = picked.includes(chip.id)
            return (
              <motion.button
                key={chip.id}
                className="chip-btn"
                aria-pressed={on}
                onClick={() => toggle(chip.id)}
                animate={{ y: on ? -3 : 0, rotate: on ? (i % 2 ? 2.5 : -2.5) : 0, scale: on ? 1.06 : 1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              >
                <ChipSticker chip={chip} size="md" off={!on} />
              </motion.button>
            )
          })}
        </div>

        <p className="find-count" aria-live="polite">
          {t.find.count(results.length)}
        </p>

        <motion.div layout className="find-grid">
          <AnimatePresence mode="popLayout">
            {results.map((clip) => (
              <PostIt key={clip.slug} clip={clip} index={CLIPS.indexOf(clip)} />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {results.length === 0 && (
              <motion.p className="find-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {t.find.none}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
