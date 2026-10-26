import { Router } from 'express';
import * as c from '../controllers/cmsController.js';
import * as wb from '../controllers/websiteBookingController.js';
import { listInquiries, deleteInquiry } from '../controllers/publicController.js';
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

// ---- Website inquiries (Super Admin) ----
r.get('/inquiries', listInquiries);
r.delete('/inquiries/:id', deleteInquiry);

// ---- v39 Website masters (gated by the per-menu permission matrix) ----
r.get('/banners', wm.listBanners);
r.post('/banners', can('cms-banners', 'CREATE'), wm.createBanner);
r.put('/banners/:id', can('cms-banners', 'EDIT'), wm.updateBanner);
r.delete('/banners/:id', can('cms-banners', 'DELETE'), wm.deleteBanner);

r.get('/videos', wm.listVideos);
r.post('/videos', can('cms-videos', 'CREATE'), wm.createVideo);
r.put('/videos/:id', can('cms-videos', 'EDIT'), wm.updateVideo);
r.delete('/videos/:id', can('cms-videos', 'DELETE'), wm.deleteVideo);

// ---- Other Pages (v58) — list / view / edit only ----
r.get('/other-pages', wm.listOtherPages);
r.get('/other-pages/:id', wm.getOtherPage);
r.put('/other-pages/:id', can('cms-other-pages', 'EDIT'), wm.updateOtherPage);

r.get('/team', wm.listTeam);
r.post('/team', can('cms-team', 'CREATE'), wm.createTeam);
r.put('/team/:id', can('cms-team', 'EDIT'), wm.updateTeam);
r.delete('/team/:id', can('cms-team', 'DELETE'), wm.deleteTeam);

// Travel Inspiration + Customize Trip (admin listings; read-only here)
r.get('/travel-inspirations', wm.listTravelInspirations);
r.get('/customize-trips', wm.listCustomizeTrips);
r.get('/customize-trips/:id', wm.getCustomizeTrip);

export default r;
