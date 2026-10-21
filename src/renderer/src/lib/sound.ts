import type { ThemeId } from '../../../shared/api'

/**
 * Arayüz sesleri dosya olarak değil, Web Audio ile anlık üretilir: kurulum
 * büyümez ve her tema kendi tınısını alır. Sesler kısadır (<180 ms) ve
 * ayarlardan kapatılabilir.
 */
export type SoundEvent = 'click' | 'chip' | 'copy' | 'drag' | 'done' | 'error' | 'trash'

type Voice = 'paper' | 'blip' | 'tick' | 'beep'

/** Her temanın sesi bir "ağız"dan çıkar; olay sadece perdeyi ve süreyi değiştirir. */
const VOICES: Record<ThemeId, Voice> = {
  sticker: 'paper',
  cyber: 'blip',
  modern: 'tick',
  classic: 'beep'
}

interface Note {
  /** Taban frekans (Hz) */
  hz: number
  /** Saniye cinsinden süre */
  length: number
  /** 0-1 arası ses yüksekliği çarpanı */
  level: number
  /** Frekansın sonunda gittiği yer; tırmanan ya da düşen sesler için. */
  slide?: number
}

const NOTES: Record<SoundEvent, Note> = {
  click: { hz: 620, length: 0.05, level: 0.5 },
  chip: { hz: 880, length: 0.07, level: 0.7, slide: 1.25 },
  copy: { hz: 760, length: 0.1, level: 0.85, slide: 1.5 },
  drag: { hz: 520, length: 0.06, level: 0.5, slide: 0.85 },
  done: { hz: 660, length: 0.16, level: 0.9, slide: 1.9 },
  error: { hz: 300, length: 0.18, level: 0.9, slide: 0.6 },
  trash: { hz: 420, length: 0.14, level: 0.7, slide: 0.45 }
}

/** Genel seviye: sesler fark edilsin ama konuşmanın üstüne binmesin. */
const MASTER = 0.16

let context: AudioContext | null = null
let enabled = false
let theme: ThemeId = 'sticker'

export function configureSound(on: boolean, current: ThemeId): void {
  enabled = on
  theme = current
}

export function play(event: SoundEvent): void {
  if (!enabled) return
  try {
    const audio = (context ??= new AudioContext())
    // Tarayıcı ilk kullanıcı hareketine kadar bağlamı askıda tutabilir.
    if (audio.state === 'suspended') void audio.resume()
    render(audio, VOICES[theme] ?? 'tick', NOTES[event])
  } catch {
    // Ses çıkmazsa uygulamanın akışı bozulmaz.
  }
}

function render(audio: AudioContext, voice: Voice, note: Note): void {
  const now = audio.currentTime
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.connect(audio.destination)

  if (voice === 'paper') {
    // Kâğıt şırakı: kısa gürültü patlaması, tiz tarafı süzülmüş.
    const source = audio.createBufferSource()
    source.buffer = noise(audio, note.length)
    const filter = audio.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(note.hz * 2.2, now)
    filter.Q.value = 0.8
    source.connect(filter).connect(gain)
    envelope(gain, now, note, 0.004)
    source.start(now)
    source.stop(now + note.length)
    return
  }

  const osc = audio.createOscillator()
  osc.type = voice === 'blip' ? 'sawtooth' : voice === 'beep' ? 'square' : 'sine'
  osc.frequency.setValueAtTime(note.hz, now)
  if (note.slide) {
    osc.frequency.exponentialRampToValueAtTime(note.hz * note.slide, now + note.length)
  }

  if (voice === 'blip') {
    // Neon tınısı: sawtooth'u süzüp ikinci bir oktavla destekliyoruz.
    const filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(note.hz * 6, now)
    filter.frequency.exponentialRampToValueAtTime(note.hz * 2, now + note.length)
    osc.connect(filter).connect(gain)
    const shimmer = audio.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.setValueAtTime(note.hz * 2, now)
    const shimmerGain = audio.createGain()
    shimmerGain.gain.setValueAtTime(0.25, now)
    shimmer.connect(shimmerGain).connect(gain)
    shimmer.start(now)
    shimmer.stop(now + note.length)
  } else {
    osc.connect(gain)
  }

  envelope(gain, now, note, voice === 'tick' ? 0.006 : 0.002)
  osc.start(now)
  osc.stop(now + note.length + 0.02)
}

function envelope(gain: GainNode, now: number, note: Note, attack: number): void {
  const peak = MASTER * note.level
  gain.gain.linearRampToValueAtTime(peak, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + note.length)
}

function noise(audio: AudioContext, length: number): AudioBuffer {
  const frames = Math.max(1, Math.floor(audio.sampleRate * length))
  const buffer = audio.createBuffer(1, frames, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    // Sona doğru sönen gürültü: tek başına da kâğıt gibi duyuluyor.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  }
  return buffer
}
