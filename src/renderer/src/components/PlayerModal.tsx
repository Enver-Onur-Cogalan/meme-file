import { Copy, Send, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import type { VideoFile } from '../../../shared/api'
import { formatSize, stripExtension } from '../lib/format'

interface Props {
  video: VideoFile
  onClose(): void
  onCopy(): void
}

export function PlayerModal({ video, onClose, onCopy }: Props): React.JSX.Element {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(12,10,8,0.74)] p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, rotate: -2, y: 24 }}
        animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, rotate: 1, y: 12 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="flex w-full max-w-[1120px] overflow-hidden rounded-[20px] border-2 border-text bg-bg shadow-[8px_10px_0_var(--color-ink)]"
      >
        <div className="flex grow flex-col bg-side p-[18px]">
          <video
            src={window.api.mediaUrl(video.path)}
            controls
            autoPlay
            loop
            className="aspect-video w-full rounded-xl border-2 border-ink bg-ink"
          />
        </div>
        <div className="flex w-[320px] shrink-0 flex-col gap-4 px-[22px] py-5">
          <div className="flex items-start gap-2.5">
            <div className="flex grow flex-col gap-1">
              <div className="text-[22px] leading-tight font-extrabold break-all">
                {stripExtension(video.name)}
              </div>
              <div className="font-mono text-[11.5px] text-mute">{formatSize(video.size)}</div>
            </div>
            <button
              onClick={onClose}
              className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-surf text-mute hover:text-text"
            >
              <X size={15} strokeWidth={2.25} />
            </button>
          </div>

          <div
            draggable
            onDragStart={(event) => {
              event.preventDefault()
              window.api.startDrag(video.path)
            }}
            className="flex cursor-grab items-center gap-3 rounded-[14px] border-2 border-dashed border-sticker-blue bg-sticker-blue/10 p-2.5 active:cursor-grabbing"
          >
            <Send size={20} className="text-sticker-blue" />
            <div className="flex flex-col">
              <span className="text-[13.5px] font-bold">Buradan sürükle</span>
              <span className="text-xs text-mute">
                Discord&apos;a veya herhangi bir sohbete bırak
              </span>
            </div>
          </div>

          <motion.button
            onClick={onCopy}
            whileHover={{ y: -1 }}
            whileTap={{ y: 2, boxShadow: '1px 1px 0 var(--color-ink)' }}
            className="flex h-10 items-center justify-center gap-2 rounded-full border-2 border-ink bg-sticker-yellow text-sm font-extrabold text-ink shadow-[3px_4px_0_var(--color-ink)]"
          >
            <Copy size={16} strokeWidth={2.25} />
            <span>Kopyala</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
