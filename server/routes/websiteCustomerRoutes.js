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
r.post('/logout', protectWebsiteCustomer, c.logout);                 // v53: sign out
r.get('/bookings', protectWebsiteCustomer, c.myBookings);            // v53: grouped bookings
r.get('/bookings/:type', protectWebsiteCustomer, c.myBookings);      // v53: one category
r.get('/wishlist', protectWebsiteCustomer, c.myWishlist);            // v51: restored
r.post('/wishlist-delete', protectWebsiteCustomer, c.deleteWishlist); // v51: remove one wishlist item

export default r;
