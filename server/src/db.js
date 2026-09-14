import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { entities, seedData } from './entities.js';
import { newId } from './utils/ids.js';

// Uses Node's built-in SQLite (stable in Node 22.5+) instead of a native
// module — avoids requiring a C++ toolchain (Visual Studio Build Tools on
// Windows, Xcode CLT on macOS) just to install dependencies.
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

export const db = new DatabaseSync(config.dbPath);

// WAL gives readers/writers concurrent access instead of locking the whole
// file on every write — meaningful once more than one request hits the API
// at once (e.g. the dashboard's parallel entity fetches).
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    driver_id TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    otp_code TEXT,
    otp_expires_at TEXT,
    reset_token TEXT,
    reset_token_expires_at TEXT,
    google_id TEXT,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
`);

// Adds any column present in an entity's definition but missing from an
// already-created table (e.g. an existing local dev.db from before a field
// was added), so `data/*.db` doesn't need to be deleted after every schema
// change. Only additive — new columns must be nullable (no NOT NULL without
// a constant DEFAULT), since SQLite can't backfill a required value for
// existing rows.
function ensureColumns(table, columnsSql) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const raw of columnsSql.split(',')) {
    const def = raw.trim();
    if (!def) continue;
    const match = def.match(/^(\w+)\s+([\s\S]+)$/);
    if (!match) continue;
    const [, name, rest] = match;
    if (existing.has(name) || /PRIMARY KEY/i.test(rest)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${rest}`);
  }
}

for (const def of Object.values(entities)) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${def.table} (${def.columns});`);
  ensureColumns(def.table, def.columns);
  for (const col of def.indexes || []) {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${def.table}_${col} ON ${def.table}(${col});`);
  }
}

for (const [entityName, rows] of Object.entries(seedData)) {
  const table = entities[entityName].table;
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  if (count > 0) continue;
  const now = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO ${table} (id, name, code, created_date, updated_date) VALUES (?, ?, ?, ?, ?)`);
  for (const row of rows) insert.run(newId(), row.name, row.code, now, now);
}
