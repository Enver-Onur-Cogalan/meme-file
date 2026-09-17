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

export async function copyVideos(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const ok = await window.api.copyVideos(ids)
  const { showToast } = useStore.getState()
  if (!ok) showToast('Kopyalanamadı', 'error')
  else showToast(ids.length > 1 ? `${ids.length} video kopyalandı!` : 'Kopyalandı!')
}

export function dragVideos(ids: number[]): void {
  if (ids.length > 0) window.api.startDrag(ids)
}

export async function trashVideos(videos: Video[]): Promise<void> {
  if (videos.length === 0) return
  const store = useStore.getState()
  const ok = await store.confirm({
    title:
      videos.length > 1
        ? `${videos.length} video çöp kutusuna taşınsın mı?`
        : 'Video çöp kutusuna taşınsın mı?',
    text:
      (videos.length === 1 ? `"${videos[0].name}"\n\n` : '') +
      "Dosya Geri Dönüşüm Kutusu'na gider, oradan geri alabilirsin. Chip'leri silinir.",
    confirmLabel: 'Çöp kutusuna taşı',
    danger: true
  })
  if (!ok) return
  try {
    const count = await window.api.trashVideos(videos.map((video) => video.id))
    if (videos.some((video) => video.id === store.playerId)) store.openPlayer(null)
    store.showToast(count > 1 ? `${count} video çöp kutusunda` : 'Çöp kutusuna taşındı', 'info')
  } catch (e) {
    store.showToast(errorMessage(e, 'Silinemedi'), 'error')
  }
}

export async function confirmDeleteTag(tag: Tag): Promise<boolean> {
  const ok = await useStore.getState().confirm({
    title: `"${tag.name}" chip'i silinsin mi?`,
    text: `${tag.count} videodan kaldırılır. Videoların kendisi silinmez.`,
    confirmLabel: 'Chip’i sil',
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
  useStore.getState().showToast(favorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı', 'info')
}

export function videoMenu(video: Video, selection: Video[]): MenuItem[] {
  const store = useStore.getState()
  const targets = selection.some((v) => v.id === video.id) ? selection : [video]
  const many = targets.length > 1
  const allFavorite = targets.every((v) => v.favorite)
  const items: MenuItem[] = [
    { label: 'Oynat', icon: Play, hint: 'Enter', onSelect: () => store.openPlayer(video.id) },
    {
      label: many ? `${targets.length} videoyu kopyala` : 'Kopyala',
      icon: Copy,
      hint: 'Ctrl C',
      onSelect: () => void copyVideos(targets.map((v) => v.id))
    },
    {
      label: allFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle',
      icon: allFavorite ? StarOff : Star,
      hint: 'F',
      onSelect: () => void toggleFavorite(targets)
    },
    {
      label: 'Yeni chip oluştur ve ekle',
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
        label: 'Kırp',
        icon: Scissors,
        separatorBefore: true,
        onSelect: () => store.openClip(video.id, 'trim')
      },
      { label: "Discord'a sığdır", icon: Shrink, onSelect: () => store.openClip(video.id, 'fit') },
      { label: 'GIF yap', icon: Film, onSelect: () => store.openClip(video.id, 'gif') },
      {
        label: 'Klasörde göster',
        icon: FolderOpen,
        separatorBefore: true,
        onSelect: () => window.api.showInFolder(video.id)
      },
      {
        label: 'Yeniden adlandır',
        icon: PenLine,
        hint: 'F2',
        onSelect: () => store.openRename(video.id)
      }
    )
  }
  items.push({
    label: many ? `${targets.length} videoyu çöpe at` : 'Çöp kutusuna taşı',
    icon: Trash2,
    hint: 'Del',
    danger: true,
    separatorBefore: many,
    onSelect: () => void trashVideos(targets)
  })
  return items
}

/** IPC hatalarındaki "Error invoking remote method ..." ön ekini temizler. */
export function errorMessage(error: unknown, fallback = 'Bir şeyler ters gitti'): string {
  if (!(error instanceof Error)) return fallback
  return error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') || fallback
}
