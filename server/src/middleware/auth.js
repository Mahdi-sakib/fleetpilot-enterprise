import { verifyAccessToken } from '../utils/tokens.js';
import { get } from '../db.js';

// Attaches req.user when a valid bearer token is present; does not reject
// the request on its own (some routes need to distinguish "no token" from
// "invalid token").
export async function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await get('SELECT * FROM users WHERE id = ?', [payload.sub]);
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

// 'admin' is the legacy role name kept for accounts created before the
// driver/admin_officer/user role split — it has the same full access as
// 'admin_officer' going forward.
export function isAdminRole(role) {
  return role === 'admin' || role === 'admin_officer';
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!isAdminRole(req.user.role)) return res.status(403).json({ message: 'Admin access required' });
  next();
}
