import { app, globalShortcut } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import type { Settings } from '../shared/api'
import { ClipManager } from './lib/clips'
import { openDatabase } from './lib/db'
import { isLibraryVideo, LibraryWatcher } from './lib/library'
import { MediaJobs } from './lib/media-jobs'
import { handleMediaProtocol, registerMediaScheme } from './lib/media-protocol'
import { getSettings } from './lib/repo'
import { registerIpc } from './ipc'
import { AppWindows } from './windows'

registerMediaScheme()

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  void app.whenReady().then(start)
}

async function start(): Promise<void> {
  electronApp.setAppUserModelId('com.enveronur.memefile')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  const userData = app.getPath('userData')
  const cacheRoot = join(userData, 'cache')
  const iconsRoot = join(userData, 'icons')
  const db = openDatabase(join(userData, 'library.db'))
  let settings = getSettings(db)

  const windows = new AppWindows(() => settings.closeToTray)

  // Çok sayıda dosya aynı anda işlenirken arayüzü boğmamak için bildirimleri seyrekleştir.
  let notifyTimer: ReturnType<typeof setTimeout> | null = null
  const notifyChanged = (): void => {
    if (notifyTimer) return
    notifyTimer = setTimeout(() => {
      notifyTimer = null
      windows.broadcast('library:changed')
    }, 250)
  }

  const media = new MediaJobs(db, cacheRoot, notifyChanged)
  const library = new LibraryWatcher(db, () => {
    media.kick()
    notifyChanged()
  })
  const clips = new ClipManager(
    db,
    (jobId, ratio) => windows.broadcast('clip:progress', { jobId, ratio }),
    () => {
      media.kick()
      notifyChanged()
    }
  )

  const applySettings = (next: Settings): void => {
    settings = next
    windows.registerQuickShortcut(next.quickSearchShortcut)
    // Geliştirme sırasında (imzasız uygulama) oturum açılış öğesi ayarlanamaz.
    if (app.isPackaged && process.platform !== 'linux') {
      app.setLoginItemSettings({ openAtLogin: next.launchAtLogin, args: ['--hidden'] })
    }
  }

  handleMediaProtocol({
    isAllowedVideo: (filePath) => isLibraryVideo(db, filePath),
    cacheRoot,
    iconsRoot
  })
  registerIpc({
    db,
    windows,
    library,
    media,
    clips,
    cacheRoot,
    iconsRoot,
    notifyChanged,
    applySettings
  })

  windows.createTray()
  windows.createMain(!process.argv.includes('--hidden'))
  windows.createQuick()
  applySettings(settings)

  app.on('second-instance', () => windows.showMain())
  app.on('activate', () => windows.showMain())
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    library.close()
  })

  await library.syncAll()
  media.kick()
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
