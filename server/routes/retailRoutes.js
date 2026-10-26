import { Router } from 'express';
import * as c from '../controllers/retailController.js';
import { protect, allow, can } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER);
// A logged-in retail customer may view their OWN orders/invoices from their portal.
// listOrders/getOrder force the filter to their own customerId, so this is safe.
const staffOrCustomer = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER, ROLES.RETAIL_CUSTOMER);

r.get('/customers', protect, staff, c.listCustomers);
r.post('/customers', protect, staff, can('retail-customers', 'CREATE'), c.createCustomer);
r.get('/customers/:id', protect, staff, c.getCustomer);
r.put('/customers/:id', protect, staff, can('retail-customers', 'EDIT'), c.updateCustomer);
r.delete('/customers/:id', protect, staff, can('retail-customers', 'DELETE'), c.deleteCustomer);
// customer documents (any type)
r.post('/customers/:id/documents', protect, staff, toFolder('customers'), upload.single('file'), c.addCustomerDocument);
r.delete('/customers/:id/documents/:docId', protect, staff, c.deleteCustomerDocument);

// req #9: order actions are gated by the per-menu permission matrix ('retail-orders'), enforced
// on the backend. Super Admin bypasses; Company Owner may create/edit but never delete (req #8);
// employees need the specific action; legacy employees fall back to their old menu access.
r.get('/orders', protect, staffOrCustomer, c.listOrders);   // customers see only their own (controller-enforced)
r.post('/orders', protect, staff, can('retail-orders', 'CREATE'), c.createOrder);
r.get('/orders/:id', protect, staffOrCustomer, c.getOrder);
r.put('/orders/:id', protect, staff, can('retail-orders', 'EDIT'), c.updateOrder);
r.put('/orders/:id/hold', protect, staff, can('retail-orders', 'EDIT'), c.holdOrder);       // req #1
r.put('/orders/:id/release', protect, staff, can('retail-orders', 'EDIT'), c.releaseOrder);  // req #1
r.put('/orders/:id/cancel', protect, staff, can('retail-orders', 'EDIT'), c.cancelOrder);    // only after invoice generated (req #2)
r.delete('/orders/:id', protect, staff, can('retail-orders', 'DELETE'), c.deleteOrder);      // blocked after invoice/cancel (req #2)
r.post('/orders/:id/payments', protect, c.addPayment);
export default r;
