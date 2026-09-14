import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { entities } from './entities.js';

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

for (const def of Object.values(entities)) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${def.table} (${def.columns});`);
  for (const col of def.indexes || []) {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${def.table}_${col} ON ${def.table}(${col});`);
  }
}
