import type { DatabaseSync } from 'node:sqlite'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join, relative, resolve, isAbsolute } from 'node:path'
import { VIDEO_EXTENSIONS, type LibraryFolder, type VideoFile } from '../../shared/api'

export function isVideoPath(filePath: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extname(filePath).toLowerCase())
}

export function listFolders(db: DatabaseSync): LibraryFolder[] {
  return db
    .prepare('SELECT id, path FROM folders ORDER BY added_at')
    .all() as unknown as LibraryFolder[]
}

export function addFolder(db: DatabaseSync, folderPath: string): LibraryFolder {
  db.prepare('INSERT OR IGNORE INTO folders (path, added_at) VALUES (?, ?)').run(
    folderPath,
    Date.now()
  )
  return db
    .prepare('SELECT id, path FROM folders WHERE path = ?')
    .get(folderPath) as unknown as LibraryFolder
}

export function getFolder(db: DatabaseSync, id: number): LibraryFolder | undefined {
  return db.prepare('SELECT id, path FROM folders WHERE id = ?').get(id) as unknown as
    LibraryFolder | undefined
}

/**
 * Renderer'dan gelen bir yolun kütüphanedeki bir klasörün içinde olan bir video olduğunu doğrular.
 * media:// protokolü, sürükleme ve kopyalama bundan geçmeyen hiçbir dosyaya dokunmaz.
 */
export function isLibraryVideo(db: DatabaseSync, filePath: string): boolean {
  if (!isAbsolute(filePath) || !isVideoPath(filePath)) return false
  const target = resolve(filePath)
  return listFolders(db).some((folder) => {
    const rel = relative(resolve(folder.path), target)
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
  })
}

export async function scanFolder(folderPath: string): Promise<VideoFile[]> {
  const entries = await readdir(folderPath, { recursive: true, withFileTypes: true })
  const videos = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isVideoPath(entry.name))
      .map(async (entry) => {
        const path = join(entry.parentPath, entry.name)
        const info = await stat(path)
        return { path, name: basename(path), size: info.size, modifiedAt: info.mtimeMs }
      })
  )
  return videos.sort((a, b) => b.modifiedAt - a.modifiedAt)
}
