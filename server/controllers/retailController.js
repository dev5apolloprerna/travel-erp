import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User, { ROLES } from '../models/User.js';
import { scopeToOrg, ownsOrg } from '../middleware/auth.js';
import { resolveOrgId } from '../utils/orgContext.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
// GST no longer applied at order time — tax is entered at invoice generation
import { publicUrl, removeFile } from '../utils/upload.js';
import { sendCredentialsMail } from '../utils/mailer.js';
import { logActivity, diffFields } from '../utils/activityLog.js';
import { ensureCreditNoteForOrder } from '../services/creditNoteService.js';
import { validateBookingPassengers, extractOrderPassengers } from '../utils/bookingValidation.js';

const genPassword = () => Math.random().toString(36).slice(-8);

// ---- Customers ----
export const listCustomers = async (req, res) => {
  const q = req.query.search
    ? { name: { $regex: req.query.search, $options: 'i' } }
    : {};
  const customers = await Customer.find(scopeToOrg(q, req)).sort('-createdAt');
  res.json(customers);
};

export const getCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer || !ownsOrg(customer, req)) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
};

export const createCustomer = async (req, res) => {
  const { name, mobile, city, state, stateCode, gstNumber, address } = req.body;
  // req #3: normalise the email (trim + lowercase) and reject a duplicate within the same org
  // (customer uniqueness is per-tenant/org, matching the existing org-scoped data model).
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const orgId = await resolveOrgId(req);
  const dupFilter = { email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  if (orgId) dupFilter.organizationId = orgId;
  const existingCustomer = await Customer.findOne(dupFilter);
  if (existingCustomer)
    return res.status(400).json({ message: 'A customer with this email already exists.' });

  const customer = await Customer.create({
    name, mobile, email, city, state, stateCode, gstNumber, address, createdBy: req.user._id, organizationId: orgId,
  });

  // auto-create (or update) a retail customer portal login + (simulated) email.
  // If a User with this email already exists, update its password so the emailed
  // credentials always work (previously the save error was silently ignored, which
  // left the old password in place and broke login).
  const tempPass = genPassword();
  const loginEmail = (email || '').toLowerCase().trim();
  let portalUser = await User.findOne({ email: loginEmail });
  if (!portalUser) {
    portalUser = new User({ name, email: loginEmail, role: ROLES.RETAIL_CUSTOMER, customerId: customer._id, organizationId: orgId });
  } else {
    // keep it pointed at this customer + retail role
    portalUser.name = name || portalUser.name;
    portalUser.role = ROLES.RETAIL_CUSTOMER;
    portalUser.customerId = customer._id;
    portalUser.organizationId = orgId;
    portalUser.isActive = true;
  }
  await portalUser.setPassword(tempPass);
  await portalUser.save();

  await logActivity(req, { action: 'CREATE', module: 'Customer', recordId: customer._id, recordLabel: customer.name, message: 'Customer created' });

  const loginUrl = `${process.env.CLIENT_URL}/login/retail`;
  // Try to actually email the credentials (falls back gracefully if SMTP isn't set up yet)
  const mail = await sendCredentialsMail({
    to: email, name, loginUrl, username: email, password: tempPass, portal: 'Customer',
  });

  res.status(201).json({
    customer,
    credentials: { to: email, loginUrl, username: email, password: tempPass },
    emailSent: mail.sent,
    emailError: mail.error || null,
  });
};

/* ---------------- Customer documents (add / delete, any type) ---------------- */
export const addCustomerDocument = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer || !ownsOrg(customer, req)) return res.status(404).json({ message: 'Customer not found' });
  if (!req.file) return res.status(400).json({ message: 'File is required' });

  customer.documents.push({
    name: req.body.name || req.file.originalname,
    fileUrl: publicUrl(req, req.file),
  });
  await customer.save();
  res.status(201).json(customer.documents);
};

export const deleteCustomerDocument = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer || !ownsOrg(customer, req)) return res.status(404).json({ message: 'Customer not found' });

  const doc = customer.documents.id(req.params.docId);
  if (doc) { removeFile(doc.fileUrl); doc.deleteOne(); }
  await customer.save();
  res.json(customer.documents);
};

