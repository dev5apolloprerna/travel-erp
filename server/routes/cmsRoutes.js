import { Router } from 'express';
import * as c from '../controllers/cmsController.js';
import * as wb from '../controllers/websiteBookingController.js';
import { listInquiries, deleteInquiry } from '../controllers/publicController.js';
import { protect, allow, can } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.use(protect, staff);

// req #4: mutating actions gated by the per-menu permission matrix; reads stay open to anyone
// who can see the menu.
// ---- Destination: main category ----
r.get('/categories', c.listCategories);
r.post('/categories', can('cms-categories', 'CREATE'), c.createCategory);
r.put('/categories/:id', can('cms-categories', 'EDIT'), c.updateCategory);
r.delete('/categories/:id', can('cms-categories', 'DELETE'), c.deleteCategory);

// ---- Destination: sub category ----

// ---- Destination detail ----
r.get('/destinations', c.listDestinations);
r.get('/destinations/:id', c.getDestination);
r.post('/destinations', can('cms-destinations', 'CREATE'), c.createDestination);
r.put('/destinations/:id', can('cms-destinations', 'EDIT'), c.updateDestination);
r.delete('/destinations/:id', can('cms-destinations', 'DELETE'), c.deleteDestination);

// ---- Tour packages ----
r.get('/packages', c.listPackages);
r.get('/packages/:id', c.getPackage);
r.post('/packages', can('cms-packages', 'CREATE'), c.createPackage);
r.put('/packages/:id', can('cms-packages', 'EDIT'), c.updatePackage);
r.delete('/packages/:id', can('cms-packages', 'DELETE'), c.deletePackage);

// ---- FAQ ----
r.get('/faqs', c.listFaqs);
r.post('/faqs', can('cms-content', 'CREATE'), c.createFaq);
r.put('/faqs/:id', can('cms-content', 'EDIT'), c.updateFaq);
r.delete('/faqs/:id', can('cms-content', 'DELETE'), c.deleteFaq);

// ---- Testimonials ----
r.get('/testimonials', c.listTestimonials);
r.post('/testimonials', can('cms-content', 'CREATE'), c.createTestimonial);
r.put('/testimonials/:id', can('cms-content', 'EDIT'), c.updateTestimonial);
r.delete('/testimonials/:id', can('cms-content', 'DELETE'), c.deleteTestimonial);

// ---- Shared image upload ----
r.post('/images', toFolder('cms'), upload.single('file'), c.uploadImage);
r.delete('/images', c.deleteImage);

// ---- Website bookings (admin view) ----
r.get('/bookings', wb.listBookings);
r.get('/bookings/:id', wb.getBooking);
r.put('/bookings/:id', wb.updateBooking);
r.post('/bookings/:id/fulfil', wb.fulfilManually);

// ---- Website inquiries (Super Admin) ----
r.get('/inquiries', listInquiries);
r.delete('/inquiries/:id', deleteInquiry);

export default r;
