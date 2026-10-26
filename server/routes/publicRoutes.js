import { Router } from 'express';
import * as p from '../controllers/publicController.js';
import * as wb from '../controllers/websiteBookingController.js';

/**
 * Public API for the marketing website. No authentication.
 * Only active records are returned and prices are always taken from the database.
 */
const r = Router();

// Destinations
r.get('/navigation', p.navigationTree);
r.get('/destination_categories', p.destinationCategoriesList);
r.get('/destinations_page', p.destinationsPage);
r.get('/destinations', p.listDestinations);
r.get('/destinations/:slug', p.getDestination);

// Packages
r.get('/packages', p.listPackages);
r.get('/packages/:slug', p.getPackage);

// Content
r.get('/faqs', p.listFaqs);
r.get('/testimonials', p.listTestimonials);
r.get('/company', p.companyInfo);

// Inquiry (contact form)
r.post('/inquiry', p.createInquiry);

// Booking + payment
r.post('/bookings', wb.createBooking);
r.post('/bookings/:id/confirm', wb.confirmPayment);
r.post('/bookings/:id/fail', wb.markPaymentFailed);   // v51: record a failed/cancelled payment

// v39 public store endpoints
r.post('/travel-inspiration', p.storeTravelInspiration);
r.post('/customize-trip', p.storeCustomizeTrip);
r.get('/our-team', p.listOurTeamPublic);
r.get('/banners', p.listBannersPublic);
r.get('/video-gallery', p.listVideosPublic);
r.get('/other-pages/:id?', p.listOtherPagesPublic);   // v58: id => one, no id => all
r.post('/wishlist', p.storeWishlist);   // v51: restored

export default r;