// ---- Orders ----
export const listOrders = async (req, res) => {
  const filter = scopeToOrg({ module: 'RETAIL' }, req);
  // employees see only their own orders (admin sees all)
  if (req.user.role === ROLES.EMPLOYEE) filter.createdBy = req.user._id;
  // a logged-in retail customer only ever sees their own bookings — enforce it
  // server-side (don't rely on the client passing the right customerId).
  if (req.user.role === ROLES.RETAIL_CUSTOMER) {
    filter.customerId = req.user.customerId;
  } else if (req.query.customerId) {
    filter.customerId = req.query.customerId;
  }
  const orders = await Order.find(filter).populate('customerId', 'name email').sort('-createdAt');
  res.json(orders);
};

/**
 * GET /api/retail/customers/:id/latest-passengers?excludeOrder=
 * v65.1: passengers from this customer's MOST RECENT eligible order (one that has
 * passengers), for auto-filling a new Retail booking. Org-scoped, staff-only,
 * single query (no N+1). Returns only the supported passenger fields.
 */
export const latestPassengers = async (req, res) => {
  const filter = scopeToOrg({ module: 'RETAIL', customerId: req.params.id, 'services.passengers.0': { $exists: true } }, req);
  if (req.query.excludeOrder) filter._id = { $ne: req.query.excludeOrder };
  // Scan a few most-recent orders (newest first, _id as the tie-breaker) and return
  // the first that actually has a NAMED passenger.
  const orders = await Order.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(5)
    .select('orderNo invoiceNo createdAt services.serviceType services.passengers')
    .lean();
  for (const o of orders) {
    const passengers = extractOrderPassengers(o);
    if (passengers.length) {
      return res.json({ sourceOrder: { id: o._id, no: o.orderNo || o.invoiceNo || '', date: o.createdAt }, passengers });
    }
  }
  return res.json({ sourceOrder: null, passengers: [] });
};

export const getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customerId');
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  // A retail customer may only open their OWN order (not another customer's in the same org).
  if (req.user.role === ROLES.RETAIL_CUSTOMER) {
    const ownerId = String(order.customerId?._id || order.customerId || '');
    if (ownerId !== String(req.user.customerId)) return res.status(404).json({ message: 'Order not found' });
  }
  const payments = await Payment.find({ orderId: order._id }).sort('createdAt');
  res.json({ order, payments });
};

/**
 * Build GST-applied service lines + order totals.
 * - GST% comes from the Service master (per service), unless supplied on the line.
 * - Intra-state (customer state == company state) -> CGST + SGST, else IGST.
 * - Invoice type DOMESTIC / INTERNATIONAL comes from the selected service's type.
 */
/**
 * Orders now capture booking details only — no amount and no tax.
 * Price and tax are entered later at invoice generation.
 * We still resolve the service name/type from the master for display and invoice prefix.
 */
const buildOrderServices = async (services = [], selectedType) => {
  const resolved = [];
  let invoiceType = selectedType || 'DOMESTIC';

  for (const line of services) {
    if (line.serviceRef) {
      const master = await Service.findById(line.serviceRef);
      if (master && !selectedType && master.type === 'INTERNATIONAL') invoiceType = 'INTERNATIONAL';
    }
    // Strip any money/tax that might arrive from an old client.
    const { amount, gstPercent, taxableAmount, cgst, sgst, igst, totalWithGst, ...clean } = line;
    resolved.push(clean);
  }
  return { services: resolved, invoiceType };
};

// Validate a package booking server-side (req #3): it must contain at least two services, and
// every line must reference a real, active service. Prices/totals are never taken from the client.
const validatePackage = async (services = []) => {
  if (!Array.isArray(services) || services.length < 2)
    return 'A package must contain at least two services.';
  for (const line of services) {
    if (!line.serviceRef) return 'Every package service must be selected from the Service Master.';
    const master = await Service.findById(line.serviceRef);
    if (!master || master.isActive === false) return 'One of the selected services is invalid or inactive.';
    // req #2: Flight is not allowed inside a package booking.
    if ((master.name || '').toUpperCase() === 'FLIGHT') return 'Flight booking is not available within a package.';
  }
  return null;
};

