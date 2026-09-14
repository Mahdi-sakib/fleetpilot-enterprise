import { Router } from 'express';
import { db } from '../db.js';
import { entities } from '../entities.js';
import { newId } from '../utils/ids.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

function resolveEntity(req, _res, next) {
  const def = entities[req.params.entity];
  if (!def) throw new ApiError(404, `Unknown entity "${req.params.entity}"`);
  req.entityDef = def;
  next();
}

function allowedColumns(def) {
  return new Set(['id', 'created_date', 'updated_date', ...Object.keys(def.schema.shape)]);
}

function parseSort(sort, def) {
  if (!sort) return { column: 'created_date', direction: 'DESC' };
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  if (!allowedColumns(def).has(column)) throw new ApiError(400, `Cannot sort by "${column}"`);
  return { column, direction: desc ? 'DESC' : 'ASC' };
}

function parseLimit(limit) {
  const n = Number(limit);
  if (!limit || Number.isNaN(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

router.param('entity', resolveEntity);

router.get('/:entity', (req, res) => {
  const def = req.entityDef;
  const { column, direction } = parseSort(req.query.sort, def);
  const limit = parseLimit(req.query.limit);
  const rows = db
    .prepare(`SELECT * FROM ${def.table} ORDER BY ${column} ${direction} LIMIT ?`)
    .all(limit);
  res.json(rows);
});

// POST because equality filters are sent as a JSON body (mirrors the
// object-based `.filter({...})` calls the frontend already makes).
router.post('/:entity/query', (req, res) => {
  const def = req.entityDef;
  const columns = allowedColumns(def);
  const filters = req.body && typeof req.body === 'object' ? req.body : {};
  const clauses = [];
  const values = [];
  for (const [key, value] of Object.entries(filters)) {
    if (!columns.has(key)) throw new ApiError(400, `Cannot filter by "${key}"`);
    clauses.push(`${key} = ?`);
    values.push(value);
  }
  const { column, direction } = parseSort(req.query.sort, def);
  const limit = parseLimit(req.query.limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM ${def.table} ${where} ORDER BY ${column} ${direction} LIMIT ?`)
    .all(...values, limit);
  res.json(rows);
});

router.get('/:entity/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM ${req.entityDef.table} WHERE id = ?`).get(req.params.id);
  if (!row) throw new ApiError(404, 'Not found');
  res.json(row);
});

router.post('/:entity', (req, res) => {
  const def = req.entityDef;
  const parsed = def.schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Validation failed', { issues: parsed.error.issues });

  const now = new Date().toISOString();
  const record = { ...def.defaults, ...parsed.data, id: newId(), created_date: now, updated_date: now };
  const columns = Object.keys(record);
  const placeholders = columns.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${def.table} (${columns.join(', ')}) VALUES (${placeholders})`).run(
    ...columns.map((c) => record[c] ?? null),
  );
  res.status(201).json(record);
});

router.patch('/:entity/:id', (req, res) => {
  const def = req.entityDef;
  const existing = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(req.params.id);
  if (!existing) throw new ApiError(404, 'Not found');

  const parsed = def.schema.partial().safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Validation failed', { issues: parsed.error.issues });
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return res.json(existing);

  const now = new Date().toISOString();
  const columns = Object.keys(updates);
  const setClause = columns.map((c) => `${c} = ?`).join(', ');
  db.prepare(`UPDATE ${def.table} SET ${setClause}, updated_date = ? WHERE id = ?`).run(
    ...columns.map((c) => updates[c] ?? null),
    now,
    req.params.id,
  );
  res.json(db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(req.params.id));
});

router.delete('/:entity/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM ${req.entityDef.table} WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) throw new ApiError(404, 'Not found');
  res.status(204).end();
});

export default router;
