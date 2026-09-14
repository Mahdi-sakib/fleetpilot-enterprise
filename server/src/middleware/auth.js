import { verifyAccessToken } from '../utils/tokens.js';
import { db } from '../db.js';

// Attaches req.user when a valid bearer token is present; does not reject
// the request on its own (some routes need to distinguish "no token" from
// "invalid token").
export function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (user) req.user = user;
  } catch {
    // expired/invalid token — leave req.user unset, requireAuth will 401
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  next();
}
