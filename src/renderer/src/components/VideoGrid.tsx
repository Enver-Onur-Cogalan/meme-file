import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Tag, Video } from '../../../shared/api'
import { dragVideos, videoMenu } from '../lib/actions'
import { useStore } from '../lib/store'
import type { MenuState } from './ContextMenu'
import { VideoCard, type CardAction } from './VideoCard'

const MIN_CARD_WIDTH = 220
const GAP = 18
/**
 * Bu sayıya kadar tüm kartlar çizilir ve filtrelerken kartlar yeni yerlerine kayar.
 * Üstünde sadece ekranda görünen satırlar çizilir (sanal liste); binlerce videoda da akıcı kalır.
 */
const VIRTUALIZE_FROM = 120

interface Props {
  videos: Video[]
  tags: Tag[]
  scrollRef: React.RefObject<HTMLElement | null>
  onMenu(menu: MenuState): void
}

export function VideoGrid({ videos, tags, scrollRef, onMenu }: Props): React.JSX.Element {
  const selection = useStore((s) => s.selection)
  const selected = useMemo(() => new Set(selection), [selection])

  // Kartlara sabit bir fonksiyon verilir; böylece bir kart değişince diğerleri yeniden çizilmez.
  const onAction = useCallback(
    (action: CardAction, video: Video, event?: React.MouseEvent) => {
      const state = useStore.getState()
      const ids = state.selection
      const inSelection = ids.includes(video.id)
      if (action === 'open') state.openPlayer(video.id)
      else if (action === 'drag') dragVideos(inSelection ? ids : [video.id])
      else if (action === 'menu' && event) {
        event.preventDefault()
        if (!inSelection) state.select([video.id], video.id)
        const targets = inSelection ? state.videos.filter((v) => ids.includes(v.id)) : [video]
        onMenu({ x: event.clientX, y: event.clientY, items: videoMenu(video, targets) })
      } else if (action === 'click' && event) {
        const list = state.videos
        if (event.shiftKey && state.anchorId !== null) {
          const from = list.findIndex((v) => v.id === state.anchorId)
          const to = list.findIndex((v) => v.id === video.id)
          const [a, b] = from < to ? [from, to] : [to, from]
          state.select(
            list.slice(a, b + 1).map((v) => v.id),
            state.anchorId
          )
        } else if (event.ctrlKey || event.metaKey) {
          state.select(
            inSelection ? ids.filter((id) => id !== video.id) : [...ids, video.id],
            video.id
          )
        } else {
          state.select([video.id], video.id)
        }
      }
    },
    [onMenu]
  )

  if (videos.length < VIRTUALIZE_FROM) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] content-start gap-[18px]">
        <AnimatePresence mode="popLayout">
          {videos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              tags={tags}
              delay={Math.min(index, 16) * 0.025}
              entry
              selected={selected.has(video.id)}
              animateLayout
              onAction={onAction}
            />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <VirtualGrid
      videos={videos}
      tags={tags}
      selected={selected}
      scrollRef={scrollRef}
      onAction={onAction}
    />
  )
}

function VirtualGrid({
  videos,
  tags,
  selected,
  scrollRef,
  onAction
}: {
  videos: Video[]
  tags: Tag[]
  selected: Set<number>
  scrollRef: React.RefObject<HTMLElement | null>
  onAction(action: CardAction, video: Video, event?: React.MouseEvent): void
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // İlk açılışta kartlar sırayla süzülür; sonra kaydırırken ekrana giren satırlar animasyonsuz gelir
  // (her satırda animasyon oynatmak kaydırmayı ağırlaştırıyordu).
  const [animateEntry, setAnimateEntry] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setAnimateEntry(false), 900)
    return () => clearTimeout(timer)
  }, [])
  const [offsetTop, setOffsetTop] = useState(0)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = (): void => {
      setWidth(element.clientWidth)
      setOffsetTop(element.offsetTop)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP)))
  const rowCount = Math.ceil(videos.length / columns)
  const cardWidth = width ? (width - GAP * (columns - 1)) / columns : MIN_CARD_WIDTH

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    // Kapak (16:10) + başlık + bir satır chip; gerçek yükseklik çizildikten sonra ölçülür.
    estimateSize: () => cardWidth * (10 / 16) + 86 + GAP,
    overscan: 4,
    scrollMargin: offsetTop
  })

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={`${row.key}-${columns}`}
          data-index={row.index}
          ref={virtualizer.measureElement}
          className="absolute top-0 left-0 grid w-full items-start"
          style={{
            transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: GAP,
            paddingBottom: GAP
          }}
        >
          {videos.slice(row.index * columns, (row.index + 1) * columns).map((video, column) => (
            <VideoCard
              key={video.id}
              video={video}
              tags={tags}
              delay={(row.index * columns + column) * 0.02}
              entry={animateEntry}
              selected={selected.has(video.id)}
              animateLayout={false}
              onAction={onAction}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
