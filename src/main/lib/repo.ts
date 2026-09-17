import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import type {
  LibraryFolder,
  LibraryStats,
  Settings,
  Tag,
  TagInput,
  Video,
  VideoQuery
} from '../../shared/api'
import { normalizeForSearch } from '../../shared/search'
import { transaction } from './db'

interface VideoRow {
  id: number
  folder_id: number
  path: string
  name: string
  size: number
  modified_at: number
  added_at: number
  duration_ms: number | null
  width: number | null
  height: number | null
  has_audio: number | null
  media_status: Video['mediaStatus']
  status: Video['status']
  favorite: number
  send_count: number
  last_sent_at: number | null
  has_duplicate: number
  tag_ids: string | null
}

const VIDEO_COLUMNS = `v.id, v.folder_id, v.path, v.name, v.size, v.modified_at, v.added_at,
  v.duration_ms, v.width, v.height, v.has_audio, v.media_status, v.status, v.favorite,
  v.send_count, v.last_sent_at,
  EXISTS (SELECT 1 FROM videos d WHERE d.quick_hash = v.quick_hash AND d.id <> v.id AND d.missing = 0) AS has_duplicate,
  (SELECT group_concat(tag_id) FROM video_tags WHERE video_id = v.id) AS tag_ids`

function toVideo(row: VideoRow): Video {
  return {
    id: row.id,
    folderId: row.folder_id,
    path: row.path,
    name: row.name,
    size: row.size,
    modifiedAt: row.modified_at,
    addedAt: row.added_at,
    durationMs: row.duration_ms,
    width: row.width,
    height: row.height,
    hasAudio: row.has_audio === null ? null : row.has_audio === 1,
    mediaStatus: row.media_status,
    status: row.status,
    favorite: row.favorite === 1,
    sendCount: row.send_count,
    lastSentAt: row.last_sent_at,
    hasDuplicate: row.has_duplicate === 1,
    tagIds: row.tag_ids ? row.tag_ids.split(',').map(Number) : []
  }
}

/** Kullanıcının yazdığı metni güvenli bir FTS5 sorgusuna çevirir: her kelime önek olarak aranır. */
export function toFtsQuery(text: string): string | null {
  const tokens = normalizeForSearch(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  return tokens.length ? tokens.map((token) => `"${token}"*`).join(' ') : null
}

const SORTS: Record<NonNullable<VideoQuery['sort']>, string> = {
  newest: 'v.modified_at DESC',
  oldest: 'v.modified_at ASC',
  name: 'v.name COLLATE NOCASE ASC',
  size: 'v.size DESC',
  duration: 'v.duration_ms DESC',
  'most-sent': 'v.send_count DESC, v.last_sent_at DESC'
}

export function queryVideos(db: DatabaseSync, query: VideoQuery): Video[] {
  const where = ['v.missing = 0']
  const params: SQLInputValue[] = []

  if (query.view === 'inbox') where.push(`v.status = 'inbox'`)
  if (query.view === 'favorites') where.push('v.favorite = 1')
  if (query.view === 'most-sent') where.push('v.send_count > 0')
  if (query.view === 'duplicates') {
    where.push(
      'v.quick_hash IS NOT NULL AND EXISTS (SELECT 1 FROM videos d WHERE d.quick_hash = v.quick_hash AND d.id <> v.id AND d.missing = 0)'
    )
  }

  if (query.folderId != null) {
    where.push('v.folder_id = ?')
    params.push(query.folderId)
  }

  const fts = query.text ? toFtsQuery(query.text) : null
  if (fts) {
    where.push('v.id IN (SELECT rowid FROM videos_fts WHERE videos_fts MATCH ?)')
    params.push(fts)
  }

  const tagIds = query.tagIds ?? []
  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => '?').join(',')
    if (query.tagMode === 'or') {
      where.push(`v.id IN (SELECT video_id FROM video_tags WHERE tag_id IN (${placeholders}))`)
    } else {
      where.push(
        `v.id IN (SELECT video_id FROM video_tags WHERE tag_id IN (${placeholders}) GROUP BY video_id HAVING count(*) = ?)`
      )
    }
    params.push(...tagIds)
    if (query.tagMode !== 'or') params.push(tagIds.length)
  }

  const sort = query.view === 'most-sent' ? SORTS['most-sent'] : SORTS[query.sort ?? 'newest']
  const orderBy = query.view === 'duplicates' ? `v.quick_hash, ${sort}` : sort

  const rows = db
    .prepare(
      `SELECT ${VIDEO_COLUMNS} FROM videos v WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ?`
    )
    .all(...params, query.limit ?? 5000) as unknown as VideoRow[]
  return rows.map(toVideo)
}

