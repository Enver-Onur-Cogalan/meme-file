import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { formatSize } from '../lib/format'
import { useStore } from '../lib/store'

/**
 * Cyberpunk teması bir işletim sistemi gibi açılsın diye kısa bir önyükleme
 * yazısı. Oturumda bir kez gösterilir; sayılar kütüphanenin gerçek verisi.
 */
const LINE_DELAY = 260
const HOLD = 520

export function BootSequence(): React.JSX.Element {
  const theme = useStore((s) => s.settings?.theme)
  const loaded = useStore((s) => s.loaded)
  const stats = useStore((s) => s.stats)
  const [done, setDone] = useState(() => sessionStorage.getItem(SEEN_KEY) === '1')
  const [step, setStep] = useState(0)

  const lines = [
    'NEON_PRISM_OS v' + (useStore.getState().appVersion || '0.0.0'),
    `SCANNING LIBRARY… ${stats.total} FILES // ${formatSize(stats.bytes)}`,
    `INBOX ${stats.inbox} // FAVORITES ${stats.favorites} // LINK OK`,
    'READY'
  ]

  const running = theme === 'cyber' && loaded && !done

  useEffect(() => {
    if (!running) return
    const timers = lines.map((_, index) =>
      setTimeout(() => setStep(index + 1), LINE_DELAY * (index + 1))
    )
    const end = setTimeout(
      () => {
        sessionStorage.setItem(SEEN_KEY, '1')
        setDone(true)
      },
      LINE_DELAY * lines.length + HOLD
    )
    return () => {
      for (const timer of timers) clearTimeout(timer)
      clearTimeout(end)
    }
    // Satırlar sabit; sayılar ilk çizimde okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <AnimatePresence>
      {running && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-none absolute inset-0 z-[70] flex flex-col justify-center gap-2 bg-[#05070a] px-[12%] font-mono text-[15px] text-accent"
        >
          {/* Tarama çizgisi ve hafif parıltı: ekran bir CRT gibi uyanıyor. */}
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,#ffd23f14_0_1px,transparent_1px_3px)]" />
          {lines.slice(0, step).map((line, index) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
              style={{ textShadow: '0 0 10px #ffd23f80' }}
            >
              <span className="text-accent/60">&gt;</span> {line}
              {index === step - 1 && <span className="ml-1 animate-pulse">█</span>}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const SEEN_KEY = 'bootSeen'
