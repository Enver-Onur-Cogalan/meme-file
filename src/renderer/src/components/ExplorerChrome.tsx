import {
  BarChart3,
  Copy,
  FolderPlus,
  HelpCircle,
  Inbox,
  LayoutGrid,
  RefreshCw,
  Send,
  Settings as SettingsIcon,
  Star,
  Trash2
} from 'lucide-react'
import type { LibraryView } from '../../../shared/api'
import { copyVideos, trashVideos } from '../lib/actions'
import { formatSize } from '../lib/format'
import { t } from '../lib/i18n'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { MenuState } from './ContextMenu'

/**
 * Old School 98 teması bir dosya yöneticisi gibi dursun diye üstte menü,
 * altta durum çubuğu. Diğer temalarda hiç çizilmez.
 */
export function MenuBar({
  onMenu,
  onAddFolder
}: {
  onMenu(menu: MenuState): void
  onAddFolder(): void
}): React.JSX.Element {
  const tr = useT()

  const open = (event: React.MouseEvent, items: MenuState['items']): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    onMenu({ x: rect.left, y: rect.bottom + 2, items })
  }

  const go = (view: LibraryView): void => useStore.getState().setView(view)

  return (
    <div className="flex h-[22px] shrink-0 items-center gap-0.5 border-b border-line bg-surf px-1 text-[11px]">
      <MenuButton
        label={tr('menu.file')}
        onClick={(event) =>
          open(event, [
            { label: tr('nav.addFolder'), icon: FolderPlus, onSelect: onAddFolder },
            {
              label: tr('nav.settings'),
              icon: SettingsIcon,
              onSelect: () => useStore.getState().setSettingsOpen(true)
            },
            {
              label: tr('menu.rescan'),
              icon: RefreshCw,
              separatorBefore: true,
              onSelect: () => void window.api.rescan()
            }
          ])
        }
      />
      <MenuButton
        label={tr('menu.edit')}
        onClick={(event) => {
          const state = useStore.getState()
          const selected = state.selection
          open(event, [
            {
              label: tr('menu.selectAll'),
              icon: LayoutGrid,
              hint: 'Ctrl A',
              onSelect: () => state.select(state.videos.map((video) => video.id))
            },
            {
              label: tr('common.copy'),
              icon: Copy,
              hint: 'Ctrl C',
              onSelect: () => void copyVideos(selected)
            },
            {
              label: tr('common.delete'),
              icon: Trash2,
              danger: true,
              hint: 'Del',
              separatorBefore: true,
              onSelect: () =>
                void trashVideos(state.videos.filter((video) => selected.includes(video.id)))
            }
          ])
        }}
      />
      <MenuButton
        label={tr('menu.view')}
        onClick={(event) =>
          open(event, [
            { label: tr('nav.library'), icon: LayoutGrid, onSelect: () => go('library') },
            { label: tr('nav.inbox'), icon: Inbox, onSelect: () => go('inbox') },
            { label: tr('nav.favorites'), icon: Star, onSelect: () => go('favorites') },
            { label: tr('nav.mostSent'), icon: Send, onSelect: () => go('most-sent') },
            { label: tr('nav.duplicates'), icon: Copy, onSelect: () => go('duplicates') },
            {
              label: tr('nav.stats'),
              icon: BarChart3,
              separatorBefore: true,
              onSelect: () => useStore.getState().setStatsOpen(true)
            }
          ])
        }
      />
      <MenuButton
        label={tr('menu.help')}
        onClick={(event) =>
          open(event, [
            {
              label: tr('menu.about'),
              icon: HelpCircle,
              onSelect: () =>
                useStore.getState().showToast(`Meme File ${useStore.getState().appVersion}`, 'info')
            }
          ])
        }
      />
    </div>
  )
}

function MenuButton({
  label,
  onClick
}: {
  label: string
  onClick: React.MouseEventHandler
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="h-[18px] px-2 hover:bg-pill hover:text-pill-ink"
      style={{ fontFamily: 'var(--font-display, inherit)' }}
    >
      {label}
    </button>
  )
}

/** Explorer'ın alt şeridi: kaç dosya, ne kadar yer, kaç tanesi seçili. */
export function StatusBar(): React.JSX.Element {
  const videos = useStore((s) => s.videos)
  const selection = useStore((s) => s.selection)
  const bytes = videos.reduce((total, video) => total + video.size, 0)
  return (
    <div
      className="flex h-[22px] shrink-0 items-center gap-3 border-t border-line bg-surf px-2 text-[11px]"
      style={{ fontFamily: 'var(--font-display, inherit)' }}
    >
      <Cell>{t('status.objects', { count: videos.length })}</Cell>
      <Cell>{bytes === 0 ? '0 KB' : formatSize(bytes)}</Cell>
      {selection.length > 0 && <Cell>{t('status.selected', { count: selection.length })}</Cell>}
    </div>
  )
}

function Cell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="flex h-[16px] items-center px-1.5 shadow-[inset_1px_1px_0_#7b7b7b,inset_-1px_-1px_0_#ffffff]">
      {children}
    </span>
  )
}
