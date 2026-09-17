import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { addFolder, getFolder, isLibraryVideo, listFolders, scanFolder } from './lib/library'
import { copyFileToClipboard, startFileDrag } from './lib/share'

export function registerIpc(db: DatabaseSync): void {
  ipcMain.handle('folders:list', () => listFolders(db))

  ipcMain.handle('folders:add', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = { title: 'Video klasörü seç', properties: ['openDirectory' as const] }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return addFolder(db, result.filePaths[0])
  })

  ipcMain.handle('folders:scan', (_event, folderId: number) => {
    const folder = getFolder(db, folderId)
    return folder ? scanFolder(folder.path) : []
  })

  ipcMain.on('share:drag', (event, filePath: string) => {
    if (isLibraryVideo(db, filePath)) startFileDrag(event.sender, filePath)
  })

  ipcMain.handle('share:copy', (_event, filePath: string) =>
    isLibraryVideo(db, filePath) ? copyFileToClipboard(filePath) : false
  )
}
