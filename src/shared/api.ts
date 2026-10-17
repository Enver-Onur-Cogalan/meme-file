import type { LanguageSetting } from './i18n'

export const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.webm', '.mov', '.mkv'] as const

/** Discord'un ücretsiz hesaplar için dosya limiti. */
export const DISCORD_LIMIT_BYTES = 10 * 1024 * 1024

/** Sığdırırken limitin biraz altı hedeflenir; MB/MiB farkı ve Discord'un yuvarlaması sorun olmasın. */
export const DISCORD_TARGET_BYTES = Math.floor(9.5 * 1024 * 1024)

export interface LibraryFolder {
  id: number
  path: string
  videoCount: number
}

export type VideoStatus = 'inbox' | 'library'
export type MediaStatus = 'pending' | 'ready' | 'error'
/** native: olduğu gibi oynar · pending/converting: uyumlu kopya hazırlanıyor · ready: kopya hazır */
export type PlaybackStatus = 'native' | 'pending' | 'converting' | 'ready' | 'error'

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
  playback: PlaybackStatus
  videoCodec: string | null
  /** Oynatma ve gönderme için kullanılacak dosya: uyumlu kopya hazırsa o, değilse orijinal. */
  playbackPath: string
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

/** İstatistik ekranının tek seferde çektiği özet. */
export interface InsightsReport {
  totals: {
    videos: number
    bytes: number
    durationMs: number
    sends: number
    tagged: number
    neverSent: number
    withSound: number
  }
  /** Son 12 ay; `month` "YYYY-MM" biçiminde, en eskiden yeniye. */
  months: { month: string; added: number }[]
  topSent: Video[]
  topTags: { id: number; count: number }[]
  untagged: number
  records: { largest: Video | null; longest: Video | null; lastSent: Video | null }
}

export interface ImportResult {
  imported: number
  /** Video olmayan ya da okunamayan dosyalar */
  skipped: number
  /** Zaten kütüphanedeki bir klasörün içinde olanlar */
  alreadyInLibrary: number
  folderId: number | null
}

export interface Settings {
  language: LanguageSetting
  /** Sürüklenen videoların kopyalanacağı klasör */
  importFolderId: number | null
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
  /** Videonun üzerine basılacak PNG (meme yazısı); kaynak çözünürlüğünde. */
  overlay?: Uint8Array | null
}

export interface ConvertProgress {
  videoId: number
  ratio: number
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

export type UpdateState = 'idle' | 'checking' | 'downloading' | 'ready' | 'latest' | 'error' | 'dev'

export interface UpdateStatus {
  state: UpdateState
  version?: string
  percent?: number
  message?: string
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
  /** Sürüklenen / yapıştırılan videoları kütüphaneye kopyalar. */
  importFiles(paths: string[], folderId?: number | null): Promise<ImportResult>
  readClipboardFiles(): Promise<string[]>
  /** Sürüklenen bir File nesnesinin diskteki yolu. */
  pathForFile(file: File): string

  queryVideos(query: VideoQuery): Promise<Video[]>
  getStats(): Promise<LibraryStats>
  /** İstatistik ekranı için tüm kütüphanenin özeti. */
  getInsights(): Promise<InsightsReport>
  setFavorite(videoIds: number[], favorite: boolean): Promise<void>
  setVideoTags(videoId: number, tagIds: number[]): Promise<void>
  addTagToVideos(videoIds: number[], tagId: number, add: boolean): Promise<void>
  markReviewed(videoIds: number[]): Promise<void>
  showInFolder(videoId: number): void
  /** Uzantı korunur; aynı klasörde aynı adda dosya varsa hata verir. */
  renameVideo(videoId: number, name: string): Promise<Video>
  /** Dosyaları Geri Dönüşüm Kutusu'na taşır; taşınan video sayısını döndürür. */
  trashVideos(videoIds: number[]): Promise<number>

  listTags(): Promise<Tag[]>
  /** Dosya adına ve benzer videolara bakarak chip önerir. */
  suggestTags(videoId: number): Promise<number[]>
  createTag(input: TagInput): Promise<Tag>
  updateTag(tagId: number, input: TagInput): Promise<Tag>
  deleteTag(tagId: number): Promise<void>
  reorderTags(tagIds: number[]): Promise<void>
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

  getAppVersion(): Promise<string>
  getUpdateStatus(): Promise<UpdateStatus>
  checkForUpdates(): Promise<void>
  installUpdate(): void

  hideQuickWindow(): void
  openInMainWindow(videoId: number): void

  onLibraryChanged(listener: () => void): () => void
  onClipProgress(listener: (progress: ClipProgress) => void): () => void
  onConvertProgress(listener: (progress: ConvertProgress) => void): () => void
  onOpenVideo(listener: (videoId: number) => void): () => void
  onQuickWindowShown(listener: () => void): () => void
  onUpdateStatus(listener: (status: UpdateStatus) => void): () => void
  onSettingsChanged(listener: (settings: Settings) => void): () => void
}
