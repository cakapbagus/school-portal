import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let _client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!_client) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;
    if (tursoUrl) {
      _client = createClient({ url: tursoUrl, authToken: tursoToken });
    } else {
      const dbDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      _client = createClient({ url: `file:${path.join(dbDir, 'portal.db')}` });
    }
  }
  return _client;
}

export async function initDb() {
  const db = getDb();

  // settings: prefix s_
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (
    s_key   TEXT PRIMARY KEY,
    s_value TEXT NOT NULL
  )`);

  // folders: prefix f_
  await db.execute(`CREATE TABLE IF NOT EXISTS folders (
    f_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    f_name          TEXT    NOT NULL,
    f_description   TEXT,
    f_icon          TEXT    DEFAULT '📁',
    f_visible       INTEGER DEFAULT 1,
    f_position      INTEGER DEFAULT 0,
    f_password_hash TEXT,
    f_created_at    TEXT    DEFAULT (datetime('now'))
  )`);

  // links: prefix l_
  // l_folder_id NULL = root, integer = berada di dalam folder tsb
  await db.execute(`CREATE TABLE IF NOT EXISTS links (
    l_id                INTEGER PRIMARY KEY AUTOINCREMENT,
    l_folder_id         INTEGER DEFAULT NULL,
    l_type              TEXT    DEFAULT 'link',
    l_label             TEXT    NOT NULL,
    l_url               TEXT    NOT NULL DEFAULT '',
    l_image_url         TEXT,
    l_effect            TEXT    DEFAULT 'none',
    l_bg_color          TEXT,
    l_visible           INTEGER DEFAULT 1,
    l_position          INTEGER DEFAULT 0,
    l_password_hash     TEXT,
    l_scheduler_enabled INTEGER DEFAULT 0,
    l_scheduler_start   TEXT,
    l_scheduler_end     TEXT,
    l_created_at        TEXT    DEFAULT (datetime('now'))
  )`);

  // Seed defaults
  const existing = await db.execute(`SELECT s_value FROM settings WHERE s_key = 'admin_password'`);
  if (existing.rows.length === 0) {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await db.execute({ sql: `INSERT INTO settings (s_key, s_value) VALUES ('admin_password', ?)`, args: [hash] });
    await db.execute({ sql: `INSERT OR IGNORE INTO settings (s_key, s_value) VALUES ('site_title', ?)`,    args: ['School Portal'] });
    await db.execute({ sql: `INSERT OR IGNORE INTO settings (s_key, s_value) VALUES ('site_subtitle', ?)`, args: ['School Link & Information Portal'] });
    await db.execute({ sql: `INSERT OR IGNORE INTO settings (s_key, s_value) VALUES ('site_logo', ?)`,     args: [''] });
    await db.execute({ sql: `INSERT OR IGNORE INTO settings (s_key, s_value) VALUES ('site_banner', ?)`,   args: [''] });
  }
}
