import mongoose from 'mongoose';
import { slugify } from './Destination.js';

// One day of the itinerary
const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    meals: { type: [String], default: [] },      // Breakfast, Lunch, Dinner
    hotel: { type: String, default: '' },
    city: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { _id: true }
);

const tourPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, index: true },
    packageCode: { type: String, default: '' },

    // Where it goes
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationCategory' },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationSubCategory' },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },

    // Domestic vs International decides the payment gateway on the website:
    // DOMESTIC -> Razorpay, INTERNATIONAL -> Stripe.
    type: { type: String, enum: ['DOMESTIC', 'INTERNATIONAL'], default: 'DOMESTIC' },

    // Duration & pricing
    durationDays: { type: Number, default: 1 },
    durationNights: { type: Number, default: 0 },
    price: { type: Number, default: 0 },              // per person
    discountPrice: { type: Number, default: 0 },      // 0 = no discount
    currency: { type: String, default: 'INR' },
    gstPercent: { type: Number, default: 5 },

    // Media
    bannerImage: { type: String, default: '' },
    images: { type: [String], default: [] },

    // Content
    overview: { type: String, default: '' },
    highlights: { type: [String], default: [] },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },
    termsConditions: { type: String, default: '' },
    itinerary: { type: [itineraryDaySchema], default: [] },

    // Availability
    maxPax: { type: Number, default: 0 },             // 0 = no limit
    availableFrom: Date,
    availableTo: Date,

    displayOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    seoKeywords: { type: String, default: '' },
  },
  { timestamps: true }
);

tourPackageSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('name')) this.slug = slugify(this.name);
  // Keep the itinerary in day order and renumber gaps.
  if (this.itinerary?.length) {
    this.itinerary.sort((a, b) => (a.day || 0) - (b.day || 0));
  }
  next();
});

/** Price actually charged (discount wins when set). */
tourPackageSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice > 0 ? this.discountPrice : this.price;
});
tourPackageSchema.set('toJSON', { virtuals: true });

export default mongoose.model('TourPackage', tourPackageSchema);
