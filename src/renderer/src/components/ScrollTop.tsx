import { ArrowUp } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useT } from '../lib/i18n'
import { spring } from '../lib/motion'
import { play } from '../lib/sound'

/** Buton bu kadar kaydırmadan sonra belirir; bir kart sırasından fazlası. */
const SHOW_AT = 520
/** Kaydırma durduktan sonra buton soluklaşır: duruyor ama göz yormuyor. */
const FADE_AFTER = 2000
/**
 * Yumuşak kaydırma uzun mesafede aradaki onlarca satırı boşuna çizdiriyor;
 * bu eşiğin üstünde tek adımda başa dönüyoruz.
 */
const SMOOTH_LIMIT = 3000

/** Uzun listede başa dönmek için sağ alt köşede duran düğme. */
export function ScrollTop({
  scrollRef
}: {
  scrollRef: React.RefObject<HTMLElement | null>
}): React.JSX.Element {
  const [visible, setVisible] = useState(false)
  const [idle, setIdle] = useState(false)
  const t = useT()

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let frame = 0
    // Kaydırma olayı saniyede onlarca kez gelir; durumu kareye bir kez okuyoruz.
    const read = (): void => {
      frame = 0
      setVisible(element.scrollTop > SHOW_AT)
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), FADE_AFTER)
    }
    const onScroll = (): void => {
      if (frame) return
      frame = requestAnimationFrame(read)
    }
    element.addEventListener('scroll', onScroll, { passive: true })
    read()
    return () => {
      element.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [scrollRef])

  const toTop = useCallback((): void => {
    const element = scrollRef.current
    if (!element) return
    play('click')
    element.scrollTo({ top: 0, behavior: element.scrollTop > SMOOTH_LIMIT ? 'auto' : 'smooth' })
  }, [scrollRef])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 14 }}
          animate={{ opacity: idle ? 0.4 : 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 14 }}
          whileHover={{ opacity: 1, scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={spring}
          onClick={toTop}
          title={t('library.scrollTop')}
          aria-label={t('library.scrollTop')}
          className="btn scroll-top fixed right-7 bottom-5 z-20 flex size-11 items-center justify-center rounded-full border-2 border-ink bg-pill p-0 text-pill-ink shadow-[var(--shadow-sticker)]"
        >
          <ArrowUp size={20} strokeWidth={2.75} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
