import { Router } from 'express';
import * as c from '../controllers/invoiceController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const r = Router();
// Credit notes listing (req #8) — must be declared before the '/:orderId' param route.
r.get('/credit-notes', protect, c.listCreditNotes);
// Any authenticated user may fetch an invoice they can reach
// (staff from the order screen, customers from their portal).
r.get('/:orderId', protect, c.getForInvoice);
r.get('/:orderId/pdf', protect, c.downloadInvoice);
r.get('/:orderId/preview', protect, c.previewInvoice);
r.post('/:orderId/generate', protect, c.generateInvoiceNo);
r.post('/:orderId/email', protect, c.emailInvoice);
// req #8: cancelling an invoice (and raising its credit note) is Super-Admin only — a Company
// Owner / Employee cannot do this even by calling the API directly.
r.post('/:orderId/cancel', protect, allow(ROLES.SUPER_ADMIN), c.cancelInvoice);
export default r;
