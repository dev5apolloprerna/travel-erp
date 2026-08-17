import { DestinationCategory, DestinationSubCategory, Destination } from '../models/Destination.js';
import TourPackage from '../models/TourPackage.js';
import { Faq, Testimonial } from '../models/Content.js';
import { publicUrl, removeFile } from '../utils/upload.js';

/**
 * Admin-side CMS for the public website:
 * destination categories, sub categories, destination details,
 * tour packages, FAQs and testimonials.
 */

// Arrays arrive either as a real array or as newline/comma separated text from the form.
const toList = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  return [];
};

/* ============================ MAIN CATEGORY ============================ */
export const listCategories = async (req, res) => {
  const rows = await DestinationCategory.find().sort({ displayOrder: 1, name: 1 });
  res.json(rows);
};

export const createCategory = async (req, res) =>
  res.status(201).json(await DestinationCategory.create(req.body));

export const updateCategory = async (req, res) => {
  const row = await DestinationCategory.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Category not found' });
  Object.assign(row, req.body);
  await row.save();
  res.json(row);
};

export const deleteCategory = async (req, res) => {
  const inUse = await DestinationSubCategory.countDocuments({ categoryId: req.params.id });
  if (inUse) {
    return res.status(400).json({
      message: `This category has ${inUse} sub categor${inUse === 1 ? 'y' : 'ies'}. Delete or move them first.`,
    });
  }
  await DestinationCategory.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted' });
};

/* ============================ SUB CATEGORY ============================ */
export const listSubCategories = async (req, res) => {
  const filter = req.query.categoryId ? { categoryId: req.query.categoryId } : {};
  const rows = await DestinationSubCategory.find(filter)
    .populate('categoryId', 'name')
    .sort({ displayOrder: 1, name: 1 });
  res.json(rows);
};

export const createSubCategory = async (req, res) =>
  res.status(201).json(await DestinationSubCategory.create(req.body));

export const updateSubCategory = async (req, res) => {
  const row = await DestinationSubCategory.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Sub category not found' });
  Object.assign(row, req.body);
  await row.save();
  res.json(row);
};

export const deleteSubCategory = async (req, res) => {
  const inUse = await Destination.countDocuments({ subCategoryId: req.params.id });
  if (inUse) {
    return res.status(400).json({ message: `This sub category has ${inUse} destination(s). Delete or move them first.` });
  }
  await DestinationSubCategory.findByIdAndDelete(req.params.id);
  res.json({ message: 'Sub category deleted' });
};

/* ============================ DESTINATION DETAIL ============================ */
const destinationPayload = (body) => ({
  ...body,
  places: toList(body.places),
  bestTimeSeasons: toList(body.bestTimeSeasons),
  bestTimeMonths: toList(body.bestTimeMonths),
  uniquelyPopularFor: toList(body.uniquelyPopularFor),
  touristAttractions: toList(body.touristAttractions),
  memorablePursuits: toList(body.memorablePursuits),
  somethingLeisurely: toList(body.somethingLeisurely),
  quickTips: toList(body.quickTips),
  sliderImages: Array.isArray(body.sliderImages) ? body.sliderImages : undefined,
});

export const listDestinations = async (req, res) => {
  const filter = {};
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.subCategoryId) filter.subCategoryId = req.query.subCategoryId;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

  const rows = await Destination.find(filter)
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name')
    .sort({ displayOrder: 1, name: 1 });
  res.json(rows);
};

export const getDestination = async (req, res) => {
  const row = await Destination.findById(req.params.id)
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name');
  if (!row) return res.status(404).json({ message: 'Destination not found' });
  res.json(row);
};

export const createDestination = async (req, res) => {
  const payload = destinationPayload(req.body);
  if (payload.sliderImages === undefined) delete payload.sliderImages;
  res.status(201).json(await Destination.create(payload));
};

