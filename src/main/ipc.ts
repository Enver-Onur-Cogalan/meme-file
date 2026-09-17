import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rename, stat } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import type { ClipRequest, Settings, TagInput, VideoQuery } from '../shared/api'
import { exportBackup, importBackup } from './lib/backup'
import { sanitizeFileName, type ClipManager } from './lib/clips'
import type { LibraryWatcher } from './lib/library'
import type { MediaJobs } from './lib/media-jobs'
import * as repo from './lib/repo'
import { copyFilesToClipboard, startFileDrag } from './lib/share'
import type { AppWindows } from './windows'

export interface IpcContext {
  db: DatabaseSync
  windows: AppWindows
  library: LibraryWatcher
  media: MediaJobs
  clips: ClipManager
  cacheRoot: string
  iconsRoot: string
  notifyChanged(): void
  applySettings(settings: Settings): void
}

const ICON_EXTENSIONS = ['.svg', '.png', '.webp', '.jpg', '.jpeg']
const TAG_COLOR = /^#[0-9a-f]{6}$/i
const TAG_ICON = /^(lucide:[A-Za-z0-9]+|custom:[\w-]+\.(svg|png|webp|jpe?g))$/

function ids(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is number => Number.isInteger(id) && id > 0)
}

function validTag(input: TagInput): TagInput {
  const name = String(input?.name ?? '').trim()
  if (!name || name.length > 40) throw new Error('Chip adı 1-40 karakter olmalı')
  if (!TAG_COLOR.test(input.color)) throw new Error('Geçersiz renk')
  if (!TAG_ICON.test(input.icon)) throw new Error('Geçersiz ikon')
  return { name, color: input.color, icon: input.icon }
}

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

