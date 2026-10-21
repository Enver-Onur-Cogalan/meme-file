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
import { useFeel } from '../lib/motion'
import { useThemeId } from '../lib/theme'
import { ElectricBorder } from './effects/ElectricBorder'
import { useStore } from '../lib/store'
import type { Tag, Video } from '../../../shared/api'
import { DISCORD_LIMIT_BYTES, formatDuration, formatSize, stripExtension } from '../lib/format'
import { TagSticker } from './TagSticker'
import { useT } from '../lib/i18n'

const SPRITE_FRAMES = 10
const MAX_CHIPS = 3

export type CardAction = 'click' | 'open' | 'drag' | 'menu'

interface Props {
  video: Video
  tags: Tag[]
  delay: number
  /** false: kart animasyonsuz belirir (ör. kaydırırken ekrana giren satırlar) */
  entry: boolean
  selected: boolean
  animateLayout: boolean
  onAction(action: CardAction, video: Video, event?: React.MouseEvent): void
}

export const VideoCard = memo(function VideoCard({
  video,
  tags,
  delay,
  entry,
  selected,
  animateLayout,
  onAction
}: Props): React.JSX.Element {
  const t = useT()
  const [hover, setHover] = useState(false)
  const [scrub, setScrub] = useState(0)
  const [peeling, setPeeling] = useState(false)
  const [entered, setEntered] = useState(!entry)
  const [thumbFailed, setThumbFailed] = useState(false)

  const videoTags = video.tagIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => !!tag)
  const ready = video.mediaStatus === 'ready' && !thumbFailed
  const frame = Math.min(SPRITE_FRAMES - 1, Math.floor(scrub * SPRITE_FRAMES))
  const feel = useFeel()
  // Cyberpunk'ta kartın dışını kıvılcım sarar: üzerine gelince canlı, seçiliyken duruyor.
  const electric = useThemeId() === 'cyber' && (hover || selected)

  return (
    <motion.div
      layout={animateLayout ? 'position' : false}
      initial={entry ? feel.enter : false}
      animate={{
        opacity: 1,
        y: hover ? feel.lift : 0,
        rotate: peeling ? feel.rotate * 4 : hover ? feel.rotate : 0,
        scale: peeling ? 1.06 : 1
      }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{
        type: 'spring',
        stiffness: feel.card.stiffness,
        damping: feel.card.damping,
        // Gecikme sadece giriş animasyonunda; üzerine gelme tepkisi anında olmalı.
        delay: entered ? 0 : delay
      }}
      onAnimationComplete={() => setEntered(true)}
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
      data-selected={selected || undefined}
      className={`card relative flex cursor-grab flex-col overflow-hidden rounded-[14px] border-2 bg-surf active:cursor-grabbing ${
        selected
          ? 'border-accent shadow-[5px_6px_0_var(--color-ink)]'
          : hover
            ? 'border-text shadow-[6px_8px_0_var(--color-ink)]'
            : 'border-line'
      }`}
    >
      {electric && (
        <>
          {/* İki ayrı hızda camgöbeği ve kırmızı ark: tek çizgi yerine çakışan kıvılcımlar */}
          <ElectricBorder
            className="eb-overlay z-[4]"
            color="#22e5ff"
            coreColor="#ecffff"
            composite="lighter"
            borderRadius={14}
            borderOffset={40}
            displacement={34}
            chaos={0.2}
            speed={1.25}
            lineWidth={2.6}
            glow={18}
            showGlowLayers={false}
            paused={!hover}
          />
          <ElectricBorder
            className="eb-overlay z-[4]"
            color="#ff2d55"
            coreColor="#ffe3ea"
            composite="lighter"
            borderRadius={14}
            borderOffset={40}
            displacement={28}
            chaos={0.24}
            speed={1.85}
            lineWidth={2.2}
            glow={16}
            showGlowLayers={false}
            paused={!hover}
          />
        </>
      )}
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
            <span className="text-[11px] font-semibold">{t('card.noPreview')}</span>
          </div>
        )}

        {hover && (
          <motion.div
            initial={{ opacity: 0, y: -8, rotate: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className="absolute top-2.5 left-2.5 flex h-[26px] items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-pill px-2.5 text-[11.5px] font-bold text-pill-ink"
          >
            <Send size={13} strokeWidth={2.25} />
            <span>{t('card.dragToDiscord')}</span>
          </motion.div>
        )}

        <div
          className={`absolute top-2.5 -right-0.5 flex flex-col items-end gap-1 transition-opacity ${hover ? 'opacity-0' : ''}`}
        >
          {video.size > DISCORD_LIMIT_BYTES && (
            <div
              title={t('card.overLimit')}
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
              title={t('card.notPlayableTitle')}
              className="flex h-6 items-center gap-1 rounded-l-full border-[1.5px] border-ink bg-sticker-red pr-2.5 pl-2 text-[11px] font-extrabold text-ink"
            >
              <AlertTriangle size={11} strokeWidth={2.25} />
              <span>{t('card.notPlayable')}</span>
            </div>
          )}
          {video.hasDuplicate && (
            <div
              title={t('card.duplicateTitle')}
              className="flex h-6 items-center gap-1 rounded-l-full border-[1.5px] border-ink bg-sticker-purple pr-2.5 pl-2 text-[11px] font-extrabold text-ink"
            >
              <Copy size={11} strokeWidth={2.25} />
              <span>{t('card.duplicate')}</span>
            </div>
          )}
        </div>

        <div
          className={`absolute right-2 flex gap-1 transition-[bottom] duration-200 ${hover ? 'bottom-[26px]' : 'bottom-2'}`}
        >
          {video.hasAudio !== null && (
            <div
              title={video.hasAudio ? t('card.withSound') : t('card.silent')}
              className="flex h-[22px] items-center rounded-full bg-ink/80 px-[7px] text-over"
            >
              {video.hasAudio ? (
                <Volume2 size={12} />
              ) : (
                <VolumeX size={12} className="text-sticker-red" />
              )}
            </div>
          )}
          <div className="flex h-[22px] items-center rounded-full bg-ink/80 px-2 font-mono text-[11px] text-over">
            {formatDuration(video.durationMs)}
          </div>
        </div>

        {hover && (
          <div className="absolute right-2.5 bottom-2.5 left-2.5 h-2 overflow-hidden rounded-full border-[1.5px] border-ink bg-ink/55">
            <div
              className="h-full bg-accent"
              style={{ width: `${((frame + 1) / SPRITE_FRAMES) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[9px] px-3 pt-2.5 pb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="card-title grow truncate text-[13.5px] font-semibold"
            data-text={video.name}
            title={video.name}
          >
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
                fill="var(--color-accent)"
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
  const t = useT()
  return (
    <div
      title={t('card.convertingTitle')}
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
        {progress !== undefined
          ? t('card.converting', { percent: Math.round(progress * 100) })
          : t('card.willConvert')}
      </span>
    </div>
  )
}
