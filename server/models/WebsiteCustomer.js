import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Website (public storefront) customer account (v39). Separate from the ERP `User` model and the
// ERP `Customer` model. _id is the unique primary key; email is unique.
const websiteCustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },

    // Address (captured on booking-created accounts and editable via the profile API) — v50.
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },

    // Profile photo — uploaded via the profile-update API (v59). Stored as a relative /uploads path.
    customer_profile_image: { type: String, default: null },

    // Password reset / account-setup
    resetToken: { type: String, default: null },
    resetExpires: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

websiteCustomerSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};
websiteCustomerSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never expose the hash / reset fields.
websiteCustomerSchema.methods.toPublic = function () {
  return {
    id: this._id, name: this.name, mobile: this.mobile, email: this.email,
    address: this.address, city: this.city, state: this.state, country: this.country,
    customer_profile_image: this.customer_profile_image || null,   // relative path; absolutized by the controller
    isActive: this.isActive, createdAt: this.createdAt,
  };
};

export default mongoose.model('WebsiteCustomer', websiteCustomerSchema);
