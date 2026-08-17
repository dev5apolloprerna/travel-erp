import { DestinationCategory, DestinationSubCategory, Destination } from '../models/Destination.js';
import TourPackage from '../models/TourPackage.js';
import { Faq, Testimonial } from '../models/Content.js';
import Settings from '../models/Settings.js';

/**
 * Read-only endpoints for the public marketing website.
 * No authentication — only active records are ever returned.
 */

const activeOnly = { isActive: true };

/* ---------------- Destinations ---------------- */

/** Full navigation tree: Region -> Country -> Destination. */
export const navigationTree = async (req, res) => {
  const [categories, subCategories, destinations] = await Promise.all([
    DestinationCategory.find(activeOnly).sort({ displayOrder: 1, name: 1 }).lean(),
    DestinationSubCategory.find(activeOnly).sort({ displayOrder: 1, name: 1 }).lean(),
    Destination.find(activeOnly).select('name slug categoryId subCategoryId bannerImage').sort({ displayOrder: 1, name: 1 }).lean(),
  ]);

  const tree = categories.map((cat) => ({
    _id: cat._id, name: cat.name, slug: cat.slug, image: cat.image,
    subCategories: subCategories
      .filter((sc) => String(sc.categoryId) === String(cat._id))
      .map((sc) => ({
        _id: sc._id, name: sc.name, slug: sc.slug, image: sc.image,
        destinations: destinations.filter((d) => String(d.subCategoryId) === String(sc._id)),
      })),
  }));
  res.json(tree);
};

export const listDestinations = async (req, res) => {
  const filter = { ...activeOnly };
  if (req.query.categorySlug) {
    const cat = await DestinationCategory.findOne({ slug: req.query.categorySlug });
    if (cat) filter.categoryId = cat._id;
  }
  if (req.query.subCategorySlug) {
    const sub = await DestinationSubCategory.findOne({ slug: req.query.subCategorySlug });
    if (sub) filter.subCategoryId = sub._id;
  }
  if (req.query.featured === 'true') filter.isFeatured = true;

  const rows = await Destination.find(filter)
    .populate('categoryId', 'name slug')
    .populate('subCategoryId', 'name slug')
    .sort({ displayOrder: 1, name: 1 })
    .limit(Number(req.query.limit) || 100);
  res.json(rows);
};

/** Destination detail by slug, with the packages that go there. */
export const getDestination = async (req, res) => {
  const dest = await Destination.findOne({ slug: req.params.slug, ...activeOnly })
    .populate('categoryId', 'name slug')
    .populate('subCategoryId', 'name slug');
  if (!dest) return res.status(404).json({ message: 'Destination not found' });

  const packages = await TourPackage.find({ destinationId: dest._id, ...activeOnly })
    .select('name slug bannerImage durationDays durationNights price discountPrice currency type')
    .sort({ displayOrder: 1 });

  res.json({ destination: dest, packages });
};

/* ---------------- Tour packages ---------------- */
export const listPackages = async (req, res) => {
  const filter = { ...activeOnly };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.featured === 'true') filter.isFeatured = true;
  if (req.query.destinationSlug) {
    const dest = await Destination.findOne({ slug: req.query.destinationSlug });
    if (dest) filter.destinationId = dest._id;
  }
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

  const rows = await TourPackage.find(filter)
    .select('-termsConditions -seoKeywords')
    .populate('destinationId', 'name slug')
    .sort({ displayOrder: 1, name: 1 })
    .limit(Number(req.query.limit) || 100);
  res.json(rows);
};

export const getPackage = async (req, res) => {
  const pkg = await TourPackage.findOne({ slug: req.params.slug, ...activeOnly })
    .populate('destinationId', 'name slug bannerImage')
    .populate('categoryId', 'name slug');
  if (!pkg) return res.status(404).json({ message: 'Package not found' });

  const testimonials = await Testimonial.find({ packageId: pkg._id, ...activeOnly })
    .sort({ displayOrder: 1 })
    .limit(10);

  res.json({ package: pkg, testimonials });
};

/* ---------------- FAQ & testimonials ---------------- */
export const listFaqs = async (req, res) => {
  const filter = { ...activeOnly };
  if (req.query.category) filter.category = req.query.category;
  res.json(await Faq.find(filter).sort({ category: 1, displayOrder: 1 }));
};

export const listTestimonials = async (req, res) =>
  res.json(
    await Testimonial.find(activeOnly)
      .populate('packageId', 'name slug')
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(Number(req.query.limit) || 50)
  );

/* ---------------- Company info for the website footer ---------------- */
export const companyInfo = async (req, res) => {
  const s = await Settings.getSettings();
  res.json({
    companyName: s.companyName,
    address: [s.addressLine1, s.addressLine2, s.city, s.state, s.pincode].filter(Boolean).join(', '),
    phone: s.phone,
    email: s.email,
    website: s.website,
  });
};
