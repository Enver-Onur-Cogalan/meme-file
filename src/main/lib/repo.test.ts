import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { migrate } from './db'
import * as repo from './repo'

let db: DatabaseSync
let folderId: number

const file = (name: string, size = 1000): repo.ScannedFile => ({
  path: `/memeler/${name}`,
  name,
  size,
  modifiedAt: 1000
})

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  db.exec('DELETE FROM tags')
  folderId = repo.insertFolder(db, '/memeler').id
})

const names = (videos: { name: string }[]): string[] => videos.map((v) => v.name).sort()

describe('syncFolder', () => {
  it('ilk taramada videolar kütüphaneye, sonradan gelenler Gelen Kutusuna düşer', () => {
    repo.syncFolder(db, folderId, [file('a.mp4')], true)
    repo.syncFolder(db, folderId, [file('a.mp4'), file('b.mp4')], false)
    expect(names(repo.queryVideos(db, { view: 'inbox' }))).toEqual(['b.mp4'])
    expect(repo.getStats(db)).toMatchObject({ total: 2, inbox: 1 })
  })

  it('silinen dosyayı kayıp işaretler, geri gelince chip’leri korur', () => {
    repo.syncFolder(db, folderId, [file('a.mp4')], true)
    const [video] = repo.queryVideos(db, { view: 'library' })
    const tag = repo.createTag(db, { name: 'komik', color: '#f5c542', icon: 'lucide:Laugh' })
    repo.setVideoTags(db, video.id, [tag.id])

    repo.syncFolder(db, folderId, [], false)
    expect(repo.queryVideos(db, { view: 'library' })).toHaveLength(0)

    repo.syncFolder(db, folderId, [file('a.mp4')], false)
    expect(repo.queryVideos(db, { view: 'library' })[0].tagIds).toEqual([tag.id])
  })

  it('yeniden adlandırılan dosya aynı içerik özetiyle chip’lerini devralır', () => {
    repo.syncFolder(db, folderId, [file('eski.mp4')], true)
    const [old] = repo.queryVideos(db, { view: 'library' })
    const tag = repo.createTag(db, { name: 'efsane', color: '#f59a3d', icon: 'lucide:Flame' })
    repo.setVideoTags(db, old.id, [tag.id])
    repo.setFavorite(db, [old.id], true)
    repo.saveMediaInfo(db, old.id, {
      durationMs: 1000,
      width: 10,
      height: 10,
      hasAudio: true,
      quickHash: 'h1'
    })

    repo.syncFolder(db, folderId, [file('yeni.mp4')], false)
    const [renamed] = repo.queryVideos(db, { view: 'library' })
    repo.saveMediaInfo(db, renamed.id, {
      durationMs: 1000,
      width: 10,
      height: 10,
      hasAudio: true,
      quickHash: 'h1'
    })

    const [result] = repo.queryVideos(db, { view: 'library', text: 'efsane' })
    expect(result).toMatchObject({
      name: 'yeni.mp4',
      favorite: true,
      status: 'library',
      tagIds: [tag.id]
    })
    expect(db.prepare('SELECT count(*) AS n FROM videos').get()).toEqual({ n: 1 })
  })
})

