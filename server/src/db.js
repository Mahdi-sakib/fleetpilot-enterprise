import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { config } from './config.js';
import { entities, seedData } from './entities.js';
import { newId } from './utils/ids.js';

export const pool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// Thin, promise-based query helpers used throughout the routes — kept
// intentionally small (get/all/run) instead of pulling in an ORM, since
// every query here is a simple, hand-written CRUD statement.
export async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0];
}

export async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return { changes: result.affectedRows, lastInsertRowid: result.insertId };
}

async function exec(sql) {
  await pool.query(sql);
}

// CREATE INDEX has no IF NOT EXISTS in MySQL, so re-running this against an
// already-indexed column would normally error — ignore just that one error.
async function createIndexIfMissing(name, table, column) {
  try {
    await exec(`CREATE INDEX ${name} ON ${table}(${column})`);
  } catch (err) {
    if (err.code !== 'ER_DUP_KEYNAME') throw err;
  }
}

// Adds any column present in an entity's definition but missing from an
// already-created table (e.g. an existing database from before a field was
// added), so the schema stays current without a manual migration step.
// Only additive — new columns must be nullable (no NOT NULL without a
// constant DEFAULT), since there's no way to backfill a required value for
// existing rows here.
async function ensureColumns(table, columnsSql) {
  const existingRows = await all(
    'SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?',
    [config.mysql.database, table],
  );
  const existing = new Set(existingRows.map((r) => r.name));
  for (const raw of columnsSql.split(',')) {
    const def = raw.trim();
    if (!def) continue;
    const match = def.match(/^(\w+)\s+([\s\S]+)$/);
    if (!match) continue;
    const [, name, rest] = match;
    if (existing.has(name) || /PRIMARY KEY/i.test(rest)) continue;
    await exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${rest}`);
  }
}

const USERS_COLUMNS = `
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  driver_id VARCHAR(36),
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  otp_code VARCHAR(10),
  otp_expires_at VARCHAR(40),
  reset_token VARCHAR(255),
  reset_token_expires_at VARCHAR(40),
  google_id VARCHAR(255),
  created_date VARCHAR(40) NOT NULL,
  updated_date VARCHAR(40) NOT NULL
`;

let initialized = null;

// Idempotent — safe to call from every module that needs the DB ready
// (app.js awaits it at import time; tests await it explicitly too).
export function initDb() {
  if (!initialized) initialized = doInit();
  return initialized;
}

// Creates the target database if it doesn't exist yet — convenient for
// local dev/tests. In production the database is normally provisioned by
// the host already, and the app user may not have CREATE privilege outside
// it, so a permission error here is treated as "assume it already exists"
// rather than a fatal startup error.
async function ensureDatabaseExists() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4`);
  } catch (err) {
    if (err.code !== 'ER_DBACCESS_DENIED_ERROR' && err.code !== 'ER_ACCESS_DENIED_ERROR') throw err;
  } finally {
    if (conn) await conn.end();
  }
}

async function doInit() {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  await ensureDatabaseExists();

  await exec(`CREATE TABLE IF NOT EXISTS users (${USERS_COLUMNS}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await ensureColumns('users', USERS_COLUMNS);
  await createIndexIfMissing('idx_users_reset_token', 'users', 'reset_token');
  await createIndexIfMissing('idx_users_google_id', 'users', 'google_id');

  for (const def of Object.values(entities)) {
    await exec(`CREATE TABLE IF NOT EXISTS ${def.table} (${def.columns}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await ensureColumns(def.table, def.columns);
    for (const col of def.indexes || []) {
      await createIndexIfMissing(`idx_${def.table}_${col}`, def.table, col);
    }
  }

  for (const [entityName, rows] of Object.entries(seedData)) {
    const table = entities[entityName].table;
    const { count } = await get(`SELECT COUNT(*) as count FROM ${table}`);
    if (count > 0) continue;
    const now = new Date().toISOString();
    for (const row of rows) {
      await run(`INSERT INTO ${table} (id, name, code, created_date, updated_date) VALUES (?, ?, ?, ?, ?)`, [
        newId(),
        row.name,
        row.code,
        now,
        now,
      ]);
    }
  }
}
