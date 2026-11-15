import { Flame, Heart, Laugh, Moon, Skull, Sparkles, Zap, type LucideIcon } from 'lucide-react'
import { motion, useInView, useMotionTemplate, useMotionValue, useSpring, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { chipById, media, type Chip, type ChipId, type Clip } from '../data'
import { useLang } from '../i18n'

const ICONS: Record<string, LucideIcon> = {
  laugh: Laugh,
  zap: Zap,
  skull: Skull,
  heart: Heart,
  flame: Flame,
  sparkles: Sparkles,
  moon: Moon
}

export function ChipSticker({
  chip,
  size = 'sm',
  off = false,
  tilt = 0
}: {
  chip: Chip
  size?: 'sm' | 'md'
  off?: boolean
  tilt?: number
}): React.JSX.Element {
  const { lang } = useLang()
  const Icon = ICONS[chip.icon]
  return (
    <span
      className={`chip chip-${size}`}
      data-off={off || undefined}
      style={{ '--chip': chip.color, rotate: `${tilt}deg` } as CSSProperties}
    >
      <Icon aria-hidden size={size === 'md' ? 15 : 12} strokeWidth={2.4} />
      {chip.name[lang]}
    </span>
  )
}

/** Raptiye: uygulamadaki SVG'nin aynısı. İğne duruyorken boyu sıfır. */
export function Pin({ needle, accent }: { needle: boolean; accent?: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 44" className="pin-art" style={{ '--pin': accent ? 'var(--yellow)' : '#e4dac2' } as CSSProperties}>
      <motion.g
        style={{ originX: 0.5, originY: 0 }}
        initial={false}
        animate={{ scaleY: needle ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        <path d="M10.9 17 L12 41 L12 17 Z" fill="#efe9dd" />
        <path d="M12 17 L12 41 L13.1 17 Z" fill="#8f8a7c" />
      </motion.g>
      <ellipse cx="12" cy="17.2" rx="5.2" ry="2.5" fill="var(--pin)" />
      <ellipse cx="12" cy="17.8" rx="5.2" ry="2.5" fill="#000" opacity="0.3" />
      <circle cx="12" cy="10.5" r="8.4" fill="var(--pin)" />
      <ellipse cx="12" cy="15.6" rx="6.6" ry="2.9" fill="#000" opacity="0.22" />
      <ellipse cx="9.3" cy="7.2" rx="3.4" ry="2.5" fill="#fff" opacity="0.62" transform="rotate(-24 9.3 7.2)" />
    </svg>
  )
}

const TILT_SPRING = { stiffness: 240, damping: 20, mass: 0.45 }

/** İmlece göre eğilen kâğıt; ışık imlecin altında gezer. */
export function usePaperTilt(enabled = true): {
  rotateX: MotionValue<number>
  rotateY: MotionValue<number>
  sheen: MotionValue<string>
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
  reset: () => void
} {
  const leanX = useMotionValue(0)
  const leanY = useMotionValue(0)
  const rotateX = useSpring(leanX, TILT_SPRING)
  const rotateY = useSpring(leanY, TILT_SPRING)
  const lightX = useMotionValue(50)
  const lightY = useMotionValue(50)
  const sheen = useMotionTemplate`radial-gradient(150px 150px at ${lightX}% ${lightY}%, rgba(255, 244, 214, 0.22), rgba(255, 244, 214, 0.05) 46%, transparent 72%)`
  return {
    rotateX,
    rotateY,
    sheen,
    onPointerMove: (event) => {
      if (!enabled || event.pointerType !== 'mouse') return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      leanY.set((x - 0.5) * 12)
      leanX.set((0.5 - y) * 9)
      lightX.set(x * 100)
      lightY.set(y * 100)
    },
    reset: () => {
      leanX.set(0)
      leanY.set(0)
    }
  }
}

export function paperColors(chips: ChipId[]): CSSProperties {
  const first = chips[0] ? chipById(chips[0]).color : '#b9ad95'
  const second = chips[1] ? chipById(chips[1]).color : first
  return { '--paper': first, '--paper2': second } as CSSProperties
}

/**
 * Klibin kapağı. Video dosyası yoksa ya da henüz yüklenmediyse kapak görseli,
 * o da yoksa kâğıt renginde sade bir yüzey kalır. Görünür değilken oynamaz.
 */
export function ClipCover({ clip, playing }: { clip: Clip; playing: boolean }): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    const video = ref.current
    if (!video || broken) return
    if (playing) video.play().catch(() => undefined)
    else video.pause()
  }, [playing, broken])
  return (
    <div className="cover">
      {!broken && (
        <video
          ref={ref}
          src={media(`clips/${clip.slug}.mp4`)}
          poster={media(`clips/${clip.slug}.jpg`)}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setBroken(true)}
        />
      )}
      <span className="cover-time">{clip.duration}</span>
    </div>
  )
}

export function Kbd({ children, down = false }: { children: ReactNode; down?: boolean }): React.JSX.Element {
  return (
    <kbd className="kbd" data-down={down || undefined}>
      {children}
    </kbd>
  )
}

export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const listen = (): void => setReduced(query.matches)
    query.addEventListener('change', listen)
    return () => query.removeEventListener('change', listen)
  }, [])
  return reduced
}

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => matchMedia('(pointer: coarse)').matches)
  useEffect(() => {
    const query = matchMedia('(pointer: coarse)')
    const listen = (): void => setCoarse(query.matches)
    query.addEventListener('change', listen)
    return () => query.removeEventListener('change', listen)
  }, [])
  return coarse
}

/** Lucide marka ikonlarını kaldırdı; GitHub ve LinkedIn için sade işaretler. */
export function GithubMark({ size = 17 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export function LinkedinMark({ size = 17 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

/** Uygulamadan bir kayıt: görünürken oynar, dosya yoksa hiç çizilmez. */
export function AppClip({ name, label }: { name: string; label: string }): React.JSX.Element | null {
  const ref = useRef<HTMLVideoElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    const video = ref.current
    if (!video || broken) return
    if (inView) video.play().catch(() => undefined)
    else video.pause()
  }, [inView, broken])
  if (broken) return null
  return (
    <div className="app-clip">
      <video
        ref={ref}
        src={media(`${name}.mp4`)}
        poster={media(`${name}.jpg`)}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onError={() => setBroken(true)}
      />
    </div>
  )
}
