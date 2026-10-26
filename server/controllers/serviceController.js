import Service from '../models/Service.js';
import { logActivity } from '../utils/activityLog.js';

export const listServices = async (req, res) => {
  const services = await Service.find().sort('name type');
  res.json(services);
};
export const createService = async (req, res) => {
  const service = await Service.create(req.body);
  await logActivity(req, { action: 'CREATE', module: 'Service', recordId: service._id, recordLabel: `${service.name} (${service.type})`, message: 'Service created' });
  res.status(201).json(service);
};
export const updateService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) return res.status(404).json({ message: 'Service not found' });
  await logActivity(req, { action: 'UPDATE', module: 'Service', recordId: service._id, recordLabel: `${service.name} (${service.type})`, message: 'Service updated' });
  res.json(service);
};
export const deleteService = async (req, res) => {
  const existing = await Service.findById(req.params.id);
  await Service.findByIdAndDelete(req.params.id);
  if (existing) await logActivity(req, { action: 'DELETE', module: 'Service', recordId: existing._id, recordLabel: `${existing.name} (${existing.type})`, message: 'Service deleted' });
  res.json({ message: 'Service deleted' });
};
