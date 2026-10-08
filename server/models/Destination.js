import mongoose from 'mongoose';

// Turn a name into a URL-friendly slug for the public website.
export const slugify = (s) =>
  String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// SEO block — description/keywords now hold rich text (HTML); head/body added.
const seoFields = {
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },   // rich text (HTML)
  seoKeywords: { type: String, default: '' },       // rich text (HTML)
  seoHead: { type: String, default: '' },           // rich text (HTML)
  seoBody: { type: String, default: '' },           // rich text (HTML)
};

// Repeatable "Experience" on a category (label + single image + rich description).
const experienceSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    image: { type: String, default: '' },
    description: { type: String, default: '' },      // rich text (HTML)
  },
  { _id: true }
);

/* ---------- Main category (Region) ---------- */
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // New category fields
    bestTime: { type: String, default: '' },          // e.g. "Oct – Mar"
    idealDuration: { type: String, default: '' },     // e.g. "10–18 Days"
    travelStyle: { type: String, default: '' },       // e.g. "Culture · Cities · Beaches · Food"
    experiences: { type: [experienceSchema], default: [] },

    ...seoFields,
  },
  { timestamps: true }
);

/* ---------- Destination detail (the full content page) ---------- */
const destinationSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationCategory', index: true },

    name: { type: String, required: true },
    slug: { type: String, index: true },

    // Media
    bannerImage: { type: String, default: '' },
    sliderImages: { type: [String], default: [] },

    // Copy
    shortDescription: { type: String, default: '' },
    longDescription: { type: String, default: '' },

    // Content blocks, mirroring the reference destination page
    places: { type: [String], default: [] },
    bestTimeSeasons: { type: [String], default: [] },
    bestTimeMonths: { type: [String], default: [] },
    uniquelyPopularFor: { type: [String], default: [] },
    touristAttractions: { type: [String], default: [] },
    memorablePursuits: { type: [String], default: [] },
    somethingLeisurely: { type: [String], default: [] },
    quickTips: { type: [String], default: [] },

    displayOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ...seoFields,
  },
  { timestamps: true }
);

// Keep slugs in sync with names.
for (const schema of [categorySchema, destinationSchema]) {
  schema.pre('save', function (next) {
    if (!this.slug || this.isModified('name')) this.slug = slugify(this.name);
    next();
  });
}

export const DestinationCategory = mongoose.model('DestinationCategory', categorySchema);
export const Destination = mongoose.model('Destination', destinationSchema);
