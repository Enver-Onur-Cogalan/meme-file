import { Copy, FolderOpen, Film, Play, Scissors, Shrink, Star, StarOff, Tags } from 'lucide-react'
import type { Video } from '../../../shared/api'
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
      }
    )
  }
  return items
}

/** IPC hatalarındaki "Error invoking remote method ..." ön ekini temizler. */
export function errorMessage(error: unknown, fallback = 'Bir şeyler ters gitti'): string {
  if (!(error instanceof Error)) return fallback
  return error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') || fallback
}