export const createOrder = async (req, res) => {
  const { customerId, services, invoiceType, isPackage } = req.body;
  if (!customerId) return res.status(400).json({ message: 'Please select a customer.' });

  if (isPackage) {
    const err = await validatePackage(services);
    if (err) return res.status(400).json({ message: err });
  }

  // v64: Retail bookings require passenger details (≥1 named passenger per service).
  const paxErr = validateBookingPassengers(services);
  if (paxErr) return res.status(400).json({ message: paxErr });

  const t = await buildOrderServices(services || [], invoiceType);

  const orgId = await resolveOrgId(req);
  const order = await Order.create({
    module: 'RETAIL', customerId,
    isPackage: !!isPackage,
    services: t.services,
    invoiceType: t.invoiceType,
    createdBy: req.user._id,
    organizationId: orgId,
  });
  await logActivity(req, {
    action: 'CREATE', module: 'Order', recordId: order._id, recordLabel: order.orderNo,
    message: `${isPackage ? 'Package order' : 'Order'} created with ${order.services?.length || 0} service(s)`,
  });
  res.status(201).json(order);
};

export const updateOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  // req #1: editing is only allowed BEFORE the invoice is generated. Enforced on the
  // backend (not just hidden in the UI) so the restriction can't be bypassed by a direct
  // API request. A cancelled order is likewise read-only.
  if (order.invoiceGenerated)
    return res.status(400).json({ message: 'This order cannot be edited because its invoice has already been generated.' });
  if (order.cancelled)
    return res.status(400).json({ message: 'This order has been cancelled and can no longer be edited.' });
  if (order.clubbed)
    return res.status(400).json({ message: 'This order was clubbed into a combined invoice and can no longer be edited.' });
  const { services, invoiceType, isPackage } = req.body;
  const wantPackage = isPackage === undefined ? order.isPackage : !!isPackage;
  if (services && wantPackage) {
    const err = await validatePackage(services);
    if (err) return res.status(400).json({ message: err });
  }
  // v64: enforce passenger details on edit too (Retail).
  if (services) {
    const paxErr = validateBookingPassengers(services);
    if (paxErr) return res.status(400).json({ message: paxErr });
  }
  if (services) {
    const t = await buildOrderServices(services, invoiceType || order.invoiceType);
    order.services = t.services;
    order.invoiceType = t.invoiceType;
  }
  if (isPackage !== undefined) order.isPackage = !!isPackage;
  await order.save(); // pre-save recomputes status
  await logActivity(req, { action: 'UPDATE', module: 'Order', recordId: order._id, recordLabel: order.orderNo, message: 'Order updated' });
  res.json(order);
};

// req #1: put an order ON HOLD (a pre-invoice working state). Only valid before an invoice
// exists and while the order is not cancelled. A held order cannot be invoiced until released.
export const holdOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  if (order.invoiceGenerated)
    return res.status(400).json({ message: 'An order with a generated invoice cannot be put on hold.' });
  if (order.cancelled)
    return res.status(400).json({ message: 'A cancelled order cannot be put on hold.' });
  if (order.onHold)
    return res.status(400).json({ message: 'This order is already on hold.' });
  order.onHold = true;
  order.heldAt = new Date();
  order.holdReason = (req.body?.reason || '').toString().trim();
  await order.save();
  await logActivity(req, { action: 'HOLD', module: 'Order', recordId: order._id, recordLabel: order.orderNo, message: 'Order put on hold', meta: { reason: order.holdReason } });
  res.json(order);
};

// req #1: release an order from hold back to the normal (Open) flow.
export const releaseOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  if (!order.onHold)
    return res.status(400).json({ message: 'This order is not on hold.' });
  order.onHold = false;
  order.heldAt = null;
  order.holdReason = '';
  await order.save();
  await logActivity(req, { action: 'RELEASE', module: 'Order', recordId: order._id, recordLabel: order.orderNo, message: 'Order released from hold' });
  res.json(order);
};

// Order cancellation (Booking → Order). The existing rule stands: an order is only cancellable
// AFTER its invoice has been generated (before that, orders are edited/deleted, not cancelled) —
// validated on the actual state so a direct request can't bypass it.
// v46 (req #2/#3): cancelling an INVOICED order now also raises the credit note, through the SAME
// shared service the Invoice screen uses. Scenario A (no invoice) raises none; Scenario C (already
// cancelled / credit note already present) is idempotent — no duplicate note, no repeated work.
export const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  if (!order.invoiceGenerated)
    return res.status(400).json({ message: 'An order can only be cancelled after its invoice has been generated.' });
  if (order.cancelled)
    return res.status(400).json({ message: 'This order is already cancelled.' });

  const reason = (req.body?.reason || '').toString().trim();
  try {
    // Raise/link the credit note FIRST (Scenario B). If it fails, the order is NOT saved, so we
    // never leave an order cancelled without its required credit note.
    const result = await ensureCreditNoteForOrder(order, { user: req.user, reason });

    order.cancelled = true;
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    await order.save();   // one write persists both the cancel flags and the credit-note link

    await logActivity(req, { action: 'CANCEL', module: 'Order', recordId: order._id, recordLabel: order.orderNo, message: 'Order cancelled', meta: { reason, creditNoteNo: result.creditNote?.creditNoteNo || null } });
    if (result.status === 'created') {
      await logActivity(req, { action: 'INVOICE_CANCEL', module: 'Invoice', recordId: order._id, recordLabel: order.invoiceNo, message: `Credit note ${result.creditNote.creditNoteNo} raised on order cancellation`, meta: { creditNoteNo: result.creditNote.creditNoteNo, reason } });
    }

    return res.json({ ...order.toObject(), creditNote: result.creditNote || null, creditNoteStatus: result.status });
  } catch (err) {
    // Credit-note generation failed → do NOT cancel the order; report it (no partial state).
    return res.status(500).json({ message: 'Could not generate the credit note; the order was not cancelled. Please retry.' });
  }
};

