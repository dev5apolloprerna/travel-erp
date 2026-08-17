import { Router } from 'express';
import * as c from '../controllers/settingsController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);

r.get('/', protect, staff, c.getSettings);
r.put('/', protect, staff, c.updateSettings);
r.post('/test-smtp', protect, staff, c.testSmtp);
export default r;
