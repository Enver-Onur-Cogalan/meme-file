import {
  BarChart3,
  Copy,
  Folder,
  FolderPlus,
  Inbox,
  LayoutGrid,
  Send,
  Settings,
  Star,
  Trash2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { LibraryView } from '../../../shared/api'
import { folderName } from '../lib/format'
import { useStore } from '../lib/store'
import { ChipList } from './ChipList'
import type { MenuState } from './ContextMenu'
import { AnimatedNumber } from './ui'
import { spring } from '../lib/motion'
import { useT } from '../lib/i18n'

interface Props {
  onAddFolder(): void
  onMenu(menu: MenuState): void
}

export function Sidebar({ onAddFolder, onMenu }: Props): React.JSX.Element {
  const { folders, stats, view, folderId, setView } = useStore()
  const t = useT()

  const navItem = (
    icon: LucideIcon,
    label: string,
    target: LibraryView,
    count?: number,
    badge = false
  ): React.JSX.Element => (
    <NavButton
      key={target}
      icon={icon}
      label={label}
      active={view === target && folderId === null}
      count={count}
      badge={badge}
      onClick={() => setView(target)}
    />
  )

  const removeFolder = async (id: number, path: string): Promise<void> => {
    const ok = await useStore.getState().confirm({
      title: t('folder.removeTitle', { name: folderName(path) }),
      text: t('folder.removeText'),
      confirmLabel: t('folder.remove'),
      danger: true
    })
    if (!ok) return
    await window.api.removeFolder(id)
    if (folderId === id) setView('library')
  }

  return (
    <aside className="sidebar flex w-60 shrink-0 flex-col gap-[22px] overflow-y-auto bg-side px-3 py-4">
      <div className="flex flex-col gap-[3px]">
        {navItem(LayoutGrid, t('nav.library'), 'library', stats.total)}
        {navItem(Inbox, t('nav.inbox'), 'inbox', stats.inbox, stats.inbox > 0)}
        {navItem(Star, t('nav.favorites'), 'favorites', stats.favorites)}
        {navItem(Send, t('nav.mostSent'), 'most-sent')}
        <AnimatePresence initial={false}>
          {stats.duplicates > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {navItem(Copy, t('nav.duplicates'), 'duplicates', stats.duplicates)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center justify-between px-3 pb-1 text-xs font-bold text-dim">
          <span>{t('nav.folders')}</span>
          <button onClick={onAddFolder} title={t('nav.addFolder')} className="hover:text-text">
            <FolderPlus size={15} />
          </button>
        </div>
        {folders.map((folder) => (
          <NavButton
            key={folder.id}
            icon={Folder}
            label={folderName(folder.path)}
            title={folder.path}
            count={folder.videoCount}
            active={folderId === folder.id}
            onClick={() => setView('library', folder.id)}
            onContextMenu={(event) => {
              event.preventDefault()
              onMenu({
                x: event.clientX,
                y: event.clientY,
                items: [
                  {
                    label: t('folder.removeMenu'),
                    icon: Trash2,
                    danger: true,
                    onSelect: () => void removeFolder(folder.id, folder.path)
                  }
                ]
              })
            }}
          />
        ))}
        {folders.length === 0 && (
          <button
            onClick={onAddFolder}
            className="mx-1 mt-1 flex h-9 items-center gap-2 rounded-full border-[1.5px] border-dashed border-dim px-3 text-[13px] font-semibold text-mute hover:text-text"
          >
            <FolderPlus size={15} />
            {t('nav.addFolder')}
          </button>
        )}
      </div>

      <ChipList onMenu={onMenu} />

      <span className="grow" />
      <NavButton
        icon={BarChart3}
        label={t('nav.stats')}
        active={false}
        onClick={() => useStore.getState().setStatsOpen(true)}
      />
      <NavButton
        icon={Settings}
        label={t('nav.settings')}
        active={false}
        onClick={() => useStore.getState().setSettingsOpen(true)}
      />
    </aside>
  )
}

function NavButton({
  icon: Icon,
  label,
  active,
  count,
  badge = false,
  title,
  onClick,
  onContextMenu
}: {
  icon: LucideIcon
  label: string
  active: boolean
  count?: number
  badge?: boolean
  title?: string
  onClick(): void
  onContextMenu?: React.MouseEventHandler
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      className={`relative flex h-9 w-full shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-left text-sm font-semibold transition-colors ${
        active ? 'text-pill-ink' : 'text-mute hover:text-text'
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={spring}
          className="absolute inset-0 rounded-[10px] bg-pill shadow-[var(--shadow-accent)]"
        />
      )}
      <Icon size={17} className="relative shrink-0" />
      <span className="relative grow truncate">{label}</span>
      {count !== undefined &&
        (badge ? (
          <motion.span
            key={count}
            initial={{ scale: 1.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="relative rounded-full border-[1.5px] border-ink bg-sticker-red px-[7px] text-[11px] font-extrabold text-ink"
          >
            {count}
          </motion.span>
        ) : (
          <span
            className={`relative font-mono text-[11px] ${active ? 'text-pill-ink' : 'text-dim'}`}
          >
            <AnimatedNumber value={count} />
          </span>
        ))}
    </button>
  )
}
