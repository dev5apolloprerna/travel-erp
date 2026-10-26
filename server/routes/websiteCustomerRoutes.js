import { Router } from 'express';
import * as c from '../controllers/websiteCustomerController.js';
import { protectWebsiteCustomer } from '../middleware/websiteAuth.js';
import { upload, toFolder } from '../utils/upload.js';

// Public website-customer auth APIs (v39). Mounted at /api/public/customer. No ERP auth.
const r = Router();

// Open
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', c.resetPassword);

// Authenticated (website-customer JWT)
r.get('/profile', protectWebsiteCustomer, c.profile);
// v59: profile update now also accepts a customer_profile_image upload (multipart/form-data).
r.put('/profile', protectWebsiteCustomer, toFolder('customers'), upload.single('customer_profile_image'), c.updateProfile);
r.post('/change-password', protectWebsiteCustomer, c.changePassword);
r.post('/logout', protectWebsiteCustomer, c.logout);                 // v53: sign out
r.get('/bookings', protectWebsiteCustomer, c.myBookings);            // v53: grouped bookings
r.post('/bookings/cancel', protectWebsiteCustomer, c.cancelMyBooking);      // v59: customer cancels own booking
r.post('/bookings/bill', protectWebsiteCustomer, c.downloadMyBookingBill);  // v59: download booking bill PDF

r.get('/bookings/:type', protectWebsiteCustomer, c.myBookings);      // v53: one category
r.get('/wishlist', protectWebsiteCustomer, c.myWishlist);            // v51: restored
r.post('/wishlist-delete', protectWebsiteCustomer, c.deleteWishlist); // v51: remove one wishlist item

export default r;
