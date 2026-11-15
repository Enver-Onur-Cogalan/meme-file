import { AnimatePresence, LayoutGroup, motion, type TargetAndTransition, type Transition } from 'motion/react'
import { useState } from 'react'
import { CHIPS, media } from '../data'
import { useLang } from '../i18n'
import { track } from '../analytics'
import { ChipSticker } from './bits'

const THEMES = ['sticker', 'cyber', 'modern', 'classic'] as const
type Theme = (typeof THEMES)[number]

const steps = (count: number) => (p: number) => Math.floor(p * count) / count

/** Her tema ekrana kendi hareketiyle giriyor: uygulamadaki hareket profilleri gibi. */
const ENTER: Record<Theme, { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition }> = {
  sticker: {
    initial: { opacity: 0, rotate: -5, y: 50, scale: 0.96 },
    animate: { opacity: 1, rotate: 0, y: 0, scale: 1 },
    transition: { type: 'spring', stiffness: 260, damping: 18 }
  },
  cyber: {
    initial: { opacity: 0, x: -18, filter: 'hue-rotate(80deg) saturate(3)' },
    animate: { opacity: [0, 1, 0.3, 1, 0.6, 1], x: [-18, 10, -6, 3, 0, 0], filter: 'hue-rotate(0deg) saturate(1)' },
    transition: { duration: 0.5, ease: 'linear' }
  },
  modern: {
    initial: { opacity: 0, x: 70 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  },
  classic: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, ease: steps(4) }
  }
}

export function Themes(): React.JSX.Element {
  const { t } = useLang()
  const [theme, setTheme] = useState<Theme>('sticker')
  const enter = ENTER[theme]
  return (
    <section data-track="themes" className="section themes" id="themes" data-skin={theme}>
      <div className="section-head">
        <h2>{t.themes.title}</h2>
        <p>{t.themes.lead}</p>
      </div>
      <LayoutGroup id="themes">
        <div className="theme-tabs" role="tablist">
          {THEMES.map((id) => (
            <button key={id} role="tab" aria-selected={theme === id} className="theme-tab" onClick={() => {
              setTheme(id)
              track('theme', { name: id })
            }}>
              {theme === id && (
                <motion.span layoutId="theme-pill" className="theme-pill" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />
              )}
              <span className="theme-tab-label">{t.themes.list[id].name}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
      <div className="theme-stage">
        <div className="theme-shot">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={theme}
              src={media(`themes/${theme}.jpg`)}
              alt={t.themes.list[theme].name}
              initial={enter.initial}
              animate={enter.animate}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={enter.transition}
              loading="lazy"
            />
          </AnimatePresence>
        </div>
        <div className="theme-side">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h3>{t.themes.list[theme].name}</h3>
              <p>{t.themes.list[theme].text}</p>
              <div className="theme-chips">
                {CHIPS.slice(0, 4).map((chip, i) => (
                  <motion.span
                    key={chip.id}
                    initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.08 + i * 0.05 }}
                  >
                    <ChipSticker chip={chip} size="md" />
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
