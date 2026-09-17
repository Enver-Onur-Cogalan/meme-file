import { DatabaseSync } from 'node:sqlite'

// Her eleman bir şema sürümü. Mevcut maddeler değiştirilmez, sadece sona eklenir.
const MIGRATIONS = [
  `CREATE TABLE folders (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    watch INTEGER NOT NULL DEFAULT 1,
    added_at INTEGER NOT NULL
  )`,
  `CREATE TABLE videos (
    id INTEGER PRIMARY KEY,
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    has_audio INTEGER,
    quick_hash TEXT,
    media_status TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'inbox',
    missing INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    send_count INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER
  );
  CREATE INDEX videos_folder ON videos(folder_id);
  CREATE INDEX videos_hash ON videos(quick_hash);
  CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE video_tags (
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, tag_id)
  );
  CREATE INDEX video_tags_tag ON video_tags(tag_id);
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE VIRTUAL TABLE videos_fts USING fts5(text, tokenize = 'unicode61 remove_diacritics 2');`,
  // İlk açılışta boş görünmesin diye başlangıç chip'leri; kullanıcı silebilir/düzenleyebilir.
  `INSERT OR IGNORE INTO tags (name, color, icon, created_at) VALUES
    ('komik', '#f5c542', 'lucide:Laugh', 1),
    ('tepki', '#5cc3e8', 'lucide:Zap', 2),
    ('efsane', '#f59a3d', 'lucide:Flame', 3),
    ('cringe', '#b69cf2', 'lucide:Skull', 4),
    ('oyun', '#f2665a', 'lucide:Gamepad2', 5),
    ('müzikli', '#7fd47f', 'lucide:Music', 6)`,
  // playback: native | pending | converting | ready | error. Mevcut videolar codec bilgisi için yeniden taranır.
  `ALTER TABLE videos ADD COLUMN video_codec TEXT;
  ALTER TABLE videos ADD COLUMN audio_codec TEXT;
  ALTER TABLE videos ADD COLUMN playback TEXT NOT NULL DEFAULT 'native';
  ALTER TABLE videos ADD COLUMN converted_path TEXT;
  UPDATE videos SET media_status = 'pending' WHERE missing = 0;`
]

export function openDatabase(file: string): DatabaseSync {
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  return db
}

export function migrate(db: DatabaseSync): void {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as {
    user_version: number
  }
  for (let version = current; version < MIGRATIONS.length; version++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[version])
      db.exec(`PRAGMA user_version = ${version + 1}`)
    })
  }
}

export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
