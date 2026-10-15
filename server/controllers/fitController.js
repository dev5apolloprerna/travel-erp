import { Cluster, Division, Grade, Department, Doctor, FitEmployee } from '../models/FitMasters.js';
import Order from '../models/Order.js';
import { publicUrl, removeFile } from '../utils/upload.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
import { applyGstToServices, isInterState } from '../utils/gst.js';
import { logActivity } from '../utils/activityLog.js';
import { ensureCreditNoteForOrder } from '../services/creditNoteService.js';

// Generic CRUD factory for simple masters (now with activity logging, req #1).
const crud = (Model, populate, moduleName = 'Master') => ({
  list: async (req, res) => {
    let q = Model.find().sort('-createdAt');
    if (populate) q = q.populate(populate);
    res.json(await q);
  },
  create: async (req, res) => {
    const doc = await Model.create(req.body);
    await logActivity(req, { action: 'CREATE', module: moduleName, recordId: doc._id, recordLabel: doc.name || String(doc._id), message: `${moduleName} created` });
    res.status(201).json(doc);
  },
  update: async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    await logActivity(req, { action: 'UPDATE', module: moduleName, recordId: doc._id, recordLabel: doc.name || String(doc._id), message: `${moduleName} updated` });
    res.json(doc);
  },
  remove: async (req, res) => {
    const existing = await Model.findById(req.params.id);
    await Model.findByIdAndDelete(req.params.id);
    if (existing) await logActivity(req, { action: 'DELETE', module: moduleName, recordId: existing._id, recordLabel: existing.name || String(existing._id), message: `${moduleName} deleted` });
    res.json({ message: 'Deleted' });
  },
});

export const clusters = crud(Cluster, null, 'Cluster');
export const divisions = crud(Division, { path: 'clusterId', select: 'name' }, 'Division');
export const grades = crud(Grade, null, 'Grade');
export const departments = crud(Department, null, 'Department');

// ---- DR master ----
export const listDoctors = async (req, res) => {
  const docs = await Doctor.find()
    .populate('clusterId', 'name').populate('divisionId', 'name').populate('gradeId', 'name amount')
    .sort('-createdAt');
  res.json(docs);
};
export const createDoctor = async (req, res) => {
  const doc = await Doctor.create(req.body);
  await logActivity(req, { action: 'CREATE', module: 'Passenger', recordId: doc._id, recordLabel: doc.name, message: 'Passenger (DR) created' });
  res.status(201).json(doc);
};
export const updateDoctor = async (req, res) => {
  const doc = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logActivity(req, { action: 'UPDATE', module: 'Passenger', recordId: doc?._id, recordLabel: doc?.name, message: 'Passenger (DR) updated' });
  res.json(doc);
};

// ---- FIT employees ----
export const deleteDoctor = async (req, res) => {
  const existing = await Doctor.findById(req.params.id);
  await Doctor.findByIdAndDelete(req.params.id);
  if (existing) await logActivity(req, { action: 'DELETE', module: 'Passenger', recordId: existing._id, recordLabel: existing.name, message: 'Passenger (DR) deleted' });
  res.json({ message: 'Passenger deleted' });
};

export const listFitEmployees = async (req, res) => {
  const docs = await FitEmployee.find()
    .populate('departmentId', 'name')
    .populate('clusterId', 'name')
    .populate('divisionId', 'name')
    .sort('-createdAt');
  res.json(docs);
};
export const createFitEmployee = async (req, res) => {
  const doc = await FitEmployee.create(req.body);
  await logActivity(req, { action: 'CREATE', module: 'SocietyMember', recordId: doc._id, recordLabel: doc.name, message: 'Society member created' });
  res.status(201).json(doc);
};
export const updateFitEmployee = async (req, res) => {
  const doc = await FitEmployee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logActivity(req, { action: 'UPDATE', module: 'SocietyMember', recordId: doc?._id, recordLabel: doc?.name, message: 'Society member updated' });
  res.json(doc);
};

// ---- Documents: add / delete only (no edit) ----
const modelForType = (type) => (type === 'doctor' ? Doctor : FitEmployee);