// ---- Payments (retail: order-linked, partial/full) ----
export const addPayment = async (req, res) => {
  const { amount, mode, type, paidByCustomer } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order || !ownsOrg(order, req)) return res.status(404).json({ message: 'Order not found' });
  // v65: a clubbed (superseded) invoice no longer carries a receivable — record the payment
  // against the consolidated invoice instead.
  if (order.clubbed) return res.status(400).json({ message: 'This invoice was clubbed into a consolidated invoice. Record the payment against the consolidated invoice.' });

  const payment = await Payment.create({
    module: 'RETAIL', orderId: order._id, amount, mode, type,
    receivedBy: paidByCustomer ? null : req.user._id, paidByCustomer: !!paidByCustomer,
  });
  order.paidAmount = (order.paidAmount || 0) + Number(amount);
  await order.save();
  await logActivity(req, { action: 'PAYMENT', module: 'Payment', recordId: payment._id, recordLabel: order.orderNo, message: `Payment recorded: ${amount}` });
  res.status(201).json({ payment, order });
};

// Delete customer / order (edit+delete support)
export const deleteCustomer = async (req, res) => {
  const existing = await Customer.findById(req.params.id);
  if (!existing || !ownsOrg(existing, req)) return res.status(404).json({ message: 'Customer not found' });
  await Customer.findByIdAndDelete(req.params.id);
  await logActivity(req, { action: 'DELETE', module: 'Customer', recordId: existing._id, recordLabel: existing.name, message: 'Customer deleted' });
  res.json({ message: 'Customer deleted' });
};
export const updateCustomer = async (req, res) => {
  const existing = await Customer.findById(req.params.id);
  if (!existing || !ownsOrg(existing, req)) return res.status(404).json({ message: 'Customer not found' });
  // organizationId is tenant-owned — never let it be reassigned via the payload
  const { organizationId, ...patch } = req.body;
  const changes = diffFields(existing, patch, ['name', 'email', 'mobile', 'city', 'state', 'gstNumber', 'address']);
  const customer = await Customer.findByIdAndUpdate(req.params.id, patch, { new: true });
  await logActivity(req, { action: 'UPDATE', module: 'Customer', recordId: customer._id, recordLabel: customer.name, message: 'Customer updated', changes });
  res.json(customer);
};
export const deleteOrder = async (req, res) => {
  const existing = await Order.findById(req.params.id);
  if (!existing || !ownsOrg(existing, req)) return res.status(404).json({ message: 'Order not found' });
  // req #2: once an order has a generated invoice or has been cancelled, it must NOT be deleted —
  // it has to remain for reporting, audit, invoice and credit-note purposes. Enforced on the
  // backend so it cannot be bypassed through a direct API call.
  if (existing.invoiceGenerated)
    return res.status(400).json({ message: 'An order with a generated invoice cannot be deleted (kept for audit/reporting).' });
  if (existing.clubbed)
    return res.status(400).json({ message: 'This order was clubbed into a combined invoice and cannot be deleted.' });
  if (existing.cancelled)
    return res.status(400).json({ message: 'A cancelled order cannot be deleted (kept for audit/reporting).' });
  await Order.findByIdAndDelete(req.params.id);
  await Payment.deleteMany({ orderId: req.params.id });
  await logActivity(req, { action: 'DELETE', module: 'Order', recordId: existing._id, recordLabel: existing.orderNo, message: 'Order deleted' });
  res.json({ message: 'Order deleted' });
};
