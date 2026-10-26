import mongoose from 'mongoose';

// Website "Other Pages" — static content pages shown on the public site (Privacy Policy, Terms, etc.).
// Admin can edit + view; the public API reads them. Collection: `otherpages`.
const otherPageSchema = new mongoose.Schema(
  {
    pagename: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

// The four default pages, inserted once if the collection is empty (idempotent seed).
const DEFAULTS = [
  'Privacy Policy',
  'Terms & Conditions',
  'Cancellation and Refund',
  'Booking Confirmation & Travel Documents',
];

otherPageSchema.statics.seedDefaults = async function () {
  const count = await this.estimatedDocumentCount();
  if (count === 0) {
    await this.insertMany(DEFAULTS.map((pagename) => ({ pagename, description: '' })));
  }
};

export default mongoose.model('OtherPage', otherPageSchema);
