import { protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { Readable } from 'node:stream'

export const MEDIA_SCHEME = 'media'

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
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

export interface MediaRoutes {
  /** Kütüphanedeki bir video mu? */
  isAllowedVideo(filePath: string): boolean
  cacheRoot: string
  iconsRoot: string
}

/**
 * URL biçimleri:
 *   media://local/<encodeURIComponent(mutlak yol)>   kütüphanedeki video
 *   media://thumb/<videoId>                           kapak resmi
 *   media://sprite/<videoId>                          önizleme şeridi
 *   media://icon/<dosya adı>                          kullanıcının yüklediği chip ikonu
 */
export function handleMediaProtocol(routes: MediaRoutes): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    const url = new URL(request.url)
    const segment = decodeURIComponent(url.pathname.slice(1))
    let filePath: string | null = null

    if (url.host === 'local' && routes.isAllowedVideo(segment)) filePath = segment
    if ((url.host === 'thumb' || url.host === 'sprite') && /^\d+$/.test(segment)) {
      filePath = join(routes.cacheRoot, segment, `${url.host}.jpg`)
    }
    if (url.host === 'icon' && segment === basename(segment) && !segment.startsWith('.')) {
      filePath = join(routes.iconsRoot, segment)
    }
    if (!filePath) return new Response(null, { status: 403 })

    return serveFile(filePath, request.headers.get('Range'))
  })
}

async function serveFile(filePath: string, rangeHeader: string | null): Promise<Response> {
  let size: number
  try {
    size = (await stat(filePath)).size
  } catch {
    return new Response(null, { status: 404 })
  }

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache'
  })

  // <video> ileri sarmak için Range isteği gönderir; net.fetch(file://) bunu desteklemediği için kendimiz yanıtlıyoruz.
  const range = parseRange(rangeHeader, size)
  if (range === 'invalid') {
    headers.set('Content-Range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }

  const { start, end } = range ?? { start: 0, end: size - 1 }
  headers.set('Content-Length', String(end - start + 1))
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`)

  if (size === 0) return new Response(null, { status: 200, headers })
  const body = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
  return new Response(body, { status: range ? 206 : 200, headers })
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
