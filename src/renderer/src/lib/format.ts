export { DISCORD_LIMIT_BYTES } from '../../../shared/api'

export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  // Aşağı yuvarlanır: 9.96 MB "10.0 MB" görünüp limiti aşıyormuş gibi durmasın.
  if (mb >= 1) return `${(Math.floor(mb * 10) / 10).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '–:––'
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatPreciseTime(ms: number): string {
  const s = Math.max(0, ms) / 1000
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

export function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}
