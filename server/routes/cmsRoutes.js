import { Router } from 'express';
import * as c from '../controllers/cmsController.js';
import * as wb from '../controllers/websiteBookingController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.use(protect, staff);

// ---- Destination: main category ----
r.get('/categories', c.listCategories);
r.post('/categories', c.createCategory);
r.put('/categories/:id', c.updateCategory);
r.delete('/categories/:id', c.deleteCategory);

// ---- Destination: sub category ----
r.get('/subcategories', c.listSubCategories);
r.post('/subcategories', c.createSubCategory);
r.put('/subcategories/:id', c.updateSubCategory);
r.delete('/subcategories/:id', c.deleteSubCategory);

// ---- Destination detail ----
r.get('/destinations', c.listDestinations);
r.get('/destinations/:id', c.getDestination);
r.post('/destinations', c.createDestination);
r.put('/destinations/:id', c.updateDestination);
r.delete('/destinations/:id', c.deleteDestination);

// ---- Tour packages ----
r.get('/packages', c.listPackages);
r.get('/packages/:id', c.getPackage);
r.post('/packages', c.createPackage);
r.put('/packages/:id', c.updatePackage);
r.delete('/packages/:id', c.deletePackage);

// ---- FAQ ----
r.get('/faqs', c.listFaqs);
r.post('/faqs', c.createFaq);
r.put('/faqs/:id', c.updateFaq);
r.delete('/faqs/:id', c.deleteFaq);

// ---- Testimonials ----
r.get('/testimonials', c.listTestimonials);
r.post('/testimonials', c.createTestimonial);
r.put('/testimonials/:id', c.updateTestimonial);
r.delete('/testimonials/:id', c.deleteTestimonial);

// ---- Shared image upload ----
r.post('/images', toFolder('cms'), upload.single('file'), c.uploadImage);
r.delete('/images', c.deleteImage);

// ---- Website bookings (admin view) ----
r.get('/bookings', wb.listBookings);
r.get('/bookings/:id', wb.getBooking);
r.put('/bookings/:id', wb.updateBooking);
r.post('/bookings/:id/fulfil', wb.fulfilManually);

export default r;