export function getVideo(db: DatabaseSync, id: number): Video | undefined {
  const row = db.prepare(`SELECT ${VIDEO_COLUMNS} FROM videos v WHERE v.id = ?`).get(id) as
    VideoRow | undefined
  return row && toVideo(row)
}

export function getVideos(db: DatabaseSync, ids: number[]): Video[] {
  return ids.map((id) => getVideo(db, id)).filter((video): video is Video => !!video)
}

export function getStats(db: DatabaseSync): LibraryStats {
  return db
    .prepare(
      `SELECT
        count(*) AS total,
        coalesce(sum(status = 'inbox'), 0) AS inbox,
        coalesce(sum(favorite = 1), 0) AS favorites,
        coalesce(sum(media_status = 'pending'), 0) AS pendingMedia,
        (SELECT count(*) FROM videos v WHERE v.missing = 0 AND v.quick_hash IS NOT NULL AND EXISTS
          (SELECT 1 FROM videos d WHERE d.quick_hash = v.quick_hash AND d.id <> v.id AND d.missing = 0)) AS duplicates
      FROM videos WHERE missing = 0`
    )
    .get() as unknown as LibraryStats
}

/* ---------------- klasörler ---------------- */

export function listFolders(db: DatabaseSync): LibraryFolder[] {
  return db
    .prepare(
      `SELECT f.id, f.path, (SELECT count(*) FROM videos v WHERE v.folder_id = f.id AND v.missing = 0) AS videoCount
       FROM folders f ORDER BY f.added_at`
    )
    .all() as unknown as LibraryFolder[]
}

export function insertFolder(db: DatabaseSync, folderPath: string): LibraryFolder {
  db.prepare('INSERT OR IGNORE INTO folders (path, added_at) VALUES (?, ?)').run(
    folderPath,
    Date.now()
  )
  return listFolders(db).find((folder) => folder.path === folderPath)!
}

export function getFolder(db: DatabaseSync, id: number): LibraryFolder | undefined {
  return listFolders(db).find((folder) => folder.id === id)
}

export function deleteFolder(db: DatabaseSync, id: number): number[] {
  return transaction(db, () => {
    const ids = (
      db.prepare('SELECT id FROM videos WHERE folder_id = ?').all(id) as { id: number }[]
    ).map((row) => row.id)
    for (const videoId of ids) db.prepare('DELETE FROM videos_fts WHERE rowid = ?').run(videoId)
    db.prepare('DELETE FROM folders WHERE id = ?').run(id)
    return ids
  })
}

/* ---------------- videolar ---------------- */

export interface ScannedFile {
  path: string
  name: string
  size: number
  modifiedAt: number
}

/**
 * Diskteki dosya listesini veritabanıyla eşitler.
 * @param initial Klasör ilk kez eklenirken bulunan videolar Gelen Kutusu'na düşmez.
 */
