import type { DatabaseSync } from 'node:sqlite'
import { execFile } from 'node:child_process'
import { copyFile, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import type { ImportResult } from '../../shared/api'
import { sanitizeFileName, uniquePath } from './clips'
import { isInside, isVideoPath, type LibraryWatcher } from './library'
import { getFolder, listFolders } from './repo'

/**
 * Sürüklenen ya da panodan yapıştırılan videoları hedef klasöre kopyalar.
 * Kopyalar klasör taramasıyla kütüphaneye girer, yani Gelen Kutusu'na düşer.
 */
export async function importFiles(
  db: DatabaseSync,
  library: LibraryWatcher,
  paths: string[],
  folderId: number
): Promise<ImportResult> {
  const folder = getFolder(db, folderId)
  if (!folder) return { imported: 0, skipped: 0, alreadyInLibrary: 0, folderId: null }

  const videos = paths.filter(isVideoPath)
  let imported = 0
  let alreadyInLibrary = 0

  for (const source of videos) {
    try {
      const info = await stat(source)
      if (!info.isFile()) continue
      // Zaten kütüphanedeki bir klasörün içindeyse kopyalamaya gerek yok.
      if (listFolders(db).some((item) => isInside(item.path, source))) {
        alreadyInLibrary++
        continue
      }
      const extension = extname(source)
      const name = sanitizeFileName(basename(source, extension))
      // Aynı dosya ikinci kez bırakılırsa kopyasını oluşturma.
      const existing = await stat(join(folder.path, `${name}${extension}`)).catch(() => null)
      if (existing?.size === info.size) {
        alreadyInLibrary++
        continue
      }
      await copyFile(source, uniquePath(folder.path, name, extension))
      imported++
    } catch {
      // Okunamayan dosyayı atla; sonuçta "atlandı" olarak görünür.
    }
  }

  if (imported > 0) await library.sync(folderId, false)
  return {
    imported,
    skipped: paths.length - imported - alreadyInLibrary,
    alreadyInLibrary,
    folderId
  }
}

/** Kullanıcı bir klasör seçmediyse: son kullanılan, yoksa ilk klasör. */
export function defaultImportFolder(db: DatabaseSync, preferred: number | null): number | null {
  const folders = listFolders(db)
  if (folders.length === 0) return null
  return folders.find((folder) => folder.id === preferred)?.id ?? folders[0].id
}

/** Panodaki dosya yollarını okur (Explorer'dan kopyalanan videolar). */
export function readClipboardFiles(): Promise<string[]> {
  if (process.platform === 'win32') {
    return run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }'
    ])
  }
  if (process.platform === 'darwin') {
    // Geliştirme ortamı için: Mac'te panodaki tek dosya okunur.
    return run('osascript', ['-e', 'POSIX path of (the clipboard as «class furl»)'])
  }
  return Promise.resolve([])
}

function run(command: string, args: string[]): Promise<string[]> {
  return new Promise((done) => {
    execFile(command, args, { windowsHide: true, timeout: 10_000 }, (error, stdout) => {
      if (error) return done([])
      done(
        stdout
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => resolve(dirname(line), basename(line)))
      )
    })
  })
}
