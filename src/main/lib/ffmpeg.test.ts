import { describe, expect, it, vi } from 'vitest'

vi.mock('ffmpeg-static', () => ({ default: '/bin/ffmpeg' }))

const { isPlayable, parseProbeOutput, planEncode } = await import('./ffmpeg')

describe('parseProbeOutput', () => {
  it('süre, boyut ve ses bilgisini okur', () => {
    const stderr = `Input #0, mov,mp4, from 'a.mp4':
  Duration: 00:01:04.50, start: 0.000000, bitrate: 3172 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1280x720 [SAR 1:1 DAR 16:9], 3092 kb/s, 30 fps
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 69 kb/s`
    expect(parseProbeOutput(stderr)).toEqual({
      durationMs: 64500,
      width: 1280,
      height: 720,
      hasAudio: true,
      hasVideo: true,
      videoCodec: 'h264',
      audioCodec: 'aac'
    })
  })

  it('döndürülmüş telefon videosunda boyutları çevirir', () => {
    const stderr = `  Duration: 00:00:03.00
  Stream #0:0: Video: h264, yuv420p(tv, bt709), 1920x1080, 30 fps
      Side data:
        displaymatrix: rotation of -90.00 degrees`
    const result = parseProbeOutput(stderr)
    expect([result.width, result.height, result.hasAudio]).toEqual([1080, 1920, false])
  })
})

describe('planEncode', () => {
  it('boyut sınırı yoksa bit hızı belirlemez', () => {
    expect(planEncode(10, null, true, 1080).videoKbps).toBeNull()
  })

  it('10 MB ve 17 saniye için toplam bit hızı hedefin altında kalır', () => {
    const target = 10 * 1024 * 1024
    const plan = planEncode(17, target, true, 1080)
    const totalBytes = (((plan.videoKbps ?? 0) + (plan.audioKbps ?? 0)) * 1000 * 17) / 8
    expect(totalBytes).toBeLessThan(target)
    expect(plan.maxHeight).toBe(1080)
  })

  it('düşük bit hızında çözünürlüğü düşürür ama kaynaktan büyütmez', () => {
    expect(planEncode(60, 10 * 1024 * 1024, true, 1080).maxHeight).toBe(720)
    expect(planEncode(60, 10 * 1024 * 1024, true, 360).maxHeight).toBe(360)
  })

  it('çok uzun klipte anlaşılır hata verir', () => {
    expect(() => planEncode(1200, 10 * 1024 * 1024, true, 1080)).toThrow(/kısaltmayı/)
  })
})

describe('isPlayable', () => {
  it('H.264/AAC mp4 ve VP9/Opus webm oynar', () => {
    expect(isPlayable('.mp4', 'h264', 'aac')).toBe(true)
    expect(isPlayable('.webm', 'vp9', 'opus')).toBe(true)
    expect(isPlayable('.mov', 'h264', null)).toBe(true)
  })

  it('HEVC, ProRes, AC-3 ses ve H.264 mkv dönüştürülür', () => {
    expect(isPlayable('.mp4', 'hevc', 'aac')).toBe(false)
    expect(isPlayable('.mov', 'prores', 'pcm_s16le')).toBe(false)
    expect(isPlayable('.mp4', 'h264', 'ac3')).toBe(false)
    expect(isPlayable('.mkv', 'h264', 'aac')).toBe(false)
    expect(isPlayable('.mkv', 'vp9', 'opus')).toBe(true)
  })

  it('probe çıktısından codec okur', () => {
    const info = parseProbeOutput(`  Duration: 00:00:02.00
  Stream #0:0[0x1](und): Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv), 1920x1080, 30 fps
  Stream #0:1[0x2](und): Audio: ac3 (ac-3 / 0x332D6361), 48000 Hz, stereo`)
    expect([info.videoCodec, info.audioCodec]).toEqual(['hevc', 'ac3'])
  })
})
