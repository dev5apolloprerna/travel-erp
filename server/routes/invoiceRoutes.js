import { Router } from 'express';
import * as c from '../controllers/invoiceController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
// Credit notes listing + document — declared before the '/:orderId' param route.
r.get('/credit-notes', protect, c.listCreditNotes);
r.get('/credit-notes/:id/pdf', protect, c.downloadCreditNote);
// Multi-invoice clubbing (v65). Listing for the clubbing UI + the consolidate action.
// Clubbing is a consolidation accounting action — Super-Admin only (like invoice cancel).
r.get('/', protect, allow(ROLES.SUPER_ADMIN), c.listInvoices);
r.post('/club', protect, allow(ROLES.SUPER_ADMIN), c.clubInvoices);
// Any authenticated user may fetch an invoice they can reach
// (staff from the order screen, customers from their portal).
r.get('/:orderId', protect, c.getForInvoice);
r.get('/:orderId/pdf', protect, c.downloadInvoice);
r.get('/:orderId/preview', protect, c.previewInvoice);
r.post('/:orderId/generate', protect, c.generateInvoiceNo);
r.post('/:orderId/email', protect, c.emailInvoice);
// Cancelling an invoice (and raising its credit note) is SUPER ADMIN only. Company Owner and
// Company Employee may edit and hold invoices/orders but must NOT cancel or delete them.
// Enforced on the backend so a direct API/URL request from either role is rejected 403. (When a
// Super Admin cancels an invoice that was created by an employee, the credit note still generates.)
r.post('/:orderId/cancel', protect, allow(ROLES.SUPER_ADMIN), c.cancelInvoice);
export default r;
