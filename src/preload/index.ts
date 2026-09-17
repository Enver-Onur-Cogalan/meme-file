import { contextBridge, ipcRenderer } from 'electron'
import type { MemeApi } from '../shared/api'

const api: MemeApi = {
  platform: process.platform,
  listFolders: () => ipcRenderer.invoke('folders:list'),
  addFolder: () => ipcRenderer.invoke('folders:add'),
  scanFolder: (folderId) => ipcRenderer.invoke('folders:scan', folderId),
  mediaUrl: (filePath) => `media://local/${encodeURIComponent(filePath)}`,
  startDrag: (filePath) => ipcRenderer.send('share:drag', filePath),
  copyFile: (filePath) => ipcRenderer.invoke('share:copy', filePath)
}

contextBridge.exposeInMainWorld('api', api)
