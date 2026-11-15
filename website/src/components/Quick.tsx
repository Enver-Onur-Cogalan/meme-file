import { AnimatePresence, motion } from 'motion/react'
import { Check, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CLIPS, chipById, media } from '../data'
import { useLang } from '../i18n'
import { track } from '../analytics'
import { AppClip, ChipSticker, Kbd } from './bits'
import { fold } from './Find'

export function Quick(): React.JSX.Element {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)

  const summon = (): void => {
    setPressed(true)
    window.setTimeout(() => setPressed(false), 180)
    setOpen(true)
    track('quick-open')
  }

  // Sayfanın her yerinde çalışır: uygulamadaki kısayolun aynısı.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
        event.preventDefault()
        summon()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const copied = (name: string): void => {
    setOpen(false)
    setToast(t.quick.copied(name))
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  return (
    <section data-track="quick" className="section quick">
      <div>
      <div className="section-head">
        <h2>{t.quick.title}</h2>
        <p>{t.quick.lead}</p>
      </div>
      <div className="quick-try">
        <p>{t.quick.tryIt}</p>
        <button className="keys" onClick={summon} aria-label="Ctrl + Shift + Space">
          <Kbd down={pressed}>Ctrl</Kbd>
          <span aria-hidden>+</span>
          <Kbd down={pressed}>Shift</Kbd>
          <span aria-hidden>+</span>
          <Kbd down={pressed}>Space</Kbd>
        </button>
        <p className="quick-or">{t.quick.orClick}</p>
      </div>
      </div>
      <AppClip name="quick" label={t.quick.title} />

      <AnimatePresence>{open && <Palette onClose={() => setOpen(false)} onPick={copied} />}</AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            <Check size={17} strokeWidth={3} aria-hidden /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function Palette({ onClose, onPick }: { onClose: () => void; onPick: (name: string) => void }): React.JSX.Element {
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const results = useMemo(() => {
    const q = fold(query.trim())
    if (!q) return CLIPS
    return CLIPS.filter((clip) =>
      fold([clip.name[lang], ...clip.chips.map((id) => chipById(id).name[lang])].join(' ')).includes(q)
    )
  }, [query, lang])

  const safeCursor = Math.min(cursor, Math.max(0, results.length - 1))

  const onKey = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') onClose()
    else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (event.key === 'Enter' && results[safeCursor]) {
      onPick(results[safeCursor].name[lang])
    }
  }

  return (
    <motion.div className="palette-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="palette"
        role="dialog"
        aria-modal
        aria-label={t.quick.title}
        initial={{ opacity: 0, y: -24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKey}
      >
        <label className="palette-input">
          <Search size={19} aria-hidden />
          <input
            autoFocus
            value={query}
            placeholder={t.quick.placeholder}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
          />
        </label>
        <ul className="palette-list" role="listbox">
          {results.map((clip, i) => (
            <li
              key={clip.slug}
              role="option"
              aria-selected={i === safeCursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => onPick(clip.name[lang])}
            >
              {i === safeCursor && (
                <motion.span layoutId="palette-cursor" className="palette-cursor" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />
              )}
              <span className="palette-thumb" style={{ backgroundImage: `url(${media(`clips/${clip.slug}.jpg`)})` }} />
              <span className="palette-name">{clip.name[lang]}</span>
              <span className="palette-chips">
                {clip.chips.slice(0, 2).map((id) => (
                  <ChipSticker key={id} chip={chipById(id)} />
                ))}
              </span>
            </li>
          ))}
          {results.length === 0 && <li className="palette-empty">{t.quick.empty}</li>}
        </ul>
        <p className="palette-hint">{t.quick.hint}</p>
      </motion.div>
    </motion.div>
  )
}
