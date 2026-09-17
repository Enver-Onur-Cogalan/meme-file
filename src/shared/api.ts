export const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.webm', '.mov', '.mkv'] as const

/** Discord'un ücretsiz hesaplar için dosya limiti. */
export const DISCORD_LIMIT_BYTES = 10 * 1024 * 1024

export interface LibraryFolder {
  id: number
  path: string
  videoCount: number
}

export type VideoStatus = 'inbox' | 'library'
export type MediaStatus = 'pending' | 'ready' | 'error'

export interface Video {
  id: number
  folderId: number
  path: string
  name: string
  size: number
  modifiedAt: number
  addedAt: number
  durationMs: number | null
  width: number | null
  height: number | null
  hasAudio: boolean | null
  mediaStatus: MediaStatus
  status: VideoStatus
  favorite: boolean
  sendCount: number
  lastSentAt: number | null
  hasDuplicate: boolean
  tagIds: number[]
}

export interface Tag {
  id: number
  name: string
  color: string
  /** "lucide:Flame" veya "custom:<dosya adı>" */
  icon: string
  count: number
}

export type TagInput = Pick<Tag, 'name' | 'color' | 'icon'>

export type LibraryView = 'library' | 'inbox' | 'favorites' | 'most-sent' | 'duplicates'
export type SortOrder = 'newest' | 'oldest' | 'name' | 'size' | 'duration' | 'most-sent'
export type TagMode = 'and' | 'or'

export interface VideoQuery {
  view: LibraryView
  folderId?: number | null
  text?: string
  tagIds?: number[]
  tagMode?: TagMode
  sort?: SortOrder
  limit?: number
}

export interface LibraryStats {
  total: number
  inbox: number
  favorites: number
  duplicates: number
  pendingMedia: number
}

export interface Settings {
  closeToTray: boolean
  launchAtLogin: boolean
  quickSearchShortcut: string
  tagMode: TagMode
}

export interface ClipRequest {
  videoId: number
  startMs: number
  endMs: number
  /** null: boyut sınırı yok, sadece kırp */
  targetBytes: number | null
  mute: boolean
  format: 'mp4' | 'gif'
  outputName: string
}

export interface ClipProgress {
  jobId: number
  ratio: number
}

export interface ClipResult {
  path: string
  size: number
  /** GIF'ler kütüphaneye eklenmez */
  videoId: number | null
}

export interface BackupResult {
  tags: number
  videos: number
}

/** Renderer'a preload üzerinden açılan API. Main process tarafı: src/main/ipc.ts */
export interface MemeApi {
  platform: NodeJS.Platform
  isQuickWindow: boolean

  listFolders(): Promise<LibraryFolder[]>
  addFolder(): Promise<LibraryFolder | null>
  removeFolder(folderId: number): Promise<void>
  rescan(): Promise<void>

  queryVideos(query: VideoQuery): Promise<Video[]>
  getStats(): Promise<LibraryStats>
  setFavorite(videoIds: number[], favorite: boolean): Promise<void>
  setVideoTags(videoId: number, tagIds: number[]): Promise<void>
  addTagToVideos(videoIds: number[], tagId: number, add: boolean): Promise<void>
  markReviewed(videoIds: number[]): Promise<void>
  showInFolder(videoId: number): void

  listTags(): Promise<Tag[]>
  createTag(input: TagInput): Promise<Tag>
  updateTag(tagId: number, input: TagInput): Promise<Tag>
  deleteTag(tagId: number): Promise<void>
  importIcon(): Promise<string | null>

  mediaUrl(filePath: string): string
  thumbUrl(video: Pick<Video, 'id' | 'modifiedAt'>): string
  spriteUrl(video: Pick<Video, 'id' | 'modifiedAt'>): string
  iconUrl(fileName: string): string

  startDrag(videoIds: number[]): void
  copyVideos(videoIds: number[]): Promise<boolean>
  copyPath(filePath: string): Promise<boolean>

  createClip(request: ClipRequest): Promise<ClipResult>
  cancelClip(): void

  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  exportBackup(): Promise<BackupResult | null>
  importBackup(): Promise<BackupResult | null>

  hideQuickWindow(): void
  openInMainWindow(videoId: number): void

  onLibraryChanged(listener: () => void): () => void
  onClipProgress(listener: (progress: ClipProgress) => void): () => void
  onOpenVideo(listener: (videoId: number) => void): () => void
  onQuickWindowShown(listener: () => void): () => void
}
