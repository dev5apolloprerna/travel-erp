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
