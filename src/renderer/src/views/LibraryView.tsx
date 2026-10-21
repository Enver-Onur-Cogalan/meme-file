import {
  ArrowDownUp,
  Check,
  Copy,
  Dices,
  FolderPlus,
  Inbox,
  RefreshCw,
  Search,
  SearchX,
  Shrink,
  Star,
  Tags,
  X
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LibraryView as View, SortOrder, Video } from '../../../shared/api'
import type { MenuState } from '../components/ContextMenu'
import { TagSticker } from '../components/TagSticker'
import { AnimatedNumber, Button, Kbd } from '../components/ui'
import { spring } from '../lib/motion'
import { play } from '../lib/sound'
import { useThemeId } from '../lib/theme'
import { VideoGrid } from '../components/VideoGrid'
import { copyVideos, toggleFavorite } from '../lib/actions'
import { folderName } from '../lib/format'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../lib/store'
import { useCountParts, useT } from '../lib/i18n'
import type { MessageKey } from '../../../shared/i18n'

const TITLES: Record<View, MessageKey> = {
  library: 'nav.library',
  inbox: 'nav.inbox',
  favorites: 'nav.favorites',
  'most-sent': 'nav.mostSent',
  duplicates: 'nav.duplicates'
}

const SORTS: { value: SortOrder; label: MessageKey }[] = [
  { value: 'newest', label: 'sort.newest' },
  { value: 'oldest', label: 'sort.oldest' },
  { value: 'name', label: 'sort.name' },
  { value: 'size', label: 'sort.size' },
  { value: 'duration', label: 'sort.duration' },
  { value: 'most-sent', label: 'sort.mostSent' }
]

interface Props {
  onAddFolder(): void
  onMenu(menu: MenuState): void
  searchRef: React.RefObject<HTMLInputElement | null>
}

