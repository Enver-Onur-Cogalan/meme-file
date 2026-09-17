import { Check, Film, Scissors, Shrink, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DISCORD_LIMIT_BYTES, DISCORD_TARGET_BYTES, type Video } from '../../../shared/api'
import { errorMessage } from '../lib/actions'
import { formatPreciseTime, formatSize, stripExtension } from '../lib/format'
import { type ClipMode, useStore } from '../lib/store'
import { Button, DialogHeader, Label, Modal, Segmented, Toggle } from './ui'

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
  const durationMs = video.durationMs ?? 0
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(durationMs)
  const [current, setCurrent] = useState(0)
  const [format, setFormat] = useState<'mp4' | 'gif'>(mode === 'gif' ? 'gif' : 'mp4')
  const [target, setTarget] = useState<Target>(mode === 'fit' ? 'discord' : 'original')
  const [mute, setMute] = useState(false)
  const [name, setName] = useState(
    `${stripExtension(video.name)}${mode === 'fit' ? '-discord' : mode === 'gif' ? '' : '-kirpilmis'}`
  )
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | 'seek' | null>(null)

  useEffect(() => window.api.onClipProgress(({ ratio }) => setProgress(ratio)), [])

  // Seçili aralık döngüde oynar.
  useEffect(() => {
    const el = videoRef.current
    if (el && (el.currentTime * 1000 < start || el.currentTime * 1000 > end))
      el.currentTime = start / 1000
  }, [start, end])

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

  const onPointerMove = (event: React.PointerEvent): void => {
    if (!dragging.current) return
    const ms = pointerToMs(event.clientX)
    if (dragging.current === 'start') setStart(Math.min(ms, end - MIN_CLIP_MS))
    else if (dragging.current === 'end') setEnd(Math.max(ms, start + MIN_CLIP_MS))
    else if (videoRef.current)
      videoRef.current.currentTime = Math.min(Math.max(ms, start), end) / 1000
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
          ? `Hazır (${formatSize(result.size)}) ve kopyalandı!`
          : `Hazır: ${formatSize(result.size)}`
      )
      onBusy(false)
      onClose()
    } catch (e) {
      setError(errorMessage(e, 'Oluşturulamadı'))
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
        title="Klibi hazırla"
        subtitle={`${video.name} · ${formatPreciseTime(durationMs)} · ${formatSize(video.size)}`}
        onClose={() => progress === null && onClose()}
      />
      <div className="relative flex min-h-0">
        <div className="flex min-w-0 grow flex-col gap-4 bg-side px-[22px] py-5">
          <video
            ref={videoRef}
            src={window.api.mediaUrl(video.path)}
            autoPlay
            muted
            onTimeUpdate={(event) => {
              const el = event.currentTarget
              if (el.currentTime * 1000 >= end) el.currentTime = start / 1000
              setCurrent(el.currentTime * 1000)
            }}
            onEnded={(event) => {
              event.currentTarget.currentTime = start / 1000
              void event.currentTarget.play()
            }}
            className="aspect-video w-full rounded-[14px] border-2 border-ink bg-ink object-contain"
          />
          <div className="flex flex-col gap-2">
            <div
              ref={trackRef}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                const target = (event.target as HTMLElement).dataset.handle as
                  'start' | 'end' | undefined
                dragging.current = target ?? 'seek'
                onPointerMove(event)
              }}
              onPointerMove={onPointerMove}
              onPointerUp={() => (dragging.current = null)}
              className="relative h-14 cursor-pointer touch-none overflow-hidden rounded-[10px] border-[1.5px] border-ink bg-surf select-none"
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
                className="absolute inset-y-0 left-0 bg-[rgba(12,10,8,0.72)]"
                style={{ width: pct(start) }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-[rgba(12,10,8,0.72)]"
                style={{ left: pct(end) }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 border-y-[3px] border-sticker-yellow"
                style={{ left: pct(start), right: `calc(100% - ${pct(end)})` }}
              />
              {(['start', 'end'] as const).map((handle) => (
                <motion.div
                  key={handle}
                  data-handle={handle}
                  whileHover={{ scaleX: 1.3 }}
                  className={`absolute inset-y-0 flex w-3.5 cursor-ew-resize items-center justify-center bg-sticker-yellow ${
                    handle === 'start' ? 'rounded-l-md' : 'rounded-r-md'
                  }`}
                  style={{ left: `calc(${pct(handle === 'start' ? start : end)} - 7px)` }}
                >
                  <div data-handle={handle} className="h-[18px] w-0.5 rounded-sm bg-ink" />
                </motion.div>
              ))}
              <div
                className="pointer-events-none absolute -inset-y-0.5 w-0.5 bg-text"
                style={{ left: pct(current) }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-mute">
              <span>0:00.0</span>
              <span className="font-sans text-[13px] font-bold text-text">
                Seçim: {formatPreciseTime(start)} → {formatPreciseTime(end)} ·{' '}
                {(selectedMs / 1000).toFixed(1)} sn
              </span>
              <span>{formatPreciseTime(durationMs)}</span>
            </div>
          </div>
        </div>

        <div className="flex w-[360px] shrink-0 flex-col gap-5 px-[22px] py-5">
          <div className="flex flex-col gap-2">
            <Label>Biçim</Label>
            <Segmented
              layoutId="clip-format"
              value={format}
              onChange={setFormat}
              color="var(--color-text)"
              options={[
                { value: 'mp4', label: 'Video (MP4)' },
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
                <Label>Hedef boyut</Label>
                <Segmented
                  layoutId="clip-target"
                  value={target}
                  onChange={setTarget}
                  options={[
                    { value: 'original', label: 'Orijinal' },
                    { value: 'discord', label: '10 MB · Discord' },
                    { value: 'large', label: '50 MB' }
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-line p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-mute">Tahmini boyut</span>
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
                  ? 'Klip bu boyut için çok uzun, kısalt'
                  : format === 'gif'
                    ? '480px · 15 fps · sessiz'
                    : 'Kalite otomatik ayarlanır'}
              </span>
              <span className="text-mute">Discord limiti 10 MB</span>
            </div>
          </div>

          {format === 'mp4' && video.hasAudio !== false && (
            <Toggle checked={mute} onChange={setMute} label="Sesi kaldır" />
          )}

          <div className="flex flex-col gap-2">
            <Label>Yeni dosya adı</Label>
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
            Orijinal dosyaya dokunulmaz, yanına yeni bir kopya oluşturulur
            {format === 'mp4' ? " ve chip'leri de aktarılır" : ''}.
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
                Hazırlanıyor… %{Math.round(progress * 100)}
              </div>
              <div className="h-4 w-[420px] overflow-hidden rounded-full border-2 border-ink bg-surf">
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="h-full bg-sticker-green"
                />
              </div>
              <Button icon={X} onClick={() => window.api.cancelClip()}>
                Vazgeç
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end gap-2.5 border-t-[1.5px] border-line px-[22px] py-4">
        <Button onClick={onClose} disabled={progress !== null}>
          İptal
        </Button>
        <Button
          variant="primary"
          icon={Check}
          color="var(--color-sticker-green)"
          disabled={progress !== null || tooLong || !name.trim()}
          onClick={() => void create()}
        >
          Oluştur ve kopyala
        </Button>
      </div>
    </>
  )
}
