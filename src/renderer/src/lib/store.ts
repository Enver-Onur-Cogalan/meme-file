import { create } from 'zustand'
import type {
  LibraryFolder,
  LibraryStats,
  LibraryView,
  Settings,
  SortOrder,
  Tag,
  Video
} from '../../../shared/api'

export type ClipMode = 'trim' | 'fit' | 'gif'

export interface ConfirmRequest {
  title: string
  text: string
  confirmLabel: string
  danger?: boolean
  resolve(ok: boolean): void
}

export interface ToastMessage {
  id: number
  text: string
  tone: 'ok' | 'error' | 'info'
}

interface State {
  folders: LibraryFolder[]
  tags: Tag[]
  stats: LibraryStats
  settings: Settings | null
  videos: Video[]
  loaded: boolean

  view: LibraryView
  folderId: number | null
  text: string
  tagIds: number[]
  sort: SortOrder

  selection: number[]
  anchorId: number | null

  playerId: number | null
  chipEditor: { tag: Tag | null; assignTo?: number[] } | null
  clip: { videoId: number; mode: ClipMode } | null
  settingsOpen: boolean
  renameId: number | null
  confirmRequest: ConfirmRequest | null
  toast: ToastMessage | null
  /** Uyumlu kopyası hazırlanan videoların ilerlemesi (0-1) */
  convertProgress: Record<number, number>
}

interface Actions {
  refresh(): Promise<void>
  setView(view: LibraryView, folderId?: number | null): void
  setText(text: string): void
  toggleTagFilter(tagId: number): void
  clearFilters(): void
  setSort(sort: SortOrder): void
  select(ids: number[], anchorId?: number | null): void
  openPlayer(id: number | null): void
  openChipEditor(tag: Tag | null, assignTo?: number[]): void
  closeChipEditor(): void
  openClip(videoId: number, mode: ClipMode): void
  closeClip(): void
  setSettingsOpen(open: boolean): void
  openRename(videoId: number | null): void
  confirm(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean>
  resolveConfirm(ok: boolean): void
  setSettings(settings: Settings): void
  showToast(text: string, tone?: ToastMessage['tone']): void
}

const EMPTY_STATS: LibraryStats = {
  total: 0,
  inbox: 0,
  favorites: 0,
  duplicates: 0,
  pendingMedia: 0
}

let refreshSeq = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useStore = create<State & Actions>()((set, get) => ({
  folders: [],
  tags: [],
  stats: EMPTY_STATS,
  settings: null,
  videos: [],
  loaded: false,

  view: 'library',
  folderId: null,
  text: '',
  tagIds: [],
  sort: 'newest',

  selection: [],
  anchorId: null,

  playerId: null,
  chipEditor: null,
  clip: null,
  settingsOpen: false,
  renameId: null,
  confirmRequest: null,
  toast: null,
  convertProgress: {},

  async refresh() {
    const seq = ++refreshSeq
    const { view, folderId, text, tagIds, sort, settings } = get()
    const [folders, tags, stats, videos, freshSettings] = await Promise.all([
      window.api.listFolders(),
      window.api.listTags(),
      window.api.getStats(),
      window.api.queryVideos({
        view,
        folderId,
        text,
        tagIds,
        sort,
        tagMode: settings?.tagMode ?? 'and'
      }),
      settings ? Promise.resolve(settings) : window.api.getSettings()
    ])
    // Daha yeni bir istek başladıysa eski sonucu yazma.
    if (seq !== refreshSeq) return
    const validTagIds = get().tagIds.filter((id) => tags.some((tag) => tag.id === id))
    set({
      folders,
      tags,
      stats,
      videos,
      settings: freshSettings,
      loaded: true,
      tagIds: validTagIds,
      selection: get().selection.filter((id) => videos.some((video) => video.id === id))
    })
  },

  setView(view, folderId = null) {
    set({ view, folderId, selection: [], anchorId: null })
  },
  setText(text) {
    set({ text })
  },
  toggleTagFilter(tagId) {
    const { tagIds } = get()
    set({
      tagIds: tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : [...tagIds, tagId]
    })
  },
  clearFilters() {
    set({ text: '', tagIds: [] })
  },
  setSort(sort) {
    set({ sort })
  },
  select(ids, anchorId = null) {
    set({ selection: ids, anchorId })
  },
  openPlayer(id) {
    set({ playerId: id })
  },
  openChipEditor(tag, assignTo) {
    set({ chipEditor: { tag, assignTo } })
  },
  closeChipEditor() {
    set({ chipEditor: null })
  },
  openClip(videoId, mode) {
    set({ clip: { videoId, mode } })
  },
  closeClip() {
    set({ clip: null })
  },
  setSettingsOpen(open) {
    set({ settingsOpen: open })
  },
  openRename(videoId) {
    set({ renameId: videoId })
  },
  confirm(request) {
    get().confirmRequest?.resolve(false)
    return new Promise((resolve) => set({ confirmRequest: { ...request, resolve } }))
  },
  resolveConfirm(ok) {
    get().confirmRequest?.resolve(ok)
    set({ confirmRequest: null })
  },
  setSettings(settings) {
    set({ settings })
  },
  showToast(text, tone = 'ok') {
    clearTimeout(toastTimer)
    set({ toast: { id: Date.now(), text, tone } })
    toastTimer = setTimeout(() => set({ toast: null }), 1800)
  }
}))

export function videoById(id: number | null): Video | undefined {
  return id === null ? undefined : useStore.getState().videos.find((video) => video.id === id)
}
