import {
  Copy,
  FolderOpen,
  Film,
  PenLine,
  Play,
  Scissors,
  Shrink,
  Star,
  StarOff,
  Tags,
  Trash2
} from 'lucide-react'
import type { Tag, Video } from '../../../shared/api'
import type { MenuItem } from '../components/ContextMenu'
import { useStore } from './store'
import { t } from './i18n'

export async function copyVideos(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const ok = await window.api.copyVideos(ids)
  const { showToast } = useStore.getState()
  if (!ok) showToast(t('common.copyFailed'), 'error')
  else
    showToast(ids.length > 1 ? t('common.copiedMany', { count: ids.length }) : t('common.copied'))
}

export function dragVideos(ids: number[]): void {
  if (ids.length > 0) window.api.startDrag(ids)
}

export async function trashVideos(videos: Video[]): Promise<void> {
  if (videos.length === 0) return
  const store = useStore.getState()
  const ok = await store.confirm({
    title: videos.length > 1 ? t('trash.titleMany', { count: videos.length }) : t('trash.title'),
    text: (videos.length === 1 ? `"${videos[0].name}"\n\n` : '') + t('trash.text'),
    confirmLabel: t('trash.confirm'),
    danger: true
  })
  if (!ok) return
  try {
    const count = await window.api.trashVideos(videos.map((video) => video.id))
    if (videos.some((video) => video.id === store.playerId)) store.openPlayer(null)
    store.showToast(count > 1 ? t('trash.doneMany', { count }) : t('trash.done'), 'info')
  } catch (e) {
    store.showToast(errorMessage(e, t('trash.failed')), 'error')
  }
}

export async function confirmDeleteTag(tag: Tag): Promise<boolean> {
  const ok = await useStore.getState().confirm({
    title: t('tag.deleteTitle', { name: tag.name }),
    text: t('tag.deleteText', { count: tag.count }),
    confirmLabel: t('tag.delete'),
    danger: true
  })
  if (ok) await window.api.deleteTag(tag.id)
  return ok
}

export async function toggleFavorite(videos: Video[]): Promise<void> {
  if (videos.length === 0) return
  const favorite = !videos.every((video) => video.favorite)
  await window.api.setFavorite(
    videos.map((video) => video.id),
    favorite
  )
  useStore.getState().showToast(favorite ? t('favorite.added') : t('favorite.removed'), 'info')
}

export function videoMenu(video: Video, selection: Video[]): MenuItem[] {
  const store = useStore.getState()
  const targets = selection.some((v) => v.id === video.id) ? selection : [video]
  const many = targets.length > 1
  const allFavorite = targets.every((v) => v.favorite)
  const items: MenuItem[] = [
    {
      label: t('menu.play'),
      icon: Play,
      hint: 'Enter',
      onSelect: () => store.openPlayer(video.id)
    },
    {
      label: many ? t('menu.copyMany', { count: targets.length }) : t('common.copy'),
      icon: Copy,
      hint: 'Ctrl C',
      onSelect: () => void copyVideos(targets.map((v) => v.id))
    },
    {
      label: allFavorite ? t('menu.removeFavorite') : t('menu.addFavorite'),
      icon: allFavorite ? StarOff : Star,
      hint: 'F',
      onSelect: () => void toggleFavorite(targets)
    },
    {
      label: t('menu.newChip'),
      icon: Tags,
      onSelect: () =>
        store.openChipEditor(
          null,
          targets.map((v) => v.id)
        )
    }
  ]
  if (!many) {
    items.push(
      {
        label: t('menu.trim'),
        icon: Scissors,
        separatorBefore: true,
        onSelect: () => store.openClip(video.id, 'trim')
      },
      { label: t('menu.fit'), icon: Shrink, onSelect: () => store.openClip(video.id, 'fit') },
      { label: t('menu.gif'), icon: Film, onSelect: () => store.openClip(video.id, 'gif') },
      {
        label: t('menu.showInFolder'),
        icon: FolderOpen,
        separatorBefore: true,
        onSelect: () => window.api.showInFolder(video.id)
      },
      {
        label: t('menu.rename'),
        icon: PenLine,
        hint: 'F2',
        onSelect: () => store.openRename(video.id)
      }
    )
  }
  items.push({
    label: many ? t('menu.trashMany', { count: targets.length }) : t('menu.trash'),
    icon: Trash2,
    hint: 'Del',
    danger: true,
    separatorBefore: many,
    onSelect: () => void trashVideos(targets)
  })
  return items
}

/** IPC hatalarındaki "Error invoking remote method ..." ön ekini temizler. */
export function errorMessage(error: unknown, fallback = t('common.somethingWrong')): string {
  if (!(error instanceof Error)) return fallback
  return error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') || fallback
}
