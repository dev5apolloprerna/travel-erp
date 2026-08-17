import { Router } from 'express';
import * as c from '../controllers/retailController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);

r.get('/customers', protect, staff, c.listCustomers);
r.post('/customers', protect, staff, c.createCustomer);
r.get('/customers/:id', protect, staff, c.getCustomer);
r.put('/customers/:id', protect, staff, c.updateCustomer);
r.delete('/customers/:id', protect, staff, c.deleteCustomer);
// customer documents (any type)
r.post('/customers/:id/documents', protect, staff, toFolder('customers'), upload.single('file'), c.addCustomerDocument);
r.delete('/customers/:id/documents/:docId', protect, staff, c.deleteCustomerDocument);

r.get('/orders', protect, staff, c.listOrders);
r.post('/orders', protect, staff, c.createOrder);
r.get('/orders/:id', protect, c.getOrder);
r.put('/orders/:id', protect, staff, c.updateOrder);
r.delete('/orders/:id', protect, staff, c.deleteOrder);
r.post('/orders/:id/payments', protect, c.addPayment);
export default r;