export const deleteFitEmployee = async (req, res) => {
  const existing = await FitEmployee.findById(req.params.id);
  await FitEmployee.findByIdAndDelete(req.params.id);
  if (existing) await logActivity(req, { action: 'DELETE', module: 'SocietyMember', recordId: existing._id, recordLabel: existing.name, message: 'Society member deleted' });
  res.json({ message: 'Member deleted' });
};

export const addDocument = async (req, res) => {
  const Model = modelForType(req.params.type);
  const doc = await Model.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Record not found' });

  // Accepts a real uploaded file (multer). Falls back to a supplied URL if no file.
  const fileUrl = req.file ? publicUrl(req, req.file) : req.body.fileUrl;
  if (!fileUrl) return res.status(400).json({ message: 'File is required' });

  doc.documents.push({
    name: req.body.name || req.file?.originalname || 'Document',
    fileUrl,
  });
  await doc.save();
  res.status(201).json(doc.documents);
};

export const deleteDocument = async (req, res) => {
  const Model = modelForType(req.params.type);
  const doc = await Model.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Record not found' });
  const d = doc.documents.id(req.params.docId);
  if (d) { removeFile(d.fileUrl); d.deleteOne(); }
  await doc.save();
  res.json(doc.documents);
};

// ---- FIT order (mixed DR + member passengers, single total, GST applied) ----
export const createOrder = async (req, res) => {
  const { services, invoiceType: selectedType, placeOfSupply, passenger } = req.body;

  // Society orders capture booking details only — no amount, no tax (added at invoice time).
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
    module: 'FIT',
    services: resolved,
    invoiceType,
    placeOfSupply: placeOfSupply || '',
    // Society bookings are for a specific passenger + division (field-force detail captured).
    societyPassenger: passenger || undefined,
    createdBy: req.user._id,
  });
  await logActivity(req, { action: 'CREATE', module: 'Order', recordId: order._id, recordLabel: order.orderNo, message: 'Society order created' });
  res.status(201).json(order);
};

export const listOrders = async (req, res) => {
  const orders = await Order.find({ module: 'FIT' })
    .populate('createdBy', 'name')
    .sort('-createdAt');
  res.json(orders);
};

export const getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('createdBy', 'name');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
};

export const deleteOrder = async (req, res) => {
  const existing = await Order.findById(req.params.id);
  await Order.findByIdAndDelete(req.params.id);
  if (existing) await logActivity(req, { action: 'DELETE', module: 'Order', recordId: existing._id, recordLabel: existing.orderNo, message: 'Society order deleted' });
  res.json({ message: 'Order deleted' });
};

// req #3: cancel a Society order, following the SAME workflow as retail/B2B order cancellation.
// Reuses the shared credit-note service so Scenario B (invoice exists) raises the linked credit note
// through the existing process, Scenario A (no invoice) raises none, and Scenario C (repeat) is
// idempotent. The order is only marked cancelled after the credit note is persisted.
export const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || order.module !== 'FIT') return res.status(404).json({ message: 'Order not found' });
  if (!order.invoiceGenerated)
    return res.status(400).json({ message: 'An order can only be cancelled after its invoice has been generated.' });
  if (order.cancelled)
    return res.status(400).json({ message: 'This order is already cancelled.' });

  const reason = (req.body?.reason || '').toString().trim();
  try {
    const result = await ensureCreditNoteForOrder(order, { user: req.user, reason });
    order.cancelled = true;
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    await order.save();

    await logActivity(req, { action: 'CANCEL', module: 'Order', recordId: order._id, recordLabel: order.orderNo, message: 'Society order cancelled', meta: { reason, creditNoteNo: result.creditNote?.creditNoteNo || null } });
    if (result.status === 'created') {
      await logActivity(req, { action: 'INVOICE_CANCEL', module: 'Invoice', recordId: order._id, recordLabel: order.invoiceNo, message: `Credit note ${result.creditNote.creditNoteNo} raised on Society order cancellation`, meta: { creditNoteNo: result.creditNote.creditNoteNo, reason } });
    }
    return res.json({ ...order.toObject(), creditNote: result.creditNote || null, creditNoteStatus: result.status });
  } catch (err) {
    return res.status(500).json({ message: 'Could not generate the credit note; the order was not cancelled. Please retry.' });
  }
};
