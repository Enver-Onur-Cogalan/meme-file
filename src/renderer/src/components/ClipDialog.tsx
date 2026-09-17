import { Check, Film, Pause, Play, Scissors, Shrink, Volume2, VolumeX, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DISCORD_LIMIT_BYTES, DISCORD_TARGET_BYTES, type Video } from '../../../shared/api'
import { errorMessage } from '../lib/actions'
import { formatPreciseTime, formatSize, stripExtension } from '../lib/format'
import { type ClipMode, useStore } from '../lib/store'
import { Button, DialogHeader, Label, Modal, Segmented, Toggle } from './ui'
import { useT } from '../lib/i18n'

type Target = 'original' | 'discord' | 'large'
const TARGET_BYTES: Record<Target, number | null> = {
  original: null,
  discord: DISCORD_TARGET_BYTES,
  large: 50 * 1024 * 1024
}
const MIN_CLIP_MS = 300

export function ClipDialog(): React.JSX.Element {
  const clip = useStore((s) => s.clip)
  const video = useStore((s) => s.videos.find((v) => v.id === clip?.videoId))
  const close = useStore((s) => s.closeClip)
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={!!clip && !!video}
      onClose={() => !busy && close()}
      width={980}
      closeOnBackdrop={!busy}
    >
      {clip && video && (
        <ClipBody
          key={`${video.id}-${clip.mode}`}
          video={video}
          mode={clip.mode}
          onClose={close}
          onBusy={setBusy}
        />
      )}
    </Modal>
  )
}

