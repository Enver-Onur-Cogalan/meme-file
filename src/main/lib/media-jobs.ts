import type { DatabaseSync } from 'node:sqlite'
import { cpus } from 'node:os'
import { rm } from 'node:fs/promises'
import { extname, join } from 'node:path'
import {
  convertToCompatible,
  createSprite,
  createThumbnail,
  isPlayable,
  probe,
  quickHash
} from './ffmpeg'
import { nextConversion, pendingMedia, saveMediaInfo, setPlayback } from './repo'

export function cacheDir(root: string, videoId: number): string {
  return join(root, String(videoId))
}

export function convertedPathFor(root: string, videoId: number, fileName: string): string {
  // Dosya adı korunur ki Discord'a giden kopya da aynı isimle görünsün.
  return join(cacheDir(root, videoId), 'converted', `${fileName.replace(/\.[^.]+$/, '')}.mp4`)
}

/**
 * Arka plan işleri:
 * 1. Yeni videolar için süre/boyut/codec bilgisi, kapak resmi ve önizleme şeridi (paralel)
 * 2. Oynatılamayan videolar (HEVC vb.) için uyumlu MP4 kopyası (tek tek; ağır iş)
 */
export class MediaJobs {
  private running = 0
  private queued = new Set<number>()
  private converting: number | null = null
  private readonly concurrency = Math.max(2, Math.min(4, Math.floor(cpus().length / 2)))

  constructor(
    private db: DatabaseSync,
    private cacheRoot: string,
    private onChange: () => void,
    private onConvertProgress: (videoId: number, ratio: number) => void
  ) {}

  kick(): void {
    for (const item of pendingMedia(this.db, this.concurrency * 2)) {
      if (this.running >= this.concurrency) break
      if (this.queued.has(item.id)) continue
      this.queued.add(item.id)
      this.running++
      void this.process(item.id, item.path).finally(() => {
        this.running--
        this.queued.delete(item.id)
        this.onChange()
        this.kick()
      })
    }
    this.kickConversion()
  }

  private kickConversion(): void {
    if (this.converting !== null) return
    const item = nextConversion(this.db, [...this.queued])
    if (!item) return
    this.converting = item.id
    void this.convert(item).finally(() => {
      this.converting = null
      this.onChange()
      this.kickConversion()
    })
  }

  private async process(videoId: number, filePath: string): Promise<void> {
    const dir = cacheDir(this.cacheRoot, videoId)
    try {
      const info = await probe(filePath)
      if (!info.hasVideo) throw new Error('Video akışı yok')
      await createThumbnail(filePath, join(dir, 'thumb.jpg'), info.durationMs)
      if (info.durationMs) await createSprite(filePath, join(dir, 'sprite.jpg'), info.durationMs)
      saveMediaInfo(this.db, videoId, {
        ...info,
        quickHash: await quickHash(filePath),
        playable: isPlayable(extname(filePath), info.videoCodec, info.audioCodec)
      })
    } catch {
      saveMediaInfo(this.db, videoId, null)
    }
  }

  private async convert(item: {
    id: number
    path: string
    name: string
    durationMs: number | null
  }): Promise<void> {
    const output = convertedPathFor(this.cacheRoot, item.id, item.name)
    setPlayback(this.db, item.id, 'converting')
    this.onChange()
    try {
      await convertToCompatible(item.path, output, item.durationMs, (ratio) =>
        this.onConvertProgress(item.id, ratio)
      )
      setPlayback(this.db, item.id, 'ready', output)
    } catch {
      setPlayback(this.db, item.id, 'error')
    }
  }

  async removeCache(videoIds: number[]): Promise<void> {
    await Promise.all(
      videoIds.map((id) => rm(cacheDir(this.cacheRoot, id), { recursive: true, force: true }))
    )
  }
}
