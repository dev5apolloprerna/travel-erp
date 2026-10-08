import { DestinationCategory, Destination } from '../models/Destination.js';
import TourPackage from '../models/TourPackage.js';
import { Faq, Testimonial } from '../models/Content.js';
import Settings from '../models/Settings.js';
import FrontInquiry from '../models/FrontInquiry.js';
import { sendMail } from '../utils/mailer.js';

/**
 * Read-only endpoints for the public marketing website.
 * No authentication — only active records are ever returned.
 */

const activeOnly = { isActive: true };

// Convert stored HTML (from the rich-text editor) to readable plain text:
// drop tags, decode common entities, and tidy whitespace. Used only to shape API
// responses — the stored database value is never modified.
const htmlToText = (html) => {
  if (html == null) return '';
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/* ---------------- Destinations ---------------- */

/** Navigation tree: Region (category) -> Destinations, plus category detail fields. */
export const navigationTree = async (req, res) => {
  const [categories, destinations] = await Promise.all([
    DestinationCategory.find(activeOnly).sort({ displayOrder: 1, name: 1 }).lean(),
    Destination.find(activeOnly).select('name slug categoryId bannerImage').sort({ displayOrder: 1, name: 1 }).lean(),
  ]);

  const tree = categories.map((cat) => ({
    _id: cat._id, name: cat.name, slug: cat.slug, image: cat.image,
    bestTime: cat.bestTime, idealDuration: cat.idealDuration, travelStyle: cat.travelStyle,
    experiences: cat.experiences || [],
    destinations: destinations.filter((d) => String(d.categoryId) === String(cat._id)),
  }));
  res.json(tree);
};

export const listDestinations = async (req, res) => {
  const filter = { ...activeOnly };
  if (req.query.categorySlug) {
    const cat = await DestinationCategory.findOne({ slug: req.query.categorySlug });
    if (cat) filter.categoryId = cat._id;
  }
  if (req.query.featured === 'true') filter.isFeatured = true;

  const rows = await Destination.find(filter)
    .populate('categoryId', 'name slug')
    .sort({ displayOrder: 1, name: 1 })
    .limit(Number(req.query.limit) || 100);
  res.json(rows);
};

/** Destination detail by slug, with the packages that go there. */
export const getDestination = async (req, res) => {
  const dest = await Destination.findOne({ slug: req.params.slug, ...activeOnly })
    .populate('categoryId', 'name slug');
  if (!dest) return res.status(404).json({ message: 'Destination not found' });

  const packages = await TourPackage.find({ destinationId: dest._id, ...activeOnly })
    .select('name slug bannerImage durationDays durationNights price discountPrice currency type')
    .sort({ displayOrder: 1 });

  res.json({ destination: dest, packages });
};

/**
 * GET /api/public/destination_categories
 * Lightweight list — only name and slug per active category.
 */
export const destinationCategoriesList = async (req, res) => {
  const rows = await DestinationCategory.find(activeOnly)
    .select('name slug')
    .sort({ displayOrder: 1, name: 1 })
    .lean();
  res.json(rows.map((c) => ({ name: c.name, slug: c.slug })));
};

/**
 * GET /api/public/destinations_page?slug=<category-slug>
 * One bundle for a category landing page:
 *  - category         : the full matched category object
 *  - destinations     : all active destinations in the matched category (featured or not)
 *  - featured         : ALL featured destinations across the site (isFeatured = true)
 *  - experiences      : that category's experiences (label, image, description)
 *  - categories       : all active categories (name, image, slug) for navigation
 */
export const destinationsPage = async (req, res) => {
  const slug = req.query.slug;
  if (!slug) return res.status(400).json({ message: 'slug is required' });

  const category = await DestinationCategory.findOne({ slug, ...activeOnly }).lean();
  if (!category) return res.status(404).json({ message: 'Destination category not found' });

  const [featured, categoryDestinations, categories] = await Promise.all([
    // Featured destinations across the whole site.
    Destination.find({ ...activeOnly, isFeatured: true })
      .select('name slug bannerImage shortDescription categoryId')
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
    // All active destinations that belong to THIS category (featured or not).
    Destination.find({ ...activeOnly, categoryId: category._id })
      .select('name slug bannerImage shortDescription categoryId')
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
    DestinationCategory.find(activeOnly)
      .select('name image slug')
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
  ]);

  // Clean the experiences once, then reuse the cleaned array both inside the
  // category object and at the top level (so category.experiences isn't raw HTML).
  const cleanExperiences = (category.experiences || []).map((ex) => ({
    ...ex,
    description: htmlToText(ex.description),
  }));

  // Rich-text fields are stored as HTML; return them as clean plain text here.
  const cleanCategory = {
    ...category,
    description: htmlToText(category.description),
    seoDescription: htmlToText(category.seoDescription),
    seoKeywords: htmlToText(category.seoKeywords),
    seoHead: htmlToText(category.seoHead),
    seoBody: htmlToText(category.seoBody),
    experiences: cleanExperiences,
  };

  res.json({
    category: cleanCategory,
    destinations: categoryDestinations,
    featured,
    experiences: cleanExperiences,
    categories: categories.map((c) => ({ name: c.name, image: c.image, slug: c.slug })),
  });
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

/* ---------------- Front-website inquiry ---------------- */

/**
 * POST /api/public/inquiry
 * Body: { fullName, phone, email, travelRequirement } — all required.
 * Always saves the inquiry. Then tries to email it to the configured recipient
 * (INQUIRY_EMAIL from env, else the company email in Settings). If email can't be
 * sent (no recipient / SMTP not configured), the inquiry is still saved and no error
 * is returned to the visitor.
 */
export const createInquiry = async (req, res) => {
  const fullName = (req.body.fullName || '').trim();
  const phone = (req.body.phone || '').trim();
  const email = (req.body.email || '').trim();
  const travelRequirement = (req.body.travelRequirement || '').trim();

  if (!fullName || !phone || !email || !travelRequirement) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const inquiry = await FrontInquiry.create({ fullName, phone, email, travelRequirement });

  // Fire-and-forget email; never blocks or fails the save.
  try {
    const settings = await Settings.getSettings();
    const to = process.env.INQUIRY_EMAIL || settings.email || settings.smtpFromEmail || settings.smtpUser;
    if (to) {
      const html = `
        <h2>New Website Inquiry</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Full Name</b></td><td>${fullName}</td></tr>
          <tr><td><b>Phone Number</b></td><td>${phone}</td></tr>
          <tr><td><b>Email Address</b></td><td>${email}</td></tr>
          <tr><td><b>Travel Requirement</b></td><td>${travelRequirement}</td></tr>
        </table>`;
      const text = `New Website Inquiry\n\nFull Name: ${fullName}\nPhone Number: ${phone}\nEmail Address: ${email}\nTravel Requirement: ${travelRequirement}`;
      await sendMail({ to, subject: `New Website Inquiry from ${fullName}`, html, text });
    }
  } catch (e) {
    // Saving succeeded; ignore email errors so the visitor sees success.
    console.error('Inquiry email error:', e.message);
  }

  res.status(201).json({ message: 'Thank you! Your inquiry has been received.', id: inquiry._id });
};

/* ---------------- Admin: inquiry listing (Super Admin) ---------------- */

// GET /api/cms/inquiries  -> newest first
export const listInquiries = async (req, res) => {
  const rows = await FrontInquiry.find().sort({ createdAt: -1 });
  res.json(rows);
};

// DELETE /api/cms/inquiries/:id
export const deleteInquiry = async (req, res) => {
  await FrontInquiry.findByIdAndDelete(req.params.id);
  res.json({ message: 'Inquiry deleted' });
};
