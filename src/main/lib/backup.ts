import type { DatabaseSync } from 'node:sqlite'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { BackupResult } from '../../shared/api'
import { transaction } from './db'
import { refreshSearchIndex } from './repo'

interface BackupFile {
  app: 'meme-file'
  version: 1
  exportedAt: string
  tags: { name: string; color: string; icon: string; iconData?: string }[]
  videos: {
    name: string
    size: number
    hash: string | null
    favorite: boolean
    sendCount: number
    tags: string[]
  }[]
}

export async function exportBackup(
  db: DatabaseSync,
  iconsRoot: string,
  file: string
): Promise<BackupResult> {
  const tags = db.prepare('SELECT name, color, icon FROM tags ORDER BY created_at').all() as {
    name: string
    color: string
    icon: string
  }[]
  const videos = db
    .prepare(
      `SELECT v.id, v.name, v.size, v.quick_hash AS hash, v.favorite, v.send_count AS sendCount
       FROM videos v WHERE v.missing = 0`
    )
    .all() as {
    id: number
    name: string
    size: number
    hash: string | null
    favorite: number
    sendCount: number
  }[]
  const tagsOf = db.prepare(
    'SELECT t.name FROM video_tags vt JOIN tags t ON t.id = vt.tag_id WHERE vt.video_id = ?'
  )

  const backup: BackupFile = {
    app: 'meme-file',
    version: 1,
    exportedAt: new Date().toISOString(),
    tags: await Promise.all(
      tags.map(async (tag) => {
        if (!tag.icon.startsWith('custom:')) return tag
        const data = await readFile(join(iconsRoot, basename(tag.icon.slice(7)))).catch(() => null)
        return data ? { ...tag, iconData: data.toString('base64') } : { ...tag, icon: 'lucide:Tag' }
      })
    ),
    videos: videos
      .map((video) => ({
        name: video.name,
        size: video.size,
        hash: video.hash,
        favorite: video.favorite === 1,
        sendCount: video.sendCount,
        tags: (tagsOf.all(video.id) as { name: string }[]).map((row) => row.name)
      }))
      .filter((video) => video.tags.length > 0 || video.favorite || video.sendCount > 0)
  }
  await writeFile(file, JSON.stringify(backup, null, 2), 'utf8')
  return { tags: backup.tags.length, videos: backup.videos.length }
}

/** Videolar önce içerik özetiyle, bulunamazsa ad + boyutla eşleştirilir. Mevcut chip'ler silinmez. */
export async function importBackup(
  db: DatabaseSync,
  iconsRoot: string,
  file: string
): Promise<BackupResult> {
  const backup = JSON.parse(await readFile(file, 'utf8')) as BackupFile
  if (backup.app !== 'meme-file' || backup.version !== 1) {
    throw new Error('Bu bir Meme File yedeği değil')
  }

  await mkdir(iconsRoot, { recursive: true })
  for (const tag of backup.tags) {
    if (tag.icon.startsWith('custom:') && tag.iconData) {
      await writeFile(
        join(iconsRoot, basename(tag.icon.slice(7))),
        Buffer.from(tag.iconData, 'base64')
      )
    }
  }

  return transaction(db, () => {
    for (const tag of backup.tags) {
      db.prepare(
        'INSERT OR IGNORE INTO tags (name, color, icon, created_at) VALUES (?, ?, ?, ?)'
      ).run(tag.name, tag.color, tag.icon, Date.now())
    }
    let matched = 0
    for (const entry of backup.videos) {
      const row =
        (entry.hash
          ? db.prepare('SELECT id FROM videos WHERE quick_hash = ? AND missing = 0').get(entry.hash)
          : undefined) ??
        db
          .prepare('SELECT id FROM videos WHERE name = ? AND size = ? AND missing = 0')
          .get(entry.name, entry.size)
      if (!row) continue
      const videoId = (row as { id: number }).id
      matched++
      db.prepare(
        `UPDATE videos SET favorite = max(favorite, ?), send_count = max(send_count, ?), status = 'library' WHERE id = ?`
      ).run(entry.favorite ? 1 : 0, entry.sendCount, videoId)
      for (const name of entry.tags) {
        db.prepare(
          'INSERT OR IGNORE INTO video_tags (video_id, tag_id) SELECT ?, id FROM tags WHERE name = ? COLLATE NOCASE'
        ).run(videoId, name)
      }
      refreshSearchIndex(db, videoId)
    }
    return { tags: backup.tags.length, videos: matched }
  })
}
