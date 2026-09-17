import { describe, expect, it, vi } from 'vitest'

vi.mock('ffmpeg-static', () => ({ default: '/bin/ffmpeg' }))

const { sanitizeFileName } = await import('./clips')

describe('sanitizeFileName', () => {
  it('Windows için geçersiz karakterleri temizler', () => {
    expect(sanitizeFileName('valorant: clutch?* <1v4>')).toBe('valorant clutch 1v4')
    expect(sanitizeFileName('isim. ')).toBe('isim')
  })

  it('boş kalırsa varsayılan ad verir', () => {
    expect(sanitizeFileName('???')).toBe('klip')
  })
})
