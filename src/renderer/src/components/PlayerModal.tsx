import {
  Copy,
  Film,
  FolderOpen,
  Maximize,
  Pause,
  PenLine,
  Play,
  RefreshCw,
  Repeat,
  Scissors,
  Send,
  Shrink,
  Trash2,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Video } from '../../../shared/api'
import { copyVideos, dragVideos, toggleFavorite, trashVideos } from '../lib/actions'
import { folderName, formatDuration, formatSize, stripExtension } from '../lib/format'
import { useStore } from '../lib/store'
import { TagInput } from './TagInput'
import { TagSticker } from './TagSticker'
import { Button, IconButton, Kbd, Label } from './ui'
import { bouncy } from '../lib/motion'
import { useT } from '../lib/i18n'

export function PlayerModal({ video }: { video: Video | undefined }): React.JSX.Element {
  const { openPlayer, openClip, tags, folders } = useStore()
  const close = useCallback(() => openPlayer(null), [openPlayer])

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          key="player"
          className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(12,10,8,0.74)] p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2, y: 30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotate: 1, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="flex max-h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] border-2 border-text bg-bg shadow-[8px_10px_0_var(--color-ink)]"
          >
            <PlayerBody
              key={video.id}
              video={video}
              tags={tags}
              folder={folders.find((f) => f.id === video.folderId)?.path ?? ''}
              onClose={close}
              onClip={(mode) => openClip(video.id, mode)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PlayerBody({
  video,
  tags,
  folder,
  onClose,
  onClip
}: {
  video: Video
  tags: ReturnType<typeof useStore.getState>['tags']
  folder: string
  onClose(): void
  onClip(mode: 'trim' | 'fit' | 'gif'): void
}): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const [playing, setPlaying] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState((video.durationMs ?? 0) / 1000)
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('volume') ?? 0.8))
  const [muted, setMuted] = useState(false)
  const [loop, setLoop] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)

  const videoTags = video.tagIds.map((id) => tags.find((t) => t.id === id)).filter((t) => !!t)

  useEffect(() => {
    if (ref.current) ref.current.volume = volume
    localStorage.setItem('volume', String(volume))
  }, [volume])

  const togglePlay = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const el = ref.current
    if (!el || !Number.isFinite(el.duration)) return
    el.currentTime = Math.min(Math.max(seconds, 0), el.duration)
    setTime(el.currentTime)
  }, [])

  const seekFromPointer = (clientX: number): void => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    seekTo(((clientX - rect.left) / rect.width) * duration)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const { clip, chipEditor, renameId, confirmRequest } = useStore.getState()
      if (clip || chipEditor || renameId !== null || confirmRequest) return
      if (event.target instanceof HTMLInputElement) return
      const key = event.key.toLowerCase()
      if (key === 'escape') onClose()
      else if (key === ' ') {
        event.preventDefault()
        togglePlay()
      } else if (key === 'arrowleft')
        seekTo((ref.current?.currentTime ?? 0) - (event.shiftKey ? 1 : 5))
      else if (key === 'arrowright')
        seekTo((ref.current?.currentTime ?? 0) + (event.shiftKey ? 1 : 5))
      else if (key === 'm') setMuted((m) => !m)
      else if (key === 'l') setLoop((l) => !l)
      else if (key === 'f2') useStore.getState().openRename(video.id)
      else if (key === 'f' && !event.ctrlKey && !event.metaKey) void toggleFavorite([video])
      else if (key === 'c' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        void copyVideos([video.id])
      } else return
      event.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, togglePlay, seekTo, video])

  const progress = duration ? time / duration : 0

  return (
    <>
      <div className="flex min-h-0">
        <div className="flex min-w-0 grow flex-col gap-3 bg-side p-[18px]">
          <div className="relative overflow-hidden rounded-xl border-2 border-ink bg-ink">
            <video
              ref={ref}
              src={window.api.mediaUrl(video.playbackPath)}
              autoPlay
              loop={loop}
              muted={muted}
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => !scrubbing && setTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => {
                setDuration(event.currentTarget.duration)
                event.currentTarget.volume = volume
              }}
              className="aspect-video max-h-[62vh] w-full cursor-pointer object-contain"
            />
            {(video.playback === 'pending' || video.playback === 'converting') && (
              <ConvertingOverlay videoId={video.id} />
            )}
            <AnimatePresence>
              {loop && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="pointer-events-none absolute top-3 left-3 flex h-[26px] items-center gap-1.5 rounded-full bg-ink/80 px-2.5 text-xs font-semibold"
                >
                  <Repeat size={13} strokeWidth={2.25} className="text-sticker-yellow" />
                  {t('player.looping')}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!playing && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.3 }}
                  transition={bouncy}
                  onClick={togglePlay}
                  className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-sticker-yellow text-ink shadow-[3px_4px_0_var(--color-ink)]"
                >
                  <Play size={26} strokeWidth={2.5} className="ml-1" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div
            ref={barRef}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setScrubbing(true)
              seekFromPointer(event.clientX)
            }}
            onPointerMove={(event) => scrubbing && seekFromPointer(event.clientX)}
            onPointerUp={() => setScrubbing(false)}
            className="group relative h-3 cursor-pointer rounded-full border-[1.5px] border-ink bg-surf"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-sticker-yellow"
              style={{ width: `${progress * 100}%` }}
            />
            <motion.div
              animate={{ scale: scrubbing ? 1.25 : 1 }}
              className="absolute -top-[5px] size-[18px] rounded-full border-2 border-ink bg-text"
              style={{ left: `calc(${progress * 100}% - 9px)` }}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              aria-label={playing ? t('common.pause') : t('common.play')}
              className="flex size-11 items-center justify-center rounded-full border-2 border-ink bg-sticker-yellow text-ink shadow-[2px_3px_0_var(--color-ink)]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={playing ? 'pause' : 'play'}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ duration: 0.12 }}
                >
                  {playing ? (
                    <Pause size={18} strokeWidth={2.5} />
                  ) : (
                    <Play size={18} strokeWidth={2.5} />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <span className="font-mono text-[13px]">
              {formatDuration(time * 1000)}{' '}
              <span className="text-dim">/ {formatDuration(duration * 1000)}</span>
            </span>
            <span className="grow" />
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={t('player.mute')}
              className="text-text"
            >
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(event) => {
                setVolume(Number(event.target.value))
                setMuted(false)
              }}
              className="w-20 accent-[var(--color-text)]"
              aria-label={t('player.sound')}
            />
            <IconButton
              icon={Repeat}
              label={t('player.loop')}
              active={loop}
              onClick={() => setLoop((l) => !l)}
              size={36}
            />
            <IconButton
              icon={Maximize}
              label={t('player.fullscreen')}
              size={36}
              onClick={() => void ref.current?.requestFullscreen()}
            />
          </div>
        </div>

        <div className="flex w-[320px] shrink-0 flex-col gap-[18px] overflow-y-auto px-[22px] py-5">
          <div className="flex items-start gap-2.5">
            <div className="flex min-w-0 grow flex-col gap-1">
              <div className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words">
                {stripExtension(video.name)}
              </div>
              <div className="font-mono text-[11.5px] text-mute">
                {[
                  formatDuration(video.durationMs),
                  formatSize(video.size),
                  video.width && `${video.width}×${video.height}`,
                  video.hasAudio === null
                    ? null
                    : video.hasAudio
                      ? t('player.metaSound')
                      : t('player.metaSilent')
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.8, rotate: -30 }}
              onClick={() => void toggleFavorite([video])}
              aria-label={t('player.favorite')}
              title={t('player.favorite')}
              className="pt-1"
            >
              <motion.svg
                key={String(video.favorite)}
                initial={{ scale: 0.5, rotate: -60 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  fill={video.favorite ? 'var(--color-sticker-yellow)' : 'none'}
                  stroke={video.favorite ? 'var(--color-ink)' : 'var(--color-mute)'}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.button>
            <IconButton icon={X} label={t('common.close')} onClick={onClose} size={30} />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label>{t('player.chips')}</Label>
            <motion.div layout className="flex flex-wrap gap-1.5">
              <AnimatePresence mode="popLayout">
                {videoTags.map((tag) => (
                  <motion.div
                    key={tag.id}
                    layout
                    initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={bouncy}
                  >
                    <TagSticker
                      tag={tag}
                      size="md"
                      onRemove={() =>
                        void window.api.setVideoTags(
                          video.id,
                          video.tagIds.filter((id) => id !== tag.id)
                        )
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            <TagInput
              tags={tags}
              exclude={video.tagIds}
              onPick={(tagId) => void window.api.setVideoTags(video.id, [...video.tagIds, tagId])}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label>{t('player.send')}</Label>
            <motion.div
              draggable
              onDragStartCapture={(event: React.DragEvent) => {
                event.preventDefault()
                dragVideos([video.id])
              }}
              whileHover={{ scale: 1.02, rotate: -0.5 }}
              className="flex cursor-grab items-center gap-3 rounded-[14px] border-2 border-dashed border-sticker-blue bg-sticker-blue/10 p-2.5 active:cursor-grabbing"
            >
              {video.mediaStatus === 'ready' ? (
                <img
                  src={window.api.thumbUrl(video)}
                  alt=""
                  draggable={false}
                  className="h-10 w-16 -rotate-4 rounded-lg border-[1.5px] border-ink object-cover"
                />
              ) : (
                <Send size={22} className="text-sticker-blue" />
              )}
              <div className="flex flex-col">
                <span className="text-[13.5px] font-bold">{t('player.dragHere')}</span>
                <span className="text-xs text-mute">{t('player.dropAnywhere')}</span>
              </div>
            </motion.div>
            <Button variant="primary" icon={Copy} onClick={() => void copyVideos([video.id])}>
              {t('common.copy')}
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button icon={Scissors} onClick={() => onClip('trim')} className="px-2">
                {t('player.trim')}
              </Button>
              <Button
                icon={Shrink}
                onClick={() => onClip('fit')}
                className="px-2"
                title={t('player.fitTitle')}
              >
                {t('player.fit')}
              </Button>
              <Button icon={Film} onClick={() => onClip('gif')} className="px-2">
                GIF
              </Button>
            </div>
          </div>

          <span className="grow" />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.api.showInFolder(video.id)}
              className="flex min-w-0 grow items-center gap-1.5 text-left text-[12.5px] text-mute hover:text-text"
              title={video.path}
            >
              <FolderOpen size={14} className="shrink-0" />
              <span className="truncate">
                {folderName(folder)} / {video.name}
              </span>
            </button>
            <IconButton
              icon={PenLine}
              label={t('player.renameHint')}
              size={30}
              onClick={() => useStore.getState().openRename(video.id)}
            />
            <IconButton
              icon={Trash2}
              label={t('player.trash')}
              size={30}
              className="hover:!text-sticker-red"
              onClick={() => void trashVideos([video])}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t-[1.5px] border-line px-[22px] py-2.5 text-xs text-dim">
        {[
          [t('player.keySpace'), t('player.keyPlay')],
          ['← →', t('player.keySeek')],
          ['M', t('player.keyMute')],
          ['L', t('player.keyLoop')],
          ['F', t('player.keyFavorite')],
          ['Ctrl C', t('player.keyCopy')]
        ].map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <Kbd>{key}</Kbd>
            <span>{label}</span>
          </div>
        ))}
        <span className="grow" />
        <div className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          <span>{t('player.keyClose')}</span>
        </div>
      </div>
    </>
  )
}

function ConvertingOverlay({ videoId }: { videoId: number }): React.JSX.Element {
  const progress = useStore((s) => s.convertProgress[videoId]) ?? 0
  const t = useT()
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(12,10,8,0.85)] text-center">
      <motion.div
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        className="flex size-14 items-center justify-center rounded-2xl border-2 border-ink bg-sticker-blue text-ink shadow-[3px_4px_0_var(--color-ink)]"
      >
        <RefreshCw size={26} strokeWidth={2.25} />
      </motion.div>
      <div className="text-lg font-extrabold">
        {t('player.convertingTitle', { percent: Math.round(progress * 100) })}
      </div>
      <div className="max-w-sm text-sm text-mute">{t('player.convertingText')}</div>
      <div className="h-3 w-72 overflow-hidden rounded-full border-2 border-ink bg-surf">
        <motion.div animate={{ width: `${progress * 100}%` }} className="h-full bg-sticker-blue" />
      </div>
    </div>
  )
}
