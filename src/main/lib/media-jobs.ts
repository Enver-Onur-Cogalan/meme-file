import type { DatabaseSync } from 'node:sqlite'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createSprite, createThumbnail, probe, quickHash } from './ffmpeg'
import { pendingMedia, saveMediaInfo } from './repo'

export function cacheDir(root: string, videoId: number): string {
  return join(root, String(videoId))
}

/** Yeni videolar için arka planda süre/boyut bilgisi, kapak resmi ve önizleme şeridi üretir. */
export class MediaJobs {
  private running = 0
  private queued = new Set<number>()
  private readonly concurrency = 2

  constructor(
    private db: DatabaseSync,
    private cacheRoot: string,
    private onChange: () => void
  ) {}

  kick(): void {
    for (const item of pendingMedia(this.db)) {
      if (this.running >= this.concurrency) return
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
  }

  private async process(videoId: number, filePath: string): Promise<void> {
    const dir = cacheDir(this.cacheRoot, videoId)
    try {
      const info = await probe(filePath)
      if (!info.hasVideo) throw new Error('Video akışı yok')
      await createThumbnail(filePath, join(dir, 'thumb.jpg'), info.durationMs)
      if (info.durationMs) await createSprite(filePath, join(dir, 'sprite.jpg'), info.durationMs)
      saveMediaInfo(this.db, videoId, { ...info, quickHash: await quickHash(filePath) })
    } catch {
      saveMediaInfo(this.db, videoId, null)
    }
  }

  async removeCache(videoIds: number[]): Promise<void> {
    await Promise.all(
      videoIds.map((id) => rm(cacheDir(this.cacheRoot, id), { recursive: true, force: true }))
    )
  }
}
