import CreditNote from '../models/CreditNote.js';

/**
 * Shared credit-note generation (req #5). ONE place that both cancellation flows reuse:
 *   • Cancel Invoice (Invoice screen)           — invoiceController.cancelInvoice
 *   • Cancel Order   (Booking → Order screen)   — retailController.cancelOrder
 *
 * It sets the credit-note reference fields on the passed `order` document but does NOT save the
 * order — the caller saves it (so order-level flags like `cancelled` are persisted in the same
 * write) and decides what to log. The CreditNote document itself is created here.
 *
 * Business rules honoured:
 *  - No invoice  -> no credit note (returns { status: 'no-invoice' }).
 *  - Invoice present, none raised yet -> create one (status 'created').
 *  - Credit note already exists for the order -> reuse it, never duplicate (status 'exists').
 *  - Concurrency/duplicate submits -> the unique index on CreditNote.orderId is the final guard;
 *    a duplicate-key race resolves to the existing note (status 'exists').
 *  - Amount follows the existing accounting figure already computed on the invoice
 *    (order.netInvoiceAmount = Gross − Discount − TDS − TCS + Govt Tax + Service Charge).
 *  - Numbering uses the existing per-organization CN-000001 convention (nextCreditNoteNo).
 *
 * @returns {Promise<{status:'no-invoice'|'exists'|'created', creditNote?: object}>}
 */
export async function ensureCreditNoteForOrder(order, { user, reason } = {}) {
  if (!order?.invoiceGenerated) return { status: 'no-invoice' };

  // Already linked on the order?
  if (order.creditNoteId) {
    const linked = await CreditNote.findById(order.creditNoteId);
    if (linked) return { status: 'exists', creditNote: linked };
  }
  // Already exists for this order (e.g. raised by the other flow)?
  const existing = await CreditNote.findOne({ orderId: order._id });
  if (existing) {
    order.invoiceCancelled = true;
    order.invoiceCancelledAt = order.invoiceCancelledAt || new Date();
    order.invoiceCancelReason = order.invoiceCancelReason || (reason || '');
    order.creditNoteId = existing._id;
    order.creditNoteNo = existing.creditNoteNo;
    return { status: 'exists', creditNote: existing };
  }

  // Create a new credit note. On a duplicate-key race, fall back to the winner (no duplicate).
  const creditNoteNo = await CreditNote.nextCreditNoteNo(order.organizationId);
  let cn;
  try {
    cn = await CreditNote.create({
      organizationId: order.organizationId || null,
      creditNoteNo,
      orderId: order._id,
      invoiceNo: order.invoiceNo || '',
      invoiceDate: order.invoiceDate || null,
      amount: order.netInvoiceAmount || 0,
      reason: reason || '',
      createdBy: user?._id,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const race = await CreditNote.findOne({ orderId: order._id });
      if (race) {
        order.invoiceCancelled = true;
        order.invoiceCancelledAt = order.invoiceCancelledAt || new Date();
        order.invoiceCancelReason = order.invoiceCancelReason || (reason || '');
        order.creditNoteId = race._id;
        order.creditNoteNo = race.creditNoteNo;
        return { status: 'exists', creditNote: race };
      }
    }
    throw err;   // genuine failure — caller must NOT mark the order/invoice cancelled
  }

  order.invoiceCancelled = true;
  order.invoiceCancelledAt = new Date();
  order.invoiceCancelReason = reason || '';
  order.creditNoteId = cn._id;
  order.creditNoteNo = cn.creditNoteNo;
  return { status: 'created', creditNote: cn };
}
