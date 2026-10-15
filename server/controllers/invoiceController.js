import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import Service from '../models/Service.js';
import CreditNote from '../models/CreditNote.js';
import { ensureCreditNoteForOrder } from '../services/creditNoteService.js';
import { buildInvoicePdf, invoiceToBuffer } from '../utils/invoicePdf.js';
import { sendMail } from '../utils/mailer.js';
import { ownsOrg } from '../middleware/auth.js';
import { computeService, applyFooter } from '../invoiceCalc.js';
import { SERVICE_CHARGES } from '../invoiceCalc.js';
import { logActivity } from '../utils/activityLog.js';

// Extract the common footer fields from a calculator result onto the order.
const footerFields = (t) => ({
  discountAmount: t.discountAmount,
  tdsAmount: t.tdsAmount,
  tcsAmount: t.tcsAmount,
  govtTaxAmount: t.govtTaxAmount,
  serviceChargeAmount: t.serviceChargeAmount,   // req #7
  netInvoiceAmount: t.netInvoiceAmount,
});

// req #7: which party type this order bills (keeps the hierarchy distinction explicit).
const billedToTypeFor = (order) => {
  if (order.companyId) return 'B2B_COMPANY';
  if (order.module === 'FIT' || order.societyPassenger?.passengerId) return 'SOCIETY';
  return 'RETAIL_CUSTOMER';
};

// Load order + the party it's billed to (retail customer or B2B company)
const loadInvoiceData = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return null;

  let party = null;
  if (order.customerId) party = await Customer.findById(order.customerId);
  else if (order.companyId) party = await Company.findById(order.companyId);

  const settings = await Settings.getSettings();
  return { order, party, settings };
};

/**
 * Resolve the invoice prefix for an order from its service.
 * Orders carry one service, so the prefix is that service's `invoicePrefix`
 * (set by the admin in Service Master). Falls back sensibly for older data.
 */
const prefixForOrder = async (order) => {
  // A package invoice carries several services, so it gets its own PKG-###### sequence.
  if (order.isPackage) return 'PKG';
  const line = (order.services || [])[0];
  if (line?.serviceRef) {
    const master = await Service.findById(line.serviceRef).select('invoicePrefix name').lean();
    if (master?.invoicePrefix) return master.invoicePrefix;
    // No prefix configured yet -> derive one from the service name (FLIGHT -> FLI)
    if (master?.name) return master.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  }
  if (line?.serviceType) return line.serviceType.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  // Last resort: the old domestic / international scheme
  return order.invoiceType === 'INTERNATIONAL' ? 'INT' : 'DOM';
};

/**
 * Assign an invoice number on first generation (e.g. FLT-000001) and ALWAYS persist the order.
 * Root-cause fix (req #3): previously this returned early when an invoice number already existed,
 * so on a regenerate — or after a preview/download that had already assigned the number — the newly
 * computed charge heads and totals were never saved, leaving the stored amount (and the PDF) at 0.
 * Now the number is only generated when missing, but the order is saved every time.
 */
const ensureInvoiceNo = async (order) => {
  if (!order.invoiceNo) {
    order.invoiceNo = await Order.nextInvoiceNo(await prefixForOrder(order));
  }
  if (!order.invoiceDate) order.invoiceDate = new Date();
  await order.save();
  return order;
};

// GET /api/invoices/:orderId/pdf  -> streams the PDF
export const downloadInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data || !ownsOrg(data.order, req)) return res.status(404).json({ message: 'Order not found' });

  await ensureInvoiceNo(data.order);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${data.order.invoiceNo}.pdf"`);
  buildInvoicePdf(data, res);
};

// GET /api/invoices/:orderId/preview -> inline PDF (opens in browser tab)
export const previewInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data || !ownsOrg(data.order, req)) return res.status(404).json({ message: 'Order not found' });

  await ensureInvoiceNo(data.order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${data.order.invoiceNo}.pdf"`);
  buildInvoicePdf(data, res);
};

