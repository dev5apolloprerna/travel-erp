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

// req #9: the fixed set of per-menu actions. This is the ONLY permission vocabulary.
export const PERMISSION_ACTIONS = ['SELECT', 'READ', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'];

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
    phone: { type: String, default: '' },
    profilePic: { type: String, default: '' },

    // HR / personal details (req #3 — union of Employee fields with the HR master).
    // Additive, optional; stored as a flexible object so the login-User employee form
    // carries the same personal/HR fields as the Company Owner HR employee form.
    hr: { type: Object, default: {} },

    // documents attached to this user (used for B2B member documents)
    documents: [documentSchema],

    // ---- Employee rights (UI-driven this round) ----
    // which sidebar menus this employee can see/manage (keys from client menu config).
    // Kept as the source of menu VISIBILITY; it is derived from `permissions` on save so the
    // existing sidebar (visibleMenu) keeps working unchanged.
    menus: { type: [String], default: [] },
    // req #9: per-menu ACTION permissions. Shape: { [menuKey]: ['SELECT','READ','CREATE',
    // 'EDIT','DELETE','EXPORT','IMPORT'] }. Replaces the old "many permission types" screen with
    // this fixed 7-action matrix. Enforced on the backend (see middleware `can`). Legacy employees
    // without this field fall back to menu-based access so nothing breaks.
    permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    // which client-type modules they can work in
    modules: { type: [String], enum: ['RETAIL', 'B2B', 'FIT'], default: [] },
    // which services they can book (Service master ids)
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],

    // links for portal users
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    // Tenant/organization this user belongs to (3-layer structure). Optional; backfilled to the default 360 org.
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
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
  // req #9: keep `menus` (visibility) in sync with the action matrix — a menu is visible when
  // it has at least one action granted. Only derive when a non-empty matrix is present, so
  // legacy records that set `menus` directly (and have no matrix) are left untouched.
  if (this.permissions && typeof this.permissions === 'object' && Object.keys(this.permissions).length) {
    this.menus = Object.keys(this.permissions).filter(
      (k) => Array.isArray(this.permissions[k]) && this.permissions[k].length > 0
    );
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
