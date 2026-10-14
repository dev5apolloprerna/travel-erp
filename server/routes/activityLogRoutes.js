import { Router } from 'express';
import * as c from '../controllers/activityLogController.js';
import { protect, allow, can } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
// Activity logs are a staff reporting screen. Super Admin sees all (org-scoped for others); an
// employee needs READ on the 'admin-activity-logs' menu per the permission matrix.
r.get('/', protect, allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER), can('admin-activity-logs', 'READ'), c.listActivityLogs);
export default r;