// POST /api/invoices/:orderId/email  { to? }
export const emailInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data || !ownsOrg(data.order, req)) return res.status(404).json({ message: 'Order not found' });

  const { order, party, settings } = data;
  await ensureInvoiceNo(order);

  const to = req.body.to || party?.email;
  if (!to) return res.status(400).json({ message: 'No recipient email found for this order' });

  const pdf = await invoiceToBuffer(data);

  const result = await sendMail({
    to,
    subject: `Invoice ${order.invoiceNo} — ${settings.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
        <p>Dear ${party?.name || 'Customer'},</p>
        <p>Please find attached invoice <b>${order.invoiceNo}</b>
           dated ${new Date(order.invoiceDate).toLocaleDateString('en-IN')}
           for a total of <b>Rs. ${(order.totalAmount || 0).toLocaleString('en-IN')}</b>.</p>
        <p>Thank you for your business.</p>
        <p>Regards,<br/>${settings.companyName}</p>
      </div>`,
    attachments: [{ filename: `${order.invoiceNo}.pdf`, content: pdf }],
  });

  if (!result.sent) return res.status(400).json({ message: result.error || 'Failed to send invoice email' });
  res.json({ message: `Invoice emailed to ${to}`, invoiceNo: order.invoiceNo });
};

// Compute gross + net from the manually-entered charge heads.
// Net = Gross - Discount - TDS - TCS + Govt Tax   (sign convention confirmed with client)
export const computeInvoiceTotals = (charges = {}, footer = {}) => {
  const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const c = {
    basic: num(charges.basic), yqTax: num(charges.yqTax), yrTax: num(charges.yrTax),
    k3Tax: num(charges.k3Tax), ocTax: num(charges.ocTax), otherTax: num(charges.otherTax),
    processingCharges: num(charges.processingCharges), otherCharges: num(charges.otherCharges),
    markup: num(charges.markup),
  };
  const grossTotal = num(
    c.basic + c.yqTax + c.yrTax + c.k3Tax + c.ocTax + c.otherTax +
    c.processingCharges + c.otherCharges + c.markup
  );
  const discountAmount = num(footer.discountAmount);
  const tdsAmount = num(footer.tdsAmount);
  const govtTaxAmount = num(footer.govtTaxAmount);
  const tcsAmount = num(footer.tcsAmount);
  const serviceChargeAmount = num(footer.serviceChargeAmount);   // req #7
  const netInvoiceAmount = num(grossTotal - discountAmount - tdsAmount - tcsAmount + govtTaxAmount + serviceChargeAmount);
  return { charges: c, grossTotal, discountAmount, tdsAmount, govtTaxAmount, tcsAmount, serviceChargeAmount, netInvoiceAmount };
};

// GET /api/invoices/:orderId  -> order + party (works for retail/b2b/society)
export const getForInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data || !ownsOrg(data.order, req)) return res.status(404).json({ message: 'Order not found' });
  // Tell the screen which service calculator + charge heads to render.
  const serviceType = (data.order.services?.[0]?.serviceType || 'FLIGHT').toUpperCase();
  const def = SERVICE_CHARGES[serviceType] || SERVICE_CHARGES.FLIGHT;
  // req #3: for a package order, the screen enters one amount per included service instead of the
  // service-charge grid. Expose the included services so the client can render that breakdown.
  const packageServices = (data.order.services || []).map((s, i) => ({
    index: i,
    serviceType: s.serviceType,
    label: [s.serviceType, s.airline || s.hotelName || s.train || s.bus || s.visaCountry || s.eventTitle || '']
      .filter(Boolean).join(' — '),
  }));

  res.json({
    order: data.order,
    party: data.party,
    isPackage: !!data.order.isPackage,
    packageServices,
    calc: {
      serviceType,
      isHotel: serviceType === 'HOTEL',
      charges: def.charges || [],
      markups: def.markups || [],
      labels: def.labels || {},
    },
  });
};

