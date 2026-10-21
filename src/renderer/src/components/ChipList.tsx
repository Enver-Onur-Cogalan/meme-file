import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tag } from '../../../shared/api'
import { normalizeForSearch } from '../../../shared/search'
import { confirmDeleteTag } from '../lib/actions'
import { useT } from '../lib/i18n'
import { spring, useFeel } from '../lib/motion'
import { play } from '../lib/sound'
import { useStore } from '../lib/store'
import { tiltFor } from '../lib/tags'
import type { MenuState } from './ContextMenu'
import { TagSticker } from './TagSticker'

/** Sürükleme sayılması için gereken en küçük hareket; altında kalan hareket tıklamadır. */
const DRAG_THRESHOLD = 6

export function ChipList({ onMenu }: { onMenu(menu: MenuState): void }): React.JSX.Element {
  const { tags, tagIds, toggleTagFilter, openChipEditor } = useStore()
  const t = useT()
  const feel = useFeel()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [order, setOrder] = useState<Tag[]>(tags)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nodes = useRef(new Map<number, HTMLElement>())
  const pointerStart = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null)
  // Sürükleme bittiğinde tarayıcının ürettiği tıklama filtreyi açmasın.
  const suppressClick = useRef(false)
  const dragLayout = useRef<{ id: number; cx: number; cy: number }[]>([])
  const dragOrder = useRef<Tag[]>([])

  // Sürükleme sırasında dışarıdan gelen liste yazılmaz; bitince eşitlenir.
  const synced = draggingId === null ? tags : order
  if (synced !== order) setOrder(synced)

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query.trim())
    return q ? order.filter((tag) => normalizeForSearch(tag.name).includes(q)) : order
  }, [order, query])

  // "/" tuşu aramayı açar (bir yazı alanında değilsek).
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const state = useStore.getState()
      if (event.key !== '/' || event.target instanceof HTMLInputElement) return
      if (state.playerId !== null || state.chipEditor || state.clip || state.settingsOpen) return
      event.preventDefault()
      setSearching(true)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeSearch = (): void => {
    setSearching(false)
    setQuery('')
  }

  /**
   * Hedef sıra, sürükleme başındaki konumlara göre hesaplanır: chip'ler yer değiştirirken
   * ölçüm yapmak sırayı oynak hâle getiriyordu.
   */
  const moveTo = (id: number, x: number, y: number): void => {
    const layout = dragLayout.current
    if (!layout.length) return
    let nearest = layout[0]
    let best = Infinity
    for (const item of layout) {
      const distance = Math.hypot(item.cx - x, item.cy - y)
      if (distance < best) {
        best = distance
        nearest = item
      }
    }
    const base = dragOrder.current
    const from = base.findIndex((tag) => tag.id === id)
    const to = base.findIndex((tag) => tag.id === nearest.id)
    if (from === -1 || to === -1) return
    const next = [...base]
    next.splice(to, 0, ...next.splice(from, 1))
    setOrder((current) =>
      current.length === next.length && current.every((tag, i) => tag.id === next[i].id)
        ? current
        : next
    )
  }

  const canReorder = !query.trim()

  return (
    <div className="flex flex-col gap-2.5 px-3">
      <div className="flex h-5 items-center justify-between gap-2">
        <AnimatePresence mode="wait" initial={false}>
          {searching ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: 0 }}
              transition={spring}
              className="flex items-center gap-1.5 overflow-hidden"
            >
              <Search size={13} className="shrink-0 text-dim" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => !query && setSearching(false)}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === 'Escape') closeSearch()
                  if (event.key === 'Enter' && filtered.length === 1) {
                    toggleTagFilter(filtered[0].id)
                    closeSearch()
                  }
                }}
                placeholder={t('nav.chipSearch')}
                className="min-w-0 grow bg-transparent text-xs font-semibold outline-none placeholder:text-dim"
              />
              <span className="shrink-0 font-mono text-[10px] text-dim">
                {filtered.length}/{order.length}
              </span>
              <button
                onClick={closeSearch}
                aria-label={t('common.close')}
                className="shrink-0 text-dim hover:text-text"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-between"
            >
              <span className="text-xs font-bold text-dim">{t('nav.chips')}</span>
              {order.length > 6 && (
                <button
                  onClick={() => {
                    setSearching(true)
                    requestAnimationFrame(() => inputRef.current?.focus())
                  }}
                  title={t('nav.chipSearchHint')}
                  className="text-dim hover:text-text"
                >
                  <Search size={13} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div layout className="flex flex-wrap gap-x-1.5 gap-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((tag) => {
            const active = tagIds.includes(tag.id)
            const dragging = draggingId === tag.id
            return (
              <motion.button
                key={tag.id}
                ref={(node) => {
                  if (node) nodes.current.set(tag.id, node)
                  else nodes.current.delete(tag.id)
                }}
                layout
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                animate={{
                  opacity: 1,
                  scale: dragging ? 1.12 : 1,
                  rotate: 0,
                  zIndex: dragging ? 10 : 0
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileHover={
                  dragging ? undefined : { y: feel.lift / 2, rotate: 0, scale: feel.grow }
                }
                whileTap={dragging ? undefined : { scale: feel.press }}
                transition={spring}
                onPointerDown={(event) => {
                  if (!canReorder || event.button !== 0) return
                  pointerStart.current = {
                    x: event.clientX,
                    y: event.clientY,
                    id: tag.id,
                    moved: false
                  }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  const start = pointerStart.current
                  if (!start || start.id !== tag.id) return
                  const far =
                    Math.abs(event.clientX - start.x) > DRAG_THRESHOLD ||
                    Math.abs(event.clientY - start.y) > DRAG_THRESHOLD
                  if (!start.moved && far) {
                    start.moved = true
                    dragOrder.current = order
                    dragLayout.current = order.flatMap((item) => {
                      const node = nodes.current.get(item.id)
                      if (!node) return []
                      const rect = node.getBoundingClientRect()
                      return [
                        { id: item.id, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 }
                      ]
                    })
                    setDraggingId(tag.id)
                  }
                  if (start.moved) moveTo(tag.id, event.clientX, event.clientY)
                }}
                onPointerUp={() => {
                  const start = pointerStart.current
                  pointerStart.current = null
                  if (!start?.moved) return
                  suppressClick.current = true
                  setDraggingId(null)
                  void window.api.reorderTags(order.map((item) => item.id))
                }}
                // Tıklama (fare ya da klavye) filtreyi açıp kapatır.
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false
                    return
                  }
                  play('chip')
                  toggleTagFilter(tag.id)
                }}
                onPointerCancel={() => {
                  pointerStart.current = null
                  setDraggingId(null)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  onMenu({
                    x: event.clientX,
                    y: event.clientY,
                    items: [
                      {
                        label: t('common.edit'),
                        icon: Pencil,
                        onSelect: () => openChipEditor(tag)
                      },
                      {
                        label: t('common.delete'),
                        icon: Trash2,
                        danger: true,
                        onSelect: () => void confirmDeleteTag(tag)
                      }
                    ]
                  })
                }}
                title={t('nav.chipHint')}
                className={`touch-none rounded-full ${dragging ? 'cursor-grabbing shadow-[3px_4px_0_var(--color-ink)]' : ''} ${
                  active && !dragging ? 'shadow-[2px_3px_0_var(--color-text)]' : ''
                }`}
              >
                <TagSticker
                  tag={tag}
                  size="md"
                  count
                  tilt={active || dragging ? 0 : tiltFor(tag.id) * feel.tilt}
                />
              </motion.button>
            )
          })}
        </AnimatePresence>
        {filtered.length === 0 && query.trim() && (
          <span className="py-1 text-xs text-dim">{t('nav.chipNotFound')}</span>
        )}
        <motion.button
          layout
          whileHover={{ rotate: -3, scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => openChipEditor(null)}
          className="flex h-[30px] items-center gap-1 rounded-full border-[1.5px] border-dashed border-dim px-[11px] text-[13px] font-semibold text-mute hover:text-text"
        >
          <Plus size={14} />
          {t('common.new')}
        </motion.button>
      </motion.div>
    </div>
  )
}