export const updateDestination = async (req, res) => {
  const row = await Destination.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Destination not found' });
  const payload = destinationPayload(req.body);
  if (payload.sliderImages === undefined) delete payload.sliderImages;
  Object.assign(row, payload);
  await row.save();
  res.json(row);
};

export const deleteDestination = async (req, res) => {
  const row = await Destination.findById(req.params.id);
  if (row) {
    removeFile(row.bannerImage);
    (row.sliderImages || []).forEach(removeFile);
    await row.deleteOne();
  }
  res.json({ message: 'Destination deleted' });
};

/* ============================ TOUR PACKAGE ============================ */
const packagePayload = (body) => ({
  ...body,
  highlights: toList(body.highlights),
  inclusions: toList(body.inclusions),
  exclusions: toList(body.exclusions),
  itinerary: Array.isArray(body.itinerary)
    ? body.itinerary.map((d, i) => ({
        ...d,
        day: Number(d.day) || i + 1,
        meals: toList(d.meals),
      }))
    : undefined,
  images: Array.isArray(body.images) ? body.images : undefined,
});

export const listPackages = async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.destinationId) filter.destinationId = req.query.destinationId;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

  const rows = await TourPackage.find(filter)
    .populate('destinationId', 'name')
    .populate('categoryId', 'name')
    .sort({ displayOrder: 1, name: 1 });
  res.json(rows);
};

export const getPackage = async (req, res) => {
  const row = await TourPackage.findById(req.params.id)
    .populate('destinationId', 'name')
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name');
  if (!row) return res.status(404).json({ message: 'Package not found' });
  res.json(row);
};

export const createPackage = async (req, res) => {
  const payload = packagePayload(req.body);
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  res.status(201).json(await TourPackage.create(payload));
};

export const updatePackage = async (req, res) => {
  const row = await TourPackage.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Package not found' });
  const payload = packagePayload(req.body);
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  Object.assign(row, payload);
  await row.save();
  res.json(row);
};

export const deletePackage = async (req, res) => {
  const row = await TourPackage.findById(req.params.id);
  if (row) {
    removeFile(row.bannerImage);
    (row.images || []).forEach(removeFile);
    await row.deleteOne();
  }
  res.json({ message: 'Package deleted' });
};

/* ============================ FAQ ============================ */
export const listFaqs = async (req, res) =>
  res.json(await Faq.find().sort({ category: 1, displayOrder: 1 }));

export const createFaq = async (req, res) => res.status(201).json(await Faq.create(req.body));

export const updateFaq = async (req, res) => {
  const row = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!row) return res.status(404).json({ message: 'FAQ not found' });
  res.json(row);
};

export const deleteFaq = async (req, res) => {
  await Faq.findByIdAndDelete(req.params.id);
  res.json({ message: 'FAQ deleted' });
};

/* ============================ TESTIMONIAL ============================ */
export const listTestimonials = async (req, res) =>
  res.json(await Testimonial.find().populate('packageId', 'name').sort({ displayOrder: 1, createdAt: -1 }));

export const createTestimonial = async (req, res) =>
  res.status(201).json(await Testimonial.create(req.body));

export const updateTestimonial = async (req, res) => {
  const row = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!row) return res.status(404).json({ message: 'Testimonial not found' });
  res.json(row);
};

export const deleteTestimonial = async (req, res) => {
  const row = await Testimonial.findById(req.params.id);
  if (row) {
    removeFile(row.photo);
    await row.deleteOne();
  }
  res.json({ message: 'Testimonial deleted' });
};

/* ============================ IMAGE UPLOAD ============================ */
/** Shared image upload for every CMS screen. Returns the public URL. */
export const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image file is required' });
  res.status(201).json({ url: publicUrl(req, req.file) });
};

/** Remove a previously uploaded CMS image. */
export const deleteImage = async (req, res) => {
  removeFile(req.body.url);
  res.json({ message: 'Image removed' });
};
