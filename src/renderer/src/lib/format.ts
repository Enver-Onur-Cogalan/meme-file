export const DISCORD_LIMIT_BYTES = 10 * 1024 * 1024

export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '–'
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}
