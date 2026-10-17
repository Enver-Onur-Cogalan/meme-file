import type { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { ClipRequest, ClipResult } from '../../shared/api'
import { t } from '../i18n'
import { encodeClip } from './ffmpeg'
import { getVideo, insertCreatedVideo } from './repo'

/** Windows dosya adında geçersiz karakterleri temizler. */
export function sanitizeFileName(name: string, fallback = 'klip'): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
  return cleaned.slice(0, 120) || fallback
}

export function uniquePath(dir: string, name: string, ext: string): string {
  let candidate = join(dir, `${name}${ext}`)
  for (let i = 2; existsSync(candidate); i++) candidate = join(dir, `${name}-${i}${ext}`)
  return candidate
}

/** Kırpma, Discord'a sığdırma ve GIF işlerini yönetir. Aynı anda tek iş çalışır. */
export class ClipManager {
  private controller: AbortController | null = null
  private nextJobId = 1
  /** Kütüphaneye eklenmeyen çıktılar (GIF) sadece bu oturumda paylaşılabilir. */
  readonly extraSharePaths = new Set<string>()

  constructor(
    private db: DatabaseSync,
    private onProgress: (jobId: number, ratio: number) => void,
    private onCreated: () => void
  ) {}

  async create(request: ClipRequest): Promise<ClipResult> {
    const video = getVideo(this.db, request.videoId)
    if (!video) throw new Error(t('main.videoNotFound'))
    if (this.controller) throw new Error(t('main.clipBusy'))
    const durationMs = video.durationMs ?? request.endMs
    const startMs = Math.max(0, Math.min(request.startMs, durationMs))
    const endMs = Math.max(startMs + 100, Math.min(request.endMs, durationMs))

    const ext = request.format === 'gif' ? '.gif' : '.mp4'
    const name = sanitizeFileName(
      request.outputName.replace(/\.(mp4|gif)$/i, ''),
      t('main.defaultClipName')
    )
    // uniquePath var olan dosyaları atladığı için orijinalin üzerine asla yazılmaz.
    const output = uniquePath(dirname(video.path), name, ext)

    const jobId = this.nextJobId++
    this.controller = new AbortController()
    // Meme yazısı PNG olarak gelir; ffmpeg'e dosya üzerinden verilir.
    const overlay = request.overlay
      ? join(tmpdir(), `meme-file-overlay-${jobId}-${Date.now()}.png`)
      : null
    try {
      if (overlay && request.overlay) await writeFile(overlay, request.overlay)
      await encodeClip({
        input: video.path,
        output,
        startMs,
        endMs,
        mute: request.mute,
        hasAudio: video.hasAudio ?? true,
        sourceWidth: video.width,
        sourceHeight: video.height,
        targetBytes: request.format === 'gif' ? null : request.targetBytes,
        format: request.format,
        overlay,
        signal: this.controller.signal,
        onProgress: (ratio) => this.onProgress(jobId, ratio)
      })
    } finally {
      this.controller = null
      if (overlay) await rm(overlay, { force: true })
    }

    const info = await stat(output)
    if (request.format === 'gif') {
      this.extraSharePaths.add(output)
      return { path: output, size: info.size, videoId: null }
    }
    const videoId = insertCreatedVideo(
      this.db,
      video.folderId,
      { path: output, name: basename(output), size: info.size, modifiedAt: info.mtimeMs },
      video.id
    )
    this.onCreated()
    return { path: output, size: info.size, videoId }
  }

  cancel(): void {
    this.controller?.abort()
  }
}