// POST /api/invoices/:orderId/generate
// Body: { charges:{...}, discountAmount, tdsAmount, govtTaxAmount, tcsAmount, invoiceDate, invoiceNotes }
// Saves the charge heads, computes totals, assigns the service-prefixed number.
export const generateInvoiceNo = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });

  // req #1: an order on hold cannot be invoiced until released.
  if (order.onHold)
    return res.status(400).json({ message: 'This order is on hold. Release it before generating an invoice.' });
  // req #2/#8: a cancelled order (or one whose invoice was cancelled) cannot be (re)invoiced.
  if (order.cancelled)
    return res.status(400).json({ message: 'This order has been cancelled and cannot be invoiced.' });
  if (order.invoiceCancelled)
    return res.status(400).json({ message: 'This invoice was cancelled (a credit note was raised) and cannot be regenerated.' });

  // req #3: a PACKAGE order is billed as one amount per included service. The gross is the sum of
  // those per-service amounts (recomputed on the backend — client totals are never trusted); the
  // usual footer (Discount/TDS/TCS/Govt Tax/Service Charge) then applies.
  if (order.isPackage) {
    const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const submitted = Array.isArray(req.body.packageLines) ? req.body.packageLines : [];
    // Pair each stored service line with the submitted amount by index; ignore anything else.
    const lines = (order.services || []).map((s, i) => ({
      serviceType: s.serviceType,
      description: [s.serviceType, s.airline || s.hotelName || s.train || s.visaCountry || s.eventTitle || ''].filter(Boolean).join(' — '),
      amount: round2(submitted[i]?.amount),
    }));
    if (lines.some((l) => l.amount < 0))
      return res.status(400).json({ message: 'Package service amounts cannot be negative.' });
    const grossTotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
    const t = applyFooter(grossTotal, req.body);   // reuse the shared footer math
    order.invoicePackageLines = lines;
    order.invoiceCharges = {};
    order.grossTotal = grossTotal;
    order.chargesTotal = grossTotal;
    order.markupTotal = 0;
    Object.assign(order, footerFields(t));
    order.serviceCalcType = 'PACKAGE';
    order.totalAmount = order.netInvoiceAmount;
    order.invoiceGenerated = true;
    order.billedToType = billedToTypeFor(order);
    if (req.body.invoiceNotes !== undefined) order.invoiceNotes = req.body.invoiceNotes;
    if (req.body.invoiceDate) order.invoiceDate = new Date(req.body.invoiceDate);
    await ensureInvoiceNo(order);
    await logActivity(req, { action: 'INVOICE_GENERATE', module: 'Invoice', recordId: order._id, recordLabel: order.invoiceNo, message: `Package invoice generated (net ${order.netInvoiceAmount})` });
    return res.json({
      invoiceNo: order.invoiceNo, invoiceDate: order.invoiceDate,
      grossTotal: order.grossTotal, netInvoiceAmount: order.netInvoiceAmount,
    });
  }

  // Service-wise calculation. The service type comes from the order (not the client),
  // so each service always uses its own formula. Backend recalculates before saving.
  const serviceType = (order.services?.[0]?.serviceType || 'FLIGHT').toUpperCase();

  if (serviceType === 'HOTEL') {
    // Hotel: rooms may be sent from the invoice screen, else fall back to booked rooms.
    const rooms = Array.isArray(req.body.rooms) && req.body.rooms.length
      ? req.body.rooms
      : (order.services?.[0]?.rooms || []);
    const t = computeService('HOTEL', { rooms, ...req.body });
    order.invoiceRooms = t.perRoom.map((r, i) => ({ ...rooms[i], ...r }));
    order.invoiceCharges = {};
    order.grossTotal = t.grossTotal;
    order.hotelTotalRoomAmount = t.totalRoomAmount;
    order.hotelTotalTax = t.totalHotelTax;
    Object.assign(order, footerFields(t));
  } else {
    const t = computeService(serviceType, { charges: req.body.charges || {}, ...req.body });
    order.invoiceCharges = req.body.charges || {};
    order.grossTotal = t.grossTotal;
    order.chargesTotal = t.chargesTotal;
    order.markupTotal = t.markupTotal;
    Object.assign(order, footerFields(t));
  }

  order.serviceCalcType = serviceType;
  order.totalAmount = order.netInvoiceAmount;   // keep legacy total in sync for lists/portal
  order.invoiceGenerated = true;
  order.billedToType = billedToTypeFor(order);  // req #7: record the billed-party type
  // Direction is determined server-side, never from the client (req #4/#5). A customer Order
  // invoice is a SALES invoice (Company Owner / 360 selling to a customer); the 360 ← Main Company
  // PURCHASE invoice is the separate, Super-Admin-only SupplierInvoice module.
  order.invoiceDirection = 'SALES';
  if (req.body.invoiceNotes !== undefined) order.invoiceNotes = req.body.invoiceNotes;
  if (req.body.invoiceDate) order.invoiceDate = new Date(req.body.invoiceDate);

  await ensureInvoiceNo(order);                 // assigns number + saves

  await logActivity(req, { action: 'INVOICE_GENERATE', module: 'Invoice', recordId: order._id, recordLabel: order.invoiceNo, message: `Invoice generated (net ${order.netInvoiceAmount})` });

  res.json({
    invoiceNo: order.invoiceNo,
    invoiceDate: order.invoiceDate,
    grossTotal: order.grossTotal,
    netInvoiceAmount: order.netInvoiceAmount,
  });
};

