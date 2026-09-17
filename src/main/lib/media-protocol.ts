import { protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

export const MEDIA_SCHEME = 'media'

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska'
}

/** app "ready" olmadan önce çağrılmalı. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** URL biçimi: media://local/<encodeURIComponent(mutlak yol)> */
export function handleMediaProtocol(isAllowed: (filePath: string) => boolean): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname.slice(1))
    if (!isAllowed(filePath)) return new Response(null, { status: 403 })

    let size: number
    try {
      size = (await stat(filePath)).size
    } catch {
      return new Response(null, { status: 404 })
    }

    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    })

    // <video> ileri sarmak için Range isteği gönderir; net.fetch(file://) bunu desteklemediği için kendimiz yanıtlıyoruz.
    const range = parseRange(request.headers.get('Range'), size)
    if (range === 'invalid') {
      headers.set('Content-Range', `bytes */${size}`)
      return new Response(null, { status: 416, headers })
    }

    const { start, end } = range ?? { start: 0, end: size - 1 }
    headers.set('Content-Length', String(end - start + 1))
    if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`)

    const body = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
    return new Response(body, { status: range ? 206 : 200, headers })
  })
}

export function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | null | 'invalid' {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return 'invalid'

  let start: number
  let end: number
  if (match[1] === '') {
    // "bytes=-500": son 500 bayt
    start = Math.max(size - Number(match[2]), 0)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  }
  if (start > end || start >= size) return 'invalid'
  return { start, end }
}
