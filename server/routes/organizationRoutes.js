import { Router } from 'express';
import * as c from '../controllers/organizationController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
// Main Companies are a 360-agency-level concern — Super Admin only (req #4/#6 access matrix).
// A Company Owner must not reach these, even by calling the API directly.
r.use(protect, allow(ROLES.SUPER_ADMIN));

r.get('/', c.listOrganizations);
r.get('/main', c.listMainCompanies);
r.post('/main', c.createMainCompany);
r.put('/main/:id', c.updateMainCompany);
r.delete('/main/:id', c.deleteMainCompany);
r.put('/profile', c.updateThreeSixty);

export default r;
