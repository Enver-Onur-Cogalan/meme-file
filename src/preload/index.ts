import { contextBridge, ipcRenderer } from 'electron'
import type { ClipProgress, ConvertProgress, MemeApi } from '../shared/api'

function subscribe<T extends unknown[]>(
  channel: string,
  listener: (...args: T) => void
): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void =>
    listener(...(args as T))
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: MemeApi = {
  platform: process.platform,
  isQuickWindow: location.hash === '#quick',

  listFolders: () => ipcRenderer.invoke('folders:list'),
  addFolder: () => ipcRenderer.invoke('folders:add'),
  removeFolder: (folderId) => ipcRenderer.invoke('folders:remove', folderId),
  rescan: () => ipcRenderer.invoke('library:rescan'),

  queryVideos: (query) => ipcRenderer.invoke('videos:query', query),
  getStats: () => ipcRenderer.invoke('videos:stats'),
  setFavorite: (videoIds, favorite) => ipcRenderer.invoke('videos:favorite', videoIds, favorite),
  setVideoTags: (videoId, tagIds) => ipcRenderer.invoke('videos:set-tags', videoId, tagIds),
  addTagToVideos: (videoIds, tagId, add) =>
    ipcRenderer.invoke('videos:toggle-tag', videoIds, tagId, add),
  markReviewed: (videoIds) => ipcRenderer.invoke('videos:reviewed', videoIds),
  showInFolder: (videoId) => ipcRenderer.send('videos:show-in-folder', videoId),
  renameVideo: (videoId, name) => ipcRenderer.invoke('videos:rename', videoId, name),
  trashVideos: (videoIds) => ipcRenderer.invoke('videos:trash', videoIds),

  listTags: () => ipcRenderer.invoke('tags:list'),
  createTag: (input) => ipcRenderer.invoke('tags:create', input),
  updateTag: (tagId, input) => ipcRenderer.invoke('tags:update', tagId, input),
  deleteTag: (tagId) => ipcRenderer.invoke('tags:delete', tagId),
  importIcon: () => ipcRenderer.invoke('tags:import-icon'),

  mediaUrl: (filePath) => `media://local/${encodeURIComponent(filePath)}`,
  thumbUrl: (video) => `media://thumb/${video.id}?v=${video.modifiedAt}`,
  spriteUrl: (video) => `media://sprite/${video.id}?v=${video.modifiedAt}`,
  iconUrl: (fileName) => `media://icon/${encodeURIComponent(fileName)}`,

  startDrag: (videoIds) => ipcRenderer.send('share:drag', videoIds),
  copyVideos: (videoIds) => ipcRenderer.invoke('share:copy', videoIds),
  copyPath: (filePath) => ipcRenderer.invoke('share:copy-path', filePath),

  createClip: (request) => ipcRenderer.invoke('clips:create', request),
  cancelClip: () => ipcRenderer.send('clips:cancel'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),

  hideQuickWindow: () => ipcRenderer.send('quick:hide'),
  openInMainWindow: (videoId) => ipcRenderer.send('quick:open-in-main', videoId),

  onLibraryChanged: (listener) => subscribe('library:changed', listener),
  onClipProgress: (listener) => subscribe<[ClipProgress]>('clip:progress', listener),
  onConvertProgress: (listener) => subscribe<[ConvertProgress]>('convert:progress', listener),
  onOpenVideo: (listener) => subscribe<[number]>('video:open', listener),
  onQuickWindowShown: (listener) => subscribe('quick:shown', listener)
}

contextBridge.exposeInMainWorld('api', api)
