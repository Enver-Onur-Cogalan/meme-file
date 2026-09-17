import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: {} }))

const { parseRange } = await import('./media-protocol')

describe('parseRange', () => {
  it('başlık yoksa tüm dosya', () => {
    expect(parseRange(null, 1000)).toBeNull()
  })

  it('açık uçlu ve kapalı aralıklar', () => {
    expect(parseRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 })
    expect(parseRange('bytes=100-199', 1000)).toEqual({ start: 100, end: 199 })
    expect(parseRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 })
  })

  it('sondan aralık', () => {
    expect(parseRange('bytes=-200', 1000)).toEqual({ start: 800, end: 999 })
  })

  it('geçersiz aralıklar', () => {
    expect(parseRange('bytes=1000-', 1000)).toBe('invalid')
    expect(parseRange('bytes=5-2', 1000)).toBe('invalid')
    expect(parseRange('items=0-1', 1000)).toBe('invalid')
  })
})