export function LibraryView({ onAddFolder, onMenu, searchRef }: Props): React.JSX.Element {
  const store = useStore(
    useShallow((s) => ({
      videos: s.videos,
      tags: s.tags,
      view: s.view,
      folderId: s.folderId,
      folders: s.folders,
      text: s.text,
      tagIds: s.tagIds,
      sort: s.sort,
      selection: s.selection,
      settings: s.settings,
      stats: s.stats,
      loaded: s.loaded,
      setText: s.setText,
      setSort: s.setSort,
      updateSettings: s.updateSettings,
      toggleTagFilter: s.toggleTagFilter,
      clearFilters: s.clearFilters,
      select: s.select,
      playRandom: s.playRandom
    }))
  )
  const { videos, tags, view, folderId, folders, text, tagIds, sort, selection, settings } = store
  const [sortOpen, setSortOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const [foundBefore, foundAfter] = useCountParts('library.found', videos.length)

  const title =
    folderId !== null
      ? folderName(folders.find((f) => f.id === folderId)?.path ?? '')
      : t(TITLES[view])
  const selectedVideos = useMemo(
    () => videos.filter((video) => selection.includes(video.id)),
    [videos, selection]
  )
  const activeTags = tagIds.map((id) => tags.find((tag) => tag.id === id)).filter((t) => !!t)
  const tagMode = settings?.tagMode ?? 'and'

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 })
  }, [view, folderId])

  return (
    <main
      ref={gridRef}
      className="notebook relative flex min-w-0 grow flex-col overflow-y-auto pt-[18px] pr-[26px] pb-5 pl-[38px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) store.select([])
      }}
    >
      <div className="flex items-center gap-3.5">
        <AnimatePresence mode="wait">
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: 10, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
            className="page-title m-0 max-w-[40%] truncate text-[30px] leading-none font-extrabold tracking-[-0.02em]"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
        <label className="search-field flex h-11 grow items-center gap-2.5 rounded-full border-2 border-ink bg-pill px-[18px] text-pill-ink shadow-[var(--shadow-sticker)] focus-within:shadow-[var(--shadow-accent)]">
          <Search size={18} strokeWidth={2.25} className="shrink-0" />
          <input
            ref={searchRef}
            value={text}
            onChange={(event) => store.setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                store.setText('')
                event.currentTarget.blur()
              }
            }}
            placeholder={t('library.searchPlaceholder')}
            className="min-w-0 grow bg-transparent text-[14.5px] font-medium outline-none placeholder:text-current placeholder:opacity-55"
          />
          {text ? (
            <button onClick={() => store.setText('')} aria-label={t('library.clearSearch')}>
              <X size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <span className="font-mono text-[11px] opacity-55">Ctrl F</span>
          )}
        </label>
        {/*
          Rastgele: o an ne görüyorsan onun içinden seçer. Chip filtresi ya
          da arama varsa havuz odur; kurulan bağlamı yok saymaz.
        */}
        <Button
          icon={Dices}
          onClick={() => store.playRandom()}
          disabled={videos.length === 0}
          className="h-11"
        >
          {t('library.random')}
        </Button>
        <div className="relative">
          <Button icon={ArrowDownUp} onClick={() => setSortOpen((open) => !open)} className="h-11">
            {t(SORTS.find((s) => s.value === sort)?.label ?? 'sort.newest')}
          </Button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={spring}
                onMouseLeave={() => setSortOpen(false)}
                className="absolute top-12 right-0 z-30 flex w-52 flex-col rounded-[14px] border-2 border-text bg-bg p-1.5 shadow-[5px_6px_0_var(--color-ink)]"
              >
                {SORTS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      store.setSort(option.value)
                      setSortOpen(false)
                    }}
                    className="flex h-9 items-center justify-between rounded-[9px] px-2.5 text-left text-[13.5px] font-semibold hover:bg-surf"
                  >
                    {t(option.label)}
                    {option.value === sort && <Check size={15} className="text-accent" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex min-h-[46px] flex-wrap items-center gap-2.5 py-3">
        <AnimatePresence mode="popLayout">
          {activeTags.map((tag, i) => (
            <motion.div
              key={tag.id}
              layout
              initial={{ opacity: 0, scale: 0.4, rotate: -25, x: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="flex items-center gap-2.5"
            >
              {i > 0 && (
                <button
                  onClick={() =>
                    void store.updateSettings({ tagMode: tagMode === 'and' ? 'or' : 'and' })
                  }
                  title={t('library.tagModeHint')}
                  className="rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] font-medium text-mute hover:text-text"
                >
                  {tagMode === 'and' ? t('library.and') : t('library.or')}
                </button>
              )}
              <TagSticker
                tag={tag}
                size="md"
                onRemove={() => store.toggleTagFilter(tag.id)}
                className="shadow-[2px_3px_0_var(--color-ink)]"
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {(activeTags.length > 0 || text) && (
          <button
            onClick={store.clearFilters}
            className="text-[13px] font-semibold text-mute underline underline-offset-[3px] hover:text-text"
          >
            {t('common.clear')}
          </button>
        )}
        <span className="grow" />
        {store.stats.pendingMedia > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-dim">
            <RefreshCw size={12} className="animate-spin" />
            {t('library.pendingPreviews', { count: store.stats.pendingMedia })}
          </span>
        )}
        <span className="text-[13px] text-mute">
          {foundBefore}
          <AnimatedNumber value={videos.length} className="font-extrabold text-text" />
          {foundAfter}
        </span>
      </div>

      {folders.length === 0 && store.loaded ? (
        <EmptyState
          icon={FolderPlus}
          title={t('library.noFoldersTitle')}
          text={t('library.noFoldersText')}
          action={
            <Button
              variant="primary"
              icon={FolderPlus}
              color="var(--color-accent)"
              size="lg"
              onClick={onAddFolder}
            >
              {t('nav.addFolder')}
            </Button>
          }
        />
      ) : videos.length === 0 && store.loaded ? (
        activeTags.length > 0 || text ? (
          <EmptyState
            icon={SearchX}
            title={t('library.noResultsTitle')}
            text={t('library.noResultsText')}
            action={<Button onClick={store.clearFilters}>{t('library.clearFilters')}</Button>}
          />
        ) : view === 'inbox' ? (
          <EmptyState
            icon={Inbox}
            title={t('library.inboxEmptyTitle')}
            text={t('library.inboxEmptyText')}
          />
        ) : view === 'favorites' ? (
          <EmptyState
            icon={Star}
            title={t('library.noFavoritesTitle')}
            text={t('library.noFavoritesText')}
          />
        ) : (
          <EmptyState icon={Copy} title={t('library.emptyTitle')} text={t('library.emptyText')} />
        )
      ) : (
        <VideoGrid videos={videos} tags={tags} scrollRef={gridRef} onMenu={onMenu} />
      )}

      <AnimatePresence>
        {selection.length > 1 && (
          <BulkBar
            count={selection.length}
            onCopy={() => void copyVideos(selection)}
            onFavorite={() => void toggleFavorite(selectedVideos)}
            onTag={(tagId, add) => {
              play('chip')
              void window.api.addTagToVideos(selection, tagId, add)
            }}
            onClear={() => store.select([])}
            selectedVideos={selectedVideos}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function BulkBar({
  count,
  onCopy,
  onFavorite,
  onTag,
  onClear,
  selectedVideos
}: {
  count: number
  onCopy(): void
  onFavorite(): void
  onTag(tagId: number, add: boolean): void
  onClear(): void
  selectedVideos: Video[]
}): React.JSX.Element {
  const tags = useStore((s) => s.tags)
  const [tagPicker, setTagPicker] = useState(false)
  const t = useT()
  const [selectedBefore, selectedAfter] = useCountParts('library.selected', count)
  return (
    <motion.div
      initial={{ y: 90, opacity: 0, rotate: 2 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="sticky bottom-0 z-20 mx-auto mt-4 flex flex-col items-center gap-2"
    >
      <AnimatePresence>
        {tagPicker && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="flex max-w-[640px] flex-wrap justify-center gap-2 rounded-[18px] border-2 border-text bg-bg p-3 shadow-[5px_6px_0_var(--color-ink)]"
          >
            {tags.map((tag) => {
              const all = selectedVideos.every((video) => video.tagIds.includes(tag.id))
              return (
                <motion.button
                  key={tag.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onTag(tag.id, !all)}
                >
                  <TagSticker tag={tag} size="md" off={!all} />
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 rounded-full border-2 border-text bg-bg py-1.5 pr-1.5 pl-4 shadow-[5px_6px_0_var(--color-ink)]">
        <span className="pr-2 text-sm font-extrabold whitespace-nowrap">
          {selectedBefore}
          <AnimatedNumber value={count} />
          {selectedAfter}
        </span>
        <Button icon={Tags} onClick={() => setTagPicker((open) => !open)}>
          {t('common.chip')}
        </Button>
        <Button icon={Star} onClick={onFavorite}>
          {t('common.favorite')}
        </Button>
        <Button
          icon={Shrink}
          onClick={() => useStore.getState().openBulkClip(selectedVideos.map((video) => video.id))}
        >
          {t('player.fit')}
        </Button>
        <Button variant="primary" icon={Copy} onClick={onCopy}>
          {t('common.copy')}
        </Button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-2 text-xs text-mute hover:text-text"
        >
          <Kbd>Esc</Kbd>
        </button>
      </div>
    </motion.div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  text,
  action
}: {
  icon: typeof Inbox
  title: string
  text: string
  action?: React.ReactNode
}): React.JSX.Element {
  const theme = useThemeId()
  // Her tema boşluğu kendi diliyle anlatır: terminal çıktısı, sistem uyarısı…
  if (theme === 'cyber') {
    return (
      <div className="flex grow flex-col items-center justify-center gap-3 pb-16 font-mono">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="text-[32px] font-bold tracking-[0.18em] text-accent"
          style={{ textShadow: '0 0 18px var(--color-accent)' }}
        >
          {'// NO SIGNAL'}
        </motion.div>
        <div className="text-[13px] text-accent/70">{title}</div>
        <div className="max-w-[46ch] text-center text-[12.5px] text-mute">{text}</div>
        {action}
      </div>
    )
  }
  if (theme === 'classic') {
    return (
      <div className="flex grow items-center justify-center pb-16">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-[380px] bg-surf shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#7b7b7b,2px_2px_0_#00000055]"
        >
          <div className="flex h-[22px] items-center bg-[linear-gradient(90deg,#008080,#35a3a3)] px-2 text-[11px] text-white">
            <span style={{ fontFamily: 'var(--font-display, inherit)' }}>Meme File</span>
          </div>
          <div className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center border-[1.5px] border-ink bg-accent text-ink">
              <Icon size={20} strokeWidth={2.25} />
            </div>
            <div>
              <div className="text-[13px] font-bold">{title}</div>
              <div className="mt-1 text-[12px] text-mute">{text}</div>
            </div>
          </div>
          {action && <div className="flex justify-end px-4 pb-4">{action}</div>}
        </motion.div>
      </div>
    )
  }
  return (
    <div className="flex grow flex-col items-center justify-center gap-5 pb-16">
      <motion.div
        initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className="flex size-20 items-center justify-center rounded-3xl border-2 border-ink bg-accent text-ink shadow-[4px_5px_0_var(--color-ink)]"
      >
        <Icon size={38} strokeWidth={2.25} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="text-center"
      >
        <div className="text-2xl font-extrabold">{title}</div>
        <div className="mt-1 text-sm text-mute">{text}</div>
      </motion.div>
      {action}
    </div>
  )
}
