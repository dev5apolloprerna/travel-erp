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
r.post('/change-password', protectWebsiteCustomer, c.changePassword);
r.get('/wishlist', protectWebsiteCustomer, c.myWishlist);

export default r;
