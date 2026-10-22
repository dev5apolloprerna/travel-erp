import { Router } from 'express';
import * as c from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';

const r = Router();
// Any authenticated user may fetch an invoice they can reach
// (staff from the order screen, customers from their portal).
r.get('/:orderId', protect, c.getForInvoice);
r.get('/:orderId/pdf', protect, c.downloadInvoice);
r.get('/:orderId/preview', protect, c.previewInvoice);
r.post('/:orderId/generate', protect, c.generateInvoiceNo);
r.post('/:orderId/email', protect, c.emailInvoice);
export default r;
