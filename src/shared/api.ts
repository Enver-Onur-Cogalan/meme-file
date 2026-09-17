export const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.webm', '.mov', '.mkv'] as const

export interface LibraryFolder {
  id: number
  path: string
}

export interface VideoFile {
  path: string
  name: string
  size: number
  modifiedAt: number
}

/** Renderer'a preload üzerinden açılan API. Main process tarafı: src/main/ipc.ts */
export interface MemeApi {
  platform: NodeJS.Platform
  listFolders(): Promise<LibraryFolder[]>
  addFolder(): Promise<LibraryFolder | null>
  scanFolder(folderId: number): Promise<VideoFile[]>
  mediaUrl(filePath: string): string
  startDrag(filePath: string): void
  copyFile(filePath: string): Promise<boolean>
}
