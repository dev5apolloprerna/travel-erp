import mongoose from 'mongoose';

// Turn a name into a URL-friendly slug for the public website.
export const slugify = (s) =>
  String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const seoFields = {
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  seoKeywords: { type: String, default: '' },
};

/* ---------- Level 1: Main category (Region, e.g. Latin America/Caribbean) ---------- */
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    ...seoFields,
  },
  { timestamps: true }
);

/* ---------- Level 2: Sub category (Country/State, e.g. Bahamas) ---------- */
const subCategorySchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationCategory', required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    ...seoFields,
  },
  { timestamps: true }
);

/* ---------- Level 3: Destination detail (the full content page) ---------- */
const destinationSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationCategory', index: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationSubCategory', index: true },

    name: { type: String, required: true },
    slug: { type: String, index: true },

    // Media
    bannerImage: { type: String, default: '' },
    sliderImages: { type: [String], default: [] },

    // Copy
    shortDescription: { type: String, default: '' },
    longDescription: { type: String, default: '' },

    // Content blocks, mirroring the reference destination page
    places: { type: [String], default: [] },                 // Places covered
    bestTimeSeasons: { type: [String], default: [] },        // e.g. Winter, Summer
    bestTimeMonths: { type: [String], default: [] },         // e.g. Nov, Dec, Jan
    uniquelyPopularFor: { type: [String], default: [] },
    touristAttractions: { type: [String], default: [] },
    memorablePursuits: { type: [String], default: [] },
    somethingLeisurely: { type: [String], default: [] },
    quickTips: { type: [String], default: [] },              // Quick tips from locals

    displayOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ...seoFields,
  },
  { timestamps: true }
);

// Keep slugs in sync with names.
for (const schema of [categorySchema, subCategorySchema, destinationSchema]) {
  schema.pre('save', function (next) {
    if (!this.slug || this.isModified('name')) this.slug = slugify(this.name);
    next();
  });
}

export const DestinationCategory = mongoose.model('DestinationCategory', categorySchema);
export const DestinationSubCategory = mongoose.model('DestinationSubCategory', subCategorySchema);
export const Destination = mongoose.model('Destination', destinationSchema);
