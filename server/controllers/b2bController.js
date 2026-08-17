import Company from '../models/Company.js';
import Passenger from '../models/Passenger.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User, { ROLES } from '../models/User.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
import { applyGstToServices, isInterState } from '../utils/gst.js';
import { publicUrl, removeFile } from '../utils/upload.js';
import { sendCredentialsMail } from '../utils/mailer.js';

const genPassword = () => Math.random().toString(36).slice(-8);

// ---- Companies ----
export const listCompanies = async (req, res) => {
  const q = req.query.search ? { name: { $regex: req.query.search, $options: 'i' } } : {};
  const companies = await Company.find(q).sort('-createdAt');
  const withCounts = await Promise.all(
    companies.map(async (c) => {
      const members = await User.countDocuments({ companyId: c._id, role: ROLES.B2B_MEMBER });
      return { ...c.toJSON(), memberCount: members };
    })
  );
  res.json(withCounts);
};

export const getCompany = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  const members = await User.find({ companyId: company._id, role: ROLES.B2B_MEMBER }).select('-passwordHash');
  const orders = await Order.find({ module: 'B2B', companyId: company._id })
    .populate('requestedByMemberId', 'name')
    .populate('createdBy', 'name')
    .sort('-createdAt');
  const payments = await Payment.find({ module: 'B2B', companyId: company._id }).sort('-createdAt');
  res.json({ company, members, orders, payments });
};

export const createCompany = async (req, res) => {
  const company = await Company.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(company);
};

// ---- Members (create login user for the company) ----
export const addMember = async (req, res) => {
  const { name, email, designation, mobile } = req.body;
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already in use' });

  const tempPass = genPassword();
  const user = new User({ name, email, role: ROLES.B2B_MEMBER, companyId: company._id });
  await user.setPassword(tempPass);
  await user.save();

  const loginUrl = `${process.env.CLIENT_URL}/login/b2b`;
  const mail = await sendCredentialsMail({
    to: email, name, loginUrl, username: email, password: tempPass, portal: 'B2B Member',
  });

  res.status(201).json({
    member: { id: user._id, name, email, designation },
    credentials: { to: email, loginUrl, username: email, password: tempPass },
    emailSent: mail.sent,
    emailError: mail.error || null,
  });
};

/* ---------------- Company contacts (add / edit / delete) ---------------- */
export const addContact = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  company.contacts.push(req.body);
  await company.save();
  res.status(201).json(company.contacts);
};

export const updateContact = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  const c = company.contacts.id(req.params.contactId);
  if (!c) return res.status(404).json({ message: 'Contact not found' });
  Object.assign(c, req.body);
  await company.save();
  res.json(company.contacts);
};

export const deleteContact = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  company.contacts.id(req.params.contactId)?.deleteOne();
  await company.save();
  res.json(company.contacts);
};

/* ---------------- Company documents (add / delete) ---------------- */
export const addCompanyDocument = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  if (!req.file) return res.status(400).json({ message: 'File is required' });

  company.documents.push({
    name: req.body.name || req.file.originalname,
    fileUrl: publicUrl(req, req.file),
  });
  await company.save();
  res.status(201).json(company.documents);
};

export const deleteCompanyDocument = async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  const doc = company.documents.id(req.params.docId);
  if (doc) { removeFile(doc.fileUrl); doc.deleteOne(); }
  await company.save();
  res.json(company.documents);
};

// ---- Passenger DB (scoped per company) ----
export const listPassengers = async (req, res) => {
  const passengers = await Passenger.find({ companyId: req.params.id });
  res.json(passengers);
};
export const addPassenger = async (req, res) => {
  const passenger = await Passenger.create({ ...req.body, companyId: req.params.id });
  res.status(201).json(passenger);
};

// ---- Orders (employee books, records requesting member) ----
export const createOrder = async (req, res) => {
  const { companyId, requestedByMemberId, services, invoiceType: selectedType } = req.body;

  // Orders capture booking details only — no amount, no tax (added at invoice time).
  let invoiceType = selectedType || 'DOMESTIC';
  const resolved = [];
  for (const line of services || []) {
    if (line.serviceRef && !selectedType) {
      const master = await Service.findById(line.serviceRef);
      if (master && master.type === 'INTERNATIONAL') invoiceType = 'INTERNATIONAL';
    }
    const { amount, gstPercent, taxableAmount, cgst, sgst, igst, totalWithGst, ...clean } = line;
    resolved.push(clean);
  }

  const order = await Order.create({
    module: 'B2B', companyId, requestedByMemberId,
    services: resolved,
    invoiceType,
    createdBy: req.user._id,
  });
  res.status(201).json(order);
};

