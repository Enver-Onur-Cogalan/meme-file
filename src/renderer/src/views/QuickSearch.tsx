import { Search, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Tag, Video } from '../../../shared/api'
import { TagSticker } from '../components/TagSticker'
import { Kbd } from '../components/ui'
import { formatDuration, stripExtension } from '../lib/format'

const RESULT_LIMIT = 6

/** Global kısayolla açılan küçük pencere: ara, Enter ile kopyala ya da sürükle. */
export function QuickSearch(): React.JSX.Element {
  const [text, setText] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [active, setActive] = useState(0)
  const [shownAt, setShownAt] = useState(0)
  const [copied, setCopied] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (query: string) => {
    const [results, allTags] = await Promise.all([
      window.api.queryVideos({
        view: query ? 'library' : 'most-sent',
        text: query,
        limit: RESULT_LIMIT
      }),
      window.api.listTags()
    ])
    // Arama boşken en çok gönderilenler; hiç gönderim yoksa en yeniler.
    const fallback =
      !query && results.length === 0
        ? await window.api.queryVideos({ view: 'library', limit: RESULT_LIMIT })
        : results
    setVideos(fallback)
    setTags(allTags)
    setActive(0)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void load(text), 80)
    return () => clearTimeout(timer)
  }, [text, load])

  useEffect(
    () =>
      window.api.onQuickWindowShown(() => {
        setText('')
        setCopied(null)
        setShownAt(Date.now())
        void load('')
        inputRef.current?.focus()
      }),
    [load]
  )
  useEffect(() => window.api.onLibraryChanged(() => void load(text)), [load, text])

  const copy = async (video: Video): Promise<void> => {
    if (await window.api.copyVideos([video.id])) {
      setCopied(video.id)
      setTimeout(() => window.api.hideQuickWindow(), 450)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const video = videos[active]
    if (event.key === 'ArrowDown') setActive((i) => Math.min(i + 1, videos.length - 1))
    else if (event.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (event.key === 'Escape') window.api.hideQuickWindow()
    else if (event.key === 'Enter' && video) {
      if (event.ctrlKey || event.metaKey) window.api.openInMainWindow(video.id)
      else void copy(video)
    } else return
    event.preventDefault()
  }

  return (
    <motion.div
      key={shownAt}
      initial={{ opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
      className="mr-3 mb-3.5 flex h-[calc(100%-14px)] flex-col overflow-hidden rounded-[18px] border-2 border-text bg-bg shadow-[8px_10px_0_#000]"
      onKeyDown={onKeyDown}
    >
      <div
        className="flex items-center gap-3 border-b-[1.5px] border-line px-[18px] py-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex size-7 shrink-0 -rotate-8 items-center justify-center rounded-lg border-[1.5px] border-ink bg-sticker-yellow text-ink">
          <Search size={15} strokeWidth={2.5} />
        </div>
        <input
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Hangi meme lazım?"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="min-w-0 grow bg-transparent text-[22px] font-bold outline-none placeholder:text-dim"
        />
      </div>

      <div className="flex grow flex-col gap-0.5 overflow-hidden p-2">
        {!text && videos.length > 0 && (
          <div className="px-2 pt-1 pb-1.5 text-xs font-bold text-dim">
            {videos.some((v) => v.sendCount > 0) ? 'En çok gönderdiklerin' : 'Son eklenenler'}
          </div>
        )}
        {videos.map((video, index) => {
          const videoTags = video.tagIds
            .map((id) => tags.find((t) => t.id === id))
            .filter((t) => !!t)
          const isActive = index === active
          return (
            <div
              key={video.id}
              draggable
              onDragStart={(event) => {
                event.preventDefault()
                window.api.startDrag([video.id])
              }}
              onMouseEnter={() => setActive(index)}
              onClick={() => void copy(video)}
              onDoubleClick={() => window.api.openInMainWindow(video.id)}
              className="relative flex cursor-grab items-center gap-3 rounded-[14px] p-2 active:cursor-grabbing"
            >
              {isActive && (
                <motion.div
                  layoutId="quick-active"
                  transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                  className="absolute inset-0 rounded-[14px] bg-surf shadow-[inset_0_0_0_1.5px_var(--color-text)]"
                />
              )}
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-[10px] border-[1.5px] border-ink bg-ink">
                {video.mediaStatus === 'ready' && (
                  <img
                    src={window.api.thumbUrl(video)}
                    alt=""
                    draggable={false}
                    className="size-full object-cover"
                  />
                )}
                <span className="absolute right-1 bottom-1 rounded-full bg-ink/85 px-1.5 font-mono text-[10px]">
                  {formatDuration(video.durationMs)}
                </span>
              </div>
              <div className="relative flex min-w-0 grow flex-col gap-1.5">
                <span className="truncate text-[14.5px] font-bold">
                  {stripExtension(video.name)}
                </span>
                <div className="flex gap-1 overflow-hidden">
                  {videoTags.slice(0, 3).map((tag) => (
                    <TagSticker key={tag.id} tag={tag} />
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                {copied === video.id ? (
                  <motion.span
                    key="copied"
                    initial={{ scale: 1.6, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: -3, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                    className="relative rounded-full border-[1.5px] border-ink bg-sticker-green px-3 py-1 text-xs font-extrabold text-ink"
                  >
                    Kopyalandı!
                  </motion.span>
                ) : (
                  isActive && (
                    <motion.div
                      key="hint"
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative flex shrink-0 items-center gap-1.5 text-xs text-mute"
                    >
                      <Send size={13} />
                      sürükle veya <Kbd>Enter</Kbd>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          )
        })}
        {videos.length === 0 && (
          <div className="flex grow items-center justify-center text-sm text-dim">
            {text ? 'Böyle bir meme yok' : 'Kütüphane boş'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3.5 border-t-[1.5px] border-line px-[18px] py-2.5 text-xs text-dim">
        <span className="flex items-center gap-1.5">
          <Kbd>↑ ↓</Kbd> seç
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd> kopyala
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Ctrl Enter</Kbd> oynat
        </span>
        <span className="grow" />
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> kapat
        </span>
      </div>
    </motion.div>
  )
}
