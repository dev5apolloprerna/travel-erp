import mongoose from 'mongoose';

/* ---------------- FAQ ---------------- */
const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'General' },   // e.g. Booking, Payment, Visa
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ---------------- Testimonial ---------------- */
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, default: '' },
    photo: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    message: { type: String, required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage' },
    travelDate: Date,
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Faq = mongoose.model('Faq', faqSchema);
export const Testimonial = mongoose.model('Testimonial', testimonialSchema);