// POST /api/invoices/:orderId/cancel   { reason? }
// req #8: SUPER_ADMIN-only. Cancels a generated invoice and raises a linked Credit Note.
// The order/invoice record is never deleted — it stays for reporting/audit. The route is
// guarded by allow(SUPER_ADMIN); this re-checks state and ownership.
export const cancelInvoice = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  if (!order.invoiceGenerated)
    return res.status(400).json({ message: 'This order has no generated invoice to cancel.' });
  // Idempotency: if already cancelled, return the existing credit note instead of raising a new one
  // (prevents duplicate credit notes when the action is triggered more than once).
  if (order.invoiceCancelled) {
    const existing = order.creditNoteId ? await CreditNote.findById(order.creditNoteId) : null;
    return res.status(200).json({
      message: `Invoice ${order.invoiceNo} is already cancelled.`,
      creditNote: existing, invoiceNo: order.invoiceNo, alreadyCancelled: true,
    });
  }

  const reason = (req.body?.reason || '').toString().trim();
  try {
    // Reuse the shared credit-note service (req #4/#5). It raises/links the credit note; the order
    // is only saved (marked invoice-cancelled) after the note is persisted, so a failure cannot
    // leave a cancelled invoice without its credit note. The unique index on CreditNote.orderId is
    // the final guard against duplicates under concurrent submits.
    const { status, creditNote } = await ensureCreditNoteForOrder(order, { user: req.user, reason });
    await order.save();

    if (status === 'created') {
      await logActivity(req, { action: 'INVOICE_CANCEL', module: 'Invoice', recordId: order._id, recordLabel: order.invoiceNo, message: `Invoice cancelled; credit note ${creditNote.creditNoteNo} raised`, meta: { creditNoteNo: creditNote.creditNoteNo, reason } });
    }

    return res.json({
      message: status === 'created'
        ? `Invoice ${order.invoiceNo} cancelled. Credit note ${creditNote.creditNoteNo} raised.`
        : `Invoice ${order.invoiceNo} cancelled.`,
      creditNote: creditNote || null,
      invoiceNo: order.invoiceNo,
    });
  } catch (err) {
    // Any failure: do NOT mark the invoice cancelled; report the error (no false success).
    return res.status(500).json({ message: 'Could not generate the credit note; the invoice was not cancelled. Please retry.' });
  }
};

// GET /api/invoices/credit-notes  -> list credit notes (org-scoped), newest first.
// Each row carries the originating order (with the customer/company it bills) so the listing can
// show Credit Note no, original invoice no, customer/company, amount and date.
export const listCreditNotes = async (req, res) => {
  const filter = {};
  // Org-scope for non-super-admins (legacy/unset orgs left unrestricted, matching scopeToOrg).
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.organizationId) filter.organizationId = req.user.organizationId;
  const rows = await CreditNote.find(filter)
    .populate({
      path: 'orderId',
      select: 'orderNo module customerId companyId',
      populate: [
        { path: 'customerId', select: 'name' },
        { path: 'companyId', select: 'name' },
      ],
    })
    .sort({ createdAt: -1 });
  // Flatten a convenient party name without changing the stored structure.
  const out = rows.map((r) => {
    const o = r.orderId;
    const party = o?.customerId?.name || o?.companyId?.name || '—';
    return { ...r.toObject(), party };
  });
  res.json(out);
};

// GET /api/invoices/credit-notes/:id/pdf  -> the Credit Note document (reuses the invoice template).
export const downloadCreditNote = async (req, res) => {
  const cn = await CreditNote.findById(req.params.id);
  if (!cn) return res.status(404).json({ message: 'Credit note not found' });
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.organizationId &&
      cn.organizationId && String(cn.organizationId) !== String(req.user.organizationId)) {
    return res.status(404).json({ message: 'Credit note not found' });
  }
  const data = await loadInvoiceData(cn.orderId);
  if (!data) return res.status(404).json({ message: 'Credit note not found' });

  // Render the cancelled invoice's figures as a CREDIT NOTE, numbered with the CN number. The
  // amounts/taxes are the original invoice's (the credited amount); a note references the invoice.
  const order = (data.order.toObject ? data.order.toObject() : { ...data.order });
  order.invoiceNo = cn.creditNoteNo;
  order.invoiceCancelled = false;   // the credit note itself is not "cancelled"
  order.invoiceNotes = `Credit note against Invoice ${cn.invoiceNo || '—'}` + (cn.reason ? ` · ${cn.reason}` : '');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cn.creditNoteNo}.pdf"`);
  buildInvoicePdf({ order, settings: data.settings, party: data.party, docTitle: 'CREDIT NOTE' }, res);
};
