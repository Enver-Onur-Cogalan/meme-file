import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('ffmpeg-static', () => ({ default: '/bin/ffmpeg' }))

const { importFiles, defaultImportFolder } = await import('./import')
const { migrate } = await import('./db')
const repo = await import('./repo')

type Watcher = Parameters<typeof importFiles>[1]

let db: DatabaseSync
let library: string
let downloads: string
let synced: number[]
const watcher = { sync: async (id: number) => void synced.push(id) } as unknown as Watcher

beforeEach(async () => {
  db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  library = await mkdtemp(join(tmpdir(), 'meme-lib-'))
  downloads = await mkdtemp(join(tmpdir(), 'meme-dl-'))
  synced = []
})

const source = async (name: string, content = 'video'): Promise<string> => {
  const path = join(downloads, name)
  await writeFile(path, content)
  return path
}

describe('importFiles', () => {
  it('videoları hedef klasöre kopyalar ve klasörü yeniden tarar', async () => {
    const folderId = repo.insertFolder(db, library).id
    const result = await importFiles(
      db,
      watcher,
      [await source('komik: klip.mp4'), await source('notes.txt')],
      folderId
    )

    expect(result).toMatchObject({ imported: 1, skipped: 1, alreadyInLibrary: 0, folderId })
    expect(await readdir(library)).toEqual(['komik klip.mp4'])
    expect(synced).toEqual([folderId])
  })

  it('aynı dosya tekrar bırakılınca kopyasını oluşturmaz', async () => {
    const folderId = repo.insertFolder(db, library).id
    const file = await source('bruh.mp4')
    await importFiles(db, watcher, [file], folderId)
    const second = await importFiles(db, watcher, [file], folderId)

    expect(second).toMatchObject({ imported: 0, alreadyInLibrary: 1 })
    expect(await readdir(library)).toEqual(['bruh.mp4'])
  })

  it('zaten kütüphanedeki klasörden gelen dosyayı kopyalamaz', async () => {
    const folderId = repo.insertFolder(db, library).id
    const inside = join(library, 'already.mp4')
    await writeFile(inside, 'video')

    const result = await importFiles(db, watcher, [inside], folderId)
    expect(result).toMatchObject({ imported: 0, alreadyInLibrary: 1 })
    expect(await readdir(library)).toEqual(['already.mp4'])
  })
})

describe('defaultImportFolder', () => {
  it('tercih edilen klasör yoksa ilk klasöre düşer', () => {
    expect(defaultImportFolder(db, 5)).toBeNull()
    const first = repo.insertFolder(db, library).id
    const second = repo.insertFolder(db, downloads).id
    expect(defaultImportFolder(db, second)).toBe(second)
    expect(defaultImportFolder(db, 999)).toBe(first)
  })
})
