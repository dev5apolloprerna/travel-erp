import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { documentSchema } from './shared.js';

// Roles cover the 4 login types + b2b member + retail customer portals
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  EMPLOYEE: 'EMPLOYEE',           // travel desk staff (domestic/international)
  RETAIL_CUSTOMER: 'RETAIL_CUSTOMER',
  B2B_MEMBER: 'B2B_MEMBER',
  COMPANY_OWNER: 'COMPANY_OWNER', // owns the company's master data (wireframe masters)
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    // employee sub-type.
    // `employeeTypes` is the multi-select source of truth (an employee can be both).
    // `employeeType` is kept for backward compatibility with existing records.
    employeeType: { type: String, enum: ['DOMESTIC', 'INTERNATIONAL', null], default: null },
    employeeTypes: { type: [String], enum: ['DOMESTIC', 'INTERNATIONAL'], default: [] },

    // profile picture (all user types)
    profilePic: { type: String, default: '' },

    // documents attached to this user (used for B2B member documents)
    documents: [documentSchema],

    // ---- Employee rights (UI-driven this round) ----
    // which sidebar menus this employee can see/manage (keys from client menu config)
    menus: { type: [String], default: [] },
    // which client-type modules they can work in
    modules: { type: [String], enum: ['RETAIL', 'B2B', 'FIT'], default: [] },
    // which services they can book (Service master ids)
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],

    // links for portal users
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Keep employeeType / employeeTypes consistent in both directions.
userSchema.pre('save', function (next) {
  if (this.employeeTypes?.length) {
    this.employeeType = this.employeeTypes[0];
  } else if (this.employeeType) {
    this.employeeTypes = [this.employeeType];
  }
  next();
});

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);
