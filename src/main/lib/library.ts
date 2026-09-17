import type { DatabaseSync } from 'node:sqlite'
import { watch, type FSWatcher } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { VIDEO_EXTENSIONS } from '../../shared/api'
import { listFolders, syncFolder, type ScannedFile } from './repo'

export function isVideoPath(filePath: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extname(filePath).toLowerCase())
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * Renderer'dan gelen bir yolun kütüphanedeki bir klasörün içinde olan bir video olduğunu doğrular.
 * media:// protokolü bundan geçmeyen hiçbir videoya dokunmaz.
 */
export function isLibraryVideo(db: DatabaseSync, filePath: string): boolean {
  if (!isAbsolute(filePath) || !isVideoPath(filePath)) return false
  return listFolders(db).some((folder) => isInside(folder.path, filePath))
}

/** Uygulamanın ürettiği uyumlu kopya mı? (önbellek/<id>/converted/<ad>.mp4) */
export function isConvertedCopy(cacheRoot: string, filePath: string): boolean {
  if (!isAbsolute(filePath) || extname(filePath).toLowerCase() !== '.mp4') return false
  const parts = relative(resolve(cacheRoot), resolve(filePath)).split(/[\\/]/)
  return parts.length === 3 && /^\d+$/.test(parts[0]) && parts[1] === 'converted'
}

export async function scanFolder(folderPath: string): Promise<ScannedFile[]> {
  const entries = await readdir(folderPath, { recursive: true, withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter(
        (entry) => entry.isFile() && isVideoPath(entry.name) && !entry.name.includes('.part.')
      )
      .map(async (entry) => {
        const path = join(entry.parentPath, entry.name)
        try {
          const info = await stat(path)
          return { path, name: basename(path), size: info.size, modifiedAt: info.mtimeMs }
        } catch {
          return null // tarama sırasında silinmiş olabilir
        }
      })
  )
  return files.filter((file): file is ScannedFile => file !== null)
}

/** Klasörleri tarar, veritabanını eşitler ve değişiklik olursa onChange çağırır. */
export class LibraryWatcher {
  private watchers = new Map<number, FSWatcher>()
  private timers = new Map<number, ReturnType<typeof setTimeout>>()

  constructor(
    private db: DatabaseSync,
    private onChange: () => void
  ) {}

  async syncAll(): Promise<void> {
    for (const folder of listFolders(this.db)) await this.sync(folder.id, false)
    this.refreshWatchers()
  }

  async sync(folderId: number, initial: boolean): Promise<void> {
    const folder = listFolders(this.db).find((f) => f.id === folderId)
    if (!folder) return
    let files: ScannedFile[]
    try {
      files = await scanFolder(folder.path)
    } catch {
      // Klasör silinmiş ya da USB sürücü çıkarılmış olabilir; videolar "kayıp" sayılır ama chip'leri kalır.
      files = []
    }
    const { changed } = syncFolder(this.db, folderId, files, initial)
    if (changed) this.onChange()
  }

  refreshWatchers(): void {
    const folders = listFolders(this.db)
    for (const [id, watcher] of this.watchers) {
      if (!folders.some((folder) => folder.id === id)) {
        watcher.close()
        this.watchers.delete(id)
      }
    }
    for (const folder of folders) {
      if (this.watchers.has(folder.id)) continue
      try {
        const watcher = watch(folder.path, { recursive: true }, () => this.schedule(folder.id))
        watcher.on('error', () => {
          watcher.close()
          this.watchers.delete(folder.id)
        })
        this.watchers.set(folder.id, watcher)
      } catch {
        // Klasör erişilemiyor; bir sonraki yeniden taramada tekrar denenir.
      }
    }
  }

  /** Kopyalanan büyük dosyalar parça parça yazılır; olaylar durulana kadar beklenir. */
  private schedule(folderId: number): void {
    clearTimeout(this.timers.get(folderId))
    this.timers.set(
      folderId,
      setTimeout(() => {
        this.timers.delete(folderId)
        void this.sync(folderId, false)
      }, 1500)
    )
  }

  close(): void {
    for (const watcher of this.watchers.values()) watcher.close()
    for (const timer of this.timers.values()) clearTimeout(timer)
  }
}
