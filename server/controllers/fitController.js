import { Cluster, Division, Grade, Department, Doctor, FitEmployee } from '../models/FitMasters.js';
import Order from '../models/Order.js';
import { publicUrl, removeFile } from '../utils/upload.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
import { applyGstToServices, isInterState } from '../utils/gst.js';

// Generic CRUD factory for simple masters
const crud = (Model, populate) => ({
  list: async (req, res) => {
    let q = Model.find().sort('-createdAt');
    if (populate) q = q.populate(populate);
    res.json(await q);
  },
  create: async (req, res) => res.status(201).json(await Model.create(req.body)),
  update: async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  },
  remove: async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  },
});

export const clusters = crud(Cluster);
export const divisions = crud(Division, { path: 'clusterId', select: 'name' });
export const grades = crud(Grade);
export const departments = crud(Department);

// ---- DR master ----
export const listDoctors = async (req, res) => {
  const docs = await Doctor.find()
    .populate('clusterId', 'name').populate('divisionId', 'name').populate('gradeId', 'name amount')
    .sort('-createdAt');
  res.json(docs);
};
export const createDoctor = async (req, res) => res.status(201).json(await Doctor.create(req.body));
export const updateDoctor = async (req, res) => {
  const doc = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(doc);
};

// ---- FIT employees ----
export const deleteDoctor = async (req, res) => {
  await Doctor.findByIdAndDelete(req.params.id);
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
export const createFitEmployee = async (req, res) => res.status(201).json(await FitEmployee.create(req.body));
export const updateFitEmployee = async (req, res) => {
  const doc = await FitEmployee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(doc);
};

// ---- Documents: add / delete only (no edit) ----
const modelForType = (type) => (type === 'doctor' ? Doctor : FitEmployee);

export const deleteFitEmployee = async (req, res) => {
  await FitEmployee.findByIdAndDelete(req.params.id);
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
  await Order.findByIdAndDelete(req.params.id);
  res.json({ message: 'Order deleted' });
};
