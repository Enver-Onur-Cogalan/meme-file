import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSprite, createThumbnail, encodeClip, FFMPEG_PATH, probe, quickHash } from './ffmpeg'

// Gerçek ffmpeg binary'siyle çalışır; CI'da Windows'ta da koşar.
describe.skipIf(!existsSync(FFMPEG_PATH))('ffmpeg entegrasyonu', () => {
  let dir: string
  let source: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'meme file ş-'))
    source = join(dir, 'kaynak video ı.mp4')
    const result = spawnSync(FFMPEG_PATH, [
      '-hide_banner',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=1280x720:rate=30',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440',
      '-t',
      '6',
      '-c:v',
      'libx264',
      '-b:v',
      '8M',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      source
    ])
    expect(result.status).toBe(0)
  }, 60_000)

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('probe, kapak, önizleme şeridi ve özet üretir', async () => {
    const info = await probe(source)
    expect(info).toMatchObject({ width: 1280, height: 720, hasAudio: true, hasVideo: true })
    expect(info.durationMs).toBeGreaterThan(5900)

    await createThumbnail(source, join(dir, 'cache', 'thumb.jpg'), info.durationMs)
    await createSprite(source, join(dir, 'cache', 'sprite.jpg'), info.durationMs!)
    expect((await stat(join(dir, 'cache', 'thumb.jpg'))).size).toBeGreaterThan(1000)
    expect((await stat(join(dir, 'cache', 'sprite.jpg'))).size).toBeGreaterThan(1000)
    expect(await quickHash(source)).toMatch(/^[0-9a-f]{40}$/)
  }, 60_000)

  it('kırpıp hedef boyutun altına sığdırır', async () => {
    const output = join(dir, 'discord.mp4')
    const target = 1024 * 1024
    const progress: number[] = []
    await encodeClip({
      input: source,
      output,
      startMs: 1000,
      endMs: 5000,
      mute: false,
      hasAudio: true,
      sourceHeight: 720,
      targetBytes: target,
      format: 'mp4',
      onProgress: (ratio) => progress.push(ratio),
      signal: new AbortController().signal
    })
    const { size } = await stat(output)
    expect(size).toBeLessThanOrEqual(target)
    const info = await probe(output)
    expect(info.durationMs).toBeGreaterThan(3800)
    expect(info.durationMs).toBeLessThan(4300)
    expect(progress.at(-1)).toBeGreaterThan(0.9)
  }, 120_000)

  it('sessiz GIF üretir', async () => {
    const output = join(dir, 'klip.gif')
    await encodeClip({
      input: source,
      output,
      startMs: 0,
      endMs: 1500,
      mute: true,
      hasAudio: true,
      sourceHeight: 720,
      targetBytes: null,
      format: 'gif',
      onProgress: () => {},
      signal: new AbortController().signal
    })
    expect((await stat(output)).size).toBeGreaterThan(1000)
  }, 120_000)
})
