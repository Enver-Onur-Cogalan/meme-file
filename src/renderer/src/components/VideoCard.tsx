import { AlertTriangle, Send, Volume2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import type { VideoFile } from '../../../shared/api'
import { DISCORD_LIMIT_BYTES, formatDuration, formatSize, stripExtension } from '../lib/format'

interface Props {
  video: VideoFile
  index: number
  selected: boolean
  onSelect(): void
  onOpen(): void
}

export function VideoCard({ video, index, selected, onSelect, onOpen }: Props): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const [hover, setHover] = useState(false)
  const [duration, setDuration] = useState<number>(NaN)
  const [progress, setProgress] = useState(0)

  // Geçici önizleme: Faz 1'de ffmpeg ile üretilen thumbnail ve kare şeridine geçecek.
  const scrub = (event: React.MouseEvent<HTMLDivElement>): void => {
    const el = ref.current
    if (!el || !Number.isFinite(el.duration)) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    el.currentTime = ratio * el.duration
    setProgress(ratio)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: hover ? -1.2 : 0 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 26,
        delay: Math.min(index, 12) * 0.03
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => {
        setHover(true)
        onSelect()
      }}
      onHoverEnd={() => setHover(false)}
      className={`flex flex-col overflow-hidden rounded-[14px] border-2 bg-surf ${
        hover || selected ? 'border-text' : 'border-line'
      } ${hover ? 'shadow-[6px_8px_0_var(--color-ink)]' : ''}`}
    >
      <div
        draggable
        onDragStart={(event) => {
          event.preventDefault()
          window.api.startDrag(video.path)
        }}
        onMouseMove={scrub}
        onClick={onOpen}
        className="relative aspect-[16/10] cursor-grab bg-ink active:cursor-grabbing"
      >
        <video
          ref={ref}
          src={`${window.api.mediaUrl(video.path)}#t=0.1`}
          preload="metadata"
          muted
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          className="pointer-events-none size-full object-cover"
        />

        {hover && (
          <motion.div
            initial={{ opacity: 0, y: -6, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            className="absolute top-2.5 left-2.5 flex h-[26px] items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-text px-2.5 text-[11.5px] font-bold text-ink"
          >
            <Send size={13} strokeWidth={2.25} />
            <span>Discord&apos;a sürükle</span>
          </motion.div>
        )}

        {video.size > DISCORD_LIMIT_BYTES && (
          <div className="absolute top-2.5 -right-0.5 flex h-6 items-center gap-1 rounded-l-full border-[1.5px] border-ink bg-sticker-red pr-2.5 pl-2 text-[11px] font-extrabold text-ink">
            <AlertTriangle size={12} strokeWidth={2.25} />
            <span>{formatSize(video.size)}</span>
          </div>
        )}

        <div
          className={`absolute right-2 flex gap-1 transition-all ${hover ? 'bottom-[26px]' : 'bottom-2'}`}
        >
          <div className="flex h-[22px] items-center rounded-full bg-ink/80 px-[7px]">
            <Volume2 size={12} />
          </div>
          <div className="flex h-[22px] items-center rounded-full bg-ink/80 px-2 font-mono text-[11px]">
            {formatDuration(duration)}
          </div>
        </div>

        {hover && (
          <div className="absolute right-2.5 bottom-2.5 left-2.5 h-2 overflow-hidden rounded-full border-[1.5px] border-ink bg-ink/55">
            <div className="h-full bg-sticker-yellow" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-3">
        <span className="grow truncate text-[13.5px] font-semibold">
          {stripExtension(video.name)}
        </span>
        <span className="font-mono text-[11px] text-dim">{formatSize(video.size)}</span>
      </div>
    </motion.div>
  )
}
