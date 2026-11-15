import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react'
import { Check, Scissors } from 'lucide-react'
import { useRef, useState } from 'react'
import { CLIPS, media } from '../data'
import { useLang } from '../i18n'

// Turdaki kırpma kaydıyla aynı rakamlar.
const ORIGINAL_MB = 13.5
const FITTED_MB = 8.6
const SCALE_MB = 15
const LIMIT_MB = 10

/**
 * Sayfa kaydıkça klip kırpılıyor ve dosya küçülüyor; 10 MB çizgisinin altına
 * indiği an durum "sığdı"ya dönüyor. Kaydırma geri alınınca her şey geri sarılıyor.
 */
export function Fit(): React.JSX.Element {
  const { t, lang } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'center 0.42'] })
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })
  const size = useTransform(progress, [0, 1], [ORIGINAL_MB, FITTED_MB])
  const barWidth = useTransform(size, (mb) => `${(mb / SCALE_MB) * 100}%`)
  const leftHandle = useTransform(progress, [0, 1], ['0%', '24%'])
  const rightHandle = useTransform(progress, [0, 1], ['0%', '30%'])
  const [label, setLabel] = useState(ORIGINAL_MB.toFixed(1))
  const [fits, setFits] = useState(false)

  useMotionValueEvent(size, 'change', (mb) => {
    setLabel(mb.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
    setFits(mb <= LIMIT_MB)
  })

  return (
    <section data-track="fit" className="section fit">
      <div className="section-head">
        <h2>{t.fit.title}</h2>
        <p>{t.fit.lead}</p>
        <p className="fit-gif">{t.fit.gif}</p>
      </div>

      <div className="fit-demo" ref={ref}>
        <div className="strip" aria-hidden>
          {CLIPS.map((clip) => (
            <span key={clip.slug} className="strip-frame" style={{ backgroundImage: `url(${media(`clips/${clip.slug}.jpg`)})` }} />
          ))}
          <motion.span className="strip-shade strip-shade-left" style={{ width: leftHandle }}>
            <span className="strip-handle">
              <Scissors size={14} aria-hidden />
            </span>
          </motion.span>
          <motion.span className="strip-shade strip-shade-right" style={{ width: rightHandle }}>
            <span className="strip-handle" />
          </motion.span>
        </div>

        <div className="meter">
          <div className="meter-row">
            <motion.span
              className="meter-size"
              data-fits={fits || undefined}
              animate={{ scale: fits ? [1, 1.12, 1] : 1 }}
              transition={{ duration: 0.35 }}
            >
              {label} MB
            </motion.span>
            <motion.span
              key={fits ? 'fits' : 'big'}
              className="meter-state"
              data-fits={fits || undefined}
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: fits ? -3 : 2, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 16 }}
            >
              {fits && <Check size={15} strokeWidth={3} aria-hidden />}
              {fits ? t.fit.fits : t.fit.tooBig}
            </motion.span>
          </div>
          <div className="meter-track">
            <motion.span className="meter-fill" data-fits={fits || undefined} style={{ width: barWidth }} />
            <span className="meter-limit" style={{ left: `${(LIMIT_MB / SCALE_MB) * 100}%` }}>
              <span>
                {t.fit.limit} · 10 MB
              </span>
            </span>
          </div>
          <div className="meter-legend">
            <span>
              {t.fit.original}: {ORIGINAL_MB.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} MB
            </span>
            <span>
              {t.fit.after}: {FITTED_MB.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} MB
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
