import { Router } from 'express';
import * as c from '../controllers/serviceController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.get('/', protect, staff, c.listServices);
r.post('/', protect, staff, c.createService);
r.put('/:id', protect, staff, c.updateService);
r.delete('/:id', protect, staff, c.deleteService);
export default r;
