import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { migrate } from './db'

describe('migrate', () => {
  it('şemayı oluşturur ve tekrar çalıştırılınca bozmaz', () => {
    const db = new DatabaseSync(':memory:')
    migrate(db)
    migrate(db)
    db.prepare('INSERT INTO folders (path, added_at) VALUES (?, ?)').run('C:\\Memeler', 1)
    expect(db.prepare('SELECT path FROM folders').all()).toEqual([{ path: 'C:\\Memeler' }])
  })

  it('FTS5 ve unicode61 tokenizer mevcut', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(`CREATE VIRTUAL TABLE t USING fts5(name, tokenize = 'unicode61 remove_diacritics 2')`)
    db.prepare('INSERT INTO t VALUES (?)').run('kedi-klavye-basti')
    expect(db.prepare('SELECT name FROM t WHERE t MATCH ?').all('klavye*')).toHaveLength(1)
  })
})
