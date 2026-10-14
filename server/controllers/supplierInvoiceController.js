import SupplierInvoice from '../models/SupplierInvoice.js';
import Organization, { ORG_TYPES } from '../models/Organization.js';
import Settings from '../models/Settings.js';
import { buildInvoicePdf } from '../utils/invoicePdf.js';
import { logActivity } from '../utils/activityLog.js';

const num = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const round2 = (v) => Math.round(num(v) * 100) / 100;

const the360OrgId = async (req) => {
  if (req.user?.organizationId) return req.user.organizationId;
  const def = await Organization.findOne({ type: ORG_TYPES.THREE_SIXTY, isDefault: true });
  return def?._id || null;
};

// Compute totals from lines + footer (same convention as the customer invoice).
const compute = (body) => {
  const lines = (Array.isArray(body.lines) ? body.lines : []).map((l) => ({
    description: l.description || '', amount: round2(l.amount),
  }));
  const grossTotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const discountAmount = round2(body.discountAmount);
  const tdsAmount = round2(body.tdsAmount);
  const tcsAmount = round2(body.tcsAmount);
  const govtTaxAmount = round2(body.govtTaxAmount);
  const netInvoiceAmount = round2(grossTotal - discountAmount - tdsAmount - tcsAmount + govtTaxAmount);
  return { lines, grossTotal, discountAmount, tdsAmount, tcsAmount, govtTaxAmount, netInvoiceAmount };
};

// GET /api/supplier-invoices
export const list = async (req, res) => {
  const orgId = await the360OrgId(req);
  const rows = await SupplierInvoice.find({ organizationId: orgId })
    .populate('mainCompanyId', 'name').sort({ createdAt: -1 });
  res.json(rows);
};

// GET /api/supplier-invoices/:id
export const getOne = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await SupplierInvoice.findOne({ _id: req.params.id, organizationId: orgId })
    .populate('mainCompanyId', 'name gstNumber');
  if (!row) return res.status(404).json({ message: 'Supplier invoice not found' });
  res.json(row);
};

// POST /api/supplier-invoices
export const create = async (req, res) => {
  const orgId = await the360OrgId(req);
  if (!orgId) return res.status(400).json({ message: 'No 360 organization found.' });
  if (!req.body.mainCompanyId) return res.status(400).json({ message: 'Main Company is required.' });
  const t = compute(req.body);
  const invoiceNo = await SupplierInvoice.nextInvoiceNo(orgId);
  const doc = await SupplierInvoice.create({
    organizationId: orgId,
    mainCompanyId: req.body.mainCompanyId,
    invoiceNo,
    invoiceDate: req.body.invoiceDate || new Date(),
    notes: req.body.notes || '',
    createdBy: req.user?._id,
    ...t,
  });
  await logActivity(req, { action: 'CREATE', module: 'SupplierInvoice', recordId: doc._id, recordLabel: doc.invoiceNo, message: 'Supplier invoice created' });
  res.status(201).json(doc);
};

// PUT /api/supplier-invoices/:id
export const update = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await SupplierInvoice.findOne({ _id: req.params.id, organizationId: orgId });
  if (!row) return res.status(404).json({ message: 'Supplier invoice not found' });
  const t = compute(req.body);
  if (req.body.mainCompanyId) row.mainCompanyId = req.body.mainCompanyId;
  if (req.body.invoiceDate) row.invoiceDate = req.body.invoiceDate;
  if (req.body.notes !== undefined) row.notes = req.body.notes;
  Object.assign(row, t);
  await row.save();
  await logActivity(req, { action: 'UPDATE', module: 'SupplierInvoice', recordId: row._id, recordLabel: row.invoiceNo, message: 'Supplier invoice updated' });
  res.json(row);
};

// GET /api/supplier-invoices/:id/pdf  -> streams the Supplier Invoice PDF (req #5)
// Reuses the existing invoice PDF builder (buildInvoicePdf) — no duplicate PDF logic.
// Authorization: the route is Super-Admin-only and the record is scoped to the caller's
// 360 org, so a user can only download a supplier invoice they are permitted to access.
export const downloadInvoice = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await SupplierInvoice.findOne({ _id: req.params.id, organizationId: orgId })
    .populate('mainCompanyId', 'name gstNumber state stateCode email phone');
  if (!row) return res.status(404).json({ message: 'Supplier invoice not found' });

  const settings = await Settings.getSettings();
  const supplier = row.mainCompanyId || {};
  // Map the SupplierInvoice onto the shape buildInvoicePdf expects. The supplier (Main
  // Company) is the billing party; totals use the same Gross/Discount/TDS/TCS/Govt-Tax/Net
  // convention as the customer invoice.
  const order = {
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    createdAt: row.createdAt,
    invoiceType: 'PURCHASE',
    placeOfSupply: supplier.state || '',
    pdfLines: row.lines || [],
    grossTotal: row.grossTotal,
    discountAmount: row.discountAmount,
    tdsAmount: row.tdsAmount,
    tcsAmount: row.tcsAmount,
    govtTaxAmount: row.govtTaxAmount,
    netInvoiceAmount: row.netInvoiceAmount,
  };
  const party = {
    name: supplier.name || 'Main Company',
    state: supplier.state || '',
    gstNumber: supplier.gstNumber || '',
    email: supplier.email || '',
    contactNumber: supplier.phone || '',
  };

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${row.invoiceNo || 'supplier-invoice'}.pdf"`);
  buildInvoicePdf({ order, settings, party }, res);
};

// DELETE /api/supplier-invoices/:id
export const remove = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await SupplierInvoice.findOne({ _id: req.params.id, organizationId: orgId });
  if (!row) return res.status(404).json({ message: 'Supplier invoice not found' });
  await row.deleteOne();
  await logActivity(req, { action: 'DELETE', module: 'SupplierInvoice', recordId: row._id, recordLabel: row.invoiceNo, message: 'Supplier invoice deleted' });
  res.json({ message: 'Supplier invoice deleted' });
};
