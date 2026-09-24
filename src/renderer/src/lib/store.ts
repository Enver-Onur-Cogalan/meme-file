import { create } from 'zustand'
import { resolveLanguage, type Language } from '../../../shared/i18n'
import { adjacentId, randomId } from './playback'
import type {
  LibraryFolder,
  LibraryStats,
  LibraryView,
  Settings,
  SortOrder,
  Tag,
  UpdateStatus,
  Video
} from '../../../shared/api'

export type ClipMode = 'trim' | 'fit' | 'gif'

/**
 * Video bittiğinde ne olacağı.
 *   sequence → listedeki sıradakine geçer, sonda başa döner
 *   loop     → aynı videoda kalır
 *   shuffle  → listeden rastgele birine geçer
 */
export type PlayMode = 'sequence' | 'loop' | 'shuffle'

const PLAY_MODE_KEY = 'playMode'

function storedPlayMode(): PlayMode {
  const value = localStorage.getItem(PLAY_MODE_KEY)
  return value === 'loop' || value === 'shuffle' ? value : 'sequence'
}

/** Rastgele seçimde tekrarı önlemek için akılda tutulan video sayısı. */
const RANDOM_MEMORY = 10

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
  playMode: PlayMode
  /** Son açılan rastgele videolar; aynı şey arka arkaya gelmesin diye. */
  recentRandom: number[]
  chipEditor: { tag: Tag | null; assignTo?: number[] } | null
  clip: { videoId: number; mode: ClipMode } | null
  settingsOpen: boolean
  renameId: number | null
  confirmRequest: ConfirmRequest | null
  toast: ToastMessage | null
  /** Uyumlu kopyası hazırlanan videoların ilerlemesi (0-1) */
  convertProgress: Record<number, number>
  update: UpdateStatus
  appVersion: string
  language: Language
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
  setPlayMode(mode: PlayMode): void
  /** Oynatıcıdaki videodan listede bir ileri/geri gider; uçlarda başa sarar. */
  playAdjacent(step: 1 | -1): void
  /** O anki listeden rastgele bir video açar. Liste boşsa hiçbir şey yapmaz. */
  playRandom(): void
  openChipEditor(tag: Tag | null, assignTo?: number[]): void
  closeChipEditor(): void
  openClip(videoId: number, mode: ClipMode): void
  closeClip(): void
  setSettingsOpen(open: boolean): void
  openRename(videoId: number | null): void
  confirm(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean>
  resolveConfirm(ok: boolean): void
  setSettings(settings: Settings): void
  /** Önce arayüzde anında değiştirir, sonra kaydeder. */
  updateSettings(patch: Partial<Settings>): Promise<void>
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
  playMode: storedPlayMode(),
  recentRandom: [],
  chipEditor: null,
  clip: null,
  settingsOpen: false,
  renameId: null,
  confirmRequest: null,
  toast: null,
  convertProgress: {},
  update: { state: 'idle' },
  appVersion: '',
  language: resolveLanguage('system', navigator.language),

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
      settings ? Promise.resolve(null) : window.api.getSettings()
    ])
    // Daha yeni bir istek başladıysa eski sonucu yazma.
    if (seq !== refreshSeq) return
    // Diziler sadece gerçekten değiştiyse yeniden yazılır. Yeni bir dizi (aynı içerikle bile)
    // filtre değişti sanılıp tekrar yenilemeyi tetikliyor ve sonsuz bir döngüye giriyordu.
    const current = get()
    const validTagIds = current.tagIds.filter((id) => tags.some((tag) => tag.id === id))
    const validSelection = current.selection.filter((id) => videos.some((video) => video.id === id))
    set({
      folders,
      tags,
      stats,
      videos,
      // Ayarlar sadece ilk yüklemede okunur; sonrasında arayüz tek doğru kaynaktır.
      // (Aksi hâlde uçuştaki eski bir yenileme az önce değiştirilen ayarı geri alabiliyordu.)
      ...(freshSettings && !get().settings
        ? {
            settings: freshSettings,
            language: resolveLanguage(freshSettings.language, navigator.language)
          }
        : {}),
      loaded: true,
      ...(validTagIds.length !== current.tagIds.length ? { tagIds: validTagIds } : {}),
      ...(validSelection.length !== current.selection.length ? { selection: validSelection } : {})
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
  setPlayMode(mode) {
    localStorage.setItem(PLAY_MODE_KEY, mode)
    set({ playMode: mode })
  },
  playAdjacent(step) {
    const { videos, playerId } = get()
    const next = adjacentId(videos, playerId, step)
    if (next !== null) set({ playerId: next })
  },
  playRandom() {
    const { videos, recentRandom, playerId } = get()
    const pick = randomId(videos, recentRandom, playerId)
    if (pick === null) return
    set({
      playerId: pick,
      recentRandom: [...recentRandom, pick].slice(-RANDOM_MEMORY)
    })
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
    set({ settings, language: resolveLanguage(settings.language, navigator.language) })
  },
  async updateSettings(patch) {
    const current = get().settings
    if (current) get().setSettings({ ...current, ...patch })
    try {
      get().setSettings(await window.api.updateSettings(patch))
    } catch {
      if (current) get().setSettings(current)
    }
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
