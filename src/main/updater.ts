import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../shared/api'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

/**
 * GitHub Releases üzerinden otomatik güncelleme: açılışta ve 4 saatte bir denetler,
 * yeni sürümü arka planda indirir, kullanıcı "Yeniden başlat" deyince kurar.
 */
export function setupUpdater(
  broadcast: (status: UpdateStatus) => void,
  beforeInstall: () => void
): void {
  let status: UpdateStatus = { state: app.isPackaged ? 'idle' : 'dev' }
  const set = (next: UpdateStatus): void => {
    status = next
    broadcast(status)
  }

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('update:status', () => status)

  if (!app.isPackaged) {
    // Geliştirme sırasında güncelleme yok.
    ipcMain.handle('update:check', () => set({ state: 'dev' }))
    ipcMain.on('update:install', () => undefined)
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    if (status.state !== 'downloading' && status.state !== 'ready') set({ state: 'checking' })
  })
  autoUpdater.on('update-not-available', () => set({ state: 'latest' }))
  autoUpdater.on('update-available', (info) =>
    set({ state: 'downloading', version: info.version, percent: 0 })
  )
  autoUpdater.on('download-progress', (progress) =>
    set({ state: 'downloading', version: status.version, percent: progress.percent / 100 })
  )
  autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }))
  autoUpdater.on('error', (error) =>
    set({
      state: status.state === 'ready' ? 'ready' : 'error',
      version: status.version,
      message: error.message
    })
  )

  const check = async (): Promise<void> => {
    if (status.state === 'ready' || status.state === 'downloading') return
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // İnternet yoksa sessizce vazgeç; hata olayı durumu zaten günceller.
    }
  }

  ipcMain.handle('update:check', check)
  ipcMain.on('update:install', () => {
    if (status.state !== 'ready') return
    beforeInstall()
    autoUpdater.quitAndInstall(false, true)
  })

  setTimeout(() => void check(), 10_000)
  setInterval(() => void check(), CHECK_INTERVAL_MS)
}