function ClipBody({
  video,
  mode,
  onClose,
  onBusy
}: {
  video: Video
  mode: ClipMode
  onClose(): void
  onBusy(busy: boolean): void
}): React.JSX.Element {
  const showToast = useStore((s) => s.showToast)
  const t = useT()
  const durationMs = video.durationMs ?? 0
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(durationMs)
  const [current, setCurrent] = useState(0)
  const [format, setFormat] = useState<'mp4' | 'gif'>(mode === 'gif' ? 'gif' : 'mp4')
  const [target, setTarget] = useState<Target>(mode === 'fit' ? 'discord' : 'original')
  const [mute, setMute] = useState(false)
  const [name, setName] = useState(
    `${stripExtension(video.name)}${mode === 'fit' ? `-${t('clip.suffixDiscord')}` : mode === 'gif' ? '' : `-${t('clip.suffixTrim')}`}`
  )
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | 'seek' | null>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  // Oynatma döngüsü her karede okur; state yerine ref ile güncel tutulur.
  const range = useRef({ start, end, dragging })
  const playingRef = useRef(playing)
  useEffect(() => {
    range.current = { start, end, dragging }
    playingRef.current = playing
  })

  useEffect(() => window.api.onClipProgress(({ ratio }) => setProgress(ratio)), [])

  // Seçili aralık döngüde oynar. timeupdate saniyede ~4 kez geldiği için bitiş sınırı
  // her karede kontrol edilir; böylece önizleme seçimin sonunu taşmaz.
  useEffect(() => {
    let frame = 0
    const tick = (): void => {
      const el = videoRef.current
      const { start: s, end: e, dragging: d } = range.current
      if (el && !d) {
        const ms = el.currentTime * 1000
        if (ms >= e || ms < s - 50) {
          el.currentTime = s / 1000
          if (el.paused && playingRef.current) void el.play()
        }
        movePlayhead(el.currentTime * 1000)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Döngü bir kez kurulur; değişen değerleri range/playingRef üzerinden okur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Oynatma çizgisi her karede doğrudan DOM'da taşınır; saat yazısı saniyede ~10 kez güncellenir.
  // Böylece önizleme oynarken bütün pencere saniyede 60 kez yeniden çizilmez.
  const lastLabel = useRef(0)
  function movePlayhead(ms: number): void {
    if (playheadRef.current) {
      playheadRef.current.style.left = `${(ms / Math.max(durationMs, 1)) * 100}%`
    }
    if (Math.abs(ms - lastLabel.current) >= 100) {
      lastLabel.current = ms
      setCurrent(ms)
    }
  }

  const seekPreview = (ms: number): void => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.min(Math.max(ms, 0), durationMs) / 1000
    movePlayhead(ms)
  }

  const togglePlay = (): void => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      if (el.currentTime * 1000 >= end - 50) el.currentTime = start / 1000
      void el.play()
    } else el.pause()
  }

  const selectedMs = end - start
  const sourceBytes = (video.size * selectedMs) / Math.max(durationMs, 1)
  const targetBytes = format === 'gif' ? null : TARGET_BYTES[target]
  const estimate =
    format === 'gif'
      ? (selectedMs / 1000) * 0.9 * 1024 * 1024
      : targetBytes === null
        ? sourceBytes * (mute ? 0.95 : 1)
        : Math.min(targetBytes * 0.93, sourceBytes)
  const underLimit = estimate <= DISCORD_LIMIT_BYTES
  const tooLong = targetBytes !== null && (targetBytes * 8) / 1000 / (selectedMs / 1000) < 250

  const pointerToMs = (clientX: number): number => {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.round(Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * durationMs)
  }

  const onPointerDown = (event: React.PointerEvent): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const handle = (event.target as HTMLElement).closest<HTMLElement>('[data-handle]')?.dataset
      .handle as 'start' | 'end' | undefined
    const mode = handle ?? 'seek'
    setDragging(mode)
    range.current.dragging = mode
    // Sürüklerken video durur ve tutamacın bulunduğu kareyi gösterir.
    videoRef.current?.pause()
    onPointerMove(event, mode)
  }

  const onPointerMove = (event: React.PointerEvent, mode = dragging): void => {
    if (!mode) return
    const ms = pointerToMs(event.clientX)
    if (mode === 'start') {
      const next = Math.min(ms, end - MIN_CLIP_MS)
      setStart(next)
      seekPreview(next)
    } else if (mode === 'end') {
      const next = Math.max(ms, start + MIN_CLIP_MS)
      setEnd(next)
      seekPreview(next)
    } else {
      seekPreview(Math.min(Math.max(ms, start), end))
    }
  }

  const onPointerUp = (): void => {
    const mode = dragging
    setDragging(null)
    range.current.dragging = null
    const el = videoRef.current
    if (!el) return
    // Başlangıç bırakılınca oradan, bitiş bırakılınca son 1.5 saniyeden oynat ki kesim noktası görülsün.
    if (mode === 'start') el.currentTime = start / 1000
    if (mode === 'end') el.currentTime = Math.max(start, end - 1500) / 1000
    if (playing) void el.play()
  }

  const create = async (): Promise<void> => {
    setError(null)
    setProgress(0)
    onBusy(true)
    try {
      const result = await window.api.createClip({
        videoId: video.id,
        startMs: start,
        endMs: end,
        targetBytes,
        mute: format === 'gif' || mute,
        format,
        outputName: name
      })
      const copied = result.videoId
        ? await window.api.copyVideos([result.videoId])
        : await window.api.copyPath(result.path)
      showToast(
        copied
          ? t('clip.readyCopied', { size: formatSize(result.size) })
          : t('clip.ready', { size: formatSize(result.size) })
      )
      onBusy(false)
      onClose()
    } catch (e) {
      setError(errorMessage(e, t('clip.failed')))
      setProgress(null)
      onBusy(false)
    }
  }

  const pct = (ms: number): string => `${(ms / Math.max(durationMs, 1)) * 100}%`
  const Icon = mode === 'fit' ? Shrink : mode === 'gif' ? Film : Scissors

  return (
    <>
      <DialogHeader
        icon={Icon}
        title={t('clip.title')}
        subtitle={`${video.name} · ${formatPreciseTime(durationMs)} · ${formatSize(video.size)}`}
        onClose={() => progress === null && onClose()}
      />
      <div className="relative flex min-h-0">
        <div className="flex min-w-0 grow flex-col gap-4 bg-side px-[22px] py-5">
          <div className="group relative overflow-hidden rounded-[14px] border-2 border-ink bg-ink">
            <video
              ref={videoRef}
              src={window.api.mediaUrl(video.playbackPath)}
              autoPlay
              muted={muted}
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => !range.current.dragging && setPlaying(false)}
              onEnded={(event) => {
                event.currentTarget.currentTime = start / 1000
                void event.currentTarget.play()
              }}
              className="aspect-video w-full cursor-pointer object-contain"
            />
            <AnimatePresence>
              {dragging && dragging !== 'seek' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-3 left-3 rounded-full border-[1.5px] border-ink bg-sticker-yellow px-3 py-1 text-xs font-extrabold text-ink"
                >
                  {dragging === 'start' ? t('clip.start') : t('clip.end')} ·{' '}
                  {formatPreciseTime(dragging === 'start' ? start : end)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                aria-label={playing ? t('common.pause') : t('common.play')}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sticker-yellow text-ink shadow-[2px_2px_0_var(--color-ink)]"
              >
                {playing ? (
                  <Pause size={15} strokeWidth={2.5} />
                ) : (
                  <Play size={15} strokeWidth={2.5} />
                )}
              </motion.button>
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? t('clip.unmute') : t('clip.mute')}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surf text-mute hover:text-text"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <span className="font-mono text-xs text-mute">{formatPreciseTime(current)}</span>
              <span className="grow" />
              <span className="text-[13px] font-bold">
                {t('clip.selection', {
                  start: formatPreciseTime(start),
                  end: formatPreciseTime(end),
                  seconds: (selectedMs / 1000).toFixed(1)
                })}
              </span>
            </div>
            <div
              ref={trackRef}
              onPointerDown={onPointerDown}
              onPointerMove={(event) => onPointerMove(event)}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative mt-5 h-14 cursor-pointer touch-none rounded-[10px] border-[1.5px] border-ink bg-surf select-none"
              style={
                video.mediaStatus === 'ready'
                  ? {
                      backgroundImage: `url("${window.api.spriteUrl(video)}")`,
                      backgroundSize: '100% 100%'
                    }
                  : undefined
              }
            >
              <div
                className="absolute inset-y-0 left-0 rounded-l-[9px] bg-[rgba(12,10,8,0.72)]"
                style={{ width: pct(start) }}
              />
              <div
                className="absolute inset-y-0 right-0 rounded-r-[9px] bg-[rgba(12,10,8,0.72)]"
                style={{ left: pct(end) }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 border-y-[3px] border-sticker-yellow"
                style={{ left: pct(start), right: `calc(100% - ${pct(end)})` }}
              />
              <div
                ref={playheadRef}
                className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-full bg-text shadow-[0_0_0_1px_var(--color-ink)]"
              />
              {(['start', 'end'] as const).map((handle) => {
                const value = handle === 'start' ? start : end
                const active = dragging === handle
                return (
                  <div
                    key={handle}
                    data-handle={handle}
                    // Geniş, görünmez tutma alanı: ince tutamacı yakalamak kolay olsun.
                    className="absolute inset-y-0 z-10 flex w-6 cursor-ew-resize justify-center"
                    style={{ left: `calc(${pct(value)} - 12px)` }}
                  >
                    <motion.div
                      animate={{ scaleX: active ? 1.35 : 1 }}
                      className={`flex h-full w-3.5 items-center justify-center bg-sticker-yellow ${
                        handle === 'start' ? 'rounded-l-md' : 'rounded-r-md'
                      }`}
                    >
                      <div className="h-[18px] w-0.5 rounded-sm bg-ink" />
                    </motion.div>
                    <div
                      className={`pointer-events-none absolute -top-6 rounded-full border-[1.5px] border-ink px-1.5 font-mono text-[10.5px] whitespace-nowrap text-ink transition-colors ${
                        active ? 'bg-sticker-yellow' : 'bg-text'
                      }`}
                    >
                      {formatPreciseTime(value)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-dim">
              <span>0:00.0</span>
              <span className="font-sans">{t('clip.dragHint')}</span>
              <span>{formatPreciseTime(durationMs)}</span>
            </div>
          </div>
        </div>

        <div className="flex w-[360px] shrink-0 flex-col gap-5 px-[22px] py-5">
          <div className="flex flex-col gap-2">
            <Label>{t('clip.format')}</Label>
            <Segmented
              layoutId="clip-format"
              value={format}
              onChange={setFormat}
              color="var(--color-text)"
              options={[
                { value: 'mp4', label: t('clip.video') },
                { value: 'gif', label: 'GIF' }
              ]}
            />
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {format === 'mp4' && (
              <motion.div
                key="target"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <Label>{t('clip.targetSize')}</Label>
                <Segmented
                  layoutId="clip-target"
                  value={target}
                  onChange={setTarget}
                  options={[
                    { value: 'original', label: t('clip.original') },
                    { value: 'discord', label: t('clip.discord') },
                    { value: 'large', label: '50 MB' }
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-line p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-mute">{t('clip.estimate')}</span>
              <motion.span
                key={underLimit ? 'ok' : 'over'}
                initial={{ scale: 1.25, rotate: underLimit ? -6 : 6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                className={`text-[26px] font-extrabold tracking-[-0.02em] ${underLimit ? 'text-sticker-green' : 'text-sticker-red'}`}
              >
                ≈ {formatSize(estimate)}
              </motion.span>
            </div>
            <div className="relative h-3.5 rounded-full border-[1.5px] border-ink bg-surf">
              <motion.div
                animate={{
                  width: `${Math.min(estimate / (DISCORD_LIMIT_BYTES * 1.25), 1) * 100}%`
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                className={`absolute inset-y-0 left-0 rounded-full ${underLimit ? 'bg-sticker-green' : 'bg-sticker-red'}`}
              />
              <div className="absolute -inset-y-1.5 left-[80%] w-0.5 bg-text" />
            </div>
            <div className="flex justify-between text-xs text-dim">
              <span>
                {tooLong
                  ? t('clip.tooLong')
                  : format === 'gif'
                    ? t('clip.gifInfo')
                    : targetBytes !== null && sourceBytes <= targetBytes
                      ? t('clip.alreadyFits')
                      : t('clip.autoQuality')}
              </span>
              <span className="shrink-0 whitespace-nowrap text-mute">{t('clip.discordLimit')}</span>
            </div>
          </div>

          {format === 'mp4' && video.hasAudio !== false && (
            <Toggle checked={mute} onChange={setMute} label={t('clip.removeSound')} />
          )}

          <div className="flex flex-col gap-2">
            <Label>{t('clip.newName')}</Label>
            <div className="flex h-10 items-center rounded-xl border-[1.5px] border-line bg-surf px-3.5 text-[13.5px] focus-within:border-mute">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 grow bg-transparent outline-none"
              />
              <span className="text-dim">.{format}</span>
            </div>
          </div>

          <span className="grow" />
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border-[1.5px] border-sticker-red bg-sticker-red/10 px-3 py-2 text-[13px] font-semibold text-sticker-red"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-[12.5px] text-mute">
            {format === 'mp4' ? t('clip.untouchedWithChips') : t('clip.untouched')}
          </div>
        </div>

        <AnimatePresence>
          {progress !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[rgba(12,10,8,0.82)]"
            >
              <motion.div
                animate={{ rotate: [-6, 6, -6] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="flex size-16 items-center justify-center rounded-2xl border-2 border-ink bg-sticker-yellow text-ink shadow-[4px_5px_0_var(--color-ink)]"
              >
                <Icon size={30} strokeWidth={2.25} />
              </motion.div>
              <div className="text-xl font-extrabold">
                {t('clip.preparing', { percent: Math.round(progress * 100) })}
              </div>
              <div className="h-4 w-[420px] overflow-hidden rounded-full border-2 border-ink bg-surf">
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="h-full bg-sticker-green"
                />
              </div>
              <Button icon={X} onClick={() => window.api.cancelClip()}>
                {t('common.giveUp')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end gap-2.5 border-t-[1.5px] border-line px-[22px] py-4">
        <Button onClick={onClose} disabled={progress !== null}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          icon={Check}
          color="var(--color-sticker-green)"
          disabled={progress !== null || tooLong || !name.trim()}
          onClick={() => void create()}
        >
          {t('clip.createAndCopy')}
        </Button>
      </div>
    </>
  )
}
