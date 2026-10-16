import { Router } from 'express';
import * as c from '../controllers/websiteCustomerController.js';
import { protectWebsiteCustomer } from '../middleware/websiteAuth.js';

// Public website-customer auth APIs (v39). Mounted at /api/public/customer. No ERP auth.
const r = Router();

// Open
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', c.resetPassword);

// Authenticated (website-customer JWT)
r.get('/profile', protectWebsiteCustomer, c.profile);
r.put('/profile', protectWebsiteCustomer, c.updateProfile);          // v50 (Task 4)
r.post('/change-password', protectWebsiteCustomer, c.changePassword);
// v50 (Task 3): GET /api/public/customer/wishlist was removed on request.

export default r;
