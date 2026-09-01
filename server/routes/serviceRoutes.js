import { Router } from 'express';
import * as c from '../controllers/serviceController.js';
import { masterOptions } from '../controllers/masterOptionsController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.get('/', protect, staff, c.listServices);
// Read-only dropdown options from a whitelisted master collection (CRS, Bus Type, Vehicle…)
r.get('/master-options/:key', protect, staff, masterOptions);
r.post('/', protect, staff, c.createService);
r.put('/:id', protect, staff, c.updateService);
r.delete('/:id', protect, staff, c.deleteService);
export default r;
