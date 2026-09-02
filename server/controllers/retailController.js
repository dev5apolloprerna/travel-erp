import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User, { ROLES } from '../models/User.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
// GST no longer applied at order time — tax is entered at invoice generation
import { publicUrl, removeFile } from '../utils/upload.js';
import { sendCredentialsMail } from '../utils/mailer.js';

const genPassword = () => Math.random().toString(36).slice(-8);

// ---- Customers ----
export const listCustomers = async (req, res) => {
  const q = req.query.search
    ? { name: { $regex: req.query.search, $options: 'i' } }
    : {};
  const customers = await Customer.find(q).sort('-createdAt');
  res.json(customers);
};

export const getCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
};

export const createCustomer = async (req, res) => {
  const { name, mobile, email, city, state, stateCode, gstNumber, address } = req.body;
  const customer = await Customer.create({
    name, mobile, email, city, state, stateCode, gstNumber, address, createdBy: req.user._id,
  });

  // auto-create (or update) a retail customer portal login + (simulated) email.
  // If a User with this email already exists, update its password so the emailed
  // credentials always work (previously the save error was silently ignored, which
  // left the old password in place and broke login).
  const tempPass = genPassword();
  const loginEmail = (email || '').toLowerCase().trim();
  let portalUser = await User.findOne({ email: loginEmail });
  if (!portalUser) {
    portalUser = new User({ name, email: loginEmail, role: ROLES.RETAIL_CUSTOMER, customerId: customer._id });
  } else {
    // keep it pointed at this customer + retail role
    portalUser.name = name || portalUser.name;
    portalUser.role = ROLES.RETAIL_CUSTOMER;
    portalUser.customerId = customer._id;
    portalUser.isActive = true;
  }
  await portalUser.setPassword(tempPass);
  await portalUser.save();

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
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
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
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const doc = customer.documents.id(req.params.docId);
  if (doc) { removeFile(doc.fileUrl); doc.deleteOne(); }
  await customer.save();
  res.json(customer.documents);
};

// ---- Orders ----
export const listOrders = async (req, res) => {
  const filter = { module: 'RETAIL' };
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

export const getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customerId');
  if (!order) return res.status(404).json({ message: 'Order not found' });
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

export const createOrder = async (req, res) => {
  const { customerId, services, invoiceType } = req.body;

  const t = await buildOrderServices(services || [], invoiceType);

  const order = await Order.create({
    module: 'RETAIL', customerId,
    services: t.services,
    invoiceType: t.invoiceType,
    createdBy: req.user._id,
  });
  res.status(201).json(order);
};

export const updateOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const { services, invoiceType } = req.body;
  if (services) {
    const t = await buildOrderServices(services, invoiceType || order.invoiceType);
    order.services = t.services;
    order.invoiceType = t.invoiceType;
  }
  await order.save(); // pre-save recomputes status
  res.json(order);
};

// ---- Payments (retail: order-linked, partial/full) ----
export const addPayment = async (req, res) => {
  const { amount, mode, type, paidByCustomer } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const payment = await Payment.create({
    module: 'RETAIL', orderId: order._id, amount, mode, type,
    receivedBy: paidByCustomer ? null : req.user._id, paidByCustomer: !!paidByCustomer,
  });
  order.paidAmount = (order.paidAmount || 0) + Number(amount);
  await order.save();
  res.status(201).json({ payment, order });
};

// Delete customer / order (edit+delete support)
export const deleteCustomer = async (req, res) => {
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ message: 'Customer deleted' });
};
export const updateCustomer = async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
};
export const deleteOrder = async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  await Payment.deleteMany({ orderId: req.params.id });
  res.json({ message: 'Order deleted' });
};
