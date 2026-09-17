import {
  AlertTriangle,
  Copy,
  Film,
  ImageOff,
  RefreshCw,
  Send,
  Volume2,
  VolumeX
} from 'lucide-react'
import { motion } from 'motion/react'
import { memo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Tag, Video } from '../../../shared/api'
import { DISCORD_LIMIT_BYTES, formatDuration, formatSize, stripExtension } from '../lib/format'
import { TagSticker } from './TagSticker'

const SPRITE_FRAMES = 10
const MAX_CHIPS = 3

export type CardAction = 'click' | 'open' | 'drag' | 'menu'

interface Props {
  video: Video
  tags: Tag[]
  delay: number
  selected: boolean
  animateLayout: boolean
  onAction(action: CardAction, video: Video, event?: React.MouseEvent): void
}

export const VideoCard = memo(function VideoCard({
  video,
  tags,
  delay,
  selected,
  animateLayout,
  onAction
}: Props): React.JSX.Element {
  const [hover, setHover] = useState(false)
  const [scrub, setScrub] = useState(0)
  const [peeling, setPeeling] = useState(false)
  const [thumbFailed, setThumbFailed] = useState(false)

  const videoTags = video.tagIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => !!tag)
  const ready = video.mediaStatus === 'ready' && !thumbFailed
  const frame = Math.min(SPRITE_FRAMES - 1, Math.floor(scrub * SPRITE_FRAMES))

  return (
    <motion.div
      layout={animateLayout ? 'position' : false}
      initial={{ opacity: 0, y: 18, rotate: -1.5, scale: 0.97 }}
      animate={{
        opacity: 1,
        y: hover ? -4 : 0,
        rotate: peeling ? -5 : hover ? -1.2 : 0,
        scale: peeling ? 1.06 : 1
      }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 26,
        delay
      }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => {
        setHover(false)
        setScrub(0)
      }}
      onClick={(event) => onAction('click', video, event)}
      onDoubleClick={() => onAction('open', video)}
      onContextMenu={(event) => onAction('menu', video, event)}
      draggable
      onDragStartCapture={(event: React.DragEvent) => {
        event.preventDefault()
        setPeeling(true)
        setTimeout(() => setPeeling(false), 450)
        onAction('drag', video)
      }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 260px' }}
      className={`flex cursor-grab flex-col overflow-hidden rounded-[14px] border-2 bg-surf active:cursor-grabbing ${
        selected
          ? 'border-sticker-yellow shadow-[5px_6px_0_var(--color-ink)]'
          : hover
            ? 'border-text shadow-[6px_8px_0_var(--color-ink)]'
            : 'border-line'
      }`}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden bg-ink"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setScrub(Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 0.999))
        }}
      >
        {ready ? (
          <>
            <img
              src={window.api.thumbUrl(video)}
              alt=""
              draggable={false}
              loading="lazy"
              decoding="async"
              onError={() => setThumbFailed(true)}
              className="size-full object-cover"
            />
            {hover && video.durationMs && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("${window.api.spriteUrl(video)}")`,
                  backgroundSize: `${SPRITE_FRAMES * 100}% 100%`,
                  backgroundPositionX: `${(frame / (SPRITE_FRAMES - 1)) * 100}%`
                }}
              />
            )}
          </>
        ) : video.mediaStatus === 'pending' ? (
          <div className="flex size-full animate-pulse items-center justify-center bg-gradient-to-br from-surf to-ink">
            <Film size={28} className="text-dim" />
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-dim">
            <ImageOff size={26} />
            <span className="text-[11px] font-semibold">Önizleme yok</span>
          </div>
        )}

        {hover && (
          <motion.div
            initial={{ opacity: 0, y: -8, rotate: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className="absolute top-2.5 left-2.5 flex h-[26px] items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-text px-2.5 text-[11.5px] font-bold text-ink"
          >
            <Send size={13} strokeWidth={2.25} />
            <span>Discord&apos;a sürükle</span>
          </motion.div>
        )}

        <div
          className={`absolute top-2.5 -right-0.5 flex flex-col items-end gap-1 transition-opacity ${hover ? 'opacity-0' : ''}`}
        >
          {video.size > DISCORD_LIMIT_BYTES && (
            <div
              title="Discord'un 10 MB limitini aşıyor"
              className="flex h-6 items-center gap-1 rounded-l-full border-[1.5px] border-ink bg-sticker-red pr-2.5 pl-2 text-[11px] font-extrabold text-ink"
            >
              <AlertTriangle size={12} strokeWidth={2.25} />
              <span>{formatSize(video.size)}</span>
            </div>
          )}
          {(video.playback === 'pending' || video.playback === 'converting') && (
            <ConvertBadge videoId={video.id} />
          )}
          {video.playback === 'error' && (
            <div
              title="Bu video dönüştürülemedi; oynatıcıda açılmayabilir"
              className="flex h-6 items-center gap-1 rounded-l-full border-[1.5px] border-ink bg-sticker-red pr-2.5 pl-2 text-[11px] font-extrabold text-ink"
            >
              <AlertTriangle size={11} strokeWidth={2.25} />
              <span>oynatılamıyor</span>
            </div>
          )}
          {video.hasDuplicate && (
            <div
              title="Kütüphanede aynı videodan bir tane daha var"
              className="flex h-6 items-center gap-1 rounded-l-full border-[1.5px] border-ink bg-sticker-purple pr-2.5 pl-2 text-[11px] font-extrabold text-ink"
            >
              <Copy size={11} strokeWidth={2.25} />
              <span>kopya</span>
            </div>
          )}
        </div>

        <div
          className={`absolute right-2 flex gap-1 transition-[bottom] duration-200 ${hover ? 'bottom-[26px]' : 'bottom-2'}`}
        >
          {video.hasAudio !== null && (
            <div
              title={video.hasAudio ? 'Sesli' : 'Sessiz'}
              className="flex h-[22px] items-center rounded-full bg-ink/80 px-[7px]"
            >
              {video.hasAudio ? (
                <Volume2 size={12} />
              ) : (
                <VolumeX size={12} className="text-sticker-red" />
              )}
            </div>
          )}
          <div className="flex h-[22px] items-center rounded-full bg-ink/80 px-2 font-mono text-[11px]">
            {formatDuration(video.durationMs)}
          </div>
        </div>

        {hover && (
          <div className="absolute right-2.5 bottom-2.5 left-2.5 h-2 overflow-hidden rounded-full border-[1.5px] border-ink bg-ink/55">
            <div
              className="h-full bg-sticker-yellow"
              style={{ width: `${((frame + 1) / SPRITE_FRAMES) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[9px] px-3 pt-2.5 pb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grow truncate text-[13.5px] font-semibold" title={video.name}>
            {stripExtension(video.name)}
          </span>
          {video.favorite && (
            <motion.svg
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              className="shrink-0"
            >
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                fill="var(--color-sticker-yellow)"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </div>
        {videoTags.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-1">
            {videoTags.slice(0, MAX_CHIPS).map((tag) => (
              <TagSticker key={tag.id} tag={tag} />
            ))}
            {videoTags.length > MAX_CHIPS && (
              <span className="flex h-6 items-center rounded-full bg-ink px-2 font-mono text-[11px] text-mute">
                +{videoTags.length - MAX_CHIPS}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
})

/** HEVC gibi oynatılamayan videolar için uyumlu kopya hazırlanırken gösterilir. */
function ConvertBadge({ videoId }: { videoId: number }): React.JSX.Element {
  const progress = useStore((s) => s.convertProgress[videoId])
  return (
    <div
      title="Bu video oynatılabilir bir formata çevriliyor. Orijinal dosyaya dokunulmaz."
      className="relative flex h-6 items-center gap-1 overflow-hidden rounded-l-full border-[1.5px] border-ink bg-sticker-blue pr-2.5 pl-2 text-[11px] font-extrabold text-ink"
    >
      {progress !== undefined && (
        <div
          className="absolute inset-y-0 left-0 bg-sticker-teal transition-[width]"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <RefreshCw size={11} strokeWidth={2.5} className="relative animate-spin" />
      <span className="relative">
        {progress !== undefined ? `çevriliyor %${Math.round(progress * 100)}` : 'çevrilecek'}
      </span>
    </div>
  )
}
