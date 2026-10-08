import { Router } from 'express';
import * as c from '../controllers/supplierInvoiceController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
// Supplier invoices (Main Company → 360) are a 360-agency-level function — Super Admin only
// (req #4). A Company Owner must not reach these, even by calling the API directly.
r.use(protect, allow(ROLES.SUPER_ADMIN));
r.get('/', c.list);
r.get('/:id/pdf', c.downloadInvoice);   // download PDF (req #5)
r.get('/:id', c.getOne);
r.post('/', c.create);
r.put('/:id', c.update);
r.delete('/:id', c.remove);
export default r;
