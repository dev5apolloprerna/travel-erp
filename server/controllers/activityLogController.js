import ActivityLog from '../models/ActivityLog.js';
import { ROLES } from '../models/User.js';

// GET /api/activity-logs?module=&action=&limit=
// Newest first. Org-scoped for non-super-admins (legacy/unset orgs left unrestricted, matching
// the app's scopeToOrg convention).
export const listActivityLogs = async (req, res) => {
  const filter = {};
  if (req.user?.role !== ROLES.SUPER_ADMIN && req.user?.organizationId) filter.organizationId = req.user.organizationId;
  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const rows = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json(rows);
};