export function syncFolder(
  db: DatabaseSync,
  folderId: number,
  files: ScannedFile[],
  initial: boolean
): { added: number; changed: boolean } {
  return transaction(db, () => {
    const existing = new Map(
      (
        db
          .prepare('SELECT id, path, size, modified_at, missing FROM videos WHERE folder_id = ?')
          .all(folderId) as {
          id: number
          path: string
          size: number
          modified_at: number
          missing: number
        }[]
      ).map((row) => [row.path, row])
    )

    let added = 0
    let changed = false
    const now = Date.now()
    for (const file of files) {
      const row = existing.get(file.path)
      existing.delete(file.path)
      if (!row) {
        const result = db
          .prepare(
            `INSERT INTO videos (folder_id, path, name, size, modified_at, added_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            folderId,
            file.path,
            file.name,
            file.size,
            Math.round(file.modifiedAt),
            now,
            initial ? 'library' : 'inbox'
          )
        refreshSearchIndex(db, Number(result.lastInsertRowid))
        added++
        changed = true
      } else if (
        row.missing === 1 ||
        row.size !== file.size ||
        row.modified_at !== Math.round(file.modifiedAt)
      ) {
        const contentChanged =
          row.size !== file.size || row.modified_at !== Math.round(file.modifiedAt)
        db.prepare(
          `UPDATE videos SET missing = 0, size = ?, modified_at = ?
           ${contentChanged ? `, media_status = 'pending', quick_hash = NULL` : ''} WHERE id = ?`
        ).run(file.size, Math.round(file.modifiedAt), row.id)
        changed = true
      }
    }

    for (const row of existing.values()) {
      if (row.missing === 0) {
        db.prepare('UPDATE videos SET missing = 1 WHERE id = ?').run(row.id)
        changed = true
      }
    }
    return { added, changed }
  })
}

export function pendingMedia(db: DatabaseSync): { id: number; path: string }[] {
  return db
    .prepare(
      `SELECT id, path FROM videos WHERE media_status = 'pending' AND missing = 0 ORDER BY added_at DESC`
    )
    .all() as { id: number; path: string }[]
}

export interface MediaInfo {
  durationMs: number | null
  width: number | null
  height: number | null
  hasAudio: boolean
  quickHash: string
}

export function saveMediaInfo(db: DatabaseSync, videoId: number, info: MediaInfo | null): void {
  if (!info) {
    db.prepare(`UPDATE videos SET media_status = 'error' WHERE id = ?`).run(videoId)
    return
  }
  transaction(db, () => {
    db.prepare(
      `UPDATE videos SET media_status = 'ready', duration_ms = ?, width = ?, height = ?, has_audio = ?, quick_hash = ?
       WHERE id = ?`
    ).run(info.durationMs, info.width, info.height, info.hasAudio ? 1 : 0, info.quickHash, videoId)
    adoptMissingTwin(db, videoId, info.quickHash)
  })
}

/**
 * Dosya taşındı ya da yeniden adlandırıldıysa eski kaydı "kayıp" olarak kalır.
 * Aynı içeriğe sahip kayıp kayıt bulunursa chip'leri, favori ve gönderim sayısı yeni kayda aktarılır.
 */
function adoptMissingTwin(db: DatabaseSync, videoId: number, quickHash: string): void {
  const twin = db
    .prepare(
      'SELECT id, favorite, send_count, last_sent_at FROM videos WHERE quick_hash = ? AND missing = 1 AND id <> ?'
    )
    .get(quickHash, videoId) as
    { id: number; favorite: number; send_count: number; last_sent_at: number | null } | undefined
  if (!twin) return
  db.prepare(
    'INSERT OR IGNORE INTO video_tags (video_id, tag_id) SELECT ?, tag_id FROM video_tags WHERE video_id = ?'
  ).run(videoId, twin.id)
  db.prepare(
    `UPDATE videos SET favorite = max(favorite, ?), send_count = send_count + ?, last_sent_at = ?, status = 'library' WHERE id = ?`
  ).run(twin.favorite, twin.send_count, twin.last_sent_at, videoId)
  db.prepare('DELETE FROM videos_fts WHERE rowid = ?').run(twin.id)
  db.prepare('DELETE FROM videos WHERE id = ?').run(twin.id)
  refreshSearchIndex(db, videoId)
}

export function insertCreatedVideo(
  db: DatabaseSync,
  folderId: number,
  file: ScannedFile,
  copyTagsFrom: number
): number {
  return transaction(db, () => {
    const result = db
      .prepare(
        `INSERT INTO videos (folder_id, path, name, size, modified_at, added_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'library')
         ON CONFLICT(path) DO UPDATE SET size = excluded.size, modified_at = excluded.modified_at, status = 'library',
           missing = 0, media_status = 'pending', quick_hash = NULL
         RETURNING id`
      )
      .get(folderId, file.path, file.name, file.size, Math.round(file.modifiedAt), Date.now()) as {
      id: number
    }
    db.prepare(
      'INSERT OR IGNORE INTO video_tags (video_id, tag_id) SELECT ?, tag_id FROM video_tags WHERE video_id = ?'
    ).run(result.id, copyTagsFrom)
    refreshSearchIndex(db, result.id)
    return result.id
  })
}

export function renameVideo(db: DatabaseSync, id: number, path: string, name: string): void {
  transaction(db, () => {
    db.prepare('UPDATE videos SET path = ?, name = ? WHERE id = ?').run(path, name, id)
    refreshSearchIndex(db, id)
  })
}

export function deleteVideos(db: DatabaseSync, ids: number[]): void {
  transaction(db, () => {
    for (const id of ids) {
      db.prepare('DELETE FROM videos_fts WHERE rowid = ?').run(id)
      db.prepare('DELETE FROM videos WHERE id = ?').run(id)
    }
  })
}

export function setFavorite(db: DatabaseSync, ids: number[], favorite: boolean): void {
  transaction(db, () => {
    for (const id of ids)
      db.prepare('UPDATE videos SET favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id)
  })
}

export function markSent(db: DatabaseSync, ids: number[]): void {
  const now = Date.now()
  transaction(db, () => {
    for (const id of ids) {
      db.prepare(
        'UPDATE videos SET send_count = send_count + 1, last_sent_at = ? WHERE id = ?'
      ).run(now, id)
    }
  })
}

export function markReviewed(db: DatabaseSync, ids: number[]): void {
  transaction(db, () => {
    for (const id of ids) db.prepare(`UPDATE videos SET status = 'library' WHERE id = ?`).run(id)
  })
}

export function setVideoTags(db: DatabaseSync, videoId: number, tagIds: number[]): void {
  transaction(db, () => {
    db.prepare('DELETE FROM video_tags WHERE video_id = ?').run(videoId)
    for (const tagId of new Set(tagIds)) {
      db.prepare('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)').run(
        videoId,
        tagId
      )
    }
    refreshSearchIndex(db, videoId)
  })
}

export function addTagToVideos(
  db: DatabaseSync,
  videoIds: number[],
  tagId: number,
  add: boolean
): void {
  transaction(db, () => {
    for (const videoId of videoIds) {
      db.prepare(
        add
          ? 'INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)'
          : 'DELETE FROM video_tags WHERE video_id = ? AND tag_id = ?'
      ).run(videoId, tagId)
      refreshSearchIndex(db, videoId)
    }
  })
}

/** Arama indeksi: dosya adı + chip adları, Türkçe karakterler sadeleştirilmiş hâlde. */
export function refreshSearchIndex(db: DatabaseSync, videoId: number): void {
  const row = db
    .prepare(
      `SELECT v.name, (SELECT group_concat(t.name, ' ') FROM video_tags vt JOIN tags t ON t.id = vt.tag_id WHERE vt.video_id = v.id) AS tags
       FROM videos v WHERE v.id = ?`
    )
    .get(videoId) as { name: string; tags: string | null } | undefined
  db.prepare('DELETE FROM videos_fts WHERE rowid = ?').run(videoId)
  if (!row) return
  const text = normalizeForSearch(`${row.name.replace(/\.[^.]+$/, '')} ${row.tags ?? ''}`)
  db.prepare('INSERT INTO videos_fts (rowid, text) VALUES (?, ?)').run(videoId, text)
}

/* ---------------- chip'ler ---------------- */

export function listTags(db: DatabaseSync): Tag[] {
  return db
    .prepare(
      `SELECT t.id, t.name, t.color, t.icon,
        (SELECT count(*) FROM video_tags vt JOIN videos v ON v.id = vt.video_id WHERE vt.tag_id = t.id AND v.missing = 0) AS count
       FROM tags t ORDER BY t.created_at`
    )
    .all() as unknown as Tag[]
}

export function createTag(db: DatabaseSync, input: TagInput): Tag {
  const result = db
    .prepare('INSERT INTO tags (name, color, icon, created_at) VALUES (?, ?, ?, ?)')
    .run(input.name.trim(), input.color, input.icon, Date.now())
  return listTags(db).find((tag) => tag.id === Number(result.lastInsertRowid))!
}

export function updateTag(db: DatabaseSync, id: number, input: TagInput): Tag {
  transaction(db, () => {
    db.prepare('UPDATE tags SET name = ?, color = ?, icon = ? WHERE id = ?').run(
      input.name.trim(),
      input.color,
      input.icon,
      id
    )
    reindexTagVideos(db, id)
  })
  return listTags(db).find((tag) => tag.id === id)!
}

export function deleteTag(db: DatabaseSync, id: number): void {
  transaction(db, () => {
    const videoIds = tagVideoIds(db, id)
    db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    for (const videoId of videoIds) refreshSearchIndex(db, videoId)
  })
}

function tagVideoIds(db: DatabaseSync, tagId: number): number[] {
  return (
    db.prepare('SELECT video_id FROM video_tags WHERE tag_id = ?').all(tagId) as {
      video_id: number
    }[]
  ).map((row) => row.video_id)
}

function reindexTagVideos(db: DatabaseSync, tagId: number): void {
  for (const videoId of tagVideoIds(db, tagId)) refreshSearchIndex(db, videoId)
}

/* ---------------- ayarlar ---------------- */

export const DEFAULT_SETTINGS: Settings = {
  closeToTray: true,
  launchAtLogin: false,
  quickSearchShortcut: 'CommandOrControl+Shift+Space',
  tagMode: 'and'
}

export function getSettings(db: DatabaseSync): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  const stored = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]))
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function updateSettings(db: DatabaseSync, patch: Partial<Settings>): Settings {
  transaction(db, () => {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS) || value === undefined) continue
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(key, JSON.stringify(value))
    }
  })
  return getSettings(db)
}
