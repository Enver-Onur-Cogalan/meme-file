import { CornerDownLeft, Inbox, Plus, SkipForward, Star } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { Video } from '../../../shared/api'
import { TagSticker } from '../components/TagSticker'
import { AnimatedNumber, Button, Kbd, Label } from '../components/ui'
import { toggleFavorite } from '../lib/actions'
import { folderName, formatDuration, formatSize, stripExtension } from '../lib/format'
import { useStore } from '../lib/store'

/** Gelen Kutusu: yeni videolar tek tek önüne gelir, rakam tuşlarıyla chip verilir. */
export function InboxView(): React.JSX.Element {
  const { videos, tags, folders, openChipEditor, showToast } = useStore()
  const [skipped, setSkipped] = useState<number[]>([])
  const [direction, setDirection] = useState<'save' | 'skip'>('save')

  // Atlananlar sıranın sonuna gider.
  const queue = useMemo(
    () => [
      ...videos.filter((video) => !skipped.includes(video.id)),
      ...skipped.map((id) => videos.find((video) => video.id === id)).filter((v): v is Video => !!v)
    ],
    [videos, skipped]
  )
  const current = queue[0]
  const quickTags = tags.slice(0, 9)

  const toggleTag = (tagId: number): void => {
    if (!current) return
    const has = current.tagIds.includes(tagId)
    void window.api.setVideoTags(
      current.id,
      has ? current.tagIds.filter((id) => id !== tagId) : [...current.tagIds, tagId]
    )
  }

  const save = (): void => {
    if (!current) return
    setDirection('save')
    setSkipped((list) => list.filter((id) => id !== current.id))
    void window.api.markReviewed([current.id])
  }

  const skip = (): void => {
    if (!current || queue.length < 2) return
    setDirection('skip')
    setSkipped((list) => [...list.filter((id) => id !== current.id), current.id])
  }

  const reviewAll = (): void => {
    if (!window.confirm(`${queue.length} videonun hepsi etiketsiz olarak kütüphaneye taşınsın mı?`))
      return
    void window.api
      .markReviewed(queue.map((video) => video.id))
      .then(() => showToast('Gelen kutusu boşaltıldı'))
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.target instanceof HTMLInputElement ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return
      if (/^[1-9]$/.test(event.key)) {
        const tag = quickTags[Number(event.key) - 1]
        if (tag) toggleTag(tag.id)
      } else if (event.key === 'Enter') save()
      else if (event.key.toLowerCase() === 's') skip()
      else if (event.key.toLowerCase() === 'f' && current) void toggleFavorite([current])
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className="notebook flex min-w-0 grow flex-col gap-[18px] overflow-y-auto pt-[18px] pr-[26px] pb-5 pl-[38px]">
      <div className="flex items-center gap-4">
        <h1 className="m-0 text-[30px] leading-none font-extrabold tracking-[-0.02em]">
          Gelen Kutusu
        </h1>
        {queue.length > 0 && (
          <motion.div
            key={queue.length}
            initial={{ scale: 1.3, rotate: -8 }}
            animate={{ scale: 1, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
            className="flex h-7 items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-sticker-red px-3 text-[13px] font-extrabold text-ink"
          >
            <AnimatedNumber value={queue.length} /> video etiket bekliyor
          </motion.div>
        )}
        <span className="grow" />
        {queue.length > 1 && (
          <button
            onClick={reviewAll}
            className="text-[13px] font-semibold text-mute underline underline-offset-[3px] hover:text-text"
          >
            Hepsini etiketsiz kütüphaneye at
          </button>
        )}
      </div>

      {!current ? (
        <div className="flex grow flex-col items-center justify-center gap-5 pb-16">
          <motion.div
            initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
            className="flex size-20 items-center justify-center rounded-3xl border-2 border-ink bg-sticker-green text-ink shadow-[4px_5px_0_var(--color-ink)]"
          >
            <Inbox size={38} strokeWidth={2.25} />
          </motion.div>
          <div className="text-center">
            <div className="text-2xl font-extrabold">Gelen kutun tertemiz</div>
            <div className="mt-1 text-sm text-mute">
              Klasörlerine yeni video gelince burada görünecek.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-[22px]">
            <div className="relative flex min-w-0 grow basis-[600px] flex-col gap-3">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 80, rotate: 3 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
                  exit={
                    direction === 'save'
                      ? { opacity: 0, x: -260, y: -40, rotate: -12, scale: 0.6 }
                      : { opacity: 0, x: 200, rotate: 8, scale: 0.8 }
                  }
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="flex flex-col gap-3"
                >
                  <div className="relative overflow-hidden rounded-2xl border-2 border-text bg-ink shadow-[6px_8px_0_var(--color-ink)]">
                    <video
                      src={window.api.mediaUrl(current.path)}
                      autoPlay
                      loop
                      muted
                      className="aspect-video max-h-[46vh] w-full object-contain"
                    />
                    <div className="absolute top-3 right-3 flex h-6 items-center rounded-full bg-ink/80 px-2.5 font-mono text-[11.5px]">
                      {formatDuration(current.durationMs)}
                    </div>
                  </div>
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="truncate text-xl font-extrabold">
                      {stripExtension(current.name)}
                    </span>
                    <span className="shrink-0 text-[12.5px] text-mute">
                      {folderName(folders.find((f) => f.id === current.folderId)?.path ?? '')} ·{' '}
                      {formatSize(current.size)}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex w-[340px] shrink-0 flex-col gap-3.5 rounded-2xl border-[1.5px] border-line bg-bg p-[18px]">
              <div className="flex items-center justify-between">
                <Label>Hızlı etiketle</Label>
                <span className="text-xs text-dim">rakamla aç / kapat</span>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                {quickTags.map((tag, i) => {
                  const on = current.tagIds.includes(tag.id)
                  return (
                    <motion.button
                      key={tag.id}
                      whileTap={{ scale: 0.9 }}
                      animate={{ rotate: on ? [0, -6, 3, 0] : 0, scale: on ? [1, 1.12, 1] : 1 }}
                      transition={{ duration: 0.35 }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <TagSticker tag={tag} size="md" hotkey={String(i + 1)} off={!on} />
                    </motion.button>
                  )
                })}
                <button
                  onClick={() => openChipEditor(null, [current.id])}
                  className="flex h-[30px] items-center gap-1 rounded-full border-[1.5px] border-dashed border-dim px-[11px] text-[13px] font-semibold text-mute hover:text-text"
                >
                  <Plus size={14} />
                  yeni
                </button>
              </div>
              <span className="grow" />
              <Button variant="primary" icon={CornerDownLeft} size="lg" onClick={save}>
                Kaydet, sonraki
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button icon={SkipForward} onClick={skip} disabled={queue.length < 2}>
                  Atla <Kbd>S</Kbd>
                </Button>
                <Button
                  icon={Star}
                  onClick={() => void toggleFavorite([current])}
                  className={current.favorite ? 'text-sticker-yellow' : ''}
                >
                  Favori <Kbd>F</Kbd>
                </Button>
              </div>
            </div>
          </div>

          {queue.length > 1 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Label>Sırada</Label>
                <span className="font-mono text-[11px] text-dim">{queue.length - 1}</span>
              </div>
              <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {queue.slice(1, 7).map((video, i) => (
                    <motion.div
                      key={video.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: i > 3 ? 0.55 : 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="flex min-w-0 flex-col gap-1.5"
                    >
                      <div className="aspect-[16/10] overflow-hidden rounded-[10px] border-[1.5px] border-line bg-ink">
                        {video.mediaStatus === 'ready' && (
                          <img
                            src={window.api.thumbUrl(video)}
                            alt=""
                            className="size-full object-cover"
                          />
                        )}
                      </div>
                      <span className="truncate text-xs text-mute">
                        {stripExtension(video.name)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