describe('queryVideos', () => {
  beforeEach(() => {
    repo.syncFolder(
      db,
      folderId,
      [file('kedi-klavye-bastı.mp4'), file('valorant clutch.mp4'), file('bruh.mp4')],
      true
    )
  })

  const byName = (name: string): number =>
    repo.queryVideos(db, { view: 'library' }).find((v) => v.name === name)!.id

  it('Türkçe karakterden bağımsız ve önek ile arar', () => {
    expect(names(repo.queryVideos(db, { view: 'library', text: 'basti' }))).toEqual([
      'kedi-klavye-bastı.mp4'
    ])
    expect(names(repo.queryVideos(db, { view: 'library', text: 'KLAV' }))).toEqual([
      'kedi-klavye-bastı.mp4'
    ])
    expect(names(repo.queryVideos(db, { view: 'library', text: '"; DROP' }))).toEqual([])
  })

  it('chip filtresi VE / VEYA modlarında çalışır, chip adıyla da aranır', () => {
    const komik = repo.createTag(db, { name: 'komik', color: '#f5c542', icon: 'lucide:Laugh' })
    const tepki = repo.createTag(db, { name: 'tepki', color: '#5cc3e8', icon: 'lucide:Zap' })
    repo.addTagToVideos(db, [byName('bruh.mp4'), byName('kedi-klavye-bastı.mp4')], komik.id, true)
    repo.addTagToVideos(db, [byName('bruh.mp4'), byName('valorant clutch.mp4')], tepki.id, true)

    const and = repo.queryVideos(db, {
      view: 'library',
      tagIds: [komik.id, tepki.id],
      tagMode: 'and'
    })
    const or = repo.queryVideos(db, {
      view: 'library',
      tagIds: [komik.id, tepki.id],
      tagMode: 'or'
    })
    expect(names(and)).toEqual(['bruh.mp4'])
    expect(or).toHaveLength(3)
    expect(names(repo.queryVideos(db, { view: 'library', text: 'tepk' }))).toEqual([
      'bruh.mp4',
      'valorant clutch.mp4'
    ])
    expect(repo.listTags(db).map((t) => t.count)).toEqual([2, 2])

    repo.deleteTag(db, tepki.id)
    expect(repo.queryVideos(db, { view: 'library', text: 'tepki' })).toHaveLength(0)
  })

  it('en çok gönderilenler ve kopyalar görünümleri', () => {
    repo.markSent(db, [byName('bruh.mp4')])
    repo.markSent(db, [byName('bruh.mp4'), byName('valorant clutch.mp4')])
    expect(repo.queryVideos(db, { view: 'most-sent' }).map((v) => v.name)).toEqual([
      'bruh.mp4',
      'valorant clutch.mp4'
    ])

    const info = { durationMs: 1, width: 1, height: 1, hasAudio: false, quickHash: 'same' }
    repo.saveMediaInfo(db, byName('bruh.mp4'), info)
    repo.saveMediaInfo(db, byName('valorant clutch.mp4'), info)
    expect(repo.queryVideos(db, { view: 'duplicates' })).toHaveLength(2)
    expect(repo.getStats(db).duplicates).toBe(2)
  })
})

describe('renameVideo / deleteVideos', () => {
  it('yeniden adlandırınca chip’ler kalır ve yeni adla aranır', () => {
    repo.syncFolder(db, folderId, [file('eski ad.mp4')], true)
    const [video] = repo.queryVideos(db, { view: 'library' })
    const tag = repo.createTag(db, { name: 'komik', color: '#f5c542', icon: 'lucide:Laugh' })
    repo.setVideoTags(db, video.id, [tag.id])

    repo.renameVideo(db, video.id, '/memeler/yepyeni şaka.mp4', 'yepyeni şaka.mp4')
    const [renamed] = repo.queryVideos(db, { view: 'library', text: 'saka' })
    expect(renamed).toMatchObject({ id: video.id, name: 'yepyeni şaka.mp4', tagIds: [tag.id] })
    expect(repo.queryVideos(db, { view: 'library', text: 'eski' })).toHaveLength(0)

    // Watcher sonradan yeni yolu görünce aynı kaydı tanımalı, yeni video açmamalı.
    repo.syncFolder(db, folderId, [file('yepyeni şaka.mp4')], false)
    expect(repo.getStats(db)).toMatchObject({ total: 1, inbox: 0 })
  })

  it('silinen videolar arama indeksinden de çıkar', () => {
    repo.syncFolder(db, folderId, [file('a.mp4'), file('b.mp4')], true)
    const [first] = repo.queryVideos(db, { view: 'library', text: 'a' })
    repo.deleteVideos(db, [first.id])
    expect(repo.queryVideos(db, { view: 'library' }).map((v) => v.name)).toEqual(['b.mp4'])
    expect(db.prepare('SELECT count(*) AS n FROM videos_fts').get()).toEqual({ n: 1 })
  })
})

describe('settings', () => {
  it('varsayılanları döndürür ve sadece bilinen anahtarları kaydeder', () => {
    const settings = repo.updateSettings(db, { tagMode: 'or', unknown: 1 } as never)
    expect(settings.tagMode).toBe('or')
    expect(settings.closeToTray).toBe(true)
    expect(settings).not.toHaveProperty('unknown')
  })
})
