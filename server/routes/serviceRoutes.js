import { Router } from 'express';
import * as c from '../controllers/serviceController.js';
import { masterOptions } from '../controllers/masterOptionsController.js';
import { protect, allow, can } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
// Services are global master data (Flight, Hotel, Cab…), not company-specific. The Company
// Owner needs to READ them to select a service during Order/Booking creation (req #4), so
// reads include COMPANY_OWNER; creating/editing the service master stays admin-only.
const readStaff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER);
r.get('/', protect, readStaff, c.listServices);
// Read-only dropdown options from a whitelisted master collection (CRS, Bus Type, Vehicle…)
r.get('/master-options/:key', protect, readStaff, masterOptions);
r.post('/', protect, staff, can('admin-services', 'CREATE'), c.createService);
r.put('/:id', protect, staff, can('admin-services', 'EDIT'), c.updateService);
r.delete('/:id', protect, staff, can('admin-services', 'DELETE'), c.deleteService);
export default r;
