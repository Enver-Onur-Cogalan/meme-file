import { DatabaseSync } from 'node:sqlite'
import { beforeAll, describe, expect, it } from 'vitest'
import { migrate } from './db'
import * as repo from './repo'

// Büyüyen kütüphane için performans bütçesi: 5.000 video, 30 chip.
// Bütçeler geniş tutuldu: CI makineleri ve paralel koşan testler yavaşlatabilir; amaç büyük gerilemeleri yakalamak.
const VIDEO_COUNT = 5000

function time(fn: () => unknown): number {
  fn() // ısınma (hazırlanmış sorgular)
  const start = performance.now()
  for (let i = 0; i < 5; i++) fn()
  return (performance.now() - start) / 5
}

describe('büyük kütüphane performansı', () => {
  const db = new DatabaseSync(':memory:')
  const tagIds: number[] = []

  beforeAll(() => {
    migrate(db)
    db.exec('DELETE FROM tags')
    const folderId = repo.insertFolder(db, '/memeler').id
    const words = [
      'kedi',
      'bruh',
      'valorant',
      'clutch',
      'tepki',
      'şok',
      'komik',
      'fail',
      'ace',
      'dans'
    ]
    repo.syncFolder(
      db,
      folderId,
      Array.from({ length: VIDEO_COUNT }, (_, i) => ({
        path: `/memeler/${words[i % 10]}-${words[(i * 7) % 10]}-${i}.mp4`,
        name: `${words[i % 10]}-${words[(i * 7) % 10]}-${i}.mp4`,
        size: 1000 + i,
        modifiedAt: i
      })),
      true
    )
    for (let t = 0; t < 30; t++) {
      tagIds.push(repo.createTag(db, { name: `chip${t}`, color: '#f5c542', icon: 'lucide:Tag' }).id)
    }
    const ids = repo.queryVideos(db, { view: 'library' }).map((v) => v.id)
    for (const [i, id] of ids.entries()) {
      repo.saveMediaInfo(db, id, {
        durationMs: 1000,
        width: 1,
        height: 1,
        hasAudio: true,
        quickHash: `h${i % 4900}`
      })
      if (i % 3 === 0) repo.addTagToVideos(db, [id], tagIds[i % 30], true)
      if (i % 5 === 0) repo.addTagToVideos(db, [id], tagIds[(i + 1) % 30], true)
    }
  }, 60_000)

  const cases: [string, number, () => unknown][] = [
    ['tüm kütüphane', 500, () => repo.queryVideos(db, { view: 'library' })],
    ['arama', 150, () => repo.queryVideos(db, { view: 'library', text: 'kedi' })],
    [
      'chip filtresi (VE)',
      150,
      () => repo.queryVideos(db, { view: 'library', tagIds: tagIds.slice(0, 2) })
    ],
    ['aynı videolar', 150, () => repo.queryVideos(db, { view: 'duplicates' })],
    ['chip listesi + sayılar', 150, () => repo.listTags(db)],
    ['istatistikler', 150, () => repo.getStats(db)],
    ['klasörler', 150, () => repo.listFolders(db)]
  ]

  for (const [name, budget, fn] of cases) {
    it(`${name} ${budget} ms altında`, () => {
      const ms = time(fn)
      console.log(`${name}: ${ms.toFixed(1)} ms`)
      expect(ms).toBeLessThan(budget)
    })
  }
})
