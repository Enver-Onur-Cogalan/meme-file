import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, open, rename, rm, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import ffmpegStaticPath from 'ffmpeg-static'
import { t } from '../i18n'

/** Paketlenmiş uygulamada binary asar arşivinin dışına açılır (electron-builder asarUnpack). */
export const FFMPEG_PATH = (ffmpegStaticPath ?? 'ffmpeg').replace('app.asar', 'app.asar.unpacked')

export const SPRITE_FRAMES = 10

interface RunOptions {
  onProgress?: (seconds: number) => void
  signal?: AbortSignal
}

function runFfmpeg(
  args: string[],
  options: RunOptions = {}
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(FFMPEG_PATH, ['-hide_banner', '-nostdin', ...args], {
      windowsHide: true
    })
    let stderr = ''
    let stdoutBuffer = ''
    child.stderr?.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-20_000)
    })
    child.stdout?.on('data', (chunk) => {
      stdoutBuffer += chunk
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const match = /^out_time_us=(\d+)/.exec(line)
        if (match) options.onProgress?.(Number(match[1]) / 1_000_000)
      }
    })
    const abort = (): void => {
      child.kill()
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    child.on('error', reject)
    child.on('close', (code) => {
      options.signal?.removeEventListener('abort', abort)
      if (options.signal?.aborted) reject(new Error(t('main.cancelled')))
      else resolve({ code: code ?? 1, stderr })
    })
  })
}

export interface ProbeResult {
  durationMs: number | null
  width: number | null
  height: number | null
  hasAudio: boolean
  hasVideo: boolean
  videoCodec: string | null
  audioCodec: string | null
}

/** ffprobe ayrıca paketlenmesin diye ffmpeg'in "-i" çıktısı okunur. */
export function parseProbeOutput(stderr: string): ProbeResult {
  const duration = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  const videoLine = stderr.split('\n').find((line) => /Stream #.*: Video:/.test(line))
  const size = videoLine ? /, (\d{2,5})x(\d{2,5})[,\s]/.exec(videoLine) : null
  let width = size ? Number(size[1]) : null
  let height = size ? Number(size[2]) : null
  // Telefon videoları döndürme bilgisiyle kaydedilir; gösterilen boyut yer değiştirir.
  if (width && height && /rotation of -?(90|270)\.00 degrees/.test(stderr)) {
    ;[width, height] = [height, width]
  }
  return {
    durationMs: duration
      ? Math.round(
          (Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])) * 1000
        )
      : null,
    width,
    height,
    hasAudio: /Stream #.*: Audio:/.test(stderr),
    hasVideo: !!videoLine,
    videoCodec: /Video: (\w+)/.exec(videoLine ?? '')?.[1]?.toLowerCase() ?? null,
    audioCodec: /Stream #.*: Audio: (\w+)/.exec(stderr)?.[1]?.toLowerCase() ?? null
  }
}

export async function probe(filePath: string): Promise<ProbeResult> {
  const { stderr } = await runFfmpeg(['-i', filePath])
  return parseProbeOutput(stderr)
}

/** Chromium'un (Electron) ek codec olmadan oynatabildikleri. */
const PLAYABLE_VIDEO = ['h264', 'vp8', 'vp9', 'av1']
const PLAYABLE_AUDIO = ['aac', 'mp3', 'opus', 'vorbis', 'flac']
const WEBM_VIDEO = ['vp8', 'vp9', 'av1']
const WEBM_AUDIO = ['opus', 'vorbis']

/**
 * Video uygulamada ve Discord'da sorunsuz oynar mı? HEVC (H.265), ProRes, AC-3 ses gibi
 * durumlarda false döner ve uyumlu bir kopya üretilir.
 */
export function isPlayable(
  extension: string,
  videoCodec: string | null,
  audioCodec: string | null
): boolean {
  if (!videoCodec || !PLAYABLE_VIDEO.includes(videoCodec)) return false
  if (audioCodec && !PLAYABLE_AUDIO.includes(audioCodec)) return false
  // Matroska (.mkv) Chromium'da sadece WebM uyumlu codec'lerle güvenilir oynar.
  if (extension.toLowerCase() === '.mkv') {
    return WEBM_VIDEO.includes(videoCodec) && (!audioCodec || WEBM_AUDIO.includes(audioCodec))
  }
  return true
}

