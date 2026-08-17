import Service from '../models/Service.js';

export const listServices = async (req, res) => {
  const services = await Service.find().sort('name type');
  res.json(services);
};
export const createService = async (req, res) => {
  const { name, type } = req.body;
  const service = await Service.create({ name, type });
  res.status(201).json(service);
};
export const updateService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) return res.status(404).json({ message: 'Service not found' });
  res.json(service);
};
export const deleteService = async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ message: 'Service deleted' });
};
