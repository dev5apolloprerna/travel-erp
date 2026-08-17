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
r.get('/destinations', p.listDestinations);
r.get('/destinations/:slug', p.getDestination);

// Packages
r.get('/packages', p.listPackages);
r.get('/packages/:slug', p.getPackage);

// Content
r.get('/faqs', p.listFaqs);
r.get('/testimonials', p.listTestimonials);
r.get('/company', p.companyInfo);

// Booking + payment
r.post('/bookings', wb.createBooking);
r.post('/bookings/:id/confirm', wb.confirmPayment);

export default r;
