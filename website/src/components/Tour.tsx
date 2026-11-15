import { AnimatePresence, motion, useInView } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { media } from '../data'
import { useLang } from '../i18n'
import { track } from '../analytics'

const CHAPTERS = ['library', 'search', 'inbox', 'trim', 'caption', 'quick', 'themes'] as const
type Chapter = (typeof CHAPTERS)[number]

/** Kaydı olmayan bölüm bu kadar süre ekranda kalır. */
const FALLBACK_SECONDS = 6

export function Tour(): React.JSX.Element {
  const { t } = useLang()
  const [active, setActive] = useState<Chapter>('library')
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [missing, setMissing] = useState<Set<Chapter>>(new Set())
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const inView = useInView(frameRef, { amount: 0.35 })
  const running = inView && !paused

  const advance = (): void => {
    setProgress(0)
    setActive((current) => CHAPTERS[(CHAPTERS.indexOf(current) + 1) % CHAPTERS.length])
  }

  const isMissing = missing.has(active)

  useEffect(() => {
    const video = videoRef.current
    if (!video || isMissing) return
    if (running) video.play().catch(() => undefined)
    else video.pause()
  }, [running, active, isMissing])

  // Kaydı olmayan bölümde ilerleme çubuğu zamanla dolar.
  useEffect(() => {
    if (!isMissing || !running) return
    const started = performance.now() - progress * FALLBACK_SECONDS * 1000
    let frame = 0
    const tick = (now: number): void => {
      const value = (now - started) / (FALLBACK_SECONDS * 1000)
      if (value >= 1) return advance()
      setProgress(value)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMissing, running, active])

  return (
    <section data-track="tour" className="section tour" id="tour">
      <div className="section-head">
        <h2>{t.tour.title}</h2>
        <p>{t.tour.lead}</p>
      </div>
      <div className="tour-body">
        <div className="tour-frame" ref={frameRef}>
          <div className="window-bar" aria-hidden>
            <i />
            <i />
            <i />
            <span>Meme File</span>
          </div>
          <div className="tour-screen">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={active}
                className="tour-layer"
                initial={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {isMissing ? (
                  <div className="tour-missing">
                    <p>{t.tour.chapters[active].label}</p>
                    <span>{t.tour.missing}</span>
                  </div>
                ) : (
                  <video
                    // Çıkış animasyonundaki eski video kalkınca yeni videonun referansını silmesin.
                    ref={(node) => {
                      videoRef.current = node
                      return () => {
                        if (videoRef.current === node) videoRef.current = null
                      }
                    }}
                    src={media(`${active}.mp4`)}
                    poster={media(`${active}.jpg`)}
                    muted
                    playsInline
                    preload="metadata"
                    onTimeUpdate={(event) => {
                      const video = event.currentTarget
                      if (video.duration) setProgress(video.currentTime / video.duration)
                    }}
                    onEnded={advance}
                    onError={() => setMissing((set) => new Set(set).add(active))}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <button
            className="tour-toggle"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t.tour.play : t.tour.pause}
          >
            {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          </button>
        </div>

        <ol className="tour-chapters">
          {CHAPTERS.map((chapter) => {
            const selected = chapter === active
            return (
              <li key={chapter}>
                <button
                  className="tour-chapter"
                  data-active={selected || undefined}
                  aria-current={selected || undefined}
                  onClick={() => {
                    setProgress(0)
                    setActive(chapter)
                    track('tour-chapter', { name: chapter })
                    setPaused(false)
                  }}
                >
                  <span className="tour-chapter-label">{t.tour.chapters[chapter].label}</span>
                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.span
                        className="tour-chapter-text"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      >
                        <span>{t.tour.chapters[chapter].text}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className="tour-progress" aria-hidden>
                    <span style={{ transform: `scaleX(${selected ? progress : 0})` }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