/** Oynatılamayan videonun H.264 + AAC kopyasını üretir. */
export async function convertToCompatible(
  input: string,
  output: string,
  durationMs: number | null,
  onProgress: (ratio: number) => void
): Promise<void> {
  await mkdir(dirname(output), { recursive: true })
  const tmp = `${output}.part.mp4`
  try {
    const { code, stderr } = await runFfmpeg(
      [
        '-y',
        '-i',
        input,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        '-progress',
        'pipe:1',
        '-nostats',
        tmp
      ],
      {
        onProgress: (seconds) =>
          durationMs && onProgress(Math.min(seconds / (durationMs / 1000), 1))
      }
    )
    if (code !== 0) throw new Error(`Dönüştürülemedi: ${stderr.slice(-300)}`)
    await rename(tmp, output)
  } finally {
    await rm(tmp, { force: true })
  }
}

/** Kapak resmi: videonun %10'undan (en fazla 1. saniyeden) bir kare. */
export async function createThumbnail(
  filePath: string,
  out: string,
  durationMs: number | null
): Promise<void> {
  const at = durationMs ? Math.min(1, (durationMs / 1000) * 0.1) : 0
  await mkdir(dirname(out), { recursive: true })
  const tmp = `${out}.tmp.jpg`
  const { code, stderr } = await runFfmpeg([
    '-y',
    '-ss',
    at.toFixed(2),
    '-i',
    filePath,
    '-frames:v',
    '1',
    '-vf',
    'scale=480:-2',
    '-q:v',
    '4',
    tmp
  ])
  if (code !== 0) throw new Error(`Kapak oluşturulamadı: ${stderr.slice(-300)}`)
  await rename(tmp, out)
}

/** Fareyle önizleme için yan yana dizilmiş kareler (SPRITE_FRAMES adet, her biri 240px). */
export async function createSprite(
  filePath: string,
  out: string,
  durationMs: number
): Promise<void> {
  const seconds = Math.max(durationMs / 1000, 0.1)
  const fps = SPRITE_FRAMES / seconds
  await mkdir(dirname(out), { recursive: true })
  const tmp = `${out}.tmp.jpg`
  const { code, stderr } = await runFfmpeg([
    '-y',
    // Uzun videolarda tüm kareleri çözmek yavaş; sadece anahtar kareler yeterli.
    ...(seconds > 120 ? ['-skip_frame', 'nokey'] : []),
    '-i',
    filePath,
    '-an',
    '-vf',
    `fps=${fps.toFixed(5)},scale=240:135:force_original_aspect_ratio=increase,crop=240:135,tile=${SPRITE_FRAMES}x1`,
    '-frames:v',
    '1',
    '-q:v',
    '5',
    tmp
  ])
  if (code !== 0) throw new Error(`Önizleme şeridi oluşturulamadı: ${stderr.slice(-300)}`)
  await rename(tmp, out)
}

/** Aynı videoyu tespit etmek için hızlı özet: boyut + ilk ve son 1 MB. */
export async function quickHash(filePath: string): Promise<string> {
  const chunk = 1024 * 1024
  const { size } = await stat(filePath)
  const handle = await open(filePath, 'r')
  try {
    const hash = createHash('sha1').update(String(size))
    const head = Buffer.alloc(Math.min(chunk, size))
    await handle.read(head, 0, head.length, 0)
    hash.update(head)
    if (size > chunk) {
      const tail = Buffer.alloc(Math.min(chunk, size - chunk))
      await handle.read(tail, 0, tail.length, size - tail.length)
      hash.update(tail)
    }
    return hash.digest('hex')
  } finally {
    await handle.close()
  }
}

export interface EncodeOptions {
  input: string
  output: string
  startMs: number
  endMs: number
  mute: boolean
  hasAudio: boolean
  sourceHeight: number | null
  targetBytes: number | null
  format: 'mp4' | 'gif'
  onProgress(ratio: number): void
  signal: AbortSignal
}

export interface EncodePlan {
  videoKbps: number | null
  audioKbps: number | null
  maxHeight: number | null
  fps: number | null
}

const AUDIO_KBPS = 96