// ---- Payment: optionally allocated to specific orders ----
/**
 * Body: { amount, mode, reference, notes, allocations: [{ orderId, amount }] }
 * - allocations present -> the amount is applied to those orders (employee enters
 *   the amount per order). Any remainder still increases the company's paid total.
 * - allocations empty   -> pure lump-sum on account, exactly as before.
 */
export const addLumpSumPayment = async (req, res) => {
  const { amount, mode, reference, notes, allocations = [] } = req.body;
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });

  const total = Number(amount) || 0;
  if (total <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero' });

  // Validate the split before writing anything.
  const cleaned = [];
  let allocated = 0;
  for (const a of allocations) {
    const amt = Number(a.amount) || 0;
    if (amt <= 0) continue;
    const order = await Order.findById(a.orderId);
    if (!order) return res.status(400).json({ message: 'One of the selected orders no longer exists' });

    const due = (order.totalAmount || 0) - (order.paidAmount || 0);
    if (amt > due + 0.01) {
      return res.status(400).json({
        message: `Amount for order ${order.orderNo} (${amt}) is more than its due (${due.toFixed(2)})`,
      });
    }
    cleaned.push({ orderId: order._id, orderNo: order.orderNo, amount: amt, _order: order });
    allocated += amt;
  }

  if (allocated > total + 0.01) {
    return res.status(400).json({
      message: `Allocated ${allocated.toFixed(2)} exceeds the payment amount ${total.toFixed(2)}`,
    });
  }

  // Apply to each order
  for (const a of cleaned) {
    a._order.paidAmount = (a._order.paidAmount || 0) + a.amount;
    await a._order.save();   // pre-save recomputes UNPAID / PARTIAL / PAID
  }

  const payment = await Payment.create({
    module: 'B2B',
    companyId: company._id,
    amount: total,
    mode,
    type: cleaned.length ? 'ALLOCATED' : 'LUMPSUM',
    allocations: cleaned.map(({ orderId, orderNo, amount }) => ({ orderId, orderNo, amount })),
    reference,
    notes,
    receivedBy: req.user._id,
  });

  // Company running balance always reflects the full amount received.
  company.totalPaid = (company.totalPaid || 0) + total;
  await company.save();

  res.status(201).json({ payment, company, unallocated: Math.round((total - allocated) * 100) / 100 });
};

// ---- Orders for a company, with due amounts (used by the payment screen) ----
export const listCompanyOrders = async (req, res) => {
  const orders = await Order.find({ module: 'B2B', companyId: req.params.id })
    .populate('requestedByMemberId', 'name')
    .populate('createdBy', 'name')
    .sort('-createdAt');
  res.json(orders);
};

// ---- Member portal: own orders (view only) ----
export const myOrders = async (req, res) => {
  const orders = await Order.find({ module: 'B2B', requestedByMemberId: req.user._id }).sort('-createdAt');
  const company = await Company.findById(req.user.companyId);
  res.json({ orders, company });
};

// Company update/delete + member delete (edit+delete support)
export const updateCompany = async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!company) return res.status(404).json({ message: 'Company not found' });
  res.json(company);
};
export const deleteCompany = async (req, res) => {
  await Company.findByIdAndDelete(req.params.id);
  await User.deleteMany({ companyId: req.params.id, role: ROLES.B2B_MEMBER });
  res.json({ message: 'Company deleted' });
};
export const deleteMember = async (req, res) => {
  await User.findByIdAndDelete(req.params.memberId);
  res.json({ message: 'Member deleted' });
};
export const updateMember = async (req, res) => {
  const { name, email } = req.body;
  const member = await User.findByIdAndUpdate(req.params.memberId, { name, email }, { new: true }).select('-passwordHash');
  res.json(member);
};

/* ---------------- B2B member documents ---------------- */
export const addMemberDocument = async (req, res) => {
  const member = await User.findById(req.params.memberId);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (!req.file) return res.status(400).json({ message: 'File is required' });

  member.documents.push({
    name: req.body.name || req.file.originalname,
    fileUrl: publicUrl(req, req.file),
  });
  await member.save();
  res.status(201).json(member.documents);
};

export const deleteMemberDocument = async (req, res) => {
  const member = await User.findById(req.params.memberId);
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const doc = member.documents.id(req.params.docId);
  if (doc) { removeFile(doc.fileUrl); doc.deleteOne(); }
  await member.save();
  res.json(member.documents);
};

export const getMember = async (req, res) => {
  const member = await User.findById(req.params.memberId).select('-passwordHash');
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json(member);
};