export function registerIpc(ctx: IpcContext): void {
  const { db } = ctx
  const changed = (): void => ctx.notifyChanged()

  /* klasörler */
  ipcMain.handle('folders:list', () => repo.listFolders(db))

  ipcMain.handle('folders:add', async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Video klasörü seç',
      properties: ['openDirectory']
    }
    const window = parentWindow(event)
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const existing = repo.listFolders(db).find((folder) => folder.path === result.filePaths[0])
    const folder = existing ?? repo.insertFolder(db, result.filePaths[0])
    await ctx.library.sync(folder.id, !existing)
    ctx.library.refreshWatchers()
    ctx.media.kick()
    changed()
    return repo.getFolder(db, folder.id) ?? folder
  })

  ipcMain.handle('folders:remove', async (_event, folderId: number) => {
    const removed = repo.deleteFolder(db, folderId)
    ctx.library.refreshWatchers()
    await ctx.media.removeCache(removed)
    changed()
  })

  ipcMain.handle('library:rescan', async () => {
    await ctx.library.syncAll()
    ctx.media.kick()
    changed()
  })

  /* videolar */
  ipcMain.handle('videos:query', (_event, query: VideoQuery) => repo.queryVideos(db, query))
  ipcMain.handle('videos:stats', () => repo.getStats(db))

  ipcMain.handle('videos:favorite', (_event, videoIds: unknown, favorite: boolean) => {
    repo.setFavorite(db, ids(videoIds), !!favorite)
    changed()
  })

  ipcMain.handle('videos:set-tags', (_event, videoId: number, tagIds: unknown) => {
    repo.setVideoTags(db, videoId, ids(tagIds))
    changed()
  })

  ipcMain.handle('videos:toggle-tag', (_event, videoIds: unknown, tagId: number, add: boolean) => {
    repo.addTagToVideos(db, ids(videoIds), tagId, !!add)
    changed()
  })

  ipcMain.handle('videos:reviewed', (_event, videoIds: unknown) => {
    repo.markReviewed(db, ids(videoIds))
    changed()
  })

  ipcMain.handle('videos:rename', async (_event, videoId: number, name: string) => {
    const video = repo.getVideo(db, videoId)
    if (!video) throw new Error('Video bulunamadı')
    const ext = extname(video.path)
    const base = sanitizeFileName(String(name ?? '').replace(new RegExp(`\\${ext}$`, 'i'), ''))
    const target = join(dirname(video.path), `${base}${ext}`)
    if (target === video.path) return video
    // Windows'ta büyük/küçük harf değişikliği aynı dosyadır; başka bir dosyanın üzerine yazma.
    const sameFile = target.toLowerCase() === video.path.toLowerCase()
    if (!sameFile && existsSync(target)) throw new Error('Bu klasörde aynı adda bir dosya var')
    await rename(video.path, target)
    repo.renameVideo(db, videoId, target, basename(target))
    changed()
    return repo.getVideo(db, videoId)
  })

  ipcMain.handle('videos:trash', async (_event, videoIds: unknown) => {
    const videos = repo.getVideos(db, ids(videoIds))
    const trashed: number[] = []
    for (const video of videos) {
      try {
        await shell.trashItem(video.path)
        trashed.push(video.id)
      } catch {
        // Dosya zaten silinmiş olabilir; kaydı yine de kaldır.
        if (!existsSync(video.path)) trashed.push(video.id)
      }
    }
    repo.deleteVideos(db, trashed)
    await ctx.media.removeCache(trashed)
    changed()
    return trashed.length
  })

  ipcMain.on('videos:show-in-folder', (_event, videoId: number) => {
    const video = repo.getVideo(db, videoId)
    if (video) shell.showItemInFolder(video.path)
  })

  /* chip'ler */
  ipcMain.handle('tags:list', () => repo.listTags(db))
  ipcMain.handle('tags:create', (_event, input: TagInput) => {
    const tag = repo.createTag(db, validTag(input))
    changed()
    return tag
  })
  ipcMain.handle('tags:update', (_event, tagId: number, input: TagInput) => {
    const tag = repo.updateTag(db, tagId, validTag(input))
    changed()
    return tag
  })
  ipcMain.handle('tags:delete', (_event, tagId: number) => {
    repo.deleteTag(db, tagId)
    changed()
  })

  ipcMain.handle('tags:import-icon', async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: 'İkon seç',
      properties: ['openFile'],
      filters: [{ name: 'Görsel', extensions: ICON_EXTENSIONS.map((ext) => ext.slice(1)) }]
    }
    const window = parentWindow(event)
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    const source = result.filePaths[0]
    if (result.canceled || !source) return null
    const ext = extname(source).toLowerCase()
    if (!ICON_EXTENSIONS.includes(ext)) throw new Error('Desteklenmeyen dosya türü')
    if ((await stat(source)).size > 1024 * 1024) throw new Error("İkon 1 MB'tan küçük olmalı")
    await mkdir(ctx.iconsRoot, { recursive: true })
    const fileName = `${randomUUID()}${ext}`
    await copyFile(source, join(ctx.iconsRoot, fileName))
    return fileName
  })

  /* paylaşma */
  ipcMain.on('share:drag', (event, videoIds: unknown) => {
    const videos = repo.getVideos(db, ids(videoIds))
    if (videos.length === 0) return
    startFileDrag(
      event.sender,
      videos.map((video) => video.path),
      join(ctx.cacheRoot, String(videos[0].id), 'thumb.jpg')
    )
    repo.markSent(
      db,
      videos.map((video) => video.id)
    )
    changed()
  })

  ipcMain.handle('share:copy', async (_event, videoIds: unknown) => {
    const videos = repo.getVideos(db, ids(videoIds))
    const ok = await copyFilesToClipboard(videos.map((video) => video.path))
    if (ok) {
      repo.markSent(
        db,
        videos.map((video) => video.id)
      )
      changed()
    }
    return ok
  })

  ipcMain.handle('share:copy-path', (_event, filePath: string) =>
    ctx.clips.extraSharePaths.has(filePath) ? copyFilesToClipboard([filePath]) : false
  )

  /* klipler */
  ipcMain.handle('clips:create', (_event, request: ClipRequest) => ctx.clips.create(request))
  ipcMain.on('clips:cancel', () => ctx.clips.cancel())

  /* ayarlar ve yedek */
  ipcMain.handle('settings:get', () => repo.getSettings(db))
  ipcMain.handle('settings:update', (_event, patch: Partial<Settings>) => {
    const settings = repo.updateSettings(db, patch)
    ctx.applySettings(settings)
    return settings
  })

  ipcMain.handle('backup:export', async (event) => {
    const options: Electron.SaveDialogOptions = {
      title: 'Yedeği kaydet',
      defaultPath: join(
        app.getPath('documents'),
        `meme-file-yedek-${new Date().toISOString().slice(0, 10)}.json`
      ),
      filters: [{ name: 'Meme File yedeği', extensions: ['json'] }]
    }
    const window = parentWindow(event)
    const result = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    return exportBackup(db, ctx.iconsRoot, result.filePath)
  })

  ipcMain.handle('backup:import', async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Yedeği yükle',
      properties: ['openFile'],
      filters: [{ name: 'Meme File yedeği', extensions: ['json'] }]
    }
    const window = parentWindow(event)
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    const summary = await importBackup(db, ctx.iconsRoot, result.filePaths[0])
    changed()
    return summary
  })

  /* pencereler */
  ipcMain.on('quick:hide', () => ctx.windows.hideQuick())
  ipcMain.on('quick:open-in-main', (_event, videoId: number) => {
    ctx.windows.hideQuick()
    const main = ctx.windows.showMain()
    const send = (): void => main.webContents.send('video:open', videoId)
    if (main.webContents.isLoading()) main.webContents.once('did-finish-load', send)
    else send()
  })
}
