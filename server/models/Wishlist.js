import mongoose from 'mongoose';

// Website customer wishlist (v39). One row per (customer, package). _id is the unique primary key.
const wishlistSchema = new mongoose.Schema(
  {
    websitecustomer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WebsiteCustomer', required: true, index: true },
    package_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage', required: true },
  },
  { timestamps: true }
);

// Prevent the same package being wishlisted twice by the same customer.
wishlistSchema.index({ websitecustomer_id: 1, package_id: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema);
