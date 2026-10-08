import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ROLES } from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found or inactive' });

    req.user = user;
    // Organization context for the 3-layer structure (Phase 1).
    req.orgId = user.organizationId || null;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Server-side tenant isolation helper. Mutates/returns a Mongo filter so a query
// only sees the caller's organization. SUPER_ADMIN is unrestricted (sees all),
// which keeps every existing Super Admin flow unchanged. Users with no org set
// (legacy rows before backfill) are also left unrestricted to avoid breakage.
export const scopeToOrg = (filter = {}, req) => {
  if (!req?.user) return filter;
  if (req.user.role === ROLES.SUPER_ADMIN) return filter;
  if (!req.user.organizationId) return filter;
  return { ...filter, organizationId: req.user.organizationId };
};

// Assert a fetched document belongs to the caller's org (defense against ID tampering).
// Returns true if access is allowed.
export const ownsOrg = (doc, req) => {
  if (!doc) return false;
  if (!req?.user || req.user.role === ROLES.SUPER_ADMIN) return true;
  if (!req.user.organizationId) return true;                 // legacy/unset — don't block
  if (!doc.organizationId) return true;                      // legacy record — don't block
  return String(doc.organizationId) === String(req.user.organizationId);
};

// role-based guard: allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN)
export const allow = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};

/**
 * req #9: per-menu action permission check (Select/Read/Create/Edit/Delete/Export/Import).
 * Enforced on the BACKEND so permissions can't be bypassed by hitting the URL/API directly.
 *   - SUPER_ADMIN and legacy 'ALL' users: full access.
 *   - COMPANY_OWNER: broad access, but NEVER delete (req #8) — invoice cancel is Super-Admin-only.
 *   - EMPLOYEE: governed by their stored `permissions` matrix; legacy employees that only have
 *     the old `menus` list fall back to full access on a granted menu (preserves prior behaviour).
 */
export const hasPermission = (user, menuKey, action) => {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if ((user.menus || []).includes('ALL')) return true;
  if (user.role === ROLES.COMPANY_OWNER) return action !== 'DELETE';
  const perms = user.permissions && typeof user.permissions === 'object' ? user.permissions : null;
  if (perms && Array.isArray(perms[menuKey])) return perms[menuKey].includes(action);
  // Legacy fallback: before the matrix existed, having a menu implied full rights in it.
  if ((user.menus || []).includes(menuKey)) return true;
  return false;
};

export const can = (menuKey, action) => (req, res, next) => {
  if (hasPermission(req.user, menuKey, action)) return next();
  return res.status(403).json({ message: `Forbidden: you lack '${action}' permission for this menu.` });
};