/** Hedef dosya boyutuna sığmak için bit hızı, çözünürlük ve kare hızını seçer. */
export function planEncode(
  durationSec: number,
  targetBytes: number | null,
  withAudio: boolean,
  sourceHeight: number | null,
  safety = 0.92
): EncodePlan {
  if (targetBytes === null) {
    return { videoKbps: null, audioKbps: withAudio ? 160 : null, maxHeight: null, fps: null }
  }
  // Konteyner ek yükü için biraz pay bırakılır.
  const totalKbps = ((targetBytes * 8) / 1000 / durationSec) * safety
  const audioKbps = withAudio ? Math.min(AUDIO_KBPS, Math.max(32, totalKbps * 0.15)) : null
  const videoKbps = Math.floor(totalKbps - (audioKbps ?? 0))
  if (videoKbps < 120) {
    throw new Error(t('main.tooLongForTarget'))
  }
  const cap = (height: number): number => (sourceHeight ? Math.min(sourceHeight, height) : height)
  const maxHeight =
    videoKbps < 500
      ? cap(360)
      : videoKbps < 900
        ? cap(480)
        : videoKbps < 2500
          ? cap(720)
          : cap(1080)
  return {
    videoKbps,
    audioKbps: audioKbps && Math.round(audioKbps),
    maxHeight,
    fps: videoKbps < 1200 ? 30 : null
  }
}

export async function encodeClip(options: EncodeOptions): Promise<void> {
  const durationSec = (options.endMs - options.startMs) / 1000
  const trim = ['-ss', (options.startMs / 1000).toFixed(3), '-t', durationSec.toFixed(3)]
  const progress = ['-progress', 'pipe:1', '-nostats']
  const onProgress = (seconds: number): void =>
    options.onProgress(Math.min(seconds / durationSec, 1))
  await mkdir(dirname(options.output), { recursive: true })
  const tmp = `${options.output}.part.${options.format}`

  try {
    if (options.format === 'gif') {
      const { code, stderr } = await runFfmpeg(
        [
          '-y',
          ...trim,
          '-i',
          options.input,
          '-vf',
          'fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
          '-loop',
          '0',
          ...progress,
          tmp
        ],
        { onProgress, signal: options.signal }
      )
      if (code !== 0) throw new Error(`${t('main.gifFailed')}: ${stderr.slice(-300)}`)
      await rename(tmp, options.output)
      return
    }

    const withAudio = options.hasAudio && !options.mute
    let safety = 0.92
    for (let attempt = 0; attempt < 3; attempt++) {
      const plan = planEncode(
        durationSec,
        options.targetBytes,
        withAudio,
        options.sourceHeight,
        safety
      )
      const filters = [
        plan.maxHeight ? `scale=-2:'min(${plan.maxHeight},ih)'` : null,
        plan.fps ? `fps=${plan.fps}` : null
      ].filter(Boolean)
      const { code, stderr } = await runFfmpeg(
        [
          '-y',
          ...trim,
          '-i',
          options.input,
          '-map',
          '0:v:0',
          ...(withAudio ? ['-map', '0:a:0?'] : ['-an']),
          ...(filters.length ? ['-vf', filters.join(',')] : []),
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-pix_fmt',
          'yuv420p',
          ...(plan.videoKbps
            ? [
                '-b:v',
                `${plan.videoKbps}k`,
                '-maxrate',
                `${Math.round(plan.videoKbps * 1.3)}k`,
                '-bufsize',
                `${plan.videoKbps * 2}k`
              ]
            : ['-crf', '20']),
          ...(withAudio ? ['-c:a', 'aac', '-b:a', `${plan.audioKbps ?? 160}k`] : []),
          '-movflags',
          '+faststart',
          ...progress,
          tmp
        ],
        { onProgress, signal: options.signal }
      )
      if (code !== 0) throw new Error(`${t('main.encodeFailed')}: ${stderr.slice(-300)}`)
      const { size } = await stat(tmp)
      if (options.targetBytes === null || size <= options.targetBytes) {
        await rename(tmp, options.output)
        return
      }
      // Kodlayıcı hedefi aştıysa daha düşük bit hızıyla tekrar dene.
      safety *= (options.targetBytes / size) * 0.95
    }
    throw new Error(t('main.tooLongForTarget'))
  } finally {
    await rm(tmp, { force: true })
  }
}
