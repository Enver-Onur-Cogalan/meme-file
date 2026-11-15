import { animate, motion, useMotionValue, type PanInfo } from 'motion/react'
import { useState } from 'react'
import { chipById, paperLean, type Clip } from '../data'
import { useLang } from '../i18n'
import { ChipSticker, ClipCover, Pin, paperColors, usePaperTilt } from './bits'

interface Props {
  clip: Clip
  index: number
  /** Hero'daki giriş sırası; verilmezse giriş animasyonu yok. */
  enterDelay?: number
  /** Sürüklenebilir kâğıt: bırakıldığı nokta sohbetin üstündeyse gönderilir. */
  draggable?: boolean
  onDragMove?: (point: { x: number; y: number }) => void
  onDrop?: (point: { x: number; y: number }) => boolean
  onTap?: () => void
  layoutId?: string
  /** AnimatePresence popLayout çıkan kâğıdı ölçebilsin diye ref DOM'a iniyor. */
  ref?: React.Ref<HTMLDivElement>
}

export function PostIt({ clip, index, enterDelay, draggable = false, onDragMove, onDrop, onTap, layoutId, ref }: Props): React.JSX.Element {
  const { lang } = useLang()
  const [hover, setHover] = useState(false)
  const [peeling, setPeeling] = useState(false)
  const tilt = usePaperTilt(!peeling)
  // Geri dönüşü elle yönetiyoruz: dragSnapToOrigin, sohbete bırakılıp
  // kaldırılan kâğıdın çıkış animasyonunu bitirmesine engel oluyordu.
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const { rotate: lean, pin } = paperLean(index)
  const entering = enterDelay !== undefined
  // Gecikme yalnız ilk girişte; üzerine gelme tepkisi anında olmalı.
  const [entered, setEntered] = useState(!entering)
  const delay = entered ? 0 : (enterDelay ?? 0)

  const clientPoint = (info: PanInfo): { x: number; y: number } => ({
    x: info.point.x - window.scrollX,
    y: info.point.y - window.scrollY
  })

  return (
    <motion.div
      ref={ref}
      layout
      layoutId={layoutId}
      className="postit"
      data-untagged={clip.chips.length === 0 || undefined}
      initial={entering ? { opacity: 0, y: -70, rotate: lean - 9, scale: 1.12 } : false}
      animate={{
        opacity: 1,
        y: 0,
        z: peeling ? 64 : hover ? 26 : 0,
        rotate: peeling ? lean + 6 : hover ? lean * 0.35 : lean,
        scale: peeling ? 1.06 : 1
      }}
      exit={{ opacity: 0, scale: 0.35, transition: { duration: 0.22, ease: 'easeIn' } }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 26,
        delay,
        layout: { type: 'spring', stiffness: 420, damping: 34 }
      }}
      style={{
        ...(paperColors(clip.chips) as Record<string, string>),
        x: dragX,
        y: dragY,
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
        transformPerspective: 760,
        zIndex: peeling ? 40 : hover ? 6 : 1,
        cursor: draggable ? (peeling ? 'grabbing' : 'grab') : undefined
      }}
      onAnimationComplete={() => setEntered(true)}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => {
        setHover(false)
        tilt.reset()
      }}
      onPointerMove={tilt.onPointerMove}
      drag={draggable}
      dragElastic={0.9}
      dragMomentum={false}
      onDragStart={() => {
        setPeeling(true)
        tilt.reset()
      }}
      onDrag={(_, info) => onDragMove?.(clientPoint(info))}
      onDragEnd={(_, info) => {
        setPeeling(false)
        if (onDrop?.(clientPoint(info))) return
        const back = { type: 'spring', stiffness: 360, damping: 26 } as const
        animate(dragX, 0, back)
        animate(dragY, 0, back)
      }}
      onTap={onTap}
      tabIndex={onTap ? 0 : undefined}
      role={onTap ? 'button' : undefined}
      aria-label={onTap ? clip.name[lang] : undefined}
      onKeyDown={(event) => {
        if (onTap && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onTap()
        }
      }}
    >
      <div className="postit-photo">
        <ClipCover clip={clip} playing={hover || peeling} />
      </div>
      <div className="postit-body">
        <p className="postit-name">{clip.name[lang]}</p>
        <div className="postit-chips">
          {clip.chips.map((id) => (
            <ChipSticker key={id} chip={chipById(id)} />
          ))}
        </div>
      </div>
      <motion.span aria-hidden className="postit-sheen" style={{ background: tilt.sheen, opacity: hover && !peeling ? 1 : 0 }} />
      <motion.span
        aria-hidden
        className="postit-pin"
        style={{ translate: `${pin}px` }}
        initial={entering ? { opacity: 0, y: -26, scale: 1.9 } : false}
        animate={{
          opacity: 1,
          z: 26,
          y: peeling ? -34 : 0,
          scale: peeling ? 1.2 : 1,
          rotate: peeling ? 14 : 0
        }}
        transition={{
          type: 'spring',
          stiffness: 620,
          damping: 18,
          // Raptiye kâğıt yerine oturduktan sonra basılıyor.
          delay: entered ? 0 : delay + 0.28
        }}
      >
        <Pin needle={peeling} />
      </motion.span>
    </motion.div>
  )
}
